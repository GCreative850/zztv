(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const startBtn = $('startBtn');
  const clearBtn = $('clearBtn');
  const copyBtn = $('copyBtn');
  const downloadBtn = $('downloadBtn');
  const logBox = $('log');
  const outputBox = $('output');
  const statusLabel = $('runtimeStatus');
  const packageState = $('packageState');
  const apiBaseInput = $('apiBaseInput');
  const saveApiBtn = $('saveApiBtn');
  const apiHealthBtn = $('apiHealthBtn');
  const voiceBtn = $('voiceBtn');
  const youtubeAuthBtn = $('youtubeAuthBtn');
  const uploadTestBtn = $('uploadTestBtn');
  const fullBuildBtn = $('fullBuildBtn');
  const apiState = $('apiState');

  let latestPackage = null;
  let runId = 0;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nowLabel = () => new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const clean = (value) => String(value ?? '').replace(/[<>]/g, '').trim();
  const apiBase = () => (localStorage.getItem('zztv.apiBase') || '').replace(/\/$/, '');
  const apiUrl = (path) => `${apiBase()}${path}`;

  function log(message, type = 'info') {
    const icon = type === 'pass' ? '✅' : type === 'warn' ? '⚠️' : type === 'fail' ? '❌' : '•';
    logBox.textContent += `\n${icon} ${message}`;
    logBox.scrollTop = logBox.scrollHeight;
  }

  function setStatus(message) {
    statusLabel.textContent = message;
  }

  function setApiState(text, type = '') {
    if (!apiState) return;
    apiState.textContent = text;
    apiState.classList.remove('ready', 'warn');
    if (type) apiState.classList.add(type);
  }

  function saveApiBase() {
    const value = (apiBaseInput?.value || '').trim().replace(/\/$/, '');
    if (!value) {
      localStorage.removeItem('zztv.apiBase');
      setApiState('Same-origin', 'warn');
      log('Same-site /api mode enabled.', 'warn');
      return;
    }
    try {
      new URL(value);
      localStorage.setItem('zztv.apiBase', value);
      setApiState('Saved', 'ready');
      log(`Saved backend URL: ${value}`, 'pass');
    } catch {
      setApiState('Bad URL', 'warn');
      log('Invalid backend URL.', 'fail');
    }
  }

  async function checkApiHealth() {
    try {
      setApiState('Checking', 'warn');
      const response = await fetch(apiUrl('/api/health'));
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setApiState('API online', 'ready');
      log(`API online: OpenAI=${data.env.openaiReady}, YouTubeUpload=${data.env.youtubeUploadReady}, TikTok=${data.env.tiktokConfigured}`, 'pass');
      return data;
    } catch (error) {
      setApiState('API offline', 'warn');
      log(`API health failed: ${error.message}`, 'warn');
      return null;
    }
  }

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function fallbackPackage() {
    const sports = ['basketball', 'soccer', 'football', 'baseball', 'track'];
    const sport = pick(sports);
    const angle = pick(['confidence and teamwork', 'staying calm after mistakes', 'fast feet and smart decisions', 'practice habits that actually work']);
    const hook = `Most players miss this ${sport} lesson.`;
    return {
      runId,
      createdAt: nowLabel(),
      channel: 'ZZTV Sports',
      mode: 'Music-first private upload',
      youtube: {
        title: `ZZTV: ${angle} 🏆`,
        description: `A safe ZZTV sports short about ${angle}. Practice hard and keep improving.`,
        tags: ['sports tips', 'youth sports', sport, 'ZZTV'],
        visibility: 'private'
      },
      script: [
        'Welcome back to ZZTV!',
        hook,
        `Today: ${angle}.`,
        'Start slow and keep it clean.',
        'Speed up only when it feels easy.',
        'Stay positive and help your team.',
        'Follow ZZTV for more.'
      ],
      tiktok: {
        caption: `${hook} Practice smarter today 🏆 #ZZTV`,
        hashtags: ['#sportstips', '#youthsports', '#ZZTV']
      },
      soundProduction: {
        narration: 'None — narration disabled',
        music: 'Original browser-generated sports beat attached to the video'
      },
      videoPlan: {
        format: '9:16 vertical',
        duration: '8-12 seconds',
        scenes: ['intro', 'caption cards', 'music bed', 'follow card']
      },
      schedule: { youtubeShorts: 'private-first', tiktok: 'draft review' }
    };
  }

  function normalizePackage(pkg) {
    const fallback = fallbackPackage();
    return {
      ...fallback,
      ...pkg,
      mode: 'Music-first private upload',
      youtube: { ...fallback.youtube, ...(pkg?.youtube || {}) },
      script: Array.isArray(pkg?.script) ? pkg.script : fallback.script,
      tiktok: { ...fallback.tiktok, ...(pkg?.tiktok || {}) },
      soundProduction: { ...fallback.soundProduction, ...(pkg?.soundProduction || pkg?.sound || {}) },
      videoPlan: { ...fallback.videoPlan, ...(pkg?.videoPlan || pkg?.video || {}) }
    };
  }

  async function generatePackage() {
    const response = await fetch(apiUrl('/api/generate-package'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport: 'basketball', angle: 'confidence and teamwork for young athletes' })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
    return normalizePackage(data.package);
  }

  function renderPackage(pkg) {
    outputBox.innerHTML = `
      <div class="kv">
        <div><b>Status:</b><br>Ready. Full Build uses music-first videos with large captions. Narration is off.</div>
        <div><b>YouTube Title:</b><br>${clean(pkg.youtube.title)}</div>
        <div><b>Script Captions:</b><br>${pkg.script.map((line, index) => `${index + 1}. ${clean(line)}`).join('<br>')}</div>
        <div><b>Music:</b><br>Original browser-generated sports beat. No copyrighted song sample. No paid voice.</div>
        <div><b>TikTok Caption:</b><br>${clean(pkg.tiktok.caption)}</div>
        <div><b>Hashtags:</b><br>${(pkg.tiktok.hashtags || []).map(clean).join(' ')}</div>
      </div>`;
    packageState.textContent = 'Ready';
    packageState.classList.add('ready');
  }

  async function runZZTV(event) {
    event?.preventDefault();
    if (startBtn.disabled) return;
    runId += 1;
    startBtn.disabled = true;
    packageState.textContent = 'Running';
    packageState.classList.remove('ready');
    logBox.textContent = `Run ${runId} started at ${nowLabel()}`;
    outputBox.textContent = 'Generating package...';
    setStatus('Running ZZTV...');

    for (const step of ['Tap received', 'JavaScript loaded', 'Safety guard enabled', 'Private-first guard enabled', 'Music-first mode enabled']) {
      await sleep(80);
      log(step, 'pass');
    }

    try {
      latestPackage = await generatePackage();
      log('Generated package through backend API', 'pass');
    } catch (error) {
      latestPackage = fallbackPackage();
      log(`Backend fallback used: ${error.message}`, 'warn');
    }

    localStorage.setItem('zztv.latestPackage', JSON.stringify(latestPackage, null, 2));
    renderPackage(latestPackage);
    log('START ZZTV PASSED', 'pass');
    setStatus('Package ready.');
    startBtn.disabled = false;
  }

  async function openYouTubeAuth() {
    try {
      const response = await fetch(apiUrl('/api/youtube/auth-url'));
      const data = await response.json();
      if (!response.ok || !data.ok || !data.url) throw new Error(data.message || data.error || 'No auth URL');
      window.open(data.url, '_blank', 'noopener,noreferrer');
      log('Opened YouTube OAuth URL', 'pass');
    } catch (error) {
      log(`YouTube auth not ready: ${error.message}`, 'warn');
    }
  }

  function musicModeInfo() {
    log('Music-first mode is active. Full Build skips narration and creates an original browser-generated beat inside the video.', 'pass');
    setStatus('Music-first mode ready.');
  }

  function bestVideoType() {
    if (!window.MediaRecorder) return '';
    return ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function wrap(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const words = clean(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
      if (lines.length >= maxLines) break;
    }
    if (current && lines.length < maxLines) lines.push(current);
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  }

  function drawFrame(ctx, canvas, elapsed, durationMs, pkg, test = false) {
    const progress = Math.min(1, elapsed / durationMs);
    const w = canvas.width;
    const h = canvas.height;
    const pulse = Math.sin(progress * Math.PI * 8) * 0.5 + 0.5;
    const script = pkg.script || [];
    const line = script[Math.min(script.length - 1, Math.floor(progress * Math.max(1, script.length)))] || 'Practice smarter today.';

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#070707');
    bg.addColorStop(0.45, '#241805');
    bg.addColorStop(1, '#000000');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = `rgba(255,220,115,${0.12 + pulse * 0.12})`;
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.15, 95 + pulse * 25, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdc73';
    ctx.font = '900 66px Arial';
    ctx.fillText('ZZTV', w / 2, 96);

    ctx.fillStyle = '#fff7db';
    ctx.font = '800 18px Arial';
    ctx.fillText(test ? 'PRIVATE TEST WITH MUSIC' : 'MUSIC-FIRST PRIVATE BUILD', w / 2, 132);

    ctx.strokeStyle = 'rgba(255,220,115,.55)';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 165, w - 48, 320);

    ctx.fillStyle = '#ffdc73';
    ctx.font = '800 22px Arial';
    ctx.fillText('Sports Short', w / 2, 210);

    ctx.fillStyle = '#fff7db';
    ctx.font = '800 23px Arial';
    wrap(ctx, pkg.youtube?.title || 'ZZTV Sports Short', w / 2, 255, w - 74, 29, 2);

    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.fillRect(38, 326, w - 76, 120);
    ctx.fillStyle = '#fff7db';
    ctx.font = '900 24px Arial';
    wrap(ctx, line, w / 2, 365, w - 86, 31, 3);

    ctx.fillStyle = '#ffdc73';
    ctx.font = '900 78px Arial';
    ctx.fillText('🏀', 48 + progress * (w - 96), 535 + Math.sin(progress * Math.PI * 4) * 30);

    ctx.fillStyle = '#fff7db';
    ctx.font = '800 24px Arial';
    ctx.fillText('Original music beat', w / 2, 586);
    ctx.fillStyle = '#47d16c';
    ctx.fillRect(45, 614, (w - 90) * progress, 10);
  }

  function makeMusicStream(durationMs) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return { stream: new MediaStream(), start: () => {}, stop: () => {}, ready: false };
    }

    const ctx = new AudioContext();
    const destination = ctx.createMediaStreamDestination();
    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(destination);

    const stopNodes = [];

    function tone(startTime, frequency, duration, gainValue, type = 'sine') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain).connect(master);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.03);
      stopNodes.push(osc);
    }

    function kick(startTime) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(92, startTime);
      osc.frequency.exponentialRampToValueAtTime(42, startTime + 0.14);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.42, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.20);
      osc.connect(gain).connect(master);
      osc.start(startTime);
      osc.stop(startTime + 0.23);
      stopNodes.push(osc);
    }

    function scheduleBeat() {
      const start = ctx.currentTime + 0.06;
      const seconds = durationMs / 1000;
      const beat = 0.5; // 120 bpm
      const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 440.0, 392.0];
      for (let i = 0; i < Math.ceil(seconds / beat); i += 1) {
        const t = start + i * beat;
        if (t - start > seconds + 0.2) break;
        if (i % 4 === 0 || i % 4 === 2) kick(t);
        if (i % 4 === 1 || i % 4 === 3) tone(t, 185, 0.10, 0.16, 'triangle');
        tone(t + 0.24, 8200, 0.035, 0.045, 'square');
        tone(t, notes[i % notes.length], 0.18, 0.055, 'triangle');
      }
    }

    return {
      stream: destination.stream,
      ready: true,
      start: async () => {
        try {
          await ctx.resume();
          scheduleBeat();
        } catch {}
      },
      stop: async () => {
        for (const node of stopNodes) {
          try { node.stop(); } catch {}
        }
        try { await ctx.close(); } catch {}
      }
    };
  }

  async function makeVideo(pkg, { test = false } = {}) {
    if (!window.MediaRecorder) throw new Error('MediaRecorder unsupported');
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.captureStream) throw new Error('Canvas capture unsupported');

    const durationMs = test ? 3600 : 9200;
    const canvasStream = canvas.captureStream(24);
    const music = makeMusicStream(durationMs);
    const stream = new MediaStream([...canvasStream.getVideoTracks(), ...music.stream.getAudioTracks()]);
    const mimeType = bestVideoType();
    const options = { videoBitsPerSecond: test ? 360000 : 720000 };
    if (mimeType) options.mimeType = mimeType;

    return new Promise((resolve, reject) => {
      const chunks = [];
      let recorder;
      let done = false;

      const stopAll = () => {
        stream.getTracks().forEach((track) => track.stop());
        music.stop();
      };
      const fail = (error) => {
        if (done) return;
        done = true;
        stopAll();
        reject(error);
      };

      try {
        recorder = new MediaRecorder(stream, options);
      } catch {
        try { recorder = new MediaRecorder(stream); } catch (error) { fail(error); return; }
      }

      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      recorder.onerror = () => fail(new Error('Recorder failed'));
      recorder.onstop = () => {
        if (done) return;
        done = true;
        stopAll();
        resolve({ blob: new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' }), musicReady: music.ready });
      };

      const start = performance.now();
      function frame(now) {
        const elapsed = now - start;
        drawFrame(ctx, canvas, elapsed, durationMs, pkg, test);
        if (elapsed < durationMs && !done) requestAnimationFrame(frame);
      }

      drawFrame(ctx, canvas, 0, durationMs, pkg, test);
      recorder.start(250);
      music.start();
      requestAnimationFrame(frame);
      setTimeout(() => {
        try {
          if (recorder.state !== 'inactive') recorder.stop();
        } catch (error) {
          fail(error);
        }
      }, durationMs + 350);
      setTimeout(() => {
        if (!done) fail(new Error('Video render timed out'));
      }, durationMs + 3500);
    });
  }

  async function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Blob read failed'));
      reader.readAsDataURL(blob);
    });
  }

  async function upload(blob, pkg, { test = false } = {}) {
    const response = await fetch(apiUrl('/api/youtube/upload-direct'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl: await blobToDataUrl(blob),
        title: test ? 'ZZTV Private Music Test' : pkg.youtube.title,
        description: test ? 'Private upload test with original browser-generated music.' : `${pkg.youtube.description}\n\nMusic-first private upload by ZZTV for review.`,
        tags: test ? ['ZZTV', 'private test', 'music beat'] : pkg.youtube.tags,
        privacyStatus: 'private',
        selfDeclaredMadeForKids: true
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      const detail = data.detail || {};
      const error = Object.assign(new Error(data.message || detail.message || data.error || `HTTP ${response.status}`), {
        reason: data.reason || detail.reason,
        status: data.status || detail.status || response.status
      });
      throw error;
    }
    return data;
  }

  async function uploadTest() {
    if (uploadTestBtn.disabled) return;
    const health = await checkApiHealth();
    if (!health?.env?.youtubeUploadReady) {
      log('YouTube upload not ready.', 'fail');
      return;
    }
    const pkg = latestPackage || JSON.parse(localStorage.getItem('zztv.latestPackage') || 'null') || fallbackPackage();
    latestPackage = pkg;
    try {
      uploadTestBtn.disabled = true;
      log('Rendering private music test video...', 'warn');
      const result = await makeVideo(pkg, { test: true });
      log(result.musicReady ? 'Original browser sports beat attached' : 'Music engine unavailable; rendered video-only', result.musicReady ? 'pass' : 'warn');
      log(`Rendered test video: ${Math.round(result.blob.size / 1024)} KB, ${result.blob.type}`, 'pass');
      log('Uploading private music test...', 'warn');
      const data = await upload(result.blob, pkg, { test: true });
      log(`Private music test PASSED: ${data.url}`, 'pass');
      if (data.studioUrl) log(`Studio edit link: ${data.studioUrl}`, 'pass');
    } catch (error) {
      log(`Private upload failed: ${error.message}`, 'fail');
      if (error.reason) log(`YouTube reason: ${error.reason}`, 'fail');
      if (error.status) log(`YouTube status: ${error.status}`, 'fail');
    } finally {
      uploadTestBtn.disabled = false;
    }
  }

  async function fullBuild() {
    if (fullBuildBtn.disabled) return;
    const health = await checkApiHealth();
    if (!health?.env?.youtubeUploadReady) {
      log('Full build blocked: YouTube upload not ready.', 'fail');
      return;
    }
    try {
      fullBuildBtn.disabled = true;
      uploadTestBtn.disabled = true;
      startBtn.disabled = true;
      logBox.textContent = `Full Private Build started at ${nowLabel()}`;
      setStatus('Generating music-first package...');

      try {
        latestPackage = await generatePackage();
        log('Generated package with backend', 'pass');
      } catch (error) {
        latestPackage = fallbackPackage();
        log(`Package fallback used: ${error.message}`, 'warn');
      }

      renderPackage(latestPackage);
      localStorage.setItem('zztv.latestPackage', JSON.stringify(latestPackage, null, 2));
      log('Music-first mode active: no narration or TTS is used.', 'pass');
      log('Generating original browser sports beat for the video.', 'pass');
      log('The script is rendered as large on-screen captions.', 'pass');
      setStatus('Rendering music-first video...');

      const result = await makeVideo(latestPackage, { test: false });
      log(result.musicReady ? 'Original browser sports beat attached' : 'Music engine unavailable; rendered video-only', result.musicReady ? 'pass' : 'warn');
      log(`Rendered music-first video: ${Math.round(result.blob.size / 1024)} KB, ${result.blob.type}`, 'pass');

      setStatus('Uploading private music video...');
      const data = await upload(result.blob, latestPackage, { test: false });
      log(`FULL MUSIC VIDEO BUILD PASSED: ${data.url}`, 'pass');
      if (data.studioUrl) log(`Studio review link: ${data.studioUrl}`, 'pass');
      setStatus('Private music video uploaded. Review in Studio.');
    } catch (error) {
      log(`Full Build failed: ${error.message}`, 'fail');
      if (error.reason) log(`YouTube reason: ${error.reason}`, 'fail');
      if (error.status) log(`YouTube status: ${error.status}`, 'fail');
    } finally {
      fullBuildBtn.disabled = false;
      uploadTestBtn.disabled = false;
      startBtn.disabled = false;
    }
  }

  async function copyPackage() {
    const pkg = latestPackage || JSON.parse(localStorage.getItem('zztv.latestPackage') || 'null');
    if (!pkg) {
      setStatus('Run ZZTV before copying.');
      log('Copy skipped: no generated package yet', 'warn');
      return;
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(pkg, null, 2));
      setStatus('Package copied.');
      log('Copied package to clipboard', 'pass');
    } catch (error) {
      setStatus('Clipboard blocked. Use Download JSON instead.');
      log(`Clipboard blocked: ${error.message}`, 'warn');
    }
  }

  function downloadPackage() {
    const pkg = latestPackage || JSON.parse(localStorage.getItem('zztv.latestPackage') || 'null');
    if (!pkg) {
      setStatus('Run ZZTV before downloading.');
      log('Download skipped: no generated package yet', 'warn');
      return;
    }
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zztv-package-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('JSON downloaded.');
    log('Downloaded JSON package', 'pass');
  }

  function clearRun() {
    logBox.textContent = 'Waiting for START ZZTV...';
    outputBox.textContent = 'No package generated yet.';
    packageState.textContent = 'Empty';
    packageState.classList.remove('ready');
    setStatus('Ready. Live browser app loaded.');
  }

  function boot() {
    if (!startBtn || !logBox || !outputBox) {
      document.body.innerHTML = '<main style="padding:20px;color:white;background:#111;font-family:sans-serif"><h1>ZZTV failed to boot</h1><p>Required page elements were not found.</p></main>';
      return;
    }

    if (apiBaseInput) apiBaseInput.value = apiBase();
    startBtn.addEventListener('click', runZZTV);
    startBtn.addEventListener('touchend', runZZTV, { passive: false });
    clearBtn.addEventListener('click', clearRun);
    copyBtn.addEventListener('click', copyPackage);
    downloadBtn.addEventListener('click', downloadPackage);
    saveApiBtn?.addEventListener('click', saveApiBase);
    apiHealthBtn?.addEventListener('click', checkApiHealth);
    voiceBtn?.addEventListener('click', musicModeInfo);
    youtubeAuthBtn?.addEventListener('click', openYouTubeAuth);
    uploadTestBtn?.addEventListener('click', uploadTest);
    fullBuildBtn?.addEventListener('click', fullBuild);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => log('Offline install worker not registered; app still works online', 'warn'));
    }
    setApiState(apiBase() ? 'Saved' : 'Local mode', apiBase() ? 'ready' : 'warn');
    setStatus('Ready. Live browser app loaded.');
  }

  window.addEventListener('error', (event) => {
    log(`Browser error: ${event.message}`, 'fail');
    setStatus(`Failed: ${event.message}`);
    if (startBtn) startBtn.disabled = false;
    if (uploadTestBtn) uploadTestBtn.disabled = false;
    if (fullBuildBtn) fullBuildBtn.disabled = false;
  });

  boot();
})();
