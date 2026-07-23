import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto';

const MAX_SINGLE_UPLOAD = 64 * 1024 * 1024;

function cookieValue(req, name) {
  const header = String(req.headers.cookie || '');
  const part = header.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}

function secretKey() {
  const secret = process.env.TIKTOK_SESSION_SECRET || process.env.TIKTOK_CLIENT_SECRET || '';
  if (!secret) throw new Error('TikTok session secret is missing.');
  return createHash('sha256').update(secret).digest();
}

function sealSession(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

function openSession(token) {
  if (!token) return null;
  try {
    const payload = Buffer.from(token, 'base64url');
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', secretKey(), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'));
  } catch (_) {
    return null;
  }
}

function redirectUri(req) {
  return process.env.TIKTOK_REDIRECT_URI || `https://${req.headers.host}/api/tiktok/callback`;
}

function parseBody(req) {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body || '{}'); } catch (_) { return {}; }
  }
  return req.body || {};
}

function requireSession(req, res) {
  const session = openSession(cookieValue(req, 'zztv_tiktok'));
  if (!session?.access_token) {
    res.status(401).json({ error: 'Connect TikTok first.' });
    return null;
  }
  return session;
}

async function start(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) return res.status(500).send('TIKTOK_CLIENT_KEY is missing in Vercel.');
  const state = randomBytes(24).toString('hex');
  res.setHeader('Set-Cookie', `zztv_tiktok_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: 'code',
    scope: 'user.info.basic,video.upload',
    redirect_uri: redirectUri(req),
    state
  });
  return res.redirect(302, `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
}

async function callback(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) return res.status(500).send('TikTok credentials are missing in Vercel.');

  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  const expectedState = cookieValue(req, 'zztv_tiktok_state');
  if (!code || !state || !expectedState || state !== expectedState) return res.redirect(302, '/?tiktok=error&reason=state');

  try {
    const tokenBody = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(req)
    });
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error_description || data.error || 'TikTok token exchange failed.');

    const sealed = sealSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      open_id: data.open_id,
      scope: data.scope,
      expires_at: Date.now() + Number(data.expires_in || 86400) * 1000
    });
    res.setHeader('Set-Cookie', [
      `zztv_tiktok=${sealed}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`,
      'zztv_tiktok_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    ]);
    return res.redirect(302, '/?tiktok=connected');
  } catch (error) {
    console.error('TikTok OAuth error', error);
    return res.redirect(302, `/?tiktok=error&reason=${encodeURIComponent(error.message)}`);
  }
}

async function status(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const configured = Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
  const session = openSession(cookieValue(req, 'zztv_tiktok'));
  if (!session?.access_token) return res.status(200).json({ connected: false, configured });
  try {
    const response = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const data = await response.json();
    if (!response.ok || (data.error?.code && data.error.code !== 'ok')) return res.status(200).json({ connected: false, configured, expired: true });
    return res.status(200).json({ connected: true, configured, user: data.data?.user || {}, scopes: String(session.scope || '').split(',').filter(Boolean) });
  } catch (_) {
    return res.status(200).json({ connected: true, configured, user: {}, scopes: String(session.scope || '').split(',').filter(Boolean) });
  }
}

async function initUpload(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = requireSession(req, res);
  if (!session) return;
  const videoSize = Number(parseBody(req).video_size || 0);
  if (!Number.isFinite(videoSize) || videoSize <= 0) return res.status(400).json({ error: 'Invalid video size.' });
  if (videoSize > MAX_SINGLE_UPLOAD) return res.status(400).json({ error: 'This video is over 64 MB. Shorten it or lower export quality before uploading.' });

  try {
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ source_info: { source: 'FILE_UPLOAD', video_size: videoSize, chunk_size: videoSize, total_chunk_count: 1 } })
    });
    const data = await response.json();
    if (!response.ok || data.error?.code !== 'ok') return res.status(response.status || 400).json({ error: data.error?.message || 'TikTok upload initialization failed.', details: data.error });
    return res.status(200).json({ upload_url: data.data?.upload_url, publish_id: data.data?.publish_id });
  } catch (error) {
    console.error('TikTok upload init error', error);
    return res.status(500).json({ error: 'TikTok upload initialization failed.' });
  }
}

async function postStatus(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = requireSession(req, res);
  if (!session) return;
  const publishId = String(parseBody(req).publish_id || '');
  if (!publishId) return res.status(400).json({ error: 'Missing publish ID.' });
  try {
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ publish_id: publishId })
    });
    const data = await response.json();
    if (!response.ok || data.error?.code !== 'ok') return res.status(response.status || 400).json({ error: data.error?.message || 'Could not check TikTok status.' });
    return res.status(200).json(data.data || {});
  } catch (_) {
    return res.status(500).json({ error: 'Could not check TikTok status.' });
  }
}

async function disconnect(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Set-Cookie', 'zztv_tiktok=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return res.status(200).json({ disconnected: true });
}

export default async function handler(req, res) {
  const action = String(req.query.action || '');
  if (action === 'start') return start(req, res);
  if (action === 'callback') return callback(req, res);
  if (action === 'status') return status(req, res);
  if (action === 'init-upload') return initUpload(req, res);
  if (action === 'post-status') return postStatus(req, res);
  if (action === 'disconnect') return disconnect(req, res);
  return res.status(404).json({ error: 'Unknown TikTok action.' });
}
