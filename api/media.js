import { Readable } from "node:stream";

export const config = {
  api: {
    responseLimit: false
  }
};

function isAllowedHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "videos.pexels.com" ||
    host === "images.pexels.com" ||
    host.endsWith(".pexels.com") ||
    host === "jamendo.com" ||
    host.endsWith(".jamendo.com");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawUrl = String(req.query.url || "");
  let target;
  try {
    target = new URL(rawUrl);
  } catch (_) {
    return res.status(400).json({ error: "Invalid media URL." });
  }

  if (target.protocol !== "https:" || !isAllowedHost(target.hostname)) {
    return res.status(403).json({ error: "That media host is not allowed." });
  }

  try {
    const headers = {
      Accept: req.headers.accept || "*/*",
      "User-Agent": "ZZTV-Studio/1.0"
    };
    if (req.headers.range) headers.Range = req.headers.range;

    const upstream = await fetch(target.toString(), { headers, redirect: "follow" });
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).json({ error: `Media download failed (${upstream.status}).` });
    }

    const copyHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified"
    ];
    copyHeaders.forEach((name) => {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    });

    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(upstream.status);

    if (!upstream.body) return res.end();
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    console.error("Media proxy error", error);
    if (!res.headersSent) return res.status(500).json({ error: "Media download failed." });
    res.end();
  }
}
