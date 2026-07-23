import crypto from 'node:crypto';

function secretKey() {
  const secret = process.env.TIKTOK_SESSION_SECRET || process.env.TIKTOK_CLIENT_SECRET || '';
  if (!secret) throw new Error('TikTok session secret is missing.');
  return crypto.createHash('sha256').update(secret).digest();
}

export function sealSession(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function openSession(token) {
  if (!token) return null;
  try {
    const payload = Buffer.from(token, 'base64url');
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey(), iv);
    decipher.setAuthTag(tag);
    const text = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

export function cookieValue(req, name) {
  const header = String(req.headers.cookie || '');
  const part = header.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}
