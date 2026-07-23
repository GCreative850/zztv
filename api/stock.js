const MAX_RESULTS = 12;

function chooseVideoFile(files = []) {
  const mp4 = files.filter((file) => file.file_type === "video/mp4" && file.link);
  if (!mp4.length) return null;

  const portrait = mp4.filter((file) => Number(file.height) >= Number(file.width));
  const candidates = portrait.length ? portrait : mp4;

  return candidates
    .filter((file) => Number(file.width) >= 540)
    .sort((a, b) => {
      const aScore = Math.abs(Number(a.height || 0) - 1920) + Math.abs(Number(a.width || 0) - 1080);
      const bScore = Math.abs(Number(b.height || 0) - 1920) + Math.abs(Number(b.width || 0) - 1080);
      return aScore - bScore;
    })[0] || candidates[0];
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "PEXELS_API_KEY is missing in Vercel.",
      setup: "Create a free Pexels API key and add it to Vercel as PEXELS_API_KEY."
    });
  }

  const query = String(req.query.q || "").trim().slice(0, 100);
  const page = Math.max(1, Math.min(100, Number(req.query.page) || 1));
  if (!query) return res.status(400).json({ error: "Enter a stock-footage search." });

  try {
    const params = new URLSearchParams({
      query,
      orientation: "portrait",
      size: "medium",
      per_page: String(MAX_RESULTS),
      page: String(page),
      locale: "en-US"
    });

    const response = await fetch(`https://api.pexels.com/v1/videos/search?${params}`, {
      headers: {
        Authorization: apiKey,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      let message = `Pexels request failed (${response.status}).`;
      try {
        const body = await response.json();
        message = body.error || message;
      } catch (_) {}
      return res.status(response.status).json({ error: String(message) });
    }

    const data = await response.json();
    const results = (data.videos || []).map((video) => {
      const file = chooseVideoFile(video.video_files);
      if (!file) return null;
      return {
        id: video.id,
        duration: video.duration,
        width: file.width,
        height: file.height,
        url: file.link,
        preview: video.image,
        pageUrl: video.url,
        creator: video.user?.name || "Pexels creator",
        creatorUrl: video.user?.url || video.url,
        attribution: `Video by ${video.user?.name || "a Pexels creator"} on Pexels`
      };
    }).filter(Boolean);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      query,
      page,
      total: data.total_results || results.length,
      results,
      provider: "Pexels",
      providerUrl: "https://www.pexels.com"
    });
  } catch (error) {
    console.error("Pexels search error", error);
    return res.status(500).json({ error: "Stock-footage search failed. Check the Vercel logs." });
  }
}
