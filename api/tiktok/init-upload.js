import { cookieValue, openSession } from './_session.js';

const MAX_SINGLE_UPLOAD = 64 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = openSession(cookieValue(req, 'zztv_tiktok'));
  if (!session?.access_token) return res.status(401).json({ error: 'Connect TikTok first.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const videoSize = Number(body.video_size || 0);
  if (!Number.isFinite(videoSize) || videoSize <= 0) return res.status(400).json({ error: 'Invalid video size.' });
  if (videoSize > MAX_SINGLE_UPLOAD) return res.status(400).json({ error: 'This video is over 64 MB. Shorten it or lower the export quality before uploading.' });

  try {
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoSize,
          chunk_size: videoSize,
          total_chunk_count: 1
        }
      })
    });
    const data = await response.json();
    if (!response.ok || data.error?.code !== 'ok') {
      return res.status(response.status || 400).json({ error: data.error?.message || 'TikTok upload initialization failed.', details: data.error });
    }
    return res.status(200).json({ upload_url: data.data?.upload_url, publish_id: data.data?.publish_id });
  } catch (error) {
    console.error('TikTok upload init error', error);
    return res.status(500).json({ error: 'TikTok upload initialization failed.' });
  }
}
