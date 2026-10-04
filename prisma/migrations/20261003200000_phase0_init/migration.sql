CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "creativeIntent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "durationSeconds" REAL,
    "width" INTEGER,
    "height" INTEGER,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AssetAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "subjectsJson" TEXT NOT NULL,
    "scenesJson" TEXT NOT NULL,
    "visualTagsJson" TEXT NOT NULL,
    "locationHint" TEXT,
    "culturalHints" TEXT,
    "confidence" REAL,
    "model" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL DEFAULT '1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetAnalysis_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "culturalRelevance" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Topic_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Storyboard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "topicId" TEXT,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "narrativeArc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "schemaVersion" TEXT NOT NULL DEFAULT '1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Storyboard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Storyboard_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Shot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storyboardId" TEXT NOT NULL,
    "assetId" TEXT,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "narration" TEXT,
    "visualDescription" TEXT NOT NULL,
    "shotSize" TEXT,
    "cameraHeight" TEXT,
    "cameraMovement" TEXT,
    "durationSeconds" REAL,
    "isShotLocked" BOOLEAN NOT NULL DEFAULT false,
    "isAssetLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shot_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "Storyboard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "location" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "CulturalClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storyboardId" TEXT NOT NULL,
    "shotId" TEXT,
    "knowledgeEntryId" TEXT,
    "claim" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unverified',
    "evidence" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CulturalClaim_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "Storyboard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CulturalClaim_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CulturalClaim_knowledgeEntryId_fkey" FOREIGN KEY ("knowledgeEntryId") REFERENCES "KnowledgeEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Export" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "filePath" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Export_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Asset_projectId_idx" ON "Asset"("projectId");
CREATE UNIQUE INDEX "AssetAnalysis_assetId_key" ON "AssetAnalysis"("assetId");
CREATE INDEX "Topic_projectId_idx" ON "Topic"("projectId");
CREATE UNIQUE INDEX "Topic_projectId_rank_key" ON "Topic"("projectId", "rank");
CREATE INDEX "Storyboard_projectId_idx" ON "Storyboard"("projectId");
CREATE INDEX "Storyboard_topicId_idx" ON "Storyboard"("topicId");
CREATE INDEX "Shot_assetId_idx" ON "Shot"("assetId");
CREATE UNIQUE INDEX "Shot_storyboardId_position_key" ON "Shot"("storyboardId", "position");
CREATE INDEX "KnowledgeEntry_location_category_idx" ON "KnowledgeEntry"("location", "category");
CREATE INDEX "CulturalClaim_storyboardId_idx" ON "CulturalClaim"("storyboardId");
CREATE INDEX "CulturalClaim_shotId_idx" ON "CulturalClaim"("shotId");
CREATE INDEX "CulturalClaim_knowledgeEntryId_idx" ON "CulturalClaim"("knowledgeEntryId");
CREATE INDEX "Export_projectId_idx" ON "Export"("projectId");
