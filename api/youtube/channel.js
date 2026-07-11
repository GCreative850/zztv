import { google } from 'googleapis';
import { handleOptions, missingEnv, requireMethod, setCors } from '../_utils.js';

function publicError(error) {
  const data = error?.response?.data || error?.errors || null;
  const firstReason = data?.error?.errors?.[0]?.reason || data?.errors?.[0]?.reason || error?.errors?.[0]?.reason;
  const firstMessage = data?.error?.errors?.[0]?.message || data?.error?.message || data?.message || error?.message || 'Unknown YouTube channel error';
  return { message: firstMessage, reason: firstReason || null, status: error?.response?.status || error?.code || null };
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['GET'])) return;

  const missing = missingEnv(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI', 'YOUTUBE_REFRESH_TOKEN']);
  if (missing.length) {
    return res.status(200).json({ ok: false, ready: false, missing, message: 'YouTube channel check needs the same OAuth env vars used for upload.' });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const result = await youtube.channels.list({ part: ['snippet', 'status'], mine: true, maxResults: 1 });
    const channel = result.data.items?.[0];

    if (!channel?.id) {
      return res.status(200).json({ ok: false, ready: false, message: 'No YouTube channel is connected to this refresh token.' });
    }

    return res.status(200).json({
      ok: true,
      ready: true,
      uploadTarget: {
        channelId: channel.id,
        title: channel.snippet?.title || 'Untitled YouTube Channel',
        customUrl: channel.snippet?.customUrl || null,
        privacyStatus: 'private-first uploads only'
      }
    });
  } catch (error) {
    const detail = publicError(error);
    return res.status(200).json({ ok: false, ready: false, error: 'YouTube channel check failed.', message: detail.message, reason: detail.reason, status: detail.status, detail });
  }
}
