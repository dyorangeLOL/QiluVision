import { z } from "zod";

const confidence = z.number().min(0).max(1);

// 该 schema 同时约束模型输出和页面展示数据，unknown/null 是合法结果。
export const assetAnalysisOutputSchema = z.object({
  summary: z.string().min(1),
  scene: z.object({
    type: z.enum(["campus", "park", "street", "lake", "spring", "coast", "building", "indoor", "landscape", "other", "unknown"]),
    description: z.string().min(1),
    location_guess: z.string().nullable(),
    location_confidence: confidence,
  }),
  subjects: z.array(z.object({ name: z.string().min(1), importance: z.enum(["primary", "secondary"]) })),
  shot: z.object({
    shot_size: z.enum(["extreme_wide", "wide", "medium", "close_up", "extreme_close_up", "mixed", "unknown"]),
    composition: z.array(z.string().min(1)),
    camera_angle: z.enum(["eye_level", "high", "low", "aerial", "unknown"]),
    camera_motion: z.enum(["static", "pan", "tilt", "push_in", "pull_out", "tracking", "handheld", "mixed", "unknown"]),
  }),
  visual: z.object({
    lighting: z.enum(["daylight", "sunset", "night", "indoor", "mixed", "unknown"]),
    color_impression: z.array(z.string().min(1)),
    mood: z.array(z.string().min(1)),
    visual_quality: confidence,
  }),
  cultural_elements: z.array(z.object({ name: z.string().min(1), confidence, reason: z.string().min(1) })),
  suggested_uses: z.array(z.enum(["opening", "establishing", "transition", "detail", "character", "atmosphere", "ending"])),
  keywords: z.array(z.string().min(1)),
  confidence,
  uncertainties: z.array(z.string().min(1)),
});

export const analyzeAssetInputSchema = z.object({
  assetId: z.string().min(1),
  mediaType: z.enum(["image", "video"]),
  imagePaths: z.array(z.string().min(1)).min(1),
  detail: z.enum(["low", "original"]).default("low"),
  metadata: z.object({
    duration: z.number().nullable().optional(), width: z.number().nullable().optional(),
    height: z.number().nullable().optional(), fps: z.number().nullable().optional(), codec: z.string().nullable().optional(),
  }).optional(),
});

export type AssetAnalysisOutput = z.infer<typeof assetAnalysisOutputSchema>;
