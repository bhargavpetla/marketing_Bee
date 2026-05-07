import { ApifyClient } from "apify-client";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import type { ScrapedAd } from "./types";

let _client: ApifyClient | null = null;
function client() {
  if (!_client) {
    if (!process.env.APIFY_TOKEN) throw new Error("APIFY_TOKEN missing — set it in .env.local");
    _client = new ApifyClient({ token: process.env.APIFY_TOKEN });
  }
  return _client;
}

const META_ACTOR = process.env.APIFY_ACTOR_META || "apify/facebook-ads-scraper";
const GOOGLE_ACTOR = process.env.APIFY_ACTOR_GOOGLE || "apify/google-ads-transparency-scraper";

// SCRAPED_DIR is what we WRITE to (can be a mounted disk on Render via SCRAPED_DIR env).
// SCRAPED_PUBLIC_PATH is what the browser uses to FETCH it. Defaults to /scraped served
// from /public, but on a mounted-disk setup SCRAPED_DIR may live outside /public — in
// that case the /api/local-img route reads from disk instead.
const SCRAPED_DIR = process.env.SCRAPED_DIR || path.join(process.cwd(), "public", "scraped");
const SCRAPED_PUBLIC_PATH = process.env.SCRAPED_PUBLIC_PATH || "/scraped";
if (!fs.existsSync(SCRAPED_DIR)) fs.mkdirSync(SCRAPED_DIR, { recursive: true });

/**
 * Download a remote asset to /public/scraped/<sub>/<hash>.<ext>.
 * Returns the local /scraped/... path on success, or null on failure.
 * Falls back to direct CDN URL handling at the call site (we keep raw URLs too).
 */
async function downloadToPublic(url: string, subdir: string): Promise<string | null> {
  if (!url || !/^https?:/i.test(url)) return null;
  try {
    const dir = path.join(SCRAPED_DIR, subdir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
    const ext = (() => {
      const m = url.split("?")[0].match(/\.(jpg|jpeg|png|webp|gif|mp4|webm)$/i);
      return m ? m[1].toLowerCase() : "jpg";
    })();
    const file = `${hash}.${ext}`;
    const full = path.join(dir, file);
    if (fs.existsSync(full) && fs.statSync(full).size > 1024) return `/scraped/${subdir}/${file}`;
    const referer = (() => {
      try {
        const h = new URL(url).hostname;
        if (/fbcdn\.net$|facebook\.com$|fbsbx\.com$/i.test(h)) return "https://www.facebook.com/";
        if (/googlesyndication\.com$|googleusercontent\.com$|gstatic\.com$|google\.com$/i.test(h))
          return "https://adstransparency.google.com/";
        return null;
      } catch {
        return null;
      }
    })();
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        ...(referer ? { Referer: referer } : {}),
      },
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength < 512) return null;
    fs.writeFileSync(full, Buffer.from(ab));
    return `${SCRAPED_PUBLIC_PATH}/${subdir}/${file}`;
  } catch {
    return null;
  }
}

function pickAdId(item: any): string {
  return (
    item.adArchiveID ||
    item.adArchiveId ||
    item.ad_archive_id ||
    item.id ||
    item.adId ||
    item.creativeId ||
    crypto.randomBytes(8).toString("hex")
  );
}

