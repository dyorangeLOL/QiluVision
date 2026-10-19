import { z } from "zod";
import { assetReferenceSchema, cultureContextSchema } from "./common";

export const generateTopicsInputSchema = z.object({
  creativeIntent: z.string().min(1),
  assets: z.array(assetReferenceSchema).min(1),
  cultureContext: z.array(cultureContextSchema),
});

export const topicSuggestionSchema = z.object({
  title: z.string().min(1),
  angle: z.string().min(1),
  rationale: z.string().min(1),
  culturalRelevance: z.string().min(1),
  evidenceEntryIds: z.array(z.string().min(1)).optional(),
  evidenceQuote: z.string().optional(),
  rank: z.number().int().min(1).max(3),
});

export const generateTopicsOutputSchema = z.object({
  topics: z.array(topicSuggestionSchema).length(3),
});

