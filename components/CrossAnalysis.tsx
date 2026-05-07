"use client";

type CA = any;
type Decisions = Record<string, "approved" | "rejected">;

export default function CrossAnalysis({
  data,
  decisions = {},
  onDecide,
}: {
  data: CA;
  decisions?: Decisions;
  onDecide?: (betId: string, value: "approved" | "rejected" | null) => void;
}) {
  if (!data) return null;
  const exec = data.executive_summary;

  return (
    <div className="space-y-12">
      {/* Executive summary — vivid scorecard + threats/opportunities */}
      {exec && (
        <section className="relative">
          <div className="card p-8 md:p-10 relative overflow-hidden bg-gradient-to-br from-white via-accent-soft/20 to-currency-calm/15">
            <div className="absolute -top-32 -right-24 w-[480px] h-[480px] rounded-pill bg-gradient-brand opacity-40 blur-3xl -z-10" />
            <div className="absolute -bottom-24 -left-20 w-[360px] h-[360px] rounded-pill bg-gradient-accent opacity-20 blur-3xl -z-10" />
            <span className="eyebrow">Executive summary</span>
            <h2 className="mt-3 text-[26px] md:text-[32px] font-semibold tracking-tight text-ink-900 leading-tight max-w-[860px]">
              {exec.tldr}
            </h2>

            {exec.scorecard?.length ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-8">
                {exec.scorecard.map((s: any, i: number) => {
                  const trend = s.trend || "neutral";
                  const palette =
                    trend === "good"
                      ? "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900"
                      : trend === "warn"
                      ? "from-rose-50 to-rose-100 border-rose-200 text-rose-900"
                      : "from-white to-bg-muted border-border text-ink-900";
                  const icon = trend === "good" ? "▲" : trend === "warn" ? "▼" : "●";
                  const iconColor =
                    trend === "good" ? "text-emerald-600" : trend === "warn" ? "text-rose-600" : "text-fg-subtle";
                  return (
                    <div
                      key={i}
                      className={`rounded-md border bg-gradient-to-br ${palette} p-4 shadow-sm hover:shadow-md transition`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase tracking-[0.12em] opacity-70 font-semibold">{s.label}</div>
                        <span className={`text-[12px] ${iconColor}`}>{icon}</span>
                      </div>
                      <div className="mt-2 text-[18px] font-semibold leading-tight">{s.value}</div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Threats + Opportunities — side-by-side, color-coded with rank chips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            {exec.top_threats?.length ? (
              <div className="card p-6 border-rose-200 bg-gradient-to-br from-rose-50/60 to-white">
                <div className="flex items-center gap-2">
                  <span className="text-rose-600 text-lg">⚠</span>
                  <div className="eyebrow !text-rose-700">Top threats</div>
                </div>
                <ul className="mt-4 space-y-3">
                  {exec.top_threats.map((t: any, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 w-7 h-7 rounded-pill bg-rose-100 text-rose-700 text-[12px] font-semibold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-ink-900 text-[14px]">{t.competitor}</div>
                        <div className="text-fg-muted text-[13px] mt-0.5">{t.why}</div>
                        {t.example_copy && (
                          <div className="mt-1.5 text-[12px] italic text-rose-900/80 bg-white border border-rose-100 rounded-md px-2.5 py-1.5">
                            "{t.example_copy}"
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {exec.top_opportunities?.length ? (
              <div className="card p-6 border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 text-lg">↗</span>
                  <div className="eyebrow !text-emerald-700">Top opportunities</div>
                </div>
                <ul className="mt-4 space-y-3">
                  {exec.top_opportunities.map((t: any, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 w-7 h-7 rounded-pill bg-emerald-100 text-emerald-700 text-[12px] font-semibold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-ink-900 text-[14px]">{t.opportunity}</div>
                        <div className="text-fg-muted text-[13px] mt-0.5">{t.why}</div>
                        {t.sample_angle && (
                          <div className="mt-1.5 text-[12px] italic text-emerald-900/80 bg-white border border-emerald-100 rounded-md px-2.5 py-1.5">
                            "{t.sample_angle}"
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Action brief — bets with approve / reject */}
      {data.action_brief && (
        <section>
          <span className="eyebrow">Recommended bets · approve to ship</span>
          <h3 className="mt-3 text-[28px] md:text-[34px] font-semibold tracking-tight text-ink-900 leading-tight max-w-[820px]">
            {data.action_brief.headline}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-7">
            {(data.action_brief.bets || []).map((b: any, i: number) => {
              const id = b.id || `bet-${i + 1}`;
              const decision = decisions[id];
              return (
                <div
                  key={id}
                  className={`card p-6 hover:shadow-md transition relative ${
                    decision === "approved"
                      ? "ring-2 ring-currency-visionary"
                      : decision === "rejected"
                      ? "opacity-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="pill bg-accent-soft text-accent border-accent/20">Bet {i + 1}</span>
                    <span className="pill">
                      {b.channel === "both" ? "Meta + Google" : b.channel === "meta" ? "Meta" : "Google"}
                    </span>
                    {b.priority && (
                      <span
                        className={`pill ${
                          b.priority === "high"
                            ? "bg-currency-human/40 border-currency-human/60"
                            : b.priority === "medium"
                            ? "bg-currency-calm/40 border-currency-calm/60"
                            : "bg-bg-muted"
                        }`}
                      >
                        {b.priority} priority
                      </span>
                    )}
                    {b.effort && <span className="pill bg-bg-muted">{b.effort} effort</span>}
                  </div>
                  <div className="mt-3 text-[18px] font-semibold text-ink-900 leading-snug">{b.name}</div>
                  <p className="mt-2 text-[13px] text-fg-muted leading-relaxed">{b.concept}</p>
                  {b.copy_variants?.length ? (
                    <ul className="mt-3 space-y-1.5">
                      {b.copy_variants.map((c: string, j: number) => (
                        <li
                          key={j}
                          className="text-[13px] text-ink-900 bg-bg-muted rounded-md px-3 py-2 leading-snug"
                        >
                          "{c}"
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {b.visual && (
                    <div className="mt-3 text-[12px] text-fg-muted">
                      <b className="text-ink-900">Visual:</b> {b.visual}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {b.success_metric && (
                      <span className="pill bg-currency-visionary/40 border-currency-visionary/60">
                        📈 {b.success_metric}
                      </span>
                    )}
                    {b.risk && (
                      <span className="pill bg-currency-human/40 border-currency-human/60">⚠ {b.risk}</span>
                    )}
                  </div>

                  {/* Approve / Reject controls */}
                  {onDecide && (
                    <div className="mt-5 pt-4 border-t border-border-subtle flex items-center gap-2">
                      <button
                        onClick={() =>
                          onDecide(id, decision === "approved" ? null : "approved")
                        }
                        className={`flex-1 h-9 rounded-pill text-[13px] font-medium transition ${
                          decision === "approved"
                            ? "bg-currency-visionary text-ink-900 border border-currency-visionary"
                            : "bg-white border border-border hover:border-ink-900/30"
                        }`}
                      >
                        {decision === "approved" ? "✓ Approved" : "Approve"}
                      </button>
                      <button
                        onClick={() =>
                          onDecide(id, decision === "rejected" ? null : "rejected")
                        }
                        className={`flex-1 h-9 rounded-pill text-[13px] font-medium transition ${
                          decision === "rejected"
                            ? "bg-currency-human text-ink-900 border border-currency-human"
                            : "bg-white border border-border hover:border-ink-900/30"
                        }`}
                      >
                        {decision === "rejected" ? "✗ Rejected" : "Reject"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-7">
            {data.action_brief.quickwins?.length ? (
              <div className="card p-5 bg-currency-visionary/15">
                <div className="eyebrow">Quick wins this week</div>
                <ul className="mt-2 space-y-1.5 text-[14px] text-ink-900">
                  {data.action_brief.quickwins.map((q: string, i: number) => (
                    <li key={i} className="flex gap-2"><span className="text-accent">→</span><span>{q}</span></li>
                  ))}
                </ul>
              </div>
            ) : null}
            {data.action_brief.avoid?.length ? (
              <div className="card p-5 bg-currency-human/15">
                <div className="eyebrow">Anti-patterns — avoid</div>
                <ul className="mt-2 space-y-1.5 text-[14px] text-ink-900">
                  {data.action_brief.avoid.map((q: string, i: number) => (
                    <li key={i} className="flex gap-2"><span className="text-red-700">×</span><span>{q}</span></li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Connections */}
      {data.connections?.length ? (
        <section>
          <span className="eyebrow">Non-obvious connections</span>
          <h3 className="mt-3 text-[26px] md:text-[30px] font-semibold tracking-tight text-ink-900 leading-tight">
            Patterns across <i className="font-display font-light">multiple</i> competitors at once
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {data.connections.map((c: any, i: number) => (
              <div key={i} className="card p-6 relative">
                <div className="absolute top-6 right-6 text-[40px] font-display text-fg-disabled leading-none">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="text-[16px] font-semibold text-ink-900 pr-12 leading-snug">{c.connection}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(c.brands || []).map((b: string) => (
                    <span key={b} className="pill bg-accent-soft text-accent border-accent/20 text-[11px]">{b}</span>
                  ))}
                </div>
                <p className="mt-3 text-[13px] text-fg-muted leading-relaxed">{c.insight}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Whitespace */}
      {data.whitespace?.length ? (
        <section>
          <span className="eyebrow">Whitespace — angles nobody owns</span>
          <h3 className="mt-3 text-[26px] md:text-[30px] font-semibold tracking-tight text-ink-900 leading-tight">
            Where {data.brand} can plant a flag
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {data.whitespace.map((w: any, i: number) => (
              <div key={i} className="card p-6 bg-gradient-to-br from-currency-calm/20 to-white">
                <div className="text-[18px] font-semibold text-ink-900 leading-snug">{w.angle}</div>
                <p className="mt-2 text-[13px] text-fg-muted">{w.rationale}</p>
                {w.why_now && <p className="mt-2 text-[12px] text-accent"><b>Why now:</b> {w.why_now}</p>}
                {w.risk && <p className="mt-2 text-[12px] text-fg-subtle"><b>Risk:</b> {w.risk}</p>}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Shared themes */}
      {data.shared_themes?.length ? (
        <section>
          <span className="eyebrow">Shared themes — saturation map</span>
          <h3 className="mt-3 text-[26px] md:text-[30px] font-semibold tracking-tight text-ink-900 leading-tight">
            What everyone is saying
          </h3>
          <div className="card mt-6 divide-y divide-border-subtle">
            {data.shared_themes.map((t: any, i: number) => {
              const pct = Math.min(100, t.share_pct || 0);
              const hot = pct >= 60 ? "from-rose-500 to-rose-400" : pct >= 30 ? "from-amber-500 to-amber-400" : "from-emerald-500 to-emerald-400";
              const heat = pct >= 60 ? "Saturated" : pct >= 30 ? "Crowded" : "Open lane";
              const heatTone = pct >= 60 ? "text-rose-700" : pct >= 30 ? "text-amber-700" : "text-emerald-700";
              return (
              <div key={i} className="p-5 flex items-start gap-5">
                <div className="w-36 shrink-0">
                  <div className={`text-[11px] uppercase tracking-wider font-semibold ${heatTone}`}>{heat}</div>
                  <div className="mt-1 h-2.5 rounded-full bg-bg-muted overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${hot}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[12px] text-ink-900 font-semibold mt-1">{pct}% of brands</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-semibold text-ink-900">{t.theme}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(t.brands || []).map((b: string) => (
                      <span key={b} className="pill text-[11px]">{b}</span>
                    ))}
                  </div>
                  {t.example_hooks?.length ? (
                    <div className="mt-2 text-[13px] text-fg-muted italic">e.g. "{t.example_hooks[0]}"</div>
                  ) : null}
                </div>
              </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Pain point clusters */}
      {data.pain_point_clusters?.length ? (
        <section>
          <span className="eyebrow">Pain-point clusters</span>
          <h3 className="mt-3 text-[26px] md:text-[30px] font-semibold tracking-tight text-ink-900 leading-tight">
            What customers are being told they should worry about
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {data.pain_point_clusters.map((c: any, i: number) => (
              <div key={i} className="card p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[16px] font-semibold text-ink-900">{c.cluster}</div>
                  <span className="pill">Intensity {c.intensity}/100</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(c.brands || []).map((b: string) => <span key={b} className="pill text-[11px]">{b}</span>)}
                </div>
                {c.sample_copy?.length ? (
                  <ul className="mt-3 space-y-1.5">
                    {c.sample_copy.slice(0, 3).map((s: string, j: number) => (
                      <li key={j} className="text-[13px] text-fg-muted bg-bg-muted rounded-md px-3 py-1.5">"{s}"</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Format / funnel mix */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.format_mix?.length ? (
          <div className="card p-6">
            <span className="eyebrow">Format mix per brand</span>
            <div className="mt-4 space-y-3">
              {data.format_mix.map((f: any) => {
                const segs = [
                  { k: "UGC", v: f.ugc, c: "bg-violet-500" },
                  { k: "Founder", v: f.founder, c: "bg-amber-500" },
                  { k: "B/A", v: f.before_after, c: "bg-rose-500" },
                  { k: "Product", v: f.product, c: "bg-sky-500" },
                  { k: "Demo", v: f.demo, c: "bg-emerald-500" },
                  { k: "Review", v: f.testimonial, c: "bg-fuchsia-500" },
                ];
                return (
                  <div key={f.brand}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-medium text-ink-900">{f.brand}</span>
                    </div>
                    <div className="mt-1 flex h-3 rounded-pill overflow-hidden bg-bg-muted">
                      {segs.map((s) => (
                        <div
                          key={s.k}
                          title={`${s.k} ${s.v}%`}
                          className={`${s.c} transition-all`}
                          style={{ width: `${s.v}%` }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-fg-muted">
                {[
                  ["UGC", "bg-violet-500"],
                  ["Founder", "bg-amber-500"],
                  ["B/A", "bg-rose-500"],
                  ["Product", "bg-sky-500"],
                  ["Demo", "bg-emerald-500"],
                  ["Review", "bg-fuchsia-500"],
                ].map(([k, c]) => (
                  <span key={k} className="inline-flex items-center gap-1">
                    <span className={`inline-block w-2 h-2 rounded-pill ${c}`} />
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {data.funnel_split?.length ? (
          <div className="card p-6">
            <span className="eyebrow">Funnel split per brand</span>
            <div className="mt-4 space-y-2.5">
              {data.funnel_split.map((s: any) => (
                <div key={s.brand}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-ink-900">{s.brand}</span>
                    <span className="text-fg-subtle">{s.awareness}/{s.consideration}/{s.conversion}</span>
                  </div>
                  <div className="mt-1 flex h-2 rounded-pill overflow-hidden bg-bg-muted">
                    <div className="bg-currency-secure" style={{ width: `${s.awareness}%` }} />
                    <div className="bg-currency-calm" style={{ width: `${s.consideration}%` }} />
                    <div className="bg-currency-visionary" style={{ width: `${s.conversion}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex gap-3 mt-3 text-[11px] text-fg-muted">
                <span><span className="inline-block w-2 h-2 rounded-pill bg-currency-secure mr-1" />Awareness</span>
                <span><span className="inline-block w-2 h-2 rounded-pill bg-currency-calm mr-1" />Consideration</span>
                <span><span className="inline-block w-2 h-2 rounded-pill bg-currency-visionary mr-1" />Conversion</span>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Offer cadence + longevity */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.offer_cadence?.length ? (
          <div className="card p-6">
            <span className="eyebrow">Offer cadence — how discount-heavy each brand is</span>
            <div className="mt-4 space-y-3">
              {data.offer_cadence
                .slice()
                .sort((a: any, b: any) => (b.promo_share_pct || 0) - (a.promo_share_pct || 0))
                .map((o: any) => {
                  const pct = Math.min(100, o.promo_share_pct || 0);
                  const tone = pct >= 60 ? "bg-rose-500" : pct >= 30 ? "bg-amber-500" : "bg-emerald-500";
                  return (
                    <div key={o.brand}>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium text-ink-900">{o.brand}</span>
                        <span className="text-fg-muted">
                          {pct}% promotional · <span className="text-ink-900">{o.dominant_offer}</span>
                        </span>
                      </div>
                      <div className="mt-1 h-2.5 rounded-pill bg-bg-muted overflow-hidden">
                        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : null}
        {data.longevity?.length ? (
          <div className="card p-6">
            <span className="eyebrow">Longevity — what's actually working</span>
            <ul className="mt-4 space-y-3">
              {data.longevity.map((l: any) => (
                <li key={l.brand} className="text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink-900">{l.brand}</span>
                    <span className="pill">{l.long_runners_pct}% long-runners</span>
                  </div>
                  <p className="text-fg-muted mt-1">{l.takeaway}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* Positioning map */}
      {data.positioning_map?.length ? (
        <section>
          <span className="eyebrow">Positioning map</span>
          <h3 className="mt-3 text-[26px] md:text-[30px] font-semibold tracking-tight text-ink-900 leading-tight">
            Emotional ↔ Rational · Proof ↔ Aspirational
          </h3>
          <PositioningMap data={data.positioning_map} brand={data.brand} />
        </section>
      ) : null}
    </div>
  );
}

function PositioningMap({ data, brand }: { data: any[]; brand: string }) {
  const norm = (v: number) => Math.max(0, Math.min(100, ((v ?? 0) + 100) / 2));
  return (
    <div className="card mt-6 p-8">
      <div className="relative w-full aspect-[16/10] bg-bg-muted/40 rounded-md border border-border-subtle">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-wider text-fg-subtle">Aspirational</div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-wider text-fg-subtle">Proof</div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider text-fg-subtle [writing-mode:vertical-rl] rotate-180">Rational</div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider text-fg-subtle [writing-mode:vertical-rl] rotate-180">Emotional</div>

        {data.map((p: any) => {
          const x = norm(p.axis_emotional);
          const y = 100 - norm(p.axis_proof);
          const isBrand = p.brand?.toLowerCase() === brand?.toLowerCase();
          return (
            <div
              key={p.brand}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div
                className={`w-3 h-3 rounded-pill ${
                  isBrand ? "bg-accent ring-4 ring-accent-soft" : "bg-ink-900"
                } shadow-md transition-transform group-hover:scale-150`}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium text-ink-900 bg-white border border-border-subtle px-2 py-0.5 rounded-pill shadow-sm">
                {p.brand}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
