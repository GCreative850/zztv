import { cookieValue, openSession } from './_session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const configured = Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
  const session = openSession(cookieValue(req, 'zztv_tiktok'));
  if (!session?.access_token) return res.status(200).json({ connected: false, configured });

  try {
    const response = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const data = await response.json();
    if (!response.ok || (data.error?.code && data.error.code !== 'ok')) {
      return res.status(200).json({ connected: false, configured, expired: true });
    }
    return res.status(200).json({ connected: true, configured, user: data.data?.user || {}, scopes: String(session.scope || '').split(',').filter(Boolean) });
  } catch (_) {
    return res.status(200).json({ connected: true, configured, user: {}, scopes: String(session.scope || '').split(',').filter(Boolean) });
  }
}
