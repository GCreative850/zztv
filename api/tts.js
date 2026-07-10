import { handleOptions, readJson, requireMethod, setCors } from './_utils.js';

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function cleanInput(value) {
  const text = String(value || 'Welcome back to ZZTV!')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 3600);
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function friendlyError(status, detail, model, voice) {
  const parsed = safeJson(detail);
  const message = parsed?.error?.message || detail || 'Unknown TTS error';
  const code = parsed?.error?.code || parsed?.error?.type || null;
  return { status, model, voice, code, message };
}

async function speechAttempt({ apiKey, model, voice, input, instructions }) {
  const body = {
    model,
    voice,
    input
  };

  // Newer speech models accept instructions. Older fallback speech models may not.
  if (!model.startsWith('tts-1')) {
    body.instructions = instructions;
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text();
    return { ok: false, error: friendlyError(response.status, detail, model, voice) };
  }

  const arrayBuffer = await response.arrayBuffer();
  return { ok: true, audio: Buffer.from(arrayBuffer), model, voice };
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['POST'])) return;

  const body = await readJson(req).catch(() => ({}));
  const input = cleanInput(Array.isArray(body.script) ? body.script.join(' ') : (body.input || body.text));
  const requestedVoice = body.voice || process.env.OPENAI_TTS_VOICE;
  const requestedModel = process.env.OPENAI_TTS_MODEL;
  const instructions = body.instructions || 'Speak with bright, upbeat, kid-friendly sports energy. Clear, positive, and safe for young viewers.';

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({
      ok: false,
      dryRun: true,
      error: 'OPENAI_API_KEY is missing, so no narration audio was generated.',
      plannedAudio: {
        model: requestedModel || 'gpt-4o-mini-tts',
        voice: requestedVoice || 'coral',
        input
      }
    });
  }

  const attempts = [];
  for (const model of unique([requestedModel, 'gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'])) {
    const voices = model.startsWith('tts-1')
      ? unique([requestedVoice, 'alloy', 'nova', 'shimmer'])
      : unique([requestedVoice, 'coral', 'alloy', 'nova', 'shimmer']);
    for (const voice of voices) attempts.push({ model, voice });
  }

  const failures = [];
  for (const attempt of attempts) {
    const result = await speechAttempt({
      apiKey: process.env.OPENAI_API_KEY,
      model: attempt.model,
      voice: attempt.voice,
      input,
      instructions
    });

    if (result.ok) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="zztv-voice.mp3"');
      res.setHeader('X-ZZTV-TTS-Model', result.model);
      res.setHeader('X-ZZTV-TTS-Voice', result.voice);
      return res.status(200).send(result.audio);
    }

    failures.push(result.error);
  }

  const summary = failures
    .slice(0, 4)
    .map((failure) => `${failure.model}/${failure.voice}: ${failure.status} ${failure.code || ''} ${failure.message}`.trim())
    .join(' | ');

  return res.status(200).json({
    ok: false,
    error: `Text-to-speech generation failed after ${failures.length} attempts. ${summary}`,
    failures
  });
}
