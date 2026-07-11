import { google } from 'googleapis';
import { handleOptions, missingEnv, requireMethod, setCors } from '../_utils.js';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly'
];

function htmlPage({ redirectUri, url }) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>ZZTV YouTube Auth</title><style>body{background:#050505;color:#ffdc73;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:22px;line-height:1.4}code{display:block;background:#111;border:1px solid #584615;border-radius:14px;padding:14px;color:#fff7db;overflow-wrap:anywhere}a,button{display:inline-block;margin-top:14px;background:#ffdc73;color:#120b00;border:0;border-radius:14px;padding:12px 14px;font-weight:800;text-decoration:none}.note{color:#d8c688}</style></head><body><h1>ZZTV YouTube Auth</h1><p class="note">This auth now requests upload permission plus channel-read permission so ZZTV can verify the exact channel before uploading.</p><h2>Copy this exact redirect URI</h2><code>${redirectUri}</code><p><a href="${url}">Continue to Google YouTube Auth</a></p></body></html>`;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['GET'])) return;

  const missing = missingEnv(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI']);
  if (missing.length) {
    return res.status(200).json({ ok: false, missing, message: 'Add these env vars in Vercel first.' });
  }

  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    redirectUri
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent select_account',
    include_granted_scopes: false,
    scope: SCOPES
  });

  if (req.query?.debug === '1' || req.headers.accept?.includes('text/html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(htmlPage({ redirectUri, url }));
  }

  res.status(200).json({ ok: true, url, redirectUri, scopes: SCOPES });
}
