import type { z } from "zod";
import type {
  analyzeAssetInputSchema,
  assetAnalysisOutputSchema,
  diagnoseMissingShotsInputSchema,
  diagnoseMissingShotsOutputSchema,
  generateStoryboardInputSchema,
  generateStoryboardOutputSchema,
  generateTopicsInputSchema,
  generateTopicsOutputSchema,
  planStoryInputSchema,
  planStoryOutputSchema,
  retrieveCultureContextInputSchema,
  retrieveCultureContextOutputSchema,
  rewriteShotInputSchema,
  rewriteShotOutputSchema,
  verifyCulturalClaimsInputSchema,
  verifyCulturalClaimsOutputSchema,
} from "./schemas";

export interface AIProvider {
  analyzeAsset(input: z.infer<typeof analyzeAssetInputSchema>): Promise<z.infer<typeof assetAnalysisOutputSchema>>;
  retrieveCultureContext(input: z.infer<typeof retrieveCultureContextInputSchema>): Promise<z.infer<typeof retrieveCultureContextOutputSchema>>;
  generateTopics(input: z.infer<typeof generateTopicsInputSchema>): Promise<z.infer<typeof generateTopicsOutputSchema>>;
  planStory(input: z.infer<typeof planStoryInputSchema>): Promise<z.infer<typeof planStoryOutputSchema>>;
  generateStoryboard(input: z.infer<typeof generateStoryboardInputSchema>): Promise<z.infer<typeof generateStoryboardOutputSchema>>;
  diagnoseMissingShots(input: z.infer<typeof diagnoseMissingShotsInputSchema>): Promise<z.infer<typeof diagnoseMissingShotsOutputSchema>>;
  rewriteShot(input: z.infer<typeof rewriteShotInputSchema>): Promise<z.infer<typeof rewriteShotOutputSchema>>;
  verifyCulturalClaims(input: z.infer<typeof verifyCulturalClaimsInputSchema>): Promise<z.infer<typeof verifyCulturalClaimsOutputSchema>>;
}

