import { google } from 'googleapis';
import { handleOptions, missingEnv, requireMethod, setCors } from '../_utils.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['GET'])) return;

  const missing = missingEnv(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI']);
  if (missing.length) {
    return res.status(200).json({ ok: false, missing, message: 'Add these env vars in Vercel first.' });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/youtube.upload']
  });

  res.status(200).json({ ok: true, url, scope: 'https://www.googleapis.com/auth/youtube.upload' });
}
