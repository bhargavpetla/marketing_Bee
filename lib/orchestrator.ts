import { getDb, logEvent, setRunStatus, setRunProgress } from "./db";
import { scrapeMeta, scrapeGoogle } from "./apify";
import { askClaudeJSON } from "./claude";
import { BATCH_SYSTEM, batchUser, DISCOVER_SYSTEM, discoverUser } from "./prompts";
import type { Competitor, CrossAnalysis, RunOptions, ScrapedAd } from "./types";

export async function discoverCompetitors(brand: string): Promise<Competitor[]> {
  const out = await askClaudeJSON<{ competitors: Competitor[] }>({
    system: DISCOVER_SYSTEM,
    user: discoverUser(brand),
    maxTokens: 2500,
    temperature: 0.5,
  });
  return (out.competitors || [])
    .map((c) => ({ ...c, source: "ai" as const, overlap: clamp(Number(c.overlap) || 0, 0, 100) }))
    .filter((c) => c.name && c.name.toLowerCase() !== brand.toLowerCase())
    .slice(0, 12);
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** Pipeline: scrape -> single batch synthesis. No per-ad calls. */
export async function runPipeline(runId: string) {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM runs WHERE id=?`).get(runId) as any;
  if (!row) throw new Error("run not found");
  const competitors: Competitor[] = JSON.parse(row.competitors_json);
  const brand: string = row.brand;
  const options: RunOptions = row.options_json ? JSON.parse(row.options_json) : {};
  const lookbackMonths = options.lookbackMonths || 6;
  const formats: ("image" | "video" | "text")[] =
    options.formats && options.formats.length ? options.formats : ["image", "video", "text"];
  const dateFrom = monthsAgoISO(lookbackMonths);
  const dateTo = todayISO();

  // ---- 1) SCRAPE ----------------------------------------------------------
  setRunStatus(runId, "scraping", `Scraping ads for ${competitors.length} competitors`);
  setRunProgress(runId, 5, "Starting scrape");

  const insertAd = db.prepare(`INSERT OR REPLACE INTO ads
    (id, run_id, competitor_name, channel, ad_archive_id, page_name, page_url, started_at, ended_at, is_active,
     image_urls, video_urls, embed_urls, body, title, cta_text, cta_url, format, raw_json)
    VALUES (@id,@run_id,@competitor_name,@channel,@ad_archive_id,@page_name,@page_url,@started_at,@ended_at,@is_active,
            @image_urls,@video_urls,@embed_urls,@body,@title,@cta_text,@cta_url,@format,@raw_json)`);

  let done = 0;
  const total = competitors.length;
  const scrapeOne = async (c: Competitor) => {
    const got: ScrapedAd[] = [];
    const log = (level: "info" | "warn" | "error", msg: string) => logEvent(runId, level, msg);
    try {
      logEvent(runId, "info", `Meta scrape → ${c.name}`);
      const m = await scrapeMeta(c.name, { country: "IN", max: 18, log, dateFrom, dateTo, formats });
      got.push(...m);
      logEvent(runId, "info", `Meta scrape ← ${c.name}: ${m.length} ads`);
    } catch (e: any) {
      logEvent(runId, "warn", `Meta scrape failed ${c.name}: ${e?.message || e}`);
    }
    try {
      logEvent(runId, "info", `Google scrape → ${c.name}`);
      const g = await scrapeGoogle(c.name, { region: "IN", max: 12, log, domain: c.domain || null, dateFrom, dateTo, formats });
      got.push(...g);
      logEvent(runId, "info", `Google scrape ← ${c.name}: ${g.length} ads`);
    } catch (e: any) {
      logEvent(runId, "warn", `Google scrape failed ${c.name}: ${e?.message || e}`);
    }
    for (const a of got) {
      insertAd.run({
        id: `${runId}:${a.channel}:${a.id}`,
        run_id: runId,
        competitor_name: c.name,
        channel: a.channel,
        ad_archive_id: a.adArchiveId ?? null,
        page_name: a.pageName ?? null,
        page_url: a.pageUrl ?? null,
        started_at: a.startedAt ?? null,
        ended_at: a.endedAt ?? null,
        is_active: a.isActive == null ? null : a.isActive ? 1 : 0,
        image_urls: JSON.stringify(a.imageUrls || []),
        video_urls: JSON.stringify(a.videoUrls || []),
        embed_urls: JSON.stringify(a.embedUrls || []),
        body: a.body ?? null,
        title: a.title ?? null,
        cta_text: a.ctaText ?? null,
        cta_url: a.ctaUrl ?? null,
        format: a.format ?? "unknown",
        raw_json: JSON.stringify(a.raw ?? {}),
      });
    }
    done++;
    const pct = 5 + Math.round((done / total) * 65); // scrape covers 5..70
    setRunProgress(runId, pct, `Scraped ${done}/${total} competitors`);
  };

  await pool(competitors, 2, scrapeOne);

  // ---- 2) BATCH ANALYSIS --------------------------------------------------
  setRunStatus(runId, "analyzing", "Synthesising connections across all ads");
  setRunProgress(runId, 75, "Building cross-competitor brief");

  const ads = db.prepare(`SELECT * FROM ads WHERE run_id=?`).all(runId) as any[];
  logEvent(runId, "info", `${ads.length} ads collected — running batch synthesis`);

  if (ads.length === 0) {
    setRunStatus(runId, "error", "No ads were scraped. Check Apify actor inputs / quota.");
    db.prepare(`UPDATE runs SET error=?, updated_at=? WHERE id=?`).run(
      "No ads scraped — both Meta and Google returned 0.",
      Date.now(),
      runId,
    );
    return;
  }

  // Compact dump — keep small per-ad records to fit a comfortable context budget.
  const dump = ads.map((a) => ({
    brand: a.competitor_name,
    ch: a.channel,
    title: (a.title || "").slice(0, 120),
    body: (a.body || "").slice(0, 360),
    cta: a.cta_text || null,
    fmt: a.format,
    started: a.started_at,
    ended: a.ended_at,
    active: a.is_active === 1,
  }));
  const dumpStr = JSON.stringify(dump).slice(0, 110_000);

  setRunProgress(runId, 85, "AI is reading every ad");

  const cross = await askClaudeJSON<CrossAnalysis>({
    system: BATCH_SYSTEM,
    user: batchUser(brand, dumpStr, ads.length, competitors.map((c) => c.name)),
    maxTokens: 8000,
    temperature: 0.4,
  });

  db.prepare(`UPDATE runs SET cross_json=?, updated_at=? WHERE id=?`).run(
    JSON.stringify(cross),
    Date.now(),
    runId,
  );
  setRunProgress(runId, 100, `Done — ${ads.length} ads across ${competitors.length} brands`);
  setRunStatus(runId, "complete", `Done — ${ads.length} ads analysed across ${competitors.length} brands`);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function monthsAgoISO(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

async function pool<T>(items: T[], conc: number, worker: (t: T) => Promise<void>) {
  const queue = items.slice();
  const runners: Promise<void>[] = [];
  for (let i = 0; i < Math.min(conc, queue.length); i++) {
    runners.push(
      (async function next() {
        while (queue.length) {
          const t = queue.shift()!;
          await worker(t).catch(() => {});
        }
      })(),
    );
  }
  await Promise.all(runners);
}
