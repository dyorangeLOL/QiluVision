import "server-only";

import type { AIProvider } from "./provider";

export class DeepSeekProvider implements AIProvider {
  private unavailable(operation: string): Promise<never> {
    return Promise.reject(
      new Error(`DeepSeekProvider.${operation} is intentionally not implemented in Phase 0.`),
    );
  }

  analyzeAsset(): Promise<never> {
    return this.unavailable("analyzeAsset");
  }

  retrieveCultureContext(): Promise<never> {
    return this.unavailable("retrieveCultureContext");
  }

  generateTopics(): Promise<never> {
    return this.unavailable("generateTopics");
  }

  planStory(): Promise<never> {
    return this.unavailable("planStory");
  }

  generateStoryboard(): Promise<never> {
    return this.unavailable("generateStoryboard");
  }

  diagnoseMissingShots(): Promise<never> {
    return this.unavailable("diagnoseMissingShots");
  }

  rewriteShot(): Promise<never> {
    return this.unavailable("rewriteShot");
  }

  verifyCulturalClaims(): Promise<never> {
    return this.unavailable("verifyCulturalClaims");
  }
}

