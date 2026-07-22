const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";

const STYLE_PRESETS = {
  documentary: { stability: 0.46, similarity_boost: 0.78, style: 0.22, speed: 0.94, use_speaker_boost: true },
  sports: { stability: 0.34, similarity_boost: 0.76, style: 0.52, speed: 1.03, use_speaker_boost: true },
  storyteller: { stability: 0.38, similarity_boost: 0.8, style: 0.42, speed: 0.92, use_speaker_boost: true },
  business: { stability: 0.58, similarity_boost: 0.8, style: 0.16, speed: 0.98, use_speaker_boost: true },
  calm: { stability: 0.62, similarity_boost: 0.78, style: 0.14, speed: 0.88, use_speaker_boost: true },
  viral: { stability: 0.3, similarity_boost: 0.75, style: 0.58, speed: 1.06, use_speaker_boost: true }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ELEVENLABS_API_KEY is missing in Vercel." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const text = String(body.text || "").trim();
    const styleName = STYLE_PRESETS[body.style] ? body.style : "documentary";
    const voiceId = String(body.voiceId || DEFAULT_VOICE_ID).trim();

    if (!text) return res.status(400).json({ error: "A script is required." });
    if (text.length > 4500) return res.status(400).json({ error: "Script is too long. Keep it under 4,500 characters." });
    if (!/^[a-zA-Z0-9_-]+$/.test(voiceId)) return res.status(400).json({ error: "Invalid voice ID." });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: STYLE_PRESETS[styleName]
        })
      }
    );

    if (!response.ok) {
      let message = `ElevenLabs request failed (${response.status}).`;
      try {
        const data = await response.json();
        message = data?.detail?.message || data?.detail || data?.message || message;
      } catch (_) {}
      return res.status(response.status).json({ error: String(message) });
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(audio.length));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Disposition", "inline; filename=zzvoice.mp3");
    return res.status(200).send(audio);
  } catch (error) {
    console.error("Voice generation error", error);
    return res.status(500).json({ error: "Voice generation failed. Check the Vercel logs." });
  }
}
