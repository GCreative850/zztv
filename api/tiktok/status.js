import { handleOptions, missingEnv, requireMethod, setCors } from '../_utils.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['GET'])) return;

  const missing = missingEnv(['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']);
  res.status(200).json({
    ok: missing.length === 0,
    platform: 'TikTok',
    liveUploadReady: false,
    missing,
    message: missing.length
      ? 'TikTok app credentials are missing. TikTok posting also requires developer app approval and eligible account/API access.'
      : 'Credentials are present, but live posting still needs OAuth token flow + content posting approval wired next.',
    nextRoutesNeeded: ['/api/tiktok/auth-url', '/api/tiktok/callback', '/api/tiktok/post']
  });
}
