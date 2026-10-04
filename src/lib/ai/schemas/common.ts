import { z } from "zod";

export const assetReferenceSchema = z.object({
  assetId: z.string().min(1),
  originalFilename: z.string().min(1),
});

export const cultureContextSchema = z.object({
  entryId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  source: z.string().min(1),
  verified: z.boolean(),
});

export const shotDraftSchema = z.object({
  id: z.string().min(1).optional(),
  position: z.number().int().nonnegative(),
  title: z.string().min(1),
  purpose: z.string().min(1),
  narration: z.string().optional(),
  visualDescription: z.string().min(1),
  shotSize: z.string().optional(),
  cameraHeight: z.string().optional(),
  cameraMovement: z.string().optional(),
  durationSeconds: z.number().positive().optional(),
  assetId: z.string().min(1).nullable().optional(),
  isShotLocked: z.boolean().default(false),
  isAssetLocked: z.boolean().default(false),
});

