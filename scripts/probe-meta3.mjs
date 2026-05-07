import { ApifyClient } from "apify-client";
import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

async function probe(label, slug, input) {
  console.log(`\n=== ${label} ===`);
  try {
    const run = await client.actor(slug).call(input, { waitSecs: 240 });
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 5 });
    console.log(`items=${items.length}`);
    for (const [i, it] of items.entries()) {
      const summary = {
        pageName: it.pageName || it.advertiser_name || it.snapshot?.page_name || it.advertiserName,
        pageURL: it.pageURL || it.pageUrl || it.advertiser_url,
        body: (it.body?.text || it.adCreativeBodies?.[0] || it.snapshot?.body?.text || "").slice(0, 80),
      };
      console.log(`  [${i}] ${JSON.stringify(summary)}`);
    }
  } catch (e) {
    console.log(`ERROR: ${e?.message || e}`);
  }
}

// 1. apify/facebook-ads-scraper — official. Likely supports keyword + page URL.
await probe("apify/facebook-ads-scraper keyword Foxtale", "apify/facebook-ads-scraper", {
  searchType: "keyword",
  keyword: "Foxtale",
  countryCode: "IN",
  count: 5,
});
await probe("apify/facebook-ads-scraper urls", "apify/facebook-ads-scraper", {
  startUrls: [{ url: "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IN&q=Foxtale&search_type=page" }],
  count: 5,
});

// 2. prodiger/facebook-ads-library-scraper-v2 — page handle support
await probe("prodiger v2 page-handle foxtale", "prodiger/facebook-ads-library-scraper-v2", {
  pageHandle: "foxtale",
  country: "IN",
  resultsLimit: 5,
});
await probe("prodiger v2 keyword foxtale", "prodiger/facebook-ads-library-scraper-v2", {
  keyword: "Foxtale",
  country: "IN",
  resultsLimit: 5,
});

// 3. corent1robert by Page URL
await probe("corent1robert by Page URL", "corent1robert/facebook-ads-library-scraper", {
  pageUrls: ["https://www.facebook.com/foxtaleskincare"],
  count: 5,
});
