import { handleOptions, requireMethod, setCors, missingEnv } from './_utils.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['GET'])) return;

  res.status(200).json({
    ok: true,
    service: 'ZZTV API',
    time: new Date().toISOString(),
    env: {
      openaiReady: missingEnv(['OPENAI_API_KEY']).length === 0,
      youtubeReady: missingEnv(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI']).length === 0,
      youtubeUploadReady: missingEnv(['YOUTUBE_REFRESH_TOKEN']).length === 0,
      tiktokConfigured: missingEnv(['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']).length === 0
    }
  });
}
