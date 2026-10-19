import { NextResponse } from "next/server";
import { retrieveCulture } from "@/lib/culture/retrieval";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "济南 大明湖 趵突泉 烟台 海洋";
  if (query.length > 200) return NextResponse.json({ error: "检索词过长。" }, { status: 400 });
  return NextResponse.json(await retrieveCulture({ query, limit: 20 }));
}
