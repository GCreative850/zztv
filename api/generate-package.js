import { fallbackPackage, handleOptions, readJson, requireMethod, setCors } from './_utils.js';

function extractJson(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  try { return JSON.parse(trimmed); } catch {}
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch {}
  return null;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['POST'])) return;

  const body = await readJson(req).catch(() => ({}));
  const seed = {
    sport: body.sport || 'basketball',
    angle: body.angle || 'confidence and teamwork for young athletes'
  };

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({ ok: true, liveAI: false, package: fallbackPackage(seed), warning: 'OPENAI_API_KEY is missing, returned safe fallback package.' });
  }

  const prompt = `Create one kid-friendly sports short content package for ZZTV. Use original commentary only. No copyrighted broadcast footage. Sport: ${seed.sport}. Angle: ${seed.angle}. Return strict JSON with keys: youtube, script, tiktok, sound, video, safety. YouTube must include title, description, tags, categoryId, privacyStatus, selfDeclaredMadeForKids, containsSyntheticMedia. TikTok must include caption and hashtags. Script should be 25-35 seconds.`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: prompt,
      temperature: 0.7
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return res.status(response.status).json({ ok: false, error: 'OpenAI package generation failed', detail: data });
  }

  const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).map((part) => part.text || '').join('\n') || '';
  const parsed = extractJson(outputText) || fallbackPackage(seed);

  res.status(200).json({ ok: true, liveAI: true, package: parsed });
}
