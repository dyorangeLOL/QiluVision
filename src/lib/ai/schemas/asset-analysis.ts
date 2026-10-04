import { z } from "zod";

export const analyzeAssetInputSchema = z.object({
  assetId: z.string().min(1),
  mediaType: z.enum(["image", "video"]),
  imagePaths: z.array(z.string().min(1)).min(1),
  detail: z.enum(["low", "original"]).default("low"),
});

export const assetAnalysisOutputSchema = z.object({
  summary: z.string().min(1),
  subjects: z.array(z.string().min(1)),
  scenes: z.array(z.string().min(1)),
  visualTags: z.array(z.string().min(1)),
  locationHint: z.string().nullable(),
  culturalHints: z.array(z.string().min(1)),
  confidence: z.number().min(0).max(1),
});

