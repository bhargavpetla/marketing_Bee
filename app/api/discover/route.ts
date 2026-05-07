import { NextResponse } from "next/server";
import { discoverCompetitors } from "@/lib/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { brand } = (await req.json()) as { brand?: string };
    if (!brand || !brand.trim()) {
      return NextResponse.json({ error: "brand required" }, { status: 400 });
    }
    const competitors = await discoverCompetitors(brand.trim());
    return NextResponse.json({ competitors });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
