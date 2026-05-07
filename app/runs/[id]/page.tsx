"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import AdCard from "@/components/AdCard";
import CrossAnalysis from "@/components/CrossAnalysis";

type RunData = any;

const STAGES = [
  { key: "created", label: "Queued", range: [0, 5] },
  { key: "scraping", label: "Scraping ads", range: [5, 70] },
  { key: "analyzing", label: "AI synthesis", range: [70, 100] },
  { key: "complete", label: "Complete", range: [100, 100] },
];

export default function RunPage() {
  const params = useParams<{ id: string }>();
  const runId = params.id;
  const [data, setData] = useState<RunData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | "all">("all");
  const [chFilter, setChFilter] = useState<"all" | "meta" | "google">("all");

  useEffect(() => {
    let alive = true;
    let timer: any;
    async function tick() {
      try {
        const r = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "fetch failed");
        if (alive) setData(j);
        if (alive && j.status !== "complete" && j.status !== "error") {
          timer = setTimeout(tick, 2500);
        }
      } catch (e: any) {
        if (alive) setError(e?.message || String(e));
      }
    }
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [runId]);

  const ads = data?.ads || [];
  const filteredAds = useMemo(
    () =>
      ads.filter(
        (a: any) =>
          (filter === "all" || a.competitorName === filter) &&
          (chFilter === "all" || a.channel === chFilter),
      ),
    [ads, filter, chFilter],
  );
  const stageIdx = STAGES.findIndex((s) =>
    data?.status === "analyzing" ? s.key === "analyzing" : s.key === data?.status,
  );
  const progress = Number(data?.progress ?? 0);
  const isRunning = data?.status && data.status !== "complete" && data.status !== "error";

  async function saveDecision(betId: string, value: "approved" | "rejected" | null) {
    const next = { ...(data?.decisions || {}) };
    if (value === null) delete next[betId];
    else next[betId] = value;
    setData((d: any) => ({ ...d, decisions: next }));
    await fetch(`/api/runs/${runId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisions: next }),
    });
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="max-w-[1280px] mx-auto px-6 pt-10 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="eyebrow">Run · {runId}</span>
            <h1 className="mt-2 text-[36px] md:text-[44px] font-semibold tracking-tight text-ink-900 leading-tight">
              {data?.brand || "…"} <span className="text-fg-muted font-display font-light italic">vs the field</span>
            </h1>
          </div>
          <div className="text-right">
            <span className="pill">{data?.status || "loading"}</span>
            <div className="mt-1 text-[12px] text-fg-muted max-w-[420px]">{data?.statusMsg}</div>
          </div>
        </div>

        {/* Live progress bar */}
        {isRunning && (
          <div className="mt-7 card p-5">
            <div className="flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-2">
                <span className="dot" /><span className="dot" /><span className="dot" />
                <span className="text-ink-900 font-medium">{data?.statusMsg || "Working…"}</span>
              </div>
              <span className="font-product text-fg-muted">{progress}%</span>
            </div>
            <div className="mt-3 h-2 rounded-pill bg-bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-accent transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(2, progress)}%` }}
              />
            </div>
          </div>
        )}

        {/* Stage rail */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          {STAGES.map((s, i) => {
            const done = stageIdx > i || data?.status === "complete";
            const active = stageIdx === i && data?.status !== "complete";
            return (
              <div key={s.key} className="relative">
                <div
                  className={`h-1.5 rounded-pill transition ${
                    done ? "bg-accent" : active ? "bg-accent/40" : "bg-bg-muted"
                  }`}
                />
                <div className={`mt-2 text-[12px] ${active ? "text-ink-900 font-semibold" : "text-fg-muted"}`}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {error && <div className="mt-6 p-4 rounded-md bg-red-50 text-red-700 text-[14px]">{error}</div>}
        {data?.error && (
          <div className="mt-6 p-4 rounded-md bg-red-50 text-red-700 text-[14px] whitespace-pre-wrap">{data.error}</div>
        )}
      </section>

      {/* Cross analysis (top of page once available) */}
      {data?.cross && (
        <section className="max-w-[1280px] mx-auto px-6 py-8">
          <CrossAnalysis data={data.cross} decisions={data.decisions || {}} onDecide={saveDecision} />
        </section>
      )}

      {/* Live event feed when running */}
      {isRunning && data?.events?.length ? (
        <section className="max-w-[1280px] mx-auto px-6 mt-10">
          <span className="eyebrow">Live</span>
          <div className="card mt-3 p-4 max-h-[260px] overflow-auto font-mono text-[12px] leading-relaxed">
            {data.events.map((e: any, i: number) => (
              <div key={i} className={`flex gap-3 ${e.level === "warn" ? "text-amber-700" : e.level === "error" ? "text-red-700" : "text-fg-muted"}`}>
                <span className="text-fg-subtle">{new Date(e.ts).toLocaleTimeString()}</span>
                <span className="text-fg-subtle">{e.level}</span>
                <span className="text-ink-900">{e.msg}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Ad gallery */}
      {ads.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-6 mt-12 mb-20">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
            <div>
              <span className="eyebrow">Live creatives · {ads.length}</span>
              <h2 className="mt-2 text-[28px] md:text-[32px] font-semibold tracking-tight text-ink-900">
                Every ad we found across the field
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={chFilter}
                onChange={(e) => setChFilter(e.target.value as any)}
                className="font-product h-9 px-3 rounded-pill border border-border bg-white text-[13px]"
              >
                <option value="all">All channels</option>
                <option value="meta">Meta</option>
                <option value="google">Google</option>
              </select>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="font-product h-9 px-3 rounded-pill border border-border bg-white text-[13px]"
              >
                <option value="all">All competitors</option>
                {data?.competitors?.map((c: any) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredAds.map((a: any) => (
              <AdCard key={a.id} ad={a} />
            ))}
          </div>
        </section>
      )}

      {/* Empty / loading state */}
      {ads.length === 0 && data?.status !== "error" && isRunning && (
        <section className="max-w-[1280px] mx-auto px-6 py-16 text-center">
          <p className="text-[13px] text-fg-subtle">Scraping live ads from Meta + Google · this usually takes 2–5 minutes.</p>
        </section>
      )}
    </main>
  );
}
