import { Readable } from 'node:stream';
import { google } from 'googleapis';
import { handleOptions, missingEnv, readJson, requireMethod, setCors } from '../_utils.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['POST'])) return;

  const missing = missingEnv(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI', 'YOUTUBE_REFRESH_TOKEN']);
  if (missing.length) {
    return res.status(200).json({ ok: false, dryRun: true, missing, message: 'YouTube upload is not live until these env vars are set in Vercel.' });
  }

  const body = await readJson(req).catch(() => ({}));
  const { videoUrl, title, description, tags = [], privacyStatus = 'private', selfDeclaredMadeForKids = true } = body;

  if (!videoUrl) {
    return res.status(400).json({ ok: false, error: 'videoUrl is required. Upload from a public/signed cloud URL for serverless upload.' });
  }
  if (!title || !description) {
    return res.status(400).json({ ok: false, error: 'title and description are required.' });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });

  const fileResponse = await fetch(videoUrl);
  if (!fileResponse.ok) {
    return res.status(400).json({ ok: false, error: `Could not fetch videoUrl: ${fileResponse.status}` });
  }

  const contentType = fileResponse.headers.get('content-type') || 'video/mp4';
  const arrayBuffer = await fileResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length > 45 * 1024 * 1024) {
    return res.status(413).json({
      ok: false,
      error: 'Video is too large for this starter serverless upload route. Use a storage bucket + resumable upload worker for production.',
      sizeBytes: buffer.length
    });
  }

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
        privacyStatus,
        selfDeclaredMadeForKids,
        containsSyntheticMedia: body.containsSyntheticMedia ?? true,
        publishAt: body.publishAt || undefined
      }
    },
    media: {
      mimeType: contentType,
      body: Readable.from(buffer)
    }
  });

  res.status(200).json({
    ok: true,
    videoId: result.data.id,
    privacyStatus,
    url: result.data.id ? `https://www.youtube.com/watch?v=${result.data.id}` : null
  });
}
