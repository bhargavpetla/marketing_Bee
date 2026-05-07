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
  console.log(`actor=${slug}`);
  try {
    const run = await client.actor(slug).call(input, { waitSecs: 240 });
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 5 });
    console.log(`items=${items.length}`);
    for (const [i, it] of items.entries()) {
      const summary = {
        pageName: it.pageName || it.advertiserName || it.snapshot?.page_name,
        pageURL: it.pageURL || it.advertiserUrl,
        body: (it.snapshot?.body?.text || it.adCreativeBodies?.[0] || "").slice(0, 80),
      };
      console.log(`  [${i}] ${JSON.stringify(summary)}`);
    }
  } catch (e) {
    console.log(`ERROR: ${e?.message || e}`);
  }
}

const pageUrl = "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IN&q=Foxtale&search_type=page&media_type=all";
const keywordUrl = "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IN&q=Foxtale&search_type=keyword_unordered&media_type=all";

await probe("curious_coder urls=page", "curious_coder/facebook-ads-library-scraper", {
  urls: [{ url: pageUrl }],
  count: 5,
});

await probe("curious_coder urls=keyword", "curious_coder/facebook-ads-library-scraper", {
  urls: [{ url: keywordUrl }],
  count: 5,
});

// Try by direct FB Page URL — find Foxtale Skincare's page
await probe("curious_coder by page-id URL", "curious_coder/facebook-ads-library-scraper", {
  urls: [{ url: "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IN&view_all_page_id=104287558543928&search_type=page&media_type=all" }],
  count: 5,
});
