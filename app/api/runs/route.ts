import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getDb, setRunStatus } from "@/lib/db";
import { runPipeline } from "@/lib/orchestrator";
import type { Competitor } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { brand, competitors } = (await req.json()) as {
      brand?: string;
      competitors?: Competitor[];
    };
    if (!brand?.trim()) return NextResponse.json({ error: "brand required" }, { status: 400 });
    if (!competitors?.length) return NextResponse.json({ error: "competitors required" }, { status: 400 });

    const id = nanoid(10);
    const now = Date.now();
    getDb().prepare(
      `INSERT INTO runs (id, brand, brand_domain, status, status_msg, competitors_json, cross_json, error, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run(id, brand.trim(), null, "created", "Queued", JSON.stringify(competitors), null, null, now, now);

    // Fire pipeline in background. We await the kickoff but not completion.
    queueMicrotask(async () => {
      try {
        await runPipeline(id);
      } catch (e: any) {
        const msg = e?.message || String(e);
        getDb().prepare(`UPDATE runs SET status='error', error=?, updated_at=? WHERE id=?`).run(msg, Date.now(), id);
        setRunStatus(id, "error", msg);
      }
    });

    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
