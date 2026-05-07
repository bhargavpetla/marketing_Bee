import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "radar.db");

declare global {
  // eslint-disable-next-line no-var
  var __radarDb: Database.Database | undefined;
}

function open() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      brand TEXT NOT NULL,
      brand_domain TEXT,
      status TEXT NOT NULL,
      status_msg TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      decisions_json TEXT NOT NULL DEFAULT '{}',
      competitors_json TEXT NOT NULL DEFAULT '[]',
      cross_json TEXT,
      error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ads (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      competitor_name TEXT NOT NULL,
      channel TEXT NOT NULL,
      ad_archive_id TEXT,
      page_name TEXT,
      page_url TEXT,
      started_at TEXT,
      ended_at TEXT,
      is_active INTEGER,
      image_urls TEXT NOT NULL DEFAULT '[]',
      video_urls TEXT NOT NULL DEFAULT '[]',
      embed_urls TEXT NOT NULL DEFAULT '[]',
      body TEXT,
      title TEXT,
      cta_text TEXT,
      cta_url TEXT,
      format TEXT,
      raw_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ads_run ON ads(run_id);
    CREATE INDEX IF NOT EXISTS idx_ads_run_comp ON ads(run_id, competitor_name);

    CREATE TABLE IF NOT EXISTS ad_insights (
      ad_id TEXT PRIMARY KEY REFERENCES ads(id) ON DELETE CASCADE,
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_insights_run ON ad_insights(run_id);

    CREATE TABLE IF NOT EXISTS run_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      ts INTEGER NOT NULL,
      level TEXT NOT NULL,
      msg TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_run ON run_events(run_id, ts);
  `);
  // Idempotent migrations for existing DBs created before progress/decisions columns existed.
  for (const stmt of [
    "ALTER TABLE runs ADD COLUMN progress INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE runs ADD COLUMN decisions_json TEXT NOT NULL DEFAULT '{}'",
    "ALTER TABLE ads ADD COLUMN embed_urls TEXT NOT NULL DEFAULT '[]'",
  ]) {
    try { db.exec(stmt); } catch { /* column exists, ignore */ }
  }
  return db;
}

export function getDb(): Database.Database {
  if (!global.__radarDb) {
    global.__radarDb = open();
    // Recovery sweep: any run that was scraping/analyzing when the server died is
    // an orphan — its pipeline lived in-process and won't resume. Mark it errored
    // so the UI doesn't poll forever.
    const cutoff = Date.now() - 5 * 60 * 1000; // 5 min idle
    global.__radarDb
      .prepare(
        `UPDATE runs SET status='error',
                       error=COALESCE(error, 'Pipeline interrupted (server restart). Start a new analysis.'),
                       updated_at=?
         WHERE status NOT IN ('complete','error') AND updated_at < ?`,
      )
      .run(Date.now(), cutoff);
  }
  return global.__radarDb;
}

export function logEvent(runId: string, level: "info" | "warn" | "error", msg: string) {
  const db = getDb();
  db.prepare(`INSERT INTO run_events (run_id, ts, level, msg) VALUES (?,?,?,?)`).run(
    runId,
    Date.now(),
    level,
    msg,
  );
}

export function setRunStatus(runId: string, status: string, msg?: string) {
  const db = getDb();
  db.prepare(`UPDATE runs SET status=?, status_msg=?, updated_at=? WHERE id=?`).run(
    status,
    msg ?? null,
    Date.now(),
    runId,
  );
  logEvent(runId, "info", `${status}${msg ? `: ${msg}` : ""}`);
}

export function setRunProgress(runId: string, pct: number, msg?: string) {
  const db = getDb();
  db.prepare(`UPDATE runs SET progress=?, status_msg=COALESCE(?, status_msg), updated_at=? WHERE id=?`).run(
    Math.max(0, Math.min(100, Math.round(pct))),
    msg ?? null,
    Date.now(),
    runId,
  );
}
