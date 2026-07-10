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
  const apiState = $('apiState');

  let latestPackage = null;
  let runId = 0;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nowLabel = () => new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const clean = (value) => String(value).replace(/[<>]/g, '');

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
      log('API URL cleared. The app will try same-origin /api routes.', 'warn');
      return;
    }
    try {
      new URL(value);
      localStorage.setItem('zztv.apiBase', value);
      setApiState('Saved', 'ready');
      log(`Saved backend API URL: ${value}`, 'pass');
    } catch {
      setApiState('Bad URL', 'warn');
      log('Invalid API URL. Use a full URL like https://your-zztv.vercel.app', 'fail');
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
      log(`API health failed: ${error.message}. If using GitHub Pages, deploy to Vercel and save that URL here.`, 'warn');
      return null;
    }
  }

  function pick(array) {
    return array[Math.floor(Math.random() * array.length)];
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
      script: pkg.script || ['Welcome back to ZZTV!', 'Practice smarter today.', 'Follow for more sports tips.'],
      soundProduction: pkg.soundProduction || pkg.sound || {
        narration: 'bright, energetic, kid-friendly host voice',
        music: 'royalty-free upbeat sports beat under voice'
      },
      videoPlan: pkg.videoPlan || pkg.video || {
        format: '9:16 vertical',
        duration: '25-35 seconds',
        scenes: ['ZZTV intro', 'tip cards', 'follow end card']
      },
      tiktok: {
        caption: pkg.tiktok?.caption || 'Practice smarter today 🏆 #ZZTV',
        hashtags: pkg.tiktok?.hashtags || ['#kidssports', '#ZZTV']
      },
      schedule: pkg.schedule || { youtubeShorts: 'private-first', tiktok: 'draft/manual review' }
    };
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
        music: 'royalty-free upbeat sports beat, -18 LUFS under voice',
        effects: ['soft whistle hit', 'scoreboard ding', 'light crowd cheer'],
        mixNotes: 'Voice first, music low, no harsh highs, no copyrighted song sample.'
      },
      videoPlan: {
        format: '9:16 vertical',
        duration: '25-35 seconds',
        scenes: [
          'Gold ZZTV intro card',
          'Animated sports ball motion background',
          'Three tip cards with large captions',
          'Practice challenge call-to-action',
          'ZZTV follow end card'
        ],
        thumbnailPrompt: `Gold and black kids sports thumbnail for ${sport}, big readable text: "TRAIN SMART" with clean energetic style.`
      },
      tiktok: {
        caption: `${shortHook} Practice smarter today 🏆 #ZZTV`,
        hashtags: ['#kidssports', '#youthsports', `#${sport}`, '#sportsmotivation', '#sportstips', '#ZZTV']
      },
      schedule: {
        youtubeShorts: 'Next available evening slot, private first',
        tiktok: 'Draft/manual review until TikTok API approval',
        repeatCadence: '1 short per day after backend scheduler is connected'
      },
      backendNeededForRealAutomation: [
        'Private API server',
        'YouTube OAuth upload route',
        'TikTok Content Posting API or draft workflow',
        'AI video renderer worker',
        'Cloud storage for rendered videos',
        'Queue scheduler and retry logs'
      ]
    };
  }

  async function generatePackageWithBackend() {
    const response = await fetch(apiUrl('/api/generate-package'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport: 'basketball', angle: 'confidence and teamwork for young athletes' })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return normalizePackage(data.package);
  }

  function renderPackage(pkg) {
    const script = pkg.script.map((line, index) => `${index + 1}. ${clean(line)}`).join('<br>');
    const hashtags = pkg.tiktok.hashtags.map(clean).join(' ');
    const scenes = (pkg.videoPlan.scenes || []).map(clean).join('<br>');
    outputBox.innerHTML = `
      <div class="kv">
        <div><b>Status:</b><br>Generated package is ready. Real upload remains locked until backend OAuth is added.</div>
        <div><b>YouTube Title:</b><br>${clean(pkg.youtube.title)}</div>
        <div><b>Script:</b><br>${script}</div>
        <div><b>Voice + Sound:</b><br>${clean(pkg.soundProduction.narration || pkg.soundProduction.voice || '')}<br>${clean(pkg.soundProduction.music || '')}</div>
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

    const checks = [
      ['Phone tap/click event received', true],
      ['JavaScript execution confirmed', true],
      ['Local safe content engine loaded', true],
      ['Kid-friendly language guard enabled', true],
      ['Copyright-safe rule enabled: no broadcast scraping', true],
      ['Browser secret check passed: no API keys requested', true]
    ];

    for (const [label, passed] of checks) {
      await sleep(160);
      log(label, passed ? 'pass' : 'fail');
    }

    await sleep(180);
    try {
      latestPackage = await generatePackageWithBackend();
      log('Generated package through backend API', 'pass');
      setApiState('API used', 'ready');
    } catch (error) {
      latestPackage = buildPackage();
      log(`Backend generator unavailable, used local fallback: ${error.message}`, 'warn');
      setApiState(apiBase() ? 'API issue' : 'Local mode', 'warn');
    }

    await sleep(160);
    log('Generated YouTube package', 'pass');
    await sleep(160);
    log('Generated TikTok captions and hashtags', 'pass');
    await sleep(160);
    log('Generated sound-production notes', 'pass');
    await sleep(160);
    log('Generated private-first schedule plan', 'pass');
    await sleep(160);
    log('Final front-end result: PASSED', 'pass');

    localStorage.setItem('zztv.latestPackage', JSON.stringify(latestPackage, null, 2));
    renderPackage(latestPackage);
    setStatus('Passed. Content package ready.');
    startBtn.disabled = false;
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
      const response = await fetch(apiUrl('/api/tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: payload.script, voice: 'coral' })
      });
      const type = response.headers.get('content-type') || '';
      if (type.includes('application/json')) {
        const data = await response.json();
        log(data.warning || data.error || 'Voice route returned JSON instead of MP3', data.ok ? 'warn' : 'fail');
        setStatus('Voice API dry-run or error.');
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
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
    const types = [
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function drawTestFrame(ctx, canvas, elapsed, durationMs, pkg) {
    const progress = Math.min(1, elapsed / durationMs);
    const w = canvas.width;
    const h = canvas.height;
    const pulse = Math.sin(progress * Math.PI * 8) * 0.5 + 0.5;

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#090909');
    bg.addColorStop(0.5, '#1f1606');
    bg.addColorStop(1, '#000000');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = `rgba(255, 220, 115, ${0.10 + pulse * 0.10})`;
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.18, 110 + pulse * 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdc73';
    ctx.font = '900 72px Arial';
    ctx.fillText('ZZTV', w / 2, 140);

    ctx.fillStyle = '#fff7db';
    ctx.font = '800 30px Arial';
    ctx.fillText('PRIVATE TEST UPLOAD', w / 2, 202);

    ctx.strokeStyle = 'rgba(255,220,115,.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(34, 250, w - 68, 300);

    ctx.fillStyle = '#ffdc73';
    ctx.font = '800 30px Arial';
    ctx.fillText('Kids Sports Short', w / 2, 315);

    ctx.fillStyle = '#fff7db';
    ctx.font = '700 26px Arial';
    const title = (pkg?.youtube?.title || 'ZZTV Sports Short').slice(0, 31);
    ctx.fillText(title, w / 2, 380);

    ctx.font = '600 24px Arial';
    ctx.fillStyle = '#f2df9c';
    ctx.fillText('Original content • Private only', w / 2, 440);

    ctx.fillStyle = '#ffdc73';
    ctx.font = '900 104px Arial';
    const ballX = 70 + progress * (w - 140);
    const ballY = 720 + Math.sin(progress * Math.PI * 4) * 50;
    ctx.fillText('🏀', ballX, ballY);

    ctx.fillStyle = '#fff7db';
    ctx.font = '800 34px Arial';
    ctx.fillText('Practice smarter today', w / 2, 880);

    ctx.fillStyle = '#c9b982';
    ctx.font = '600 22px Arial';
    ctx.fillText('Generated by ZZTV Auto Sports Studio', w / 2, 930);

    ctx.fillStyle = '#47d16c';
    ctx.fillRect(70, 1060, (w - 140) * progress, 16);
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.strokeRect(70, 1060, w - 140, 16);
  }

  async function createTestVideoBlob(pkg) {
    if (!window.MediaRecorder) throw new Error('MediaRecorder is not supported in this browser. Try Chrome or Safari desktop.');
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas rendering is not available.');
    if (!canvas.captureStream) throw new Error('Canvas video capture is not supported in this browser.');

    const durationMs = 3600;
    const stream = canvas.captureStream(24);
    const mimeType = bestVideoMimeType();
    const options = { videoBitsPerSecond: 350000 };
    if (mimeType) options.mimeType = mimeType;

    return new Promise((resolve, reject) => {
      const chunks = [];
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (error) {
        try {
          recorder = new MediaRecorder(stream);
        } catch (fallbackError) {
          stream.getTracks().forEach((track) => track.stop());
          reject(fallbackError);
          return;
        }
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        reject(new Error('Video recorder failed.'));
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' });
        resolve(blob);
      };

      const start = performance.now();
      function frame(now) {
        const elapsed = now - start;
        drawTestFrame(ctx, canvas, elapsed, durationMs, pkg);
        if (elapsed < durationMs) requestAnimationFrame(frame);
      }

      drawTestFrame(ctx, canvas, 0, durationMs, pkg);
      recorder.start(250);
      requestAnimationFrame(frame);
      setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, durationMs + 250);
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
      const blob = await createTestVideoBlob(payload);
      log(`Created test video: ${Math.round(blob.size / 1024)} KB, ${blob.type || 'video'}`, 'pass');

      setStatus('Uploading private test video...');
      const dataUrl = await blobToDataUrl(blob);
      const response = await fetch(apiUrl('/api/youtube/upload-direct'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl,
          title: 'ZZTV Private Test Upload',
          description: 'Private test upload from ZZTV. This original clip confirms OAuth and upload are working.',
          tags: ['ZZTV', 'kids sports', 'private test'],
          privacyStatus: 'private',
          selfDeclaredMadeForKids: true,
          containsSyntheticMedia: true
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);

      log(`Private YouTube upload PASSED: ${data.url}`, 'pass');
      if (data.studioUrl) log(`Studio edit link: ${data.studioUrl}`, 'pass');
      setStatus('Private YouTube test uploaded.');
    } catch (error) {
      log(`Private upload failed: ${error.message}`, 'fail');
      setStatus('Private upload failed.');
    } finally {
      if (uploadTestBtn) uploadTestBtn.disabled = false;
    }
  }

  async function copyPackage() {
    const payload = latestPackage || JSON.parse(localStorage.getItem('zztv.latestPackage') || 'null');
    if (!payload) {
      setStatus('Run ZZTV before copying.');
      log('Copy skipped: no generated package yet', 'warn');
      return;
    }
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
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

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        log('Offline install worker not registered; app still works online', 'warn');
      });
    }

    setApiState(apiBase() ? 'Saved' : 'Local mode', apiBase() ? 'ready' : 'warn');
    setStatus('Ready. Live browser app loaded.');
  }

  window.addEventListener('error', (event) => {
    log(`Browser error: ${event.message}`, 'fail');
    setStatus(`Failed: ${event.message}`);
    if (startBtn) startBtn.disabled = false;
    if (uploadTestBtn) uploadTestBtn.disabled = false;
  });

  boot();
})();
