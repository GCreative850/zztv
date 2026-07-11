import { google } from 'googleapis';
import { handleOptions, missingEnv, requireMethod, setCors } from '../_utils.js';

function html(body) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZZTV YouTube Auth</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#050505;color:#fff7db;padding:20px}code,pre{background:#111;border:1px solid #40330f;border-radius:12px;padding:12px;display:block;white-space:pre-wrap;overflow-wrap:anywhere}b{color:#ffdc73}</style></head><body>${body}</body></html>`;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['GET'])) return;

  const missing = missingEnv(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI']);
  if (missing.length) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html(`<h1>Missing YouTube env vars</h1><pre>${missing.join('\n')}</pre>`));
  }

  const code = req.query.code;
  if (!code) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send(html('<h1>No code received</h1><p>Start from <code>/api/youtube/auth-url?debug=1</code>.</p>'));
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const refresh = tokens.refresh_token || '';
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html(`
      <h1>ZZTV YouTube Auth Complete</h1>
      <p><b>Copy this refresh token into Vercel as <code>YOUTUBE_REFRESH_TOKEN</code>.</b></p>
      <p>This new token is expected to include both upload permission and channel-check permission.</p>
      <pre>${refresh || 'No refresh token returned. Go to your Google Account permissions, remove ZZTV/this OAuth app access, then start /api/youtube/auth-url?debug=1 again.'}</pre>
      <p>After saving it in Vercel, redeploy, then open ZZTV and press Music Mode / Check API to confirm the channel name.</p>
      <p>Do not commit this token to GitHub.</p>
    `));
  } catch (error) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(html(`<h1>YouTube auth failed</h1><pre>${error.message}</pre>`));
  }
}
