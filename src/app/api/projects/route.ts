import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { createProjectSchema } from "@/lib/validators/project";

export async function GET() {
  const projects = await db.project.findMany({
    include: { _count: { select: { assets: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const parsed = createProjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "项目信息无效。" },
      { status: 400 },
    );
  }
  const project = await db.project.create({ data: parsed.data });
  return NextResponse.json({ project }, { status: 201 });
}
