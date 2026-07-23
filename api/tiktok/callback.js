import { cookieValue, sealSession } from './_session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || `https://${req.headers.host}/api/tiktok/callback`;
  if (!clientKey || !clientSecret) return res.status(500).send('TikTok credentials are missing in Vercel.');

  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  const expectedState = cookieValue(req, 'zztv_tiktok_state');
  if (!code || !state || !expectedState || state !== expectedState) {
    return res.redirect(302, '/?tiktok=error&reason=state');
  }

  try {
    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error_description || data.error || 'TikTok token exchange failed.');

    const session = sealSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      open_id: data.open_id,
      scope: data.scope,
      expires_at: Date.now() + Number(data.expires_in || 86400) * 1000
    });
    res.setHeader('Set-Cookie', [
      `zztv_tiktok=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`,
      'zztv_tiktok_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    ]);
    return res.redirect(302, '/?tiktok=connected');
  } catch (error) {
    console.error('TikTok OAuth error', error);
    return res.redirect(302, `/?tiktok=error&reason=${encodeURIComponent(error.message)}`);
  }
}
