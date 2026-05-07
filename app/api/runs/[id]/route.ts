import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  const run = db.prepare(`SELECT * FROM runs WHERE id=?`).get(params.id) as any;
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  const ads = db.prepare(`SELECT * FROM ads WHERE run_id=? ORDER BY competitor_name, channel`).all(params.id) as any[];
  const events = db
    .prepare(`SELECT ts, level, msg FROM run_events WHERE run_id=? ORDER BY ts DESC LIMIT 80`)
    .all(params.id) as any[];

  return NextResponse.json({
    id: run.id,
    brand: run.brand,
    status: run.status,
    statusMsg: run.status_msg,
    progress: run.progress ?? 0,
    decisions: run.decisions_json ? JSON.parse(run.decisions_json) : {},
    competitors: JSON.parse(run.competitors_json || "[]"),
    cross: run.cross_json ? JSON.parse(run.cross_json) : null,
    error: run.error,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    ads: ads.map((a) => ({
      id: a.id,
      competitorName: a.competitor_name,
      channel: a.channel,
      pageName: a.page_name,
      pageUrl: a.page_url,
      startedAt: a.started_at,
      endedAt: a.ended_at,
      isActive: a.is_active,
      imageUrls: JSON.parse(a.image_urls || "[]"),
      videoUrls: JSON.parse(a.video_urls || "[]"),
      embedUrls: JSON.parse(a.embed_urls || "[]"),
      body: a.body,
      title: a.title,
      ctaText: a.cta_text,
      ctaUrl: a.cta_url,
      format: a.format,
    })),
    events,
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json().catch(() => ({}));
  const decisions = body?.decisions;
  if (!decisions || typeof decisions !== "object") {
    return NextResponse.json({ error: "decisions object required" }, { status: 400 });
  }
  db.prepare(`UPDATE runs SET decisions_json=?, updated_at=? WHERE id=?`).run(
    JSON.stringify(decisions),
    Date.now(),
    params.id,
  );
  return NextResponse.json({ ok: true });
}
