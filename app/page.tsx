import Header from "@/components/Header";
import StartFlow from "@/components/StartFlow";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative bg-grid">
        <div className="max-w-[1280px] mx-auto px-6 pt-20 md:pt-28 pb-16 md:pb-24">
          <span className="eyebrow">For Confira Labs · Pink Foundry</span>
          <h1 className="h-display mt-4 max-w-[920px]">
            See every ad your competitors are running.{" "}
            <span className="shimmer-text">Then make sharper ones.</span>
          </h1>
          <p className="mt-6 text-[18px] text-fg-muted max-w-[640px] leading-relaxed">
            Pink Foundry Radar discovers your real competitors,
            scrapes their live Meta &amp; Google ads, and surfaces the connections —
            shared hooks, oversaturated angles, untouched whitespace —
            that your next sprint should bet on.
          </p>

          {/* Channel chips */}
          <div id="channels" className="mt-8 flex flex-wrap items-center gap-2">
            {[
              { name: "Meta Ad Library", on: true },
              { name: "Google Ads Transparency", on: true },
              { name: "LinkedIn", on: false },
              { name: "TikTok", on: false },
            ].map((c) => (
              <span key={c.name} className={`pill ${c.on ? "border-accent/30 bg-accent-soft text-accent" : "opacity-60"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${c.on ? "bg-accent" : "bg-fg-disabled"}`} /> {c.name}
                {!c.on && <span className="text-[10px] uppercase tracking-wider ml-1">soon</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Start flow */}
      <section className="max-w-[1280px] mx-auto px-6 -mt-6">
        <StartFlow defaultBrand="Pink Foundry" />
      </section>

      {/* How it works */}
      <section id="how" className="max-w-[1280px] mx-auto px-6 mt-24 mb-20">
        <span className="eyebrow">How it connects the dots</span>
        <h2 className="text-[36px] md:text-[44px] font-semibold tracking-tight text-ink-900 mt-3 max-w-[820px] leading-[1.1]">
          Per-ad insights are useful. The patterns <i className="font-display font-light">across</i> them are where the bets live.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
          {[
            {
              n: "01",
              t: "Discover the real set",
              d: "We rank 8–10 brands by audience, price band and ad-spend signal. Override anything you want.",
              c: "bg-currency-calm",
            },
            {
              n: "02",
              t: "Scrape every live creative",
              d: "Apify pulls Meta Ad Library + Google Ads Transparency at India scale. Images, copy, CTAs, run-dates — saved locally.",
              c: "bg-currency-visionary",
            },
            {
              n: "03",
              t: "Read the connections",
              d: "We extract hook, problem, promise, format and audience for every ad — then synthesize cross-brand patterns and 5 prioritized bets.",
              c: "bg-currency-human",
            },
          ].map((s) => (
            <div key={s.n} className="card p-7 hover:shadow-md transition">
              <div className={`w-10 h-10 rounded-pill ${s.c} mb-5`} />
              <div className="text-[12px] tracking-[0.12em] uppercase text-fg-subtle">{s.n}</div>
              <div className="mt-2 text-[20px] font-semibold text-ink-900">{s.t}</div>
              <p className="mt-2 text-[14px] text-fg-muted leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section id="brief" className="bg-bg-muted">
        <div className="max-w-[1280px] mx-auto px-6 py-20">
          <span className="eyebrow">What lands in your inbox</span>
          <h2 className="text-[32px] md:text-[40px] font-semibold tracking-tight text-ink-900 mt-3 max-w-[820px] leading-[1.1]">
            A connected map, not a 40-tab spreadsheet.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
            {[
              ["Positioning map", "Every competitor plotted on emotional ↔ rational and proof ↔ aspirational axes."],
              ["Pain-point clusters", "What problems 3+ brands all agitate on — and which ones nobody is touching."],
              ["Format & funnel mix", "UGC vs founder vs before/after, and how it splits across awareness → conversion."],
              ["Offer cadence", "How often each brand discounts, and what their dominant offer looks like."],
              ["Longevity signals", "Which ads are still running after 30/60/90 days — i.e. what's actually working."],
              ["5 prioritized bets", "Concrete concepts with copy, visual, channel and a measurable success metric."],
            ].map(([t, d]) => (
              <div key={t} className="card p-6">
                <div className="text-[18px] font-semibold text-ink-900">{t}</div>
                <p className="text-[14px] text-fg-muted mt-1.5 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="max-w-[1280px] mx-auto px-6 py-12 text-[13px] text-fg-muted flex items-center justify-between">
        <span>Built for Confira Labs · An NSOffice.AI product</span>
        <span className="font-product">v0.1 — MVP</span>
      </footer>
    </main>
  );
}