function asArr<T>(x: T | T[] | undefined | null): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function normalizeMeta(item: any, competitor: string): Omit<ScrapedAd, "imageUrls" | "videoUrls"> & {
  rawImages: string[];
  rawVideos: string[];
} {
  const snap = item.snapshot || item.snapshot_data || {};
  const cards = asArr(snap.cards);
  const body =
    snap.body?.text ||
    snap.body?.markup?.text ||
    item.adCreativeBodies?.[0] ||
    cards[0]?.body ||
    item.body ||
    null;
  const title = snap.title || cards[0]?.title || item.adCreativeLinkTitles?.[0] || null;
  const ctaText = snap.cta_text || cards[0]?.cta_text || item.callToActionType || null;
  const ctaUrl = snap.link_url || cards[0]?.link_url || item.adCreativeLinkCaptions?.[0] || null;

  const rawImages: string[] = [];
  const rawVideos: string[] = [];
  for (const c of [snap, ...cards]) {
    if (c.original_image_url) rawImages.push(c.original_image_url);
    if (c.resized_image_url) rawImages.push(c.resized_image_url);
    if (c.image_url) rawImages.push(c.image_url);
    if (c.video_hd_url) rawVideos.push(c.video_hd_url);
    if (c.video_sd_url) rawVideos.push(c.video_sd_url);
    if (c.video_preview_image_url) rawImages.push(c.video_preview_image_url);
  }
  for (const v of asArr(item.images)) {
    if (typeof v === "string") rawImages.push(v);
    else if (v?.url) rawImages.push(v.url);
    else if (v?.original_image_url) rawImages.push(v.original_image_url);
  }
  for (const v of asArr(item.videos)) {
    if (typeof v === "string") rawVideos.push(v);
    else if (v?.video_hd_url) rawVideos.push(v.video_hd_url);
    else if (v?.url) rawVideos.push(v.url);
  }

  const fmt: ScrapedAd["format"] = rawVideos.length
    ? "video"
    : cards.length > 1
    ? "carousel"
    : rawImages.length
    ? "image"
    : "unknown";

  return {
    id: pickAdId(item),
    competitorName: competitor,
    channel: "meta",
    adArchiveId: pickAdId(item),
    pageName: snap.page_name || item.pageName || competitor,
    pageUrl: snap.page_profile_uri || item.pageUrl || null,
    startedAt: item.startDate || item.start_date || snap.start_date || null,
    endedAt: item.endDate || item.end_date || snap.end_date || null,
    isActive: item.isActive ?? item.is_active ?? null,
    body,
    title,
    ctaText,
    ctaUrl,
    format: fmt,
    raw: item,
    rawImages,
    rawVideos,
  };
}

function normalizeGoogle(item: any, competitor: string): Omit<ScrapedAd, "imageUrls" | "videoUrls"> & {
  rawImages: string[];
  rawVideos: string[];
  rawEmbeds: string[];
} {
  const rawImages: string[] = [];
  const rawVideos: string[] = [];
  const rawEmbeds: string[] = [];

  // Documented schema: imageUrl (image/text ads), previewUrl (video ads), adFormat: "image"|"text"|"video".
  if (typeof item.imageUrl === "string" && item.imageUrl) rawImages.push(item.imageUrl);
  if (typeof item.previewUrl === "string" && item.previewUrl) {
    // previewUrl is Google's iframe-embeddable ad preview (HTML/JS), not a direct video.
    if ((item.adFormat || "").toLowerCase() === "video") rawEmbeds.push(item.previewUrl);
    else rawImages.push(item.previewUrl);
  }

  // Fallbacks for sibling actors that name fields differently.
  for (const k of ["image_url", "thumbnail", "previewImage", "preview_image", "creativeUrl"]) {
    if (item[k] && typeof item[k] === "string") rawImages.push(item[k]);
  }
  for (const k of ["videoUrl", "video_url"]) {
    if (item[k] && typeof item[k] === "string") rawVideos.push(item[k]);
  }
  for (const i of asArr(item.images)) rawImages.push(typeof i === "string" ? i : i?.url || i?.src || "");
  for (const v of asArr(item.videos)) rawVideos.push(typeof v === "string" ? v : v?.url || v?.src || "");
  for (const node of [item.creative, item.media, item.snapshot]) {
    if (!node || typeof node !== "object") continue;
    if (node.imageUrl) rawImages.push(node.imageUrl);
    if (node.videoUrl) rawVideos.push(node.videoUrl);
    for (const im of asArr(node.images)) rawImages.push(typeof im === "string" ? im : im?.url || "");
  }

  const id = item.creativeId || item.id || item.adId || crypto.randomBytes(8).toString("hex");
  const fmtField = (item.adFormat || "").toString().toLowerCase();
  const format: ScrapedAd["format"] =
    fmtField === "video" || rawVideos.filter(Boolean).length
      ? "video"
      : fmtField === "image" || fmtField === "text" || rawImages.filter(Boolean).length
      ? "image"
      : "unknown";

  return {
    id,
    competitorName: competitor,
    channel: "google",
    adArchiveId: id,
    pageName: item.advertiserName || item.advertiser || competitor,
    pageUrl:
      item.adUrl ||
      (item.advertiserId ? `https://adstransparency.google.com/advertiser/${item.advertiserId}` : null),
    startedAt: item.firstShown || item.startDate || item.first_shown || null,
    endedAt: item.lastShown || item.endDate || item.last_shown || null,
    isActive: null,
    body: item.body || item.text || item.description || item.adText || null,
    title: item.title || item.headline || item.advertiserName || null,
    ctaText: item.callToAction || item.cta || (fmtField ? `${fmtField} ad` : null),
    ctaUrl: item.adUrl || item.destinationUrl || item.url || item.landingUrl || null,
    format,
    raw: item,
    rawImages: rawImages.filter(Boolean),
    rawVideos: rawVideos.filter(Boolean),
    rawEmbeds: rawEmbeds.filter(Boolean),
  };
}

