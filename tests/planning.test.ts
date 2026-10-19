// Isolated fixtures only: never executed against the user's database or live AI.
import assert from "node:assert/strict";
import { test } from "node:test";
import { writeFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import type { AIProvider } from "../src/lib/ai/provider";
import { assetAnalysisOutputSchema } from "../src/lib/ai/schemas";
import { runPlanningAction, getPlanningData } from "../src/lib/planning/service";
import { validateShots, type ShotDraft } from "../src/lib/planning/constraints";
import { buildExport } from "../src/lib/planning/export";
import { retrieveCulture } from "../src/lib/culture/retrieval";
import { DELETE as deleteAsset } from "../src/app/api/assets/[assetId]/route";
import { GET as exportPlan } from "../src/app/api/projects/[projectId]/export/route";
import { POST as planningPost } from "../src/app/api/projects/[projectId]/planning/route";
import { explainAssetMatch } from "../src/lib/planning/matching";
import { readPlanningProgress } from "../src/lib/planning/progress";

test("offline planning, constraints, persistence and export", async () => {
  assert.match(process.env.DATABASE_URL ?? "", /[\\/]\.test-output[\\/]planning-tests\.db$/);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Live HTTP calls are forbidden in offline tests"); };
  const project = await db.project.create({ data: { name: "TEST FIXTURE · 大明湖", creativeIntent: "测试数据，不是真实AI结果" } });
  try {
    const before = await getPlanningData(project.id);
    assert.equal(before.board, null);
    await assert.rejects(runPlanningAction(project.id, { action: "topics" }), /真实素材解读/);
    const failedStream = await planningPost(new Request(`http://localhost/api/projects/${project.id}/planning`, { method: "POST", headers: { origin: "http://localhost", accept: "application/x-ndjson" }, body: JSON.stringify({ action: "topics" }) }), { params: Promise.resolve({ projectId: project.id }) });
    const streamedStages: string[] = [];
    await assert.rejects(readPlanningProgress(failedStream, (stage) => streamedStages.push(stage)), /真实素材解读/);
    assert.deepEqual(streamedStages, ["检查素材与方案版本"]);
    const analysis = assetAnalysisOutputSchema.parse({ summary: "TEST FIXTURE：湖面画面", scene: { type: "lake", description: "测试湖面", location_guess: null, location_confidence: 0 }, subjects: [], shot: { shot_size: "wide", composition: [], camera_angle: "eye_level", camera_motion: "static" }, visual: { lighting: "daylight", color_impression: [], mood: [], visual_quality: 0.5 }, cultural_elements: [], suggested_uses: ["opening"], keywords: ["湖面"], confidence: 0.5, uncertainties: ["测试数据"] });
    const asset = await db.asset.create({ data: { projectId: project.id, originalFilename: "TEST-FIXTURE.jpg", storedFilename: "test.jpg", localPath: "storage/test/original/test.jpg", type: "image", mimeType: "image/jpeg", size: 100, status: "ready", aiStatus: "ready", analysis: { create: { summary: analysis.summary, subjectsJson: "[]", scenesJson: "[]", visualTagsJson: "[]", model: "OFFLINE-TEST-NO-AI", analysisJson: JSON.stringify(analysis) } } } });
    const baseShots: ShotDraft[] = Array.from({ length: 3 }, (_, position) => ({ position, title: `TEST ${position}`, purpose: "离线约束测试", narration: position === 1 ? "" : `测试旁白${position}`, visualDescription: "测试画面", durationSeconds: 4, assetId: asset.id, isShotLocked: false, isAssetLocked: false }));
    let generated = baseShots;
    const fake: AIProvider = {
      analyzeAsset: async () => analysis,
      retrieveCultureContext: retrieveCulture,
      generateTopics: async () => ({ topics: [1, 2, 3].map((rank) => ({ rank, title: `TEST FIXTURE ${rank}`, angle: "测试", rationale: "测试", culturalRelevance: "仅用于测试" })) }),
      planStory: async () => ({ title: "TEST FIXTURE 创作方案", synopsis: "仅用于离线测试，不是模型结果", narrativeArc: "测试结构", sections: [{ title: "测试", purpose: "测试", targetDurationSeconds: 12 }] }),
      generateStoryboard: async () => ({ shots: generated }),
      diagnoseMissingShots: async () => ({ missingShots: [{ missing_shot_type: "测试特写", purpose: "测试", recommended_subject: "湖水", shot_size: "特写", camera_height: "平视", camera_movement: "静止", duration: 2, storyboard_position: 1, alternatives: [`${asset.id} 测试替代`] }] }),
      rewriteShot: async ({ shot }) => ({ shot: { ...shot, narration: "测试重写" } }),
      verifyCulturalClaims: async ({ claims }) => ({ claims: claims.map((claim) => ({ claim, status: "supported" as const, evidenceEntryIds: ["nonexistent"], evidenceQuote: "伪造引用", displayMessage: "测试" })) }),
    };
    const act = (action: unknown) => runPlanningAction(project.id, action, fake);
    const stages: string[] = [];
    await runPlanningAction(project.id, { action: "topics" }, fake, (stage) => stages.push(stage));
    assert.deepEqual(stages, ["检查素材与方案版本", "根据真实素材与文化线索生成三个选题", "校验选题与文化引用并保存"]);
    assert(explainAssetMatch({ ...baseShots[0], visualDescription: "湖面" }, analysis, null)[0].includes("湖面"));
    assert(explainAssetMatch(baseShots[0], null, 2).some((reason) => reason.includes("短于")));
    assert(explainAssetMatch({ ...baseShots[0], assetId: null }, null, null)[0].includes("尚未绑定"));
    await act({ action: "topics" });
    let state = await getPlanningData(project.id);
    assert.equal(state.topics.length, 3);
    assert(state.topics.every((topic) => topic.culturalRelevance === "未在当前知识库中找到充分依据"));
    await act({ action: "select", topicId: state.topics[0].id });
    const settings = { targetDuration: 12, aspectRatio: "9:16", shotCount: 3 };
    await act({ action: "plan", settings });
    state = await getPlanningData(project.id);
    assert.equal(state.board!.shots.length, 3);
    let board = state.board!;
    const lockedId = board.shots[0].id;
    await act({ action: "save", revision: board.revision, shots: board.shots.map((shot, i) => ({ ...shot, isShotLocked: i === 0, isAssetLocked: i === 1 })) });
    state = await getPlanningData(project.id); board = state.board!;
    await assert.rejects(act({ action: "save", revision: board.revision, shots: board.shots.map((shot, i) => i === 0 ? { ...shot, narration: "禁止覆盖" } : shot) }), /锁定镜头/);
    await assert.rejects(act({ action: "save", revision: board.revision, shots: board.shots.map((shot, i) => i === 1 ? { ...shot, assetId: null } : shot) }), /锁定|未绑定/);
    await assert.rejects(act({ action: "save", revision: board.revision - 1, shots: board.shots }), /已更新/);
    generated = baseShots;
    await assert.rejects(act({ action: "replan", settings, revision: board.revision }), /锁定镜头/);
    generated = board.shots;
    await act({ action: "replan", settings, revision: board.revision });
    state = await getPlanningData(project.id); board = state.board!;
    assert.equal(board.shots[0].id, lockedId);
    const snapshot = JSON.stringify(board.shots);
    await assert.rejects(runPlanningAction(project.id, { action: "replan", settings, revision: board.revision }, { ...fake, generateStoryboard: async () => { throw new Error("OFFLINE TEST: provider unavailable"); } }), /provider unavailable/);
    assert.equal(JSON.stringify((await getPlanningData(project.id)).board!.shots), snapshot);
    assert(board.shots[0].isShotLocked);
    const deletion = await deleteAsset(new Request(`http://localhost/api/assets/${asset.id}`, { method: "DELETE" }), { params: Promise.resolve({ assetId: asset.id }) });
    assert.equal(deletion.status, 409);
    assert(await db.asset.findUnique({ where: { id: asset.id } }));
    await act({ action: "rewrite", revision: board.revision, shotId: board.shots[1].id, instruction: "测试要求" });
    state = await getPlanningData(project.id); board = state.board!;
    assert.equal(board.shots[1].assetId, asset.id);
    assert.equal(board.shots[1].narration, "测试重写");
    await act({ action: "diagnose", revision: board.revision });
    state = await getPlanningData(project.id); board = state.board!;
    await act({ action: "checklist", revision: board.revision, indices: [0] });
    state = await getPlanningData(project.id); board = state.board!;
    assert.deepEqual(board.diagnosis.checklist, [0]);
    await act({ action: "verify", revision: board.revision });
    state = await getPlanningData(project.id); board = state.board!;
    assert(board.claims.every((claim) => claim.status === "insufficient_evidence"));
    assert((await retrieveCulture({ query: "大明湖", limit: 8 })).entries.length >= 2);
    assert.equal((await retrieveCulture({ query: "不存在的火星文化", limit: 8 })).entries.length, 0);
    const txt = await buildExport(state, "txt"); assert(txt.toString().includes("TEST-FIXTURE.jpg"));
    const csv = await buildExport(state, "csv"); assert.equal(csv[0], 0xef); assert(csv.toString().includes("Asset ID"));
    const srtState = { ...state, board: { ...board, shots: baseShots } };
    const srt = (await buildExport(srtState, "srt")).toString();
    assert(srt.includes("00:00:08,000 --> 00:00:12,000"));
    const pdf = await buildExport(state, "pdf"); assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
    await writeFile(".test-output/planning-offline-test.pdf", pdf);
    for (const format of ["pdf", "csv", "txt", "srt"]) {
      const response = await exportPlan(new Request(`http://localhost/api/projects/${project.id}/export?format=${format}`), { params: Promise.resolve({ projectId: project.id }) });
      assert.equal(response.status, 200);
      assert(response.headers.get("content-disposition")?.includes("attachment"));
      assert((await response.arrayBuffer()).byteLength > 10);
    }
    assert.equal(await db.export.count({ where: { projectId: project.id, status: "ready" } }), 4);
    const videoAssets = [{ assetId: asset.id, duration: 1, mediaType: "video" }];
    assert.throws(() => validateShots(baseShots, [], videoAssets), /源视频/);
    assert.throws(() => validateShots(baseShots.map((shot) => ({ ...shot, assetId: "other-project" })), [], []), /非本项目/);
    assert.throws(() => validateShots(baseShots, [], [{ assetId: asset.id }], 60), /总时长/);
    console.log("OFFLINE TEST ONLY: topics, selection, story, binding, lock guards, revision conflicts, rewrite, diagnosis, checklist, false citation rejection, retrieval, PDF/CSV/TXT/SRT passed.");
  } finally { globalThis.fetch = originalFetch; await db.project.delete({ where: { id: project.id } }); await db.$disconnect(); }
});

test("planning progress decodes split UTF-8 and rejects missing completion", async () => {
  const bytes = new TextEncoder().encode(`${JSON.stringify({ type: "progress", stage: "规划故事" })}\n${JSON.stringify({ type: "done", data: { saved: true } })}\n`);
  let offset = 0;
  const response = new Response(new ReadableStream({ pull(controller) { if (offset === bytes.length) return controller.close(); controller.enqueue(bytes.slice(offset, ++offset)); } }));
  const stages: string[] = [];
  assert.deepEqual(await readPlanningProgress(response, (stage) => stages.push(stage)), { saved: true });
  assert.deepEqual(stages, ["规划故事"]);
  await assert.rejects(readPlanningProgress(new Response('{"type":"progress","stage":"等待"}\n'), () => {}), /未确认保存结果/);
  await assert.rejects(readPlanningProgress(new Response('{"type":"progress"}\n'), () => {}));
});
