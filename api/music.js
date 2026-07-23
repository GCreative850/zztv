function isCommercialFriendlyLicense(url = "") {
  const normalized = String(url).toLowerCase();
  return normalized.includes("creativecommons.org/publicdomain/zero/") || normalized.includes("creativecommons.org/licenses/by/");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientId = process.env.JAMENDO_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({
      error: "JAMENDO_CLIENT_ID is missing in Vercel.",
      setup: "Create a Jamendo developer app and add its Client ID to Vercel as JAMENDO_CLIENT_ID."
    });
  }

  const query = String(req.query.q || "cinematic").trim().slice(0, 100) || "cinematic";

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      format: "json",
      limit: "40",
      search: query,
      audioformat: "mp32",
      include: "licenses+musicinfo",
      vocalinstrumental: "instrumental",
      content_id_free: "true",
      ccnc: "false",
      ccnd: "false",
      groupby: "artist_id",
      boost: "popularity_month"
    });

    const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params}`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Jamendo request failed (${response.status}).` });
    }

    const data = await response.json();
    if (data.headers?.status && data.headers.status !== "success") {
      return res.status(502).json({ error: data.headers.error_message || "Jamendo returned an error." });
    }

    const results = (data.results || []).map((track) => {
      const licenseUrl = track.license_ccurl || track.license_url || "";
      if (!track.audio || !isCommercialFriendlyLicense(licenseUrl)) return null;

      const isCc0 = licenseUrl.toLowerCase().includes("publicdomain/zero");
      return {
        id: track.id,
        name: track.name,
        artist: track.artist_name,
        duration: track.duration,
        audio: track.audio,
        image: track.image || track.album_image || "",
        pageUrl: track.shareurl || track.shorturl || "https://www.jamendo.com",
        licenseUrl,
        licenseName: isCc0 ? "CC0" : "CC BY",
        attribution: isCc0
          ? `${track.name} by ${track.artist_name} — CC0 via Jamendo`
          : `${track.name} by ${track.artist_name} — CC BY via Jamendo`
      };
    }).filter(Boolean).slice(0, 12);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      query,
      results,
      provider: "Jamendo",
      note: "Results are restricted to CC0 or CC BY tracks. Keep the generated attribution in your description."
    });
  } catch (error) {
    console.error("Jamendo search error", error);
    return res.status(500).json({ error: "Music search failed. Check the Vercel logs." });
  }
}