type Logger = (level: "info" | "warn" | "error", msg: string) => void;

export async function scrapeMeta(
  competitor: string,
  opts?: {
    country?: string;
    max?: number;
    log?: Logger;
    dateFrom?: string;
    dateTo?: string;
    formats?: ("image" | "video" | "text")[];
  },
): Promise<ScrapedAd[]> {
  const country = opts?.country || "IN";
  const max = opts?.max ?? 25;
  const formats = opts?.formats || ["image", "video", "text"];

  // FB Ad Library only accepts one media_type value; collapse to the most-specific.
  const mediaType =
    formats.length === 1 && formats[0] === "image"
      ? "image"
      : formats.length === 1 && formats[0] === "video"
      ? "video"
      : "all";
  const params = new URLSearchParams({
    active_status: "all",
    ad_type: "all",
    country,
    q: competitor,
    search_type: "keyword_unordered",
    media_type: mediaType,
  });
  if (opts?.dateFrom) params.set("start_date[min]", opts.dateFrom);
  if (opts?.dateTo) params.set("start_date[max]", opts.dateTo);
  const searchUrl = `https://www.facebook.com/ads/library/?${params.toString()}`;

  const run = await client().actor(META_ACTOR).call(
    {
      startUrls: [{ url: searchUrl }],
      resultsLimit: max * 2, // ask for more so the brand-match filter still leaves us enough
      proxyConfiguration: { useApifyProxy: true },
    } as any,
    { waitSecs: 300 },
  );
  const { items } = await client().dataset(run.defaultDatasetId).listItems({ limit: max * 2 });

  // Keyword-search results can include unrelated advertisers whose copy mentions
  // the brand. Keep only ads whose pageName plausibly matches the competitor.
  const target = brandTokens(competitor);
  const filtered = items.filter((it: any) => {
    const page = (it.pageName || it.snapshot?.page_name || "").toString();
    return matchesBrand(page, target);
  });
  if (opts?.log) {
    if (items.length === 0) {
      opts.log("warn", `Meta actor ${META_ACTOR} returned 0 items for ${competitor}; apify run=${run.id}`);
    } else {
      opts.log(
        "info",
        `Meta actor returned ${items.length} raw items, ${filtered.length} matched ${competitor}; keys=${Object.keys(items[0] as object).slice(0, 8).join(",")}`,
      );
    }
  }
  return finalizeAds(filtered.slice(0, max), competitor, "meta", normalizeMeta);
}

