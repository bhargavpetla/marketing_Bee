// Live probe: hit both Meta and Google actors with multiple input shapes,
// for known-real brands, and dump exactly what comes back so we can see
// whether the actor is the issue or our normalization is the issue.
import { ApifyClient } from "apify-client";
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const TOKEN = process.env.APIFY_TOKEN;
const META_ACTOR = process.env.APIFY_ACTOR_META || "leadsbrary/meta-ads-library-scraper";
const GOOGLE_ACTOR = process.env.APIFY_ACTOR_GOOGLE || "solidcode/ads-transparency-scraper";
const client = new ApifyClient({ token: TOKEN });

async function probe(name, slug, input, limit = 5) {
  console.log(`\n--- ${name} ---`);
  console.log(`actor=${slug}`);
  console.log(`input=${JSON.stringify(input)}`);
  try {
    const run = await client.actor(slug).call(input, { waitSecs: 240 });
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit });
    console.log(`run=${run.id} items=${items.length}`);
    for (const [i, it] of items.entries()) {
      const summary = {
        pageName: it.pageName || it.advertiserName || it.snapshot?.page_name,
        pageURL: it.pageURL || it.advertiserUrl,
        adFormat: it.adFormat,
        body: (it.snapshot?.body?.text || it.snapshot?.body?.markup?.text || it.adCreativeBodies?.[0] || "").slice(0, 100),
        title: it.snapshot?.title || it.adCreativeLinkTitles?.[0] || it.title,
        creativeId: it.creativeId,
      };
      console.log(`  [${i}] ${JSON.stringify(summary)}`);
    }
  } catch (e) {
    console.log(`ERROR: ${e?.message || e}`);
  }
}

// ===== META =====
const metaUrl = (q, search_type, country = "IN") =>
  `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${country}&q=${encodeURIComponent(q)}&search_type=${search_type}&media_type=all`;

await probe("META Foxtale keyword_unordered IN", META_ACTOR, {
  startUrls: [{ url: metaUrl("Foxtale", "keyword_unordered") }],
  resultsLimit: 5,
  proxyConfiguration: { useApifyProxy: true },
});

await probe("META Foxtale page IN", META_ACTOR, {
  startUrls: [{ url: metaUrl("Foxtale", "page") }],
  resultsLimit: 5,
  proxyConfiguration: { useApifyProxy: true },
});

await probe("META Foxtale keyword_unordered (no country)", META_ACTOR, {
  startUrls: [{ url: metaUrl("Foxtale", "keyword_unordered", "ALL") }],
  resultsLimit: 5,
  proxyConfiguration: { useApifyProxy: true },
});

// ===== GOOGLE =====
await probe("GOOGLE advertiserId Foxtale", GOOGLE_ACTOR, {
  searchQuery: "AR00489837309257056257",
  maxResults: 3,
  region: "IN",
});

await probe("GOOGLE domain foxtale.in", GOOGLE_ACTOR, {
  searchQuery: "foxtale.in",
  maxResults: 3,
  region: "IN",
});

await probe("GOOGLE keyword Foxtale", GOOGLE_ACTOR, {
  searchQuery: "Foxtale",
  maxResults: 3,
  region: "IN",
});

await probe("GOOGLE keyword Minimalist", GOOGLE_ACTOR, {
  searchQuery: "Minimalist",
  maxResults: 3,
  region: "IN",
});

await probe("GOOGLE domain beminimalist.com", GOOGLE_ACTOR, {
  searchQuery: "beminimalist.com",
  maxResults: 3,
  region: "IN",
});
