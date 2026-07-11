import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import ffmpegPath from 'ffmpeg-static';
import { google } from 'googleapis';
import { handleOptions, missingEnv, readJson, requireMethod, setCors } from '../_utils.js';

function parseDataUrl(dataUrl) {
  const raw = String(dataUrl || '');
  const commaIndex = raw.indexOf(',');
  if (!raw.startsWith('data:') || commaIndex === -1) return null;
  const meta = raw.slice(5, commaIndex);
  const payload = raw.slice(commaIndex + 1);
  const metaParts = meta.split(';').map((part) => part.trim()).filter(Boolean);
  const mimeType = metaParts[0] || 'video/mp4';
  const isBase64 = metaParts.some((part) => part.toLowerCase() === 'base64');
  if (!mimeType.startsWith('video/') || !isBase64 || !payload) return null;
  return { mimeType, buffer: Buffer.from(payload, 'base64') };
}

function publicError(error) {
  const data = error?.response?.data || error?.errors || null;
  const firstReason = data?.error?.errors?.[0]?.reason || data?.errors?.[0]?.reason || error?.errors?.[0]?.reason;
  const firstMessage = data?.error?.errors?.[0]?.message || data?.error?.message || data?.message || error?.message || 'Unknown YouTube upload error';
  return { message: firstMessage, reason: firstReason || null, status: error?.response?.status || error?.code || null };
}

function wavBuffer({ seconds = 5.6, sampleRate = 44100 } = {}) {
  const totalSamples = Math.max(1, Math.floor(seconds * sampleRate));
  const bytesPerSample = 2;
  const channels = 1;
  const dataSize = totalSamples * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const notes = [261.63, 329.63, 392, 523.25, 392, 329.63];
  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const beatIndex = Math.floor(t / 0.5);
    const beatT = t - beatIndex * 0.5;
    const kick = Math.sin(2 * Math.PI * (85 - beatT * 80) * t) * Math.max(0, 1 - beatT * 8) * (beatIndex % 2 === 0 ? 0.45 : 0.12);
    const tone = Math.sin(2 * Math.PI * notes[beatIndex % notes.length] * t) * 0.09;
    const hat = beatT > 0.24 && beatT < 0.28 ? (Math.random() * 2 - 1) * 0.05 : 0;
    const fadeIn = Math.min(1, t / 0.2);
    const fadeOut = Math.min(1, (seconds - t) / 0.35);
    const sample = Math.max(-1, Math.min(1, (kick + tone + hat) * fadeIn * fadeOut * 0.75));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  return buffer;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('ffmpeg-static path unavailable'));
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.split('\n').slice(-6).join(' ').trim() || `ffmpeg exited ${code}`));
    });
  });
}

async function attachBackendMusic(parsed, body) {
  if (!body.serverMusic) return { ...parsed, backendMusic: false, backendMusicFallback: false };
  const id = randomUUID();
  const inputExt = parsed.mimeType.includes('webm') ? 'webm' : 'mp4';
  const inputPath = join(tmpdir(), `${id}-in.${inputExt}`);
  const musicPath = join(tmpdir(), `${id}-music.wav`);
  const outputPath = join(tmpdir(), `${id}-out.mp4`);
  try {
    const seconds = Math.max(2.5, Math.min(15, Number(body.durationMs || body.duration || 5600) / 1000));
    await writeFile(inputPath, parsed.buffer);
    await writeFile(musicPath, wavBuffer({ seconds }));
    await runFfmpeg(['-y', '-i', inputPath, '-i', musicPath, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', outputPath]);
    const out = await readFile(outputPath);
    if (!out.length) throw new Error('backend mux produced empty output');
    return { mimeType: 'video/mp4', buffer: out, backendMusic: true, backendMusicFallback: false };
  } catch (error) {
    return { ...parsed, backendMusic: false, backendMusicFallback: true, backendMusicError: error.message };
  } finally {
    await Promise.allSettled([rm(inputPath, { force: true }), rm(musicPath, { force: true }), rm(outputPath, { force: true })]);
  }
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!requireMethod(req, res, ['POST'])) return;

  const missing = missingEnv(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI', 'YOUTUBE_REFRESH_TOKEN']);
  if (missing.length) {
    return res.status(200).json({ ok: false, dryRun: true, missing, message: 'Private upload is not live until these env vars are set in Vercel.' });
  }

  const body = await readJson(req).catch(() => ({}));
  const parsed = parseDataUrl(body.dataUrl);
  if (!parsed) return res.status(400).json({ ok: false, error: 'dataUrl is required and must be a base64 video data URL.' });
  if (parsed.buffer.length > 45 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'Video is too large for this starter direct upload route.', sizeBytes: parsed.buffer.length });

  const uploadMedia = await attachBackendMusic(parsed, body);
  const title = body.title || 'ZZTV Private Test Upload';
  const description = body.description || 'Private test upload from ZZTV. This was generated as an original test clip.';
  const tags = Array.isArray(body.tags) ? body.tags : ['ZZTV', 'kids sports', 'private test'];

  try {
    const oauth2Client = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET, process.env.YOUTUBE_REDIRECT_URI);
    oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const result = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: { title, description, tags, categoryId: body.categoryId || '17' },
        status: { privacyStatus: 'private', selfDeclaredMadeForKids: body.selfDeclaredMadeForKids ?? true }
      },
      media: { mimeType: uploadMedia.mimeType, body: Readable.from(uploadMedia.buffer) }
    });

    return res.status(200).json({
      ok: true,
      privateOnly: true,
      videoId: result.data.id,
      url: result.data.id ? `https://www.youtube.com/watch?v=${result.data.id}` : null,
      studioUrl: result.data.id ? `https://studio.youtube.com/video/${result.data.id}/edit` : null,
      mimeType: uploadMedia.mimeType,
      sizeBytes: uploadMedia.buffer.length,
      backendMusic: uploadMedia.backendMusic,
      backendMusicFallback: uploadMedia.backendMusicFallback,
      backendMusicError: uploadMedia.backendMusicError || null
    });
  } catch (error) {
    const detail = publicError(error);
    return res.status(200).json({ ok: false, privateOnly: true, error: 'YouTube private upload failed.', message: detail.message, reason: detail.reason, status: detail.status, detail, mimeType: uploadMedia.mimeType, sizeBytes: uploadMedia.buffer.length, backendMusic: uploadMedia.backendMusic, backendMusicFallback: uploadMedia.backendMusicFallback, backendMusicError: uploadMedia.backendMusicError || null });
  }
}
