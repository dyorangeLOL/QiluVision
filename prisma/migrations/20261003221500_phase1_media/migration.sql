PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "localPath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "duration" REAL,
    "width" INTEGER,
    "height" INTEGER,
    "fps" REAL,
    "codec" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploading',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Asset" (
    "id", "projectId", "originalFilename", "storedFilename", "type", "mimeType",
    "size", "localPath", "duration", "width", "height", "status", "createdAt", "updatedAt"
)
SELECT
    "id", "projectId", "originalFilename", "originalFilename", "mediaType",
    COALESCE("mimeType", 'application/octet-stream'), COALESCE("fileSize", 0),
    "storagePath", "durationSeconds", "width", "height",
    CASE WHEN "processingStatus" = 'pending' THEN 'uploaded' ELSE "processingStatus" END,
    "createdAt", "updatedAt"
FROM "Asset";

DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";

CREATE INDEX "Asset_projectId_idx" ON "Asset"("projectId");
CREATE INDEX "Asset_projectId_status_idx" ON "Asset"("projectId", "status");

CREATE TABLE "AssetFrame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "timestamp" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetFrame_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AssetFrame_assetId_position_key" ON "AssetFrame"("assetId", "position");
CREATE INDEX "AssetFrame_assetId_idx" ON "AssetFrame"("assetId");

PRAGMA foreign_keys=ON;
