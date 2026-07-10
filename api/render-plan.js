import { fallbackPackage, handleOptions, readJson, requireMethod, setCors } from './_utils.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['POST'])) return;

  const body = await readJson(req).catch(() => ({}));
  const pkg = body.package || fallbackPackage();

  const renderPlan = {
    ok: true,
    renderer: 'starter-plan',
    note: 'This endpoint creates the render instructions. Actual MP4 rendering should run in a worker because serverless functions are short-lived.',
    format: '1080x1920 vertical MP4',
    durationSeconds: 30,
    assetsNeeded: [
      'royalty-free sports background or generated animation',
      'voiceover MP3 from /api/tts',
      'upbeat royalty-free beat',
      'safe icon/ball animations',
      'captions from script'
    ],
    timeline: (pkg.script || []).map((line, index) => ({
      start: index * 4,
      end: index * 4 + 4,
      caption: line,
      visual: index === 0 ? 'ZZTV gold intro' : 'sports motion card with large subtitles'
    })),
    uploadAfterRender: {
      youtube: '/api/youtube/upload',
      tiktok: '/api/tiktok/status first; posting route pending approval'
    }
  };

  res.status(200).json(renderPlan);
}
