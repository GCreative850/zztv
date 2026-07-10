export function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function handleOptions(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export function requireMethod(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.status(405).json({ ok: false, error: `Method ${req.method} not allowed`, allowed: methods });
    return false;
  }
  return true;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  return JSON.parse(text);
}

export function missingEnv(names) {
  return names.filter((name) => !process.env[name]);
}

export function fallbackPackage(seed = {}) {
  const sport = seed.sport || 'basketball';
  const angle = seed.angle || 'how young athletes build confidence with one simple drill';
  return {
    source: 'fallback-no-ai-key',
    createdAt: new Date().toISOString(),
    channel: 'ZZTV Kids Sports',
    safety: [
      'Kid-friendly language',
      'Original sports commentary only',
      'No copyrighted broadcast footage',
      'Private-first upload plan'
    ],
    youtube: {
      title: `ZZTV: ${angle.replace(/^./, (char) => char.toUpperCase())} 🏆`,
      description: `A fun kid-friendly sports short about ${angle}. Practice hard, stay positive, and keep improving.`,
      tags: ['kids sports', 'youth sports', sport, 'sports motivation', 'ZZTV'],
      categoryId: '17',
      privacyStatus: 'private',
      selfDeclaredMadeForKids: true,
      containsSyntheticMedia: true
    },
    script: [
      'Welcome back to ZZTV!',
      `Today we are talking about ${angle}.`,
      'Pick one skill and practice it slowly first.',
      'Speed up only after it feels clean.',
      'Encourage your teammates and keep the energy positive.',
      'Follow ZZTV for more sports tips.'
    ],
    tiktok: {
      caption: 'Practice smarter today 🏆 #ZZTV',
      hashtags: ['#kidssports', '#youthsports', `#${sport}`, '#sportsmotivation', '#ZZTV']
    },
    sound: {
      voice: 'bright, excited, kid-friendly narration',
      music: 'royalty-free upbeat sports beat under voice',
      mix: 'voice first, low background music, no copyrighted samples'
    },
    video: {
      format: '9:16 vertical',
      duration: '25-35 seconds',
      scenes: ['ZZTV intro', 'animated sports background', 'three tip cards', 'practice challenge', 'follow end card']
    }
  };
}
