import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { serializeAsset } from "@/lib/media/serialize";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { assets: { include: { frames: { orderBy: { position: "asc" } } } } },
  });
  if (!project) return NextResponse.json({ error: "项目不存在。" }, { status: 404 });
  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      creativeIntent: project.creativeIntent,
      assets: project.assets.map(serializeAsset),
    },
  });
}
