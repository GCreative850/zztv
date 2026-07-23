import { cookieValue, openSession } from './_session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = openSession(cookieValue(req, 'zztv_tiktok'));
  if (!session?.access_token) return res.status(401).json({ error: 'Connect TikTok first.' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const publishId = String(body.publish_id || '');
  if (!publishId) return res.status(400).json({ error: 'Missing publish ID.' });

  const response = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ publish_id: publishId })
  });
  const data = await response.json();
  if (!response.ok || data.error?.code !== 'ok') return res.status(response.status || 400).json({ error: data.error?.message || 'Could not check TikTok status.' });
  return res.status(200).json(data.data || {});
}
