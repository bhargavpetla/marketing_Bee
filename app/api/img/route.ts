import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side image proxy. Many ad-CDN URLs (Facebook, Google) hot-link block when
// a browser loads them directly. We fetch them server-side and stream the bytes back.
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  try {
    const referer = pickReferer(url);
    const upstream = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        ...(referer ? { Referer: referer } : {}),
      },
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
    }
    const ct = upstream.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "fetch failed" }, { status: 502 });
  }
}

function pickReferer(url: string): string | null {
  try {
    const u = new URL(url);
    const h = u.hostname;
    if (/fbcdn\.net$|facebook\.com$|fbsbx\.com$/i.test(h)) return "https://www.facebook.com/";
    if (/googlesyndication\.com$|googleusercontent\.com$|gstatic\.com$|google\.com$/i.test(h))
      return "https://adstransparency.google.com/";
    return null;
  } catch {
    return null;
  }
}

