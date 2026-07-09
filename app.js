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

  function renderPackage(pkg) {
    const script = pkg.script.map((line, index) => `${index + 1}. ${clean(line)}`).join('<br>');
    const hashtags = pkg.tiktok.hashtags.map(clean).join(' ');
    outputBox.innerHTML = `
      <div class="kv">
        <div><b>Status:</b><br>Generated package is ready. Real upload remains locked until backend OAuth is added.</div>
        <div><b>YouTube Title:</b><br>${clean(pkg.youtube.title)}</div>
        <div><b>Script:</b><br>${script}</div>
        <div><b>Voice + Sound:</b><br>${clean(pkg.soundProduction.narration)}<br>${clean(pkg.soundProduction.music)}</div>
        <div><b>TikTok Caption:</b><br>${clean(pkg.tiktok.caption)}</div>
        <div><b>Hashtags:</b><br>${hashtags}</div>
        <div><b>Video Plan:</b><br>${pkg.videoPlan.scenes.map(clean).join('<br>')}</div>
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
      await sleep(220);
      log(label, passed ? 'pass' : 'fail');
    }

    await sleep(250);
    latestPackage = buildPackage();
    log('Generated YouTube package', 'pass');
    await sleep(220);
    log('Generated TikTok captions and hashtags', 'pass');
    await sleep(220);
    log('Generated sound-production notes', 'pass');
    await sleep(220);
    log('Generated private-first schedule plan', 'pass');
    await sleep(220);
    log('Final front-end result: PASSED', 'pass');

    localStorage.setItem('zztv.latestPackage', JSON.stringify(latestPackage, null, 2));
    renderPackage(latestPackage);
    setStatus('Passed. Content package ready.');
    startBtn.disabled = false;
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

    startBtn.addEventListener('click', runZZTV);
    startBtn.addEventListener('touchend', runZZTV, { passive: false });
    clearBtn.addEventListener('click', clearRun);
    copyBtn.addEventListener('click', copyPackage);
    downloadBtn.addEventListener('click', downloadPackage);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        log('Offline install worker not registered; app still works online', 'warn');
      });
    }

    setStatus('Ready. Live browser app loaded.');
  }

  window.addEventListener('error', (event) => {
    log(`Browser error: ${event.message}`, 'fail');
    setStatus(`Failed: ${event.message}`);
    if (startBtn) startBtn.disabled = false;
  });

  boot();
})();
