export type Competitor = {
  name: string;
  domain?: string | null;
  rationale: string;
  overlap: number; // 0..100
  source?: "ai" | "user";
};

export type ScrapedAd = {
  id: string;
  competitorName: string;
  channel: "meta" | "google";
  adArchiveId?: string | null;
  pageName?: string | null;
  pageUrl?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  isActive?: boolean | null;
  imageUrls: string[]; // local /public/scraped paths or remote URLs
  videoUrls: string[];
  embedUrls?: string[]; // HTML/JS preview URLs (Google video ads) — render in iframe
  body?: string | null;
  title?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  format?: "image" | "video" | "carousel" | "unknown";
  raw?: any;
};

export type AdInsight = {
  adId: string;
  hook: string;
  problem: string;
  promise: string;
  audienceSignals: string[];
  funnelStage: "awareness" | "consideration" | "conversion";
  emotionalTriggers: string[];
  offerType: string | null; // discount, bundle, BOGO, free-trial, none
  format: string; // UGC, founder, before/after, product-shot, demo, testimonial...
  themes: string[];
  why_it_works: string;
};

export type CrossAnalysis = {
  brand: string;
  competitors: string[];
  shared_themes: { theme: string; brands: string[]; share_pct: number; example_hooks: string[] }[];
  positioning_map: { brand: string; axis_emotional: number; axis_proof: number; note: string }[];
  pain_point_clusters: { cluster: string; brands: string[]; intensity: number; sample_copy: string[] }[];
  format_mix: { brand: string; ugc: number; founder: number; before_after: number; product: number; demo: number; testimonial: number }[];
  funnel_split: { brand: string; awareness: number; consideration: number; conversion: number }[];
  offer_cadence: { brand: string; promo_share_pct: number; dominant_offer: string }[];
  longevity: { brand: string; long_runners_pct: number; takeaway: string }[];
  whitespace: { angle: string; rationale: string; why_now: string; risk: string }[];
  connections: { connection: string; brands: string[]; insight: string }[];
  action_brief: {
    headline: string;
    bets: { name: string; concept: string; copy_variants: string[]; visual: string; channel: "meta" | "google" | "both"; risk: string; success_metric: string }[];
    avoid: string[];
    quickwins: string[];
  };
};

export type RunStatus =
  | "created"
  | "discovering"
  | "awaiting_competitors"
  | "scraping"
  | "analyzing"
  | "complete"
  | "error";

export type RunRow = {
  id: string;
  brand: string;
  brand_domain: string | null;
  status: RunStatus;
  status_msg: string | null;
  competitors_json: string;   // Competitor[]
  cross_json: string | null;  // CrossAnalysis
  error: string | null;
  created_at: number;
  updated_at: number;
};
