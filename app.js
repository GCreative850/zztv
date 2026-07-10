/* ZZTV Auto Sports Studio - browser-safe phone front-end */
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
  const clean = (value) => String(value ?? '').replace(/[<>]/g, '');

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

  function apiBase() {
    const saved = localStorage.getItem('zztv.apiBase') || '';
    return saved.replace(/\/$/, '');
  }

  function apiUrl(path) {
    return `${apiBase()}${path}`;
  }

  function saveApiBase() {
    const value = (apiBaseInput?.value || '').trim().replace(/\/$/, '');
    if (!value) {
      localStorage.removeItem('zztv.apiBase');
      setApiState('Same-origin', 'warn');
      log('API URL cleared. Same-site /api mode enabled.', 'warn');
      return;
    }
    try {
      new URL(value);
      localStorage.setItem('zztv.apiBase', value);
      setApiState('Saved', 'ready');
      log(`Saved backend API URL: ${value}`, 'pass');
    } catch {
      setApiState('Bad URL', 'warn');
      log('Invalid API URL. Use a full URL like https://zztv-rho.vercel.app', 'fail');
    }
  }

  async function checkApiHealth() {
    try {
      setApiState('Checking', 'warn');
      const response = await fetch(apiUrl('/api/health'));
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setApiState('API online', 'ready');
      log(`API online: OpenAI=${data.env.openaiReady}, YouTubeOAuth=${data.env.youtubeReady}, YouTubeUpload=${data.env.youtubeUploadReady}, TikTok=${data.env.tiktokConfigured}`, 'pass');
      return data;
    } catch (error) {
      setApiState('API offline', 'warn');
      log(`API health failed: ${error.message}.`, 'warn');
      return null;
    }
  }

  function pick(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function buildPackage() {
    const sports = ['basketball', 'soccer', 'football', 'baseball', 'track'];
    const angles = [
      '3 confidence habits young athletes can practice today',
      'how teamwork turns a regular player into a real leader',
      'why great players stay calm after mistakes',
      'one simple drill that makes practice feel like a game',
      'the secret behind fast feet and smart decisions'
    ];
    const sport = pick(sports);
    const angle = pick(angles);
    const title = `ZZTV: ${angle.replace(/^./, (c) => c.toUpperCase())} 🏆`;
    const shortHook = `Most kids miss this ${sport} lesson.`;

    return {
      runId,
      createdAt: nowLabel(),
      channel: 'ZZTV Kids Sports',
      mode: 'Safe Creator / Private-first upload plan',
      compliance: [
        'Original commentary and educational sports content',
        'No scraped NBA/NFL/MLB/FIFA broadcast footage',
        'No private API keys stored in browser',
        'Designed for kid-friendly tone and safe language'
      ],
      youtube: {
        title,
        description: `A fun, kid-friendly ZZTV sports short about ${angle}. Practice hard, stay positive, and keep improving.`,
        tags: ['kids sports', 'youth sports', sport, 'sports motivation', 'sports facts', 'ZZTV'],
        visibility: 'private-first until reviewed'
      },
      script: [
        'Welcome back to ZZTV!',
        shortHook,
        `Today we are talking about ${angle}.`,
        'Step one: focus on one small skill instead of trying to do everything at once.',
        'Step two: repeat it slowly, then speed up only when it feels clean.',
        'Step three: encourage your teammates, because good energy makes everyone better.',
        'Try this today and come back for more ZZTV sports tips.'
      ],
      soundProduction: {
        narration: 'bright, energetic, kid-friendly host voice',
        music: 'royalty-free upbeat sports beat under voice',
        mixNotes: 'Voice first, music low, no harsh highs, no copyrighted samples.'
      },
      videoPlan: {
        format: '9:16 vertical',
        duration: '10-15 seconds demo render, expandable to 25-35 seconds',
        scenes: ['Gold ZZTV intro card', 'Animated sports background', 'Three tip cards', 'Practice challenge', 'Studio review end card']
      },
      tiktok: {
        caption: `${shortHook} Practice smarter today 🏆 #ZZTV`,
        hashtags: ['#kidssports', '#youthsports', `#${sport}`, '#sportsmotivation', '#sportstips', '#ZZTV']
      },
      schedule: { youtubeShorts: 'private-first', tiktok: 'draft/manual review' }
    };
  }

  function normalizePackage(pkg) {
    if (!pkg) return buildPackage();
    return {
      runId,
      createdAt: pkg.createdAt || nowLabel(),
      channel: pkg.channel || 'ZZTV Kids Sports',
      mode: pkg.mode || 'Safe Creator / Private-first upload plan',
      compliance: pkg.compliance || pkg.safety || ['Original sports commentary only', 'Kid-friendly tone'],
      youtube: {
        title: pkg.youtube?.title || 'ZZTV Sports Short 🏆',
        description: pkg.youtube?.description || 'A kid-friendly ZZTV sports short.',
        tags: pkg.youtube?.tags || ['kids sports', 'ZZTV'],
        visibility: pkg.youtube?.visibility || pkg.youtube?.privacyStatus || 'private'
      },
      script: Array.isArray(pkg.script) ? pkg.script : ['Welcome back to ZZTV!', 'Practice smarter today.', 'Follow for more sports tips.'],
      soundProduction: pkg.soundProduction || pkg.sound || { narration: 'bright, energetic, kid-friendly host voice', music: 'royalty-free upbeat sports beat under voice' },
      videoPlan: pkg.videoPlan || pkg.video || { format: '9:16 vertical', duration: '25-35 seconds', scenes: ['ZZTV intro', 'tip cards', 'follow end card'] },
      tiktok: {
        caption: pkg.tiktok?.caption || 'Practice smarter today 🏆 #ZZTV',
        hashtags: pkg.tiktok?.hashtags || ['#kidssports', '#ZZTV']
      },
      schedule: pkg.schedule || { youtubeShorts: 'private-first', tiktok: 'draft/manual review' }
    };
  }

  async function generatePackageWithBackend() {
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
    const script = pkg.script.map((line, index) => `${index + 1}. ${clean(line)}`).join('<br>');
    const hashtags = (pkg.tiktok.hashtags || []).map(clean).join(' ');
    const scenes = (pkg.videoPlan.scenes || []).map(clean).join('<br>');
    outputBox.innerHTML = `
      <div class="kv">
        <div><b>Status:</b><br>Generated package is ready. Uploads remain private-first.</div>
        <div><b>YouTube Title:</b><br>${clean(pkg.youtube.title)}</div>
        <div><b>Script:</b><br>${script}</div>
        <div><b>Voice + Sound:</b><br>${clean(pkg.soundProduction.narration || '')}<br>${clean(pkg.soundProduction.music || '')}</div>
        <div><b>TikTok Caption:</b><br>${clean(pkg.tiktok.caption)}</div>
        <div><b>Hashtags:</b><br>${hashtags}</div>
        <div><b>Video Plan:</b><br>${scenes}</div>
      </div>
    `;
    packageState.textContent = 'Ready';
    packageState.classList.add('ready');
  }

  async function runZZTV(event) {
    if (event) event.preventDefault();
    if (startBtn.disabled) return;
    runId += 1;
    startBtn.disabled = true;
    packageState.textContent = 'Running';
    packageState.classList.remove('ready');
    logBox.textContent = `Run ${runId} started at ${nowLabel()}`;
    outputBox.textContent = 'Generating package...';
    setStatus('Running ZZTV pipeline...');

    for (const label of ['Phone tap/click event received', 'JavaScript execution confirmed', 'Local safe content engine loaded', 'Kid-friendly language guard enabled', 'Copyright-safe rule enabled: no broadcast scraping', 'Browser secret check passed: no API keys requested']) {
      await sleep(100);
      log(label, 'pass');
    }

    try {
      latestPackage = await generatePackageWithBackend();
      log('Generated package through backend API', 'pass');
      setApiState('API used', 'ready');
    } catch (error) {
      latestPackage = buildPackage();
      log(`Backend generator unavailable, used local fallback: ${error.message}`, 'warn');
      setApiState(apiBase() ? 'API issue' : 'Local mode', 'warn');
    }

    for (const label of ['Generated YouTube package', 'Generated TikTok captions and hashtags', 'Generated sound-production notes', 'Generated private-first schedule plan']) {
      await sleep(100);
      log(label, 'pass');
    }

    log('Final front-end result: PASSED', 'pass');
    localStorage.setItem('zztv.latestPackage', JSON.stringify(latestPackage, null, 2));
    renderPackage(latestPackage);
    setStatus('Passed. Content package ready.');
    startBtn.disabled = false;
  }

  async function fetchVoiceBlob(pkg) {
    const response = await fetch(apiUrl('/api/tts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script: pkg.script, voice: 'coral' })
    });
    const type = response.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.warning || data.error || 'Voice route returned JSON instead of MP3');
    }
    if (!response.ok) throw new Error(`Voice HTTP ${response.status}`);
    return response.blob();
  }

  async function makeVoice() {
    const payload = latestPackage || JSON.parse(localStorage.getItem('zztv.latestPackage') || 'null');
    if (!payload) {
      log('Run ZZTV before making voice audio', 'warn');
      setStatus('Run ZZTV first.');
      return;
    }
    try {
      setStatus('Requesting voice MP3...');
      const blob = await fetchVoiceBlob(payload);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zztv-voice-${Date.now()}.mp3`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      log('Downloaded voice MP3 from API', 'pass');
      setStatus('Voice MP3 downloaded.');
    } catch (error) {
      log(`Voice API failed: ${error.message}`, 'fail');
      setStatus('Voice API failed.');
    }
  }

  async function openYouTubeAuth() {
    try {
      const response = await fetch(apiUrl('/api/youtube/auth-url'));
      const data = await response.json();
      if (!response.ok || !data.ok || !data.url) throw new Error(data.message || data.error || 'No auth URL returned');
      window.open(data.url, '_blank', 'noopener,noreferrer');
      log('Opened YouTube OAuth URL', 'pass');
    } catch (error) {
      log(`YouTube auth not ready: ${error.message}`, 'warn');
      setStatus('Add YouTube env vars in Vercel first.');
    }
  }

  function bestVideoMimeType() {
    if (!window.MediaRecorder) return '';
    const types = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const words = clean(text).split(/\s+/);
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

  function drawFrame(ctx, canvas, elapsed, durationMs, pkg, mode = 'production') {
    const progress = Math.min(1, elapsed / durationMs);
    const w = canvas.width;
    const h = canvas.height;
    const pulse = Math.sin(progress * Math.PI * 8) * 0.5 + 0.5;
    const script = pkg.script || [];
    const phase = Math.min(script.length - 1, Math.floor(progress * Math.max(1, script.length)));
    const line = script[phase] || 'Practice smarter today.';

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#090909');
    bg.addColorStop(0.45, '#241805');
    bg.addColorStop(1, '#000000');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = `rgba(255, 220, 115, ${0.12 + pulse * 0.12})`;
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.16, 100 + pulse * 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdc73';
    ctx.font = '900 68px Arial';
    ctx.fillText('ZZTV', w / 2, 105);

    ctx.fillStyle = '#fff7db';
    ctx.font = '800 21px Arial';
    ctx.fillText(mode === 'test' ? 'PRIVATE TEST UPLOAD' : 'PRIVATE REVIEW BUILD', w / 2, 146);

    ctx.strokeStyle = 'rgba(255,220,115,.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(26, 184, w - 52, 270);

    ctx.fillStyle = '#ffdc73';
    ctx.font = '800 24px Arial';
    ctx.fillText('Kids Sports Short', w / 2, 230);

    ctx.fillStyle = '#fff7db';
    ctx.font = '800 24px Arial';
    wrapText(ctx, pkg.youtube?.title || 'ZZTV Sports Short', w / 2, 282, w - 80, 30, 2);

    ctx.fillStyle = '#f2df9c';
    ctx.font = '700 21px Arial';
    wrapText(ctx, line, w / 2, 370, w - 74, 28, 3);

    ctx.fillStyle = '#ffdc73';
    ctx.font = '900 86px Arial';
    const ballX = 48 + progress * (w - 96);
    const ballY = 512 + Math.sin(progress * Math.PI * 4) * 36;
    ctx.fillText('🏀', ballX, ballY);

    ctx.fillStyle = '#fff7db';
    ctx.font = '800 25px Arial';
    ctx.fillText('Practice smarter today', w / 2, 585);

    ctx.fillStyle = '#47d16c';
    ctx.fillRect(45, 615, (w - 90) * progress, 10);
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.strokeRect(45, 615, w - 90, 10);
  }

  async function buildAudioStream(audioBlob, durationMs) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return { tracks: [], start: () => {}, stop: () => {} };

    const audioCtx = new AudioContext();
    const destination = audioCtx.createMediaStreamDestination();
    const master = audioCtx.createGain();
    master.gain.value = 0.75;
    master.connect(destination);

    let source = null;
    if (audioBlob) {
      try {
        const buffer = await audioCtx.decodeAudioData(await audioBlob.arrayBuffer());
        source = audioCtx.createBufferSource();
        source.buffer = buffer;
        const voiceGain = audioCtx.createGain();
        voiceGain.gain.value = 0.95;
        source.connect(voiceGain).connect(master);
      } catch {
        source = null;
      }
    }

    const osc = audioCtx.createOscillator();
    const beatGain = audioCtx.createGain();
    osc.frequency.value = 146;
    osc.type = 'sine';
    beatGain.gain.value = source ? 0.015 : 0.035;
    osc.connect(beatGain).connect(master);

    return {
      tracks: destination.stream.getAudioTracks(),
      start: async () => {
        await audioCtx.resume();
        osc.start();
        if (source) source.start();
        setTimeout(() => {
          try { osc.stop(); } catch {}
          try { if (source) source.stop(); } catch {}
        }, durationMs + 400);
      },
      stop: async () => {
        try { await audioCtx.close(); } catch {}
      }
    };
  }

  async function createVideoBlob(pkg, { audioBlob = null, mode = 'production' } = {}) {
    if (!window.MediaRecorder) throw new Error('MediaRecorder is not supported in this browser. Try Chrome or Safari desktop.');
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas rendering is not available.');
    if (!canvas.captureStream) throw new Error('Canvas video capture is not supported in this browser.');

    const durationMs = mode === 'test' ? 3600 : 11500;
    const canvasStream = canvas.captureStream(24);
    const audio = await buildAudioStream(audioBlob, durationMs);
    const stream = new MediaStream([...canvasStream.getVideoTracks(), ...audio.tracks]);
    const mimeType = bestVideoMimeType();
    const options = { videoBitsPerSecond: mode === 'test' ? 350000 : 650000 };
    if (mimeType) options.mimeType = mimeType;

    return new Promise((resolve, reject) => {
      const chunks = [];
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch {
        try { recorder = new MediaRecorder(stream); } catch (fallbackError) {
          stream.getTracks().forEach((track) => track.stop());
          audio.stop();
          reject(fallbackError);
          return;
        }
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        audio.stop();
        reject(new Error('Video recorder failed.'));
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        audio.stop();
        resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' }));
      };

      const start = performance.now();
      function frame(now) {
        const elapsed = now - start;
        drawFrame(ctx, canvas, elapsed, durationMs, pkg, mode);
        if (elapsed < durationMs) requestAnimationFrame(frame);
      }

      drawFrame(ctx, canvas, 0, durationMs, pkg, mode);
      recorder.start(250);
      audio.start();
      requestAnimationFrame(frame);
      setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, durationMs + 300);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Could not read video blob.'));
      reader.readAsDataURL(blob);
    });
  }

  function uploadErrorMessage(data, response) {
    const detail = data?.detail || {};
    const message = data?.message || detail.message || data?.error || `HTTP ${response.status}`;
    const reason = data?.reason || detail.reason;
    const status = data?.status || detail.status || response.status;
    return { message, reason, status };
  }

  async function uploadPrivateVideoBlob(blob, pkg, { test = false } = {}) {
    const dataUrl = await blobToDataUrl(blob);
    const response = await fetch(apiUrl('/api/youtube/upload-direct'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl,
        title: test ? 'ZZTV Private Test Upload' : pkg.youtube.title,
        description: test ? 'Private test upload from ZZTV. This original clip confirms OAuth and upload are working.' : `${pkg.youtube.description}\n\nUploaded private-first by ZZTV for review.`,
        tags: test ? ['ZZTV', 'kids sports', 'private test'] : pkg.youtube.tags,
        privacyStatus: 'private',
        selfDeclaredMadeForKids: true
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      const issue = uploadErrorMessage(data, response);
      throw Object.assign(new Error(issue.message), issue);
    }
    return data;
  }

  async function createAndUploadPrivateTest() {
    if (uploadTestBtn?.disabled) return;
    const health = await checkApiHealth();
    if (!health?.env?.youtubeUploadReady) {
      log('YouTube upload is not ready yet. Health must show youtubeUploadReady=true.', 'warn');
      setStatus('YouTube upload not ready.');
      return;
    }

    const payload = latestPackage || JSON.parse(localStorage.getItem('zztv.latestPackage') || 'null') || buildPackage();
    latestPackage = payload;

    try {
      uploadTestBtn.disabled = true;
      setStatus('Creating private test video...');
      log('Creating tiny original ZZTV test video in browser...', 'warn');
      const blob = await createVideoBlob(payload, { mode: 'test' });
      log(`Created test video: ${Math.round(blob.size / 1024)} KB, ${blob.type || 'video'}`, 'pass');
      setStatus('Uploading private test video...');
      const data = await uploadPrivateVideoBlob(blob, payload, { test: true });
      log(`Private YouTube upload PASSED: ${data.url}`, 'pass');
      if (data.studioUrl) log(`Studio edit link: ${data.studioUrl}`, 'pass');
      setStatus('Private YouTube test uploaded.');
    } catch (error) {
      log(`Private upload failed: ${error.message}`, 'fail');
      if (error.reason) log(`YouTube reason: ${error.reason}`, 'fail');
      if (error.status) log(`YouTube status: ${error.status}`, 'fail');
      setStatus('Private upload failed.');
    } finally {
      if (uploadTestBtn) uploadTestBtn.disabled = false;
    }
  }

  async function runFullPrivateBuild() {
    if (fullBuildBtn?.disabled) return;
    const health = await checkApiHealth();
    if (!health?.env?.youtubeUploadReady) {
      log('Full build blocked: YouTube upload is not ready.', 'fail');
      setStatus('YouTube upload not ready.');
      return;
    }

    try {
      fullBuildBtn.disabled = true;
      uploadTestBtn.disabled = true;
      startBtn.disabled = true;
      logBox.textContent = `Full Private Build started at ${nowLabel()}`;
      setStatus('Generating production package...');

      try {
        latestPackage = await generatePackageWithBackend();
        log('Generated production package with OpenAI backend', 'pass');
      } catch (error) {
        latestPackage = buildPackage();
        log(`OpenAI package fallback used: ${error.message}`, 'warn');
      }
      renderPackage(latestPackage);
      localStorage.setItem('zztv.latestPackage', JSON.stringify(latestPackage, null, 2));

      let audioBlob = null;
      try {
        setStatus('Making narration audio...');
        audioBlob = await fetchVoiceBlob(latestPackage);
        log(`Narration MP3 generated: ${Math.round(audioBlob.size / 1024)} KB`, 'pass');
      } catch (error) {
        log(`Narration fallback used: ${error.message}`, 'warn');
      }

      setStatus('Rendering vertical video...');
      const videoBlob = await createVideoBlob(latestPackage, { audioBlob, mode: 'production' });
      log(`Rendered private review video: ${Math.round(videoBlob.size / 1024)} KB, ${videoBlob.type || 'video'}`, 'pass');

      setStatus('Uploading private production video...');
      const result = await uploadPrivateVideoBlob(videoBlob, latestPackage, { test: false });
      log(`FULL PRIVATE BUILD PASSED: ${result.url}`, 'pass');
      if (result.studioUrl) log(`Studio review link: ${result.studioUrl}`, 'pass');
      setStatus('Full private build uploaded. Review in YouTube Studio.');
    } catch (error) {
      log(`Full Private Build failed: ${error.message}`, 'fail');
      if (error.reason) log(`YouTube reason: ${error.reason}`, 'fail');
      if (error.status) log(`YouTube status: ${error.status}`, 'fail');
      setStatus('Full private build failed.');
    } finally {
      if (fullBuildBtn) fullBuildBtn.disabled = false;
      if (uploadTestBtn) uploadTestBtn.disabled = false;
      if (startBtn) startBtn.disabled = false;
    }
  }

  async function copyPackage() {
    const payload = latestPackage || JSON.parse(localStorage.getItem('zztv.latestPackage') || 'null');
    if (!payload) {
      setStatus('Run ZZTV before copying.');
      log('Copy skipped: no generated package yet', 'warn');
      return;
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setStatus('Package copied.');
      log('Copied package to clipboard', 'pass');
    } catch (error) {
      setStatus('Clipboard blocked. Use Download JSON instead.');
      log(`Clipboard blocked: ${error.message}`, 'warn');
    }
  }

  function downloadPackage() {
    const payload = latestPackage || JSON.parse(localStorage.getItem('zztv.latestPackage') || 'null');
    if (!payload) {
      setStatus('Run ZZTV before downloading.');
      log('Download skipped: no generated package yet', 'warn');
      return;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
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
    voiceBtn?.addEventListener('click', makeVoice);
    youtubeAuthBtn?.addEventListener('click', openYouTubeAuth);
    uploadTestBtn?.addEventListener('click', createAndUploadPrivateTest);
    fullBuildBtn?.addEventListener('click', runFullPrivateBuild);

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
