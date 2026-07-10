import { Readable } from 'node:stream';
import { google } from 'googleapis';
import { handleOptions, missingEnv, readJson, requireMethod, setCors } from '../_utils.js';

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['POST'])) return;

  const missing = missingEnv(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI', 'YOUTUBE_REFRESH_TOKEN']);
  if (missing.length) {
    return res.status(200).json({
      ok: false,
      dryRun: true,
      missing,
      message: 'Private upload is not live until these env vars are set in Vercel.'
    });
  }

  const body = await readJson(req).catch(() => ({}));
  const parsed = parseDataUrl(body.dataUrl);

  if (!parsed) {
    return res.status(400).json({ ok: false, error: 'dataUrl is required and must be a base64 video data URL.' });
  }

  if (parsed.buffer.length > 45 * 1024 * 1024) {
    return res.status(413).json({
      ok: false,
      error: 'Video is too large for this starter direct upload route.',
      sizeBytes: parsed.buffer.length
    });
  }

  const title = body.title || 'ZZTV Private Test Upload';
  const description = body.description || 'Private test upload from ZZTV. This was generated as an original test clip.';
  const tags = Array.isArray(body.tags) ? body.tags : ['ZZTV', 'kids sports', 'private test'];

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const result = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description,
        tags,
        categoryId: body.categoryId || '17'
      },
      status: {
        privacyStatus: 'private',
        selfDeclaredMadeForKids: body.selfDeclaredMadeForKids ?? true,
        containsSyntheticMedia: body.containsSyntheticMedia ?? true
      }
    },
    media: {
      mimeType: parsed.mimeType,
      body: Readable.from(parsed.buffer)
    }
  });

  return res.status(200).json({
    ok: true,
    privateOnly: true,
    videoId: result.data.id,
    url: result.data.id ? `https://www.youtube.com/watch?v=${result.data.id}` : null,
    studioUrl: result.data.id ? `https://studio.youtube.com/video/${result.data.id}/edit` : null,
    mimeType: parsed.mimeType,
    sizeBytes: parsed.buffer.length
  });
}
