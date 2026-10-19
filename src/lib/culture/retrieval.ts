import { db } from "@/lib/db";
import { knowledgeEntries } from "./entries";
import { retrieveCultureContextInputSchema, retrieveCultureContextOutputSchema } from "@/lib/ai/schemas";
import type { z } from "zod";

export const INSUFFICIENT_EVIDENCE = "未在当前知识库中找到充分依据";

export async function ensureKnowledge() {
  // 稳定 ID、幂等入库，不覆盖参赛者后续在数据库中校订的条目。
  await db.$transaction(knowledgeEntries.map((entry) => db.knowledgeEntry.upsert({ where: { id: entry.id }, update: {}, create: { ...entry, tags: JSON.stringify(entry.tags) } })));
}

export async function retrieveCulture(input: z.infer<typeof retrieveCultureContextInputSchema>) {
  const parsed = retrieveCultureContextInputSchema.parse(input);
  await ensureKnowledge();
  const entries = await db.knowledgeEntry.findMany({ orderBy: { id: "asc" } });
  const genericTerms = new Set(["文化", "城市", "素材", "画面", "旅游", "创作", "故事", "地方", "镜头", "场景", "测试", "一个", "我想", "眼中", "中的"]);
  const terms = Array.from(new Set((parsed.query.match(/[\p{L}\p{N}]{2,}/gu) ?? []).flatMap((term) => [term, ...Array.from({ length: Math.max(0, term.length - 1) }, (_, i) => term.slice(i, i + 2))]))).filter((term) => !genericTerms.has(term));
  const ranked = entries.map((entry) => {
    const haystack = `${entry.location} ${entry.title} ${entry.content} ${entry.tags}`;
    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    return { entry, score };
  }).filter(({ entry, score }) => score > 0 && (!parsed.locations?.length || parsed.locations.some((location) => entry.location.includes(location))))
    .sort((a, b) => b.score - a.score).slice(0, parsed.limit);
  return retrieveCultureContextOutputSchema.parse({ entries: ranked.map(({ entry }) => ({ entryId: entry.id, title: entry.title, content: entry.content, source: entry.source, verified: entry.verified })) });
}
