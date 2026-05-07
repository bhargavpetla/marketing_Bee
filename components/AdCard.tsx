"use client";

import { useState } from "react";

type Ad = {
  id: string;
  competitorName: string;
  channel: "meta" | "google";
  pageName?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  isActive?: number | null;
  imageUrls: string[];
  videoUrls: string[];
  embedUrls?: string[];
  body?: string | null;
  title?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  format?: string | null;
};

const channelStyle: Record<string, string> = {
  meta: "bg-currency-secure/40 border-currency-secure/60 text-info-fg",
  google: "bg-currency-intelligent/40 border-currency-intelligent/60",
};

export default function AdCard({ ad }: { ad: Ad }) {
  const [open, setOpen] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [allFailed, setAllFailed] = useState(false);
  const imgs = (ad.imageUrls || []).filter(Boolean);
  // Local /scraped/... paths serve as-is. External URLs go through our /api/img
  // proxy so hotlink-blocked CDNs (FB, Google) actually render.
  const proxied = (u: string) => (u.startsWith("/") ? u : `/api/img?url=${encodeURIComponent(u)}`);
  const img = !allFailed && imgs[imgIdx] ? proxied(imgs[imgIdx]) : undefined;
  const vid = ad.videoUrls?.[0] ? (ad.videoUrls[0].startsWith("/") ? ad.videoUrls[0] : proxied(ad.videoUrls[0])) : undefined;
  const embed = !img && !vid ? ad.embedUrls?.[0] : undefined;
  return (
    <div className="card overflow-hidden flex flex-col hover:shadow-md transition">
      <div className="relative aspect-[4/5] bg-bg-sunken">
        {vid ? (
          <video src={vid} controls poster={img} className="w-full h-full object-cover" />
        ) : img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => {
              if (imgIdx + 1 < imgs.length) setImgIdx(imgIdx + 1);
              else setAllFailed(true);
            }}
          />
        ) : embed && ad.ctaUrl ? (
          // Google video ads return a JSONP previewUrl that can't be iframed directly.
          // Show a styled card with click-through to the Google Ads Transparency listing.
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-ink-900 via-slate-800 to-accent text-white gap-3 hover:opacity-90 transition"
          >
            <div className="w-14 h-14 rounded-pill bg-white/10 backdrop-blur flex items-center justify-center text-2xl">▶</div>
            <div className="text-[13px] font-semibold">Video ad</div>
            <div className="text-[11px] opacity-70 underline">Open on Google →</div>
          </a>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-subtle text-sm">no creative</div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={`pill ${channelStyle[ad.channel] || ""}`}>
            {ad.channel === "meta" ? "Meta" : "Google"}
          </span>
          {ad.format && ad.format !== "unknown" && (
            <span className="pill bg-white/90">{ad.format}</span>
          )}
          {ad.isActive ? <span className="pill bg-currency-visionary border-currency-visionary/60">Running</span> : null}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2">
        <div className="text-[11px] uppercase tracking-[0.12em] text-fg-subtle">{ad.pageName || ad.competitorName}</div>
        {ad.title && <div className="text-[15px] font-semibold text-ink-900 leading-snug line-clamp-2">{ad.title}</div>}
        {ad.body && (
          <div className={`text-[13px] text-fg-muted leading-relaxed ${open ? "" : "line-clamp-3"}`}>{ad.body}</div>
        )}
        {ad.body && ad.body.length > 160 && (
          <button onClick={() => setOpen(!open)} className="text-[12px] text-accent self-start">
            {open ? "Show less" : "Read more"}
          </button>
        )}

        {ad.ctaText && (
          <div className="mt-1">
            <span className="pill border-ink-900/10 bg-ink-900/5">{ad.ctaText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
