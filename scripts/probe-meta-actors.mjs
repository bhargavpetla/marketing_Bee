// Probe alternative Meta actors to find one that supports brand-page search.
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
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

async function probe(label, slug, input) {
  console.log(`\n=== ${label} ===`);
  console.log(`actor=${slug}\ninput=${JSON.stringify(input)}`);
  try {
    const run = await client.actor(slug).call(input, { waitSecs: 240 });
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 5 });
    console.log(`run=${run.id} items=${items.length}`);
    for (const [i, it] of items.entries()) {
      console.log(`  [${i}] pageName="${it.pageName || it.advertiserName || it.snapshot?.page_name}" pageURL="${it.pageURL || it.advertiserUrl || ""}"`);
    }
  } catch (e) {
    console.log(`ERROR: ${e?.message || e}`);
  }
}

// Try several known Meta Ad Library actors with various input shapes
const url = "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IN&q=Foxtale&search_type=page&media_type=all";

await probe("apify/facebook-ads-library-scraper urls", "apify/facebook-ads-library-scraper", {
  urls: [{ url }],
  count: 5,
});
await probe("apify/facebook-ads-library-scraper startUrls", "apify/facebook-ads-library-scraper", {
  startUrls: [{ url }],
  resultsLimit: 5,
});
await probe("curious_coder/facebook-ads-library-scraper", "curious_coder/facebook-ads-library-scraper", {
  startUrls: [{ url }],
  resultsLimit: 5,
});
await probe("apify/facebook-ad-library-scraper", "apify/facebook-ad-library-scraper", {
  startUrls: [{ url }],
  count: 5,
});

// Also try by FB Page URL directly — Foxtale Skincare's actual FB page is facebook.com/foxtaleskincare
await probe("leadsbrary by page URL", process.env.APIFY_ACTOR_META || "leadsbrary/meta-ads-library-scraper", {
  startUrls: [{ url: "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IN&q=foxtaleskincare&search_type=keyword_unordered" }],
  resultsLimit: 5,
  proxyConfiguration: { useApifyProxy: true },
});
