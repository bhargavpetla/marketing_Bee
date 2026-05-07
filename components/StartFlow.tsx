"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Competitor } from "@/lib/types";

type Phase = "input" | "discovering" | "review" | "starting";

export default function StartFlow({ defaultBrand = "Pink Foundry" }: { defaultBrand?: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [brand, setBrand] = useState(defaultBrand);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [adding, setAdding] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function discover() {
    if (!brand.trim()) return;
    setError(null);
    setPhase("discovering");
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "discovery failed");
      setCompetitors(j.competitors || []);
      setPhase("review");
    } catch (e: any) {
      setError(e?.message || String(e));
      setPhase("input");
    }
  }

  async function start() {
    if (!competitors.length) return;
    setError(null);
    setPhase("starting");
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, competitors }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "could not start run");
      router.push(`/runs/${j.id}`);
    } catch (e: any) {
      setError(e?.message || String(e));
      setPhase("review");
    }
  }

  function addCompetitor() {
    const v = adding.trim();
    if (!v) return;
    if (competitors.some((c) => c.name.toLowerCase() === v.toLowerCase())) return;
    setCompetitors([...competitors, { name: v, rationale: "Added by user", overlap: 70, source: "user" }]);
    setAdding("");
  }
  function removeCompetitor(name: string) {
    setCompetitors(competitors.filter((c) => c.name !== name));
  }
  function updateRationale(name: string, rationale: string) {
    setCompetitors(competitors.map((c) => (c.name === name ? { ...c, rationale } : c)));
  }

  return (
    <div id="start" className="card p-8 md:p-10 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-50 bg-gradient-brand blur-3xl" style={{ filter: "blur(80px)" }} />
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="eyebrow mb-2">Step {phase === "review" || phase === "starting" ? "2 of 2" : "1 of 2"}</div>
          <h2 className="text-[28px] md:text-[32px] font-semibold tracking-tight text-ink-900 leading-tight">
            {phase === "review" || phase === "starting"
              ? "Lock the competitor set"
              : "Which brand do we put under the radar?"}
          </h2>
          <p className="text-fg-muted mt-2 max-w-[520px]">
            {phase === "review" || phase === "starting"
              ? "We picked these. Edit, remove, or add — then we'll scrape Meta + Google ads and run deep cross-competitor analysis."
              : "We'll auto-discover their direct competitors and start scraping live ads from Meta Ad Library + Google Ads Transparency."}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className={`pill ${phase === "input" ? "bg-accent-soft text-accent border-accent/20" : ""}`}>1 · Brand</span>
          <span className="text-fg-disabled">→</span>
          <span className={`pill ${phase === "review" ? "bg-accent-soft text-accent border-accent/20" : ""}`}>2 · Competitors</span>
          <span className="text-fg-disabled">→</span>
          <span className="pill">3 · Run</span>
        </div>
      </div>

      {phase === "input" && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-[12px] uppercase tracking-[0.12em] text-fg-muted font-semibold">Brand name</span>
            <input
              autoFocus
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && discover()}
              placeholder="e.g. Pink Foundry"
              className="mt-2 w-full font-product text-[20px] tracking-tight px-5 h-14 rounded-md border border-border bg-white focus:border-accent transition outline-none"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={discover}
              className="h-12 px-6 rounded-pill bg-ink-900 text-white text-[15px] font-medium hover:bg-black transition"
            >
              Discover competitors with AI →
            </button>
            <span className="text-[13px] text-fg-muted">~5 sec · India D2C bias</span>
          </div>
          {error && <p className="text-[13px] text-red-700 mt-2">{error}</p>}
        </div>
      )}

      {phase === "discovering" && (
        <div className="py-10">
          <div className="flex items-center gap-3 text-[15px] text-ink-900">
            <span className="dot"></span><span className="dot"></span><span className="dot"></span>
            <span>Analyzing positioning, audience overlap, ad activity for <b>{brand}</b>…</span>
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-2 text-[13px] text-fg-muted max-w-[640px]">
            <li>· Mapping category & price band</li>
            <li>· Cross-checking Meta active advertisers</li>
            <li>· Estimating audience overlap</li>
            <li>· Filtering marketplaces & retailers</li>
          </ul>
        </div>
      )}

      {(phase === "review" || phase === "starting") && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {competitors.map((c) => (
              <div
                key={c.name}
                className="border border-border rounded-md p-4 bg-white hover:border-accent/40 transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-product font-semibold text-ink-900 truncate">{c.name}</span>
                      {c.domain && <span className="text-[11px] text-fg-subtle truncate">· {c.domain}</span>}
                      <span className="ml-auto pill bg-currency-visionary/30 border-currency-visionary/40 text-fg">{c.overlap}%</span>
                    </div>
                    <textarea
                      value={c.rationale}
                      onChange={(e) => updateRationale(c.name, e.target.value)}
                      className="mt-2 w-full text-[13px] text-fg-muted leading-relaxed bg-transparent border-0 outline-none resize-none focus:bg-bg-muted/50 rounded p-1 -m-1 transition"
                      rows={2}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] uppercase tracking-wider text-fg-subtle">{c.source === "user" ? "user added" : "ai picked"}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCompetitor(c.name)}
                    className="opacity-0 group-hover:opacity-100 transition text-fg-muted hover:text-red-700 text-sm"
                    aria-label="remove"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
              placeholder="Add a competitor by name…"
              className="font-product flex-1 min-w-[240px] h-11 px-4 rounded-md border border-border bg-white outline-none focus:border-accent transition text-[14px]"
            />
            <button onClick={addCompetitor} className="h-11 px-5 rounded-pill border border-border hover:border-ink-900 transition text-[14px]">
              + Add
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="text-[13px] text-fg-muted">
              <b>{competitors.length}</b> competitors · we'll pull live Meta + Google ads, then synthesise the cross-competitor brief
            </div>
            <button
              disabled={phase === "starting" || !competitors.length}
              onClick={start}
              className="h-12 px-6 rounded-pill bg-accent text-white text-[15px] font-medium hover:bg-accent-hover disabled:bg-fg-disabled disabled:text-white transition shadow-sm"
            >
              {phase === "starting" ? "Starting…" : "Run analysis →"}
            </button>
          </div>
          {error && <p className="text-[13px] text-red-700 mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
