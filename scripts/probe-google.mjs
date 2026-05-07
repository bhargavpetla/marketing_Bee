// Tries multiple search shapes against the configured actor — find one that yields ads.
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
const slug = process.env.APIFY_ACTOR_GOOGLE || "solidcode/ads-transparency-scraper";
const client = new ApifyClient({ token: TOKEN });

// queries: mix of domain + keyword, India and US.
const queries = [
  { searchQuery: "foxtale.in", region: "IN" },
  { searchQuery: "minimalist.co", region: "IN" },
  { searchQuery: "Foxtale", region: "IN" },
  { searchQuery: "nike.com", region: "US" },        // known to have many ads
  { searchQuery: "nike.com", region: "IN" },
];

for (const q of queries) {
  const input = { ...q, maxResults: 5 };
  console.log(`\n--- ${slug} input=${JSON.stringify(input)} ---`);
  try {
    const run = await client.actor(slug).call(input, { waitSecs: 180 });
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 5 });
    console.log(`run=${run.id} items=${items.length}`);
    if (items.length) {
      console.log(`keys: ${Object.keys(items[0]).join(",")}`);
      console.log(`first item:`, JSON.stringify(items[0]).slice(0, 800));
      break;
    }
  } catch (e) {
    console.log(`ERROR: ${e?.message || e}`);
  }
}