function brandTokens(brand: string): Set<string> {
  return new Set(
    brand
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3),
  );
}
function matchesBrand(pageName: string, brandTokenSet: Set<string>): boolean {
  if (!pageName) return false;
  const tokens = pageName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
  // Match if any 3+ char brand token appears in the page name. Accepts "Foxtale Skincare", "DotandKey", etc.
  for (const t of brandTokenSet) {
    if (tokens.some((p) => p === t || p.includes(t) || t.includes(p))) return true;
  }
  return false;
}

export async function scrapeGoogle(
  competitor: string,
  opts?: {
    region?: string;
    max?: number;
    log?: Logger;
    domain?: string | null;
    dateFrom?: string;
    dateTo?: string;
    formats?: ("image" | "video" | "text")[];
  },
): Promise<ScrapedAd[]> {
  const region = opts?.region || "IN";
  const max = opts?.max ?? 25;
  const formats = opts?.formats || ["image", "video", "text"];

  // Schema for the Google Ads Transparency Center actor (auto-detects keyword/domain/advertiserId).
  // Prefer searching by domain when we know it — yields exact-advertiser matches.
  const searchQuery = opts?.domain && opts.domain.includes(".") ? opts.domain : competitor;
  const input: any = {
    searchQuery,
    maxResults: max,
    region,
  };
  if (opts?.dateFrom) input.dateFrom = opts.dateFrom;
  if (opts?.dateTo) input.dateTo = opts.dateTo;

  const run = await client().actor(GOOGLE_ACTOR).call(input, { waitSecs: 300 });
  const { items: rawItems } = await client().dataset(run.defaultDatasetId).listItems({ limit: max });
  // Filter by format client-side — actor doesn't accept a format param.
  const items = rawItems.filter((it: any) =>
    formats.includes(((it.adFormat || "image") as string).toLowerCase() as any),
  );

  // Diagnostic surface — if the actor ran but produced 0 items, capture the run id so we can
  // open it on Apify and inspect the input schema. If items returned but normalize zeroes them,
  // we want to see the first item's top-level keys.
  if (opts?.log) {
    if (items.length === 0) {
      opts.log(
        "warn",
        `Google actor ${GOOGLE_ACTOR} returned 0 items for ${competitor}; apify run=${run.id} (open it on apify.com to see what input shape it expected)`,
      );
    } else {
      const sample = items[0] as Record<string, unknown>;
      const keys = Object.keys(sample).slice(0, 12).join(",");
      opts.log("info", `Google actor returned ${items.length} raw items; keys=${keys}`);
    }
  }
  return finalizeAds(items, competitor, "google", normalizeGoogle);
}

async function finalizeAds(
  items: any[],
  competitor: string,
  channel: "meta" | "google",
  normalize: (item: any, competitor: string) => any,
): Promise<ScrapedAd[]> {
  void channel;
  const sub = `${slug(competitor)}-${channel}`;
  const out: ScrapedAd[] = [];
  for (const item of items) {
    const n = normalize(item, competitor);
    const rawImages: string[] = (n.rawImages || []).filter((x: unknown): x is string => typeof x === "string");
    const rawVideos: string[] = (n.rawVideos || []).filter((x: unknown): x is string => typeof x === "string");
    const imageUrls: string[] = [];
    for (const u of unique(rawImages).slice(0, 4)) {
      const local = await downloadToPublic(u, sub);
      // Fallback: if local cache failed, surface the raw CDN URL so the card isn't blank.
      imageUrls.push(local || u);
    }
    const videoUrls: string[] = [];
    for (const u of unique(rawVideos).slice(0, 1)) {
      const local = await downloadToPublic(u, sub);
      videoUrls.push(local || u);
    }
    const rawEmbeds: string[] = (n.rawEmbeds || []).filter((x: unknown): x is string => typeof x === "string");
    const embedUrls = unique(rawEmbeds).slice(0, 1);
    out.push({ ...n, imageUrls, videoUrls, embedUrls });
  }
  return out;
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function unique<T>(a: T[]): T[] {
  return Array.from(new Set(a));
}
