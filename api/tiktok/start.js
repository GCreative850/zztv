import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) return res.status(500).send('TIKTOK_CLIENT_KEY is missing in Vercel.');

  const redirectUri = process.env.TIKTOK_REDIRECT_URI || `https://${req.headers.host}/api/tiktok/callback`;
  const state = crypto.randomBytes(24).toString('hex');
  res.setHeader('Set-Cookie', `zztv_tiktok_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: 'code',
    scope: 'user.info.basic,video.upload',
    redirect_uri: redirectUri,
    state
  });
  return res.redirect(302, `https://www.tiktok.com/v2/auth/authorize/?${params}`);
}
