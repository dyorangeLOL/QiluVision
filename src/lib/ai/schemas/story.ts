import { z } from "zod";
import { assetReferenceSchema, cultureContextSchema, shotDraftSchema } from "./common";

export const planningSettingsSchema = z.object({
  aspectRatio: z.enum(["9:16", "16:9"]).default("9:16"),
  targetDuration: z.number().int().min(10).max(600).default(60),
  shotCount: z.number().int().min(3).max(30).default(10),
});

export const planStoryInputSchema = z.object({
  creativeIntent: z.string().min(1),
  selectedTopic: z.string().min(1),
  assets: z.array(assetReferenceSchema).min(1),
  cultureContext: z.array(cultureContextSchema),
  settings: planningSettingsSchema.optional(),
});

export const planStoryOutputSchema = z.object({
  title: z.string().min(1),
  synopsis: z.string().min(1),
  narrativeArc: z.string().min(1),
  sections: z.array(
    z.object({
      title: z.string().min(1),
      purpose: z.string().min(1),
      targetDurationSeconds: z.number().positive(),
    }),
  ),
});

export const generateStoryboardInputSchema = z.object({
  storyPlan: planStoryOutputSchema,
  assets: z.array(assetReferenceSchema).min(1),
  lockedShots: z.array(shotDraftSchema).default([]),
  settings: planningSettingsSchema.optional(),
  cultureContext: z.array(cultureContextSchema).default([]),
  instruction: z.string().max(1000).default(""),
});

export const generateStoryboardOutputSchema = z.object({
  shots: z.array(shotDraftSchema).min(1).max(60),
});

export const rewriteShotInputSchema = z.object({
  shot: shotDraftSchema,
  instruction: z.string().min(1),
  availableAssets: z.array(assetReferenceSchema),
  preserveShot: z.boolean(),
  preserveAsset: z.boolean(),
});

export const rewriteShotOutputSchema = z.object({
  shot: shotDraftSchema,
});

