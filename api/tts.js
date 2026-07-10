import { handleOptions, readJson, requireMethod, setCors } from './_utils.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['POST'])) return;

  const body = await readJson(req).catch(() => ({}));
  const input = Array.isArray(body.script) ? body.script.join(' ') : (body.input || body.text || 'Welcome back to ZZTV!');
  const voice = body.voice || process.env.OPENAI_TTS_VOICE || 'coral';

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({
      ok: true,
      dryRun: true,
      warning: 'OPENAI_API_KEY is missing, so no audio was generated.',
      plannedAudio: {
        model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
        voice,
        input
      }
    });
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice,
      input,
      instructions: body.instructions || 'Speak with bright, upbeat, kid-friendly sports energy. Clear, positive, and safe for young viewers.'
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    return res.status(response.status).json({ ok: false, error: 'Text-to-speech generation failed', detail });
  }

  const arrayBuffer = await response.arrayBuffer();
  const audio = Buffer.from(arrayBuffer);
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', 'attachment; filename="zztv-voice.mp3"');
  res.status(200).send(audio);
}
