import { z } from "zod";
import { cultureContextSchema } from "./common";

export const retrieveCultureContextInputSchema = z.object({
  query: z.string().min(1),
  locations: z.array(z.string().min(1)).optional(),
  limit: z.number().int().positive().max(20).default(8),
});

export const retrieveCultureContextOutputSchema = z.object({
  entries: z.array(cultureContextSchema),
});

export const verifyCulturalClaimsInputSchema = z.object({
  claims: z.array(z.string().min(1)).min(1),
  context: z.array(cultureContextSchema),
});

export const verifiedClaimSchema = z.object({
  claim: z.string().min(1),
  status: z.enum(["supported", "insufficient_evidence"]),
  evidenceEntryIds: z.array(z.string().min(1)),
  displayMessage: z.string().min(1),
  evidenceQuote: z.string().optional(),
});

export const verifyCulturalClaimsOutputSchema = z.object({
  claims: z.array(verifiedClaimSchema),
});

