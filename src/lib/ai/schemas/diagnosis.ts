import { z } from "zod";
import { assetReferenceSchema, shotDraftSchema } from "./common";

export const diagnoseMissingShotsInputSchema = z.object({
  shots: z.array(shotDraftSchema).min(1),
  assets: z.array(assetReferenceSchema),
});

export const missingShotSchema = z.object({
  missing_shot_type: z.string().min(1),
  purpose: z.string().min(1),
  recommended_subject: z.string().min(1),
  shot_size: z.string().min(1),
  camera_height: z.string().min(1),
  camera_movement: z.string().min(1),
  duration: z.number().positive(),
  storyboard_position: z.number().int().nonnegative(),
  alternatives: z.array(z.string().min(1)),
});

export const diagnoseMissingShotsOutputSchema = z.object({
  missingShots: z.array(missingShotSchema),
});

