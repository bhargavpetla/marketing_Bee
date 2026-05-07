import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getDb, setRunStatus } from "@/lib/db";
import { runPipeline } from "@/lib/orchestrator";
import type { Competitor, RunOptions } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { brand, competitors, options } = (await req.json()) as {
      brand?: string;
      competitors?: Competitor[];
      options?: RunOptions;
    };
    if (!brand?.trim()) return NextResponse.json({ error: "brand required" }, { status: 400 });
    if (!competitors?.length) return NextResponse.json({ error: "competitors required" }, { status: 400 });

    const safeOpts: RunOptions = {
      lookbackMonths: clampInt(options?.lookbackMonths, 1, 36, 6),
      formats: Array.isArray(options?.formats) && options!.formats!.length
        ? options!.formats!.filter((f) => f === "image" || f === "video" || f === "text")
        : ["image", "video", "text"],
    };

    const id = nanoid(10);
    const now = Date.now();
    getDb().prepare(
      `INSERT INTO runs (id, brand, brand_domain, status, status_msg, competitors_json, cross_json, error, options_json, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(id, brand.trim(), null, "created", "Queued", JSON.stringify(competitors), null, null, JSON.stringify(safeOpts), now, now);

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

function clampInt(v: any, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}
