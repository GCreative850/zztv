(()=>{
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const STORAGE_KEY = 'zztv_queue_v3';
  const SCENE_SECONDS = 3.2;
  const INTRO_SECONDS = 0.9;
  const OUTRO_SECONDS = 1.25;

  let queue = [];
  let current = null;
  let narrationBlob = null;
  let narrationUrl = '';
  let musicUrl = '';
  let renderUrl = '';
  let visualAssets = [];
  let raf = 0;

  try {
    queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (_) {
    queue = [];
  }

  const banks = {
    sports: [
      ['The athlete who returned after everyone counted him out', 'One injury nearly ended everything, but the comeback became bigger than the setback.'],
      ['The draft pick nobody believed in', 'Every team passed on him until one decision changed sports history.'],
      ['The game decided in the final second', 'The entire season came down to one play nobody could repeat.']
    ],
    money: [
      ['The tiny idea that became a billion-dollar company', 'It started as a problem people ignored until one person built the simplest answer.'],
      ['The business mistake that cost millions', 'One decision looked harmless until the bill arrived.'],
      ['Why some brands sell the same thing for ten times more', 'The product is only part of what customers are actually buying.']
    ],
    history: [
      ['The city that disappeared almost overnight', 'People went to sleep believing everything was normal, then history changed before morning.'],
      ['The message that arrived decades too late', 'A simple delivery exposed a story nobody expected to survive.'],
      ['The ruler defeated by one small mistake', 'An empire weakened because of a detail everyone overlooked.']
    ],
    science: [
      ['The place where time moves differently', 'Physics predicts a tiny difference that becomes real under extreme conditions.'],
      ['The sound humans cannot hear', 'An invisible signal surrounds us, but our ears miss it completely.'],
      ['The animal that survives what should be impossible', 'Its body uses a defense that sounds more like science fiction.']
    ]
  };

  const closers = [
    'That is why this story is still remembered.',
    'The real lesson is that one decision can change everything.',
    'Follow ZZTV for another story most people never heard.'
  ];

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function pick(niche) {
    if (niche === 'mixed') {
      const keys = Object.keys(banks);
      niche = keys[Math.floor(Math.random() * keys.length)];
    }
    const pair = banks[niche][Math.floor(Math.random() * banks[niche].length)];
    return { niche, topic: pair[0], hook: pair[1] };
  }

  function makeVideo(seed) {
    const picked = pick($('#niche').value);
    return {
      id: Date.now() + seed + Math.random(),
      ...picked,
      script: `${picked.hook}\n\nHere is what happened. ${picked.topic} began with a situation that looked ordinary, but one overlooked detail changed the outcome. As pressure increased, the people involved had very little time to react. What followed became a lesson in timing, preparation, and how quickly an ordinary moment can become unforgettable.\n\n${closers[Math.floor(Math.random() * closers.length)]}`,
      title: `${picked.topic} — The Full Story`,
      caption: `Most people never heard the full story behind ${picked.topic.toLowerCase()}.`,
      hashtags: `#ZZTV #Shorts #TikTok #FacelessContent #${picked.niche}`
    };
  }

  function saveQueue() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    renderQueue();
  }

  function renderQueue() {
    $('#count').textContent = `${queue.length} ready`;
    $('#queue').innerHTML = queue.length
      ? queue.map((video, index) => `
        <div class="queueItem">
          <div class="num">${String(index + 1).padStart(2, '0')}</div>
          <div class="queueText">
            <strong>${esc(video.topic)}</strong>
            <span>${esc(video.niche)} · script ready</span>
          </div>
          <button class="btn secondary mini" data-open="${index}">Open</button>
        </div>`).join('')
      : '<div class="card hint">Generate a queue to begin.</div>';

    $$('[data-open]').forEach((button) => {
      button.onclick = () => openVideo(Number(button.dataset.open));
    });
  }

  function revokeUrl(url) {
    if (url) URL.revokeObjectURL(url);
  }

  function clearRenderUrls() {
    revokeUrl(narrationUrl);
    revokeUrl(renderUrl);
    narrationUrl = '';
    renderUrl = '';
    narrationBlob = null;
    $('#voiceAudio').hidden = true;
    $('#videoResult').hidden = true;
    $('#downloadVideo').classList.remove('show');
    $('#downloadAudio').classList.remove('show');
  }

  function clearVisualAssets() {
    visualAssets.forEach((asset) => {
      if (asset.el && asset.el.pause) asset.el.pause();
      revokeUrl(asset.url);
    });
    visualAssets = [];
  }

  function openVideo(index) {
    current = queue[index];
    clearRenderUrls();
    $('#topic').textContent = current.topic;
    $('#script').value = current.script;
    $('#title').textContent = current.title;
    $('#social').textContent = `${current.caption}\n\n${current.hashtags}`;
    $('#workspace').classList.add('show');
    drawFrame(0, 20);
    $('#workspace').scrollIntoView({ behavior: 'smooth' });
  }

  async function generateVoice() {
    if (!current) return toast('Open a video first');
    current.script = $('#script').value.trim();
    if (!current.script) return toast('Script is empty');

    const button = $('#generateVoice');
    button.disabled = true;
    button.textContent = 'Generating Voice…';
    $('#voiceStatus').textContent = 'ElevenLabs is creating narration…';

    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: current.script,
          style: $('#voiceStyle').value,
          voiceId: $('#voiceId').value.trim() || undefined
        })
      });

      if (!response.ok) {
        let message = 'Voice generation failed';
        try {
          message = (await response.json()).error || message;
        } catch (_) {}
        throw new Error(message);
      }

      narrationBlob = await response.blob();
      revokeUrl(narrationUrl);
      narrationUrl = URL.createObjectURL(narrationBlob);
      $('#voiceAudio').src = narrationUrl;
      $('#voiceAudio').hidden = false;
      $('#downloadAudio').href = narrationUrl;
      $('#downloadAudio').classList.add('show');
      $('#voiceStatus').textContent = 'Narration ready. Preview it or build the video.';
      try { await $('#voiceAudio').play(); } catch (_) {}
      toast('Voice ready');
    } catch (error) {
      $('#voiceStatus').textContent = error.message;
      toast(error.message);
    } finally {
      button.disabled = false;
      button.textContent = 'Generate Human Voice';
    }
  }

  function createVisualAsset(file) {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      const el = document.createElement('video');
      el.src = url;
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.preload = 'auto';
      return { type: 'video', file, url, el };
    }
    const el = new Image();
    el.src = url;
    return { type: 'image', file, url, el };
  }

  async function loadVisuals(files) {
    const selected = [...files].slice(0, 12);
    if (!selected.length) return;
    clearVisualAssets();
    visualAssets = selected.map(createVisualAsset);

    await Promise.all(visualAssets.map((asset) => new Promise((resolve) => {
      const finish = () => resolve();
      if (asset.type === 'video') {
        asset.el.onloadedmetadata = finish;
        asset.el.onerror = finish;
      } else {
        asset.el.onload = finish;
        asset.el.onerror = finish;
      }
      setTimeout(finish, 3000);
    })));

    for (const asset of visualAssets) {
      if (asset.type === 'video') {
        asset.el.currentTime = 0;
        asset.el.play().catch(() => {});
      }
    }

    $('#visualStatus').textContent = `${visualAssets.length} visual${visualAssets.length === 1 ? '' : 's'} loaded · automatic scene changes enabled.`;
    drawFrame(0, 20);
    toast(`${visualAssets.length} visuals loaded`);
  }

  function loadMusic(file) {
    if (!file) return;
    revokeUrl(musicUrl);
    musicUrl = URL.createObjectURL(file);
    $('#musicAudio').src = musicUrl;
    $('#musicAudio').hidden = false;
    toast('Music loaded');
  }

  function assetDimensions(asset) {
    return asset.type === 'video'
      ? { width: asset.el.videoWidth, height: asset.el.videoHeight }
      : { width: asset.el.naturalWidth, height: asset.el.naturalHeight };
  }

  function drawAssetCover(ctx, asset, width, height, time, sceneIndex, alpha = 1) {
    if (!asset || !asset.el) return false;
    const { width: sourceWidth, height: sourceHeight } = assetDimensions(asset);
    if (!sourceWidth || !sourceHeight) return false;

    const local = (time % SCENE_SECONDS) / SCENE_SECONDS;
    const directions = [
      [-0.035, -0.02], [0.035, -0.015], [-0.02, 0.03], [0.025, 0.025]
    ];
    const direction = directions[sceneIndex % directions.length];
    const zoom = 1.06 + local * 0.09;
    const baseScale = Math.max(width / sourceWidth, height / sourceHeight);
    const scale = baseScale * zoom;
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const panX = direction[0] * width * (local - 0.5);
    const panY = direction[1] * height * (local - 0.5);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      asset.el,
      (width - drawWidth) / 2 + panX,
      (height - drawHeight) / 2 + panY,
      drawWidth,
      drawHeight
    );
    ctx.restore();
    return true;
  }

  function drawFallback(ctx, width, height, time) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#3d2509');
    gradient.addColorStop(0.43, '#0b0e18');
    gradient.addColorStop(1, '#04050a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let index = 0; index < 18; index += 1) {
      ctx.fillStyle = `rgba(244,207,120,${0.012 + index * 0.0018})`;
      ctx.beginPath();
      ctx.arc((index * 211 + time * 42) % width, (index * 307) % height, 110 + index * 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawScene(ctx, width, height, time, duration) {
    if (!visualAssets.length) {
      drawFallback(ctx, width, height, time);
      return;
    }

    const sceneIndex = Math.floor(time / SCENE_SECONDS);
    const activeIndex = sceneIndex % visualAssets.length;
    const active = visualAssets[activeIndex];
    const localSeconds = time % SCENE_SECONDS;
    const transitionStart = SCENE_SECONDS - 0.45;
    const transition = clamp((localSeconds - transitionStart) / 0.45, 0, 1);

    drawAssetCover(ctx, active, width, height, time, sceneIndex, 1);
    if (transition > 0 && visualAssets.length > 1 && time < duration - 0.5) {
      const next = visualAssets[(activeIndex + 1) % visualAssets.length];
      drawAssetCover(ctx, next, width, height, time + 0.45, sceneIndex + 1, transition);
    }
  }

  function scriptWords() {
    return $('#script').value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  }

  function activeCaption(time, duration) {
    const words = scriptWords();
    if (!words.length) return { words: [], active: 0, phase: 1 };
    const exact = clamp(time / Math.max(duration, 0.1), 0, 0.999999) * words.length;
    const globalIndex = Math.floor(exact);
    const chunkSize = 5;
    const start = Math.floor(globalIndex / chunkSize) * chunkSize;
    return {
      words: words.slice(start, start + chunkSize),
      active: globalIndex - start,
      phase: exact - globalIndex
    };
  }

  function layoutCaptionLines(ctx, words, maxWidth, gap) {
    const lines = [];
    let currentLine = [];
    let currentWidth = 0;

    words.forEach((word, index) => {
      const width = ctx.measureText(word).width;
      const addition = currentLine.length ? gap + width : width;
      if (currentLine.length && currentWidth + addition > maxWidth) {
        lines.push(currentLine);
        currentLine = [];
        currentWidth = 0;
      }
      currentLine.push({ word, index, width });
      currentWidth += currentLine.length === 1 ? width : gap + width;
    });

    if (currentLine.length) lines.push(currentLine);
    return lines;
  }

  function drawWord(ctx, text, x, y, isActive, phase) {
    const pop = isActive ? 1 + 0.16 * Math.max(0, 1 - phase * 2.3) : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 22;
    ctx.strokeStyle = 'rgba(0,0,0,.92)';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = isActive ? '#f4cf78' : '#ffffff';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  function drawCaptions(ctx, width, height, time, duration) {
    const caption = activeCaption(time, duration);
    if (!caption.words.length) return;

    ctx.font = '900 72px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const gap = 28;
    const lines = layoutCaptionLines(ctx, caption.words, width - 150, gap).slice(0, 3);
    const lineHeight = 92;
    const baseY = height * 0.71 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, lineIndex) => {
      const lineWidth = line.reduce((sum, entry) => sum + entry.width, 0) + gap * (line.length - 1);
      let cursor = (width - lineWidth) / 2;
      line.forEach((entry) => {
        drawWord(
          ctx,
          entry.word,
          cursor,
          baseY + lineIndex * lineHeight,
          entry.index === caption.active,
          caption.phase
        );
        cursor += entry.width + gap;
      });
    });
  }

  function drawBranding(ctx, width, height, time) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f4cf78';
    ctx.font = '1000 52px -apple-system, sans-serif';
    ctx.fillText('ZZTV', 62, 90);
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.font = '800 28px -apple-system, sans-serif';
    ctx.fillText((current?.niche || 'STORY').toUpperCase(), 62, 132);

    const pulse = 0.55 + Math.sin(time * 2.6) * 0.12;
    ctx.fillStyle = `rgba(244,207,120,${pulse})`;
    ctx.fillRect(62, height - 86, 58, 4);
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.font = '800 28px -apple-system, sans-serif';
    ctx.fillText('@ZZTV', 136, height - 72);
  }

  function drawIntro(ctx, width, height, time) {
    if (time >= INTRO_SECONDS) return;
    const progress = clamp(time / INTRO_SECONDS, 0, 1);
    const scale = 0.72 + easeOutBack(progress) * 0.28;
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.82 * (1 - progress)})`;
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f4cf78';
    ctx.font = '1000 150px -apple-system, sans-serif';
    ctx.fillText('ZZTV', 0, -20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 38px -apple-system, sans-serif';
    ctx.fillText('THE STORY STARTS NOW', 0, 105);
    ctx.restore();
  }

  function drawOutro(ctx, width, height, time, duration) {
    const start = Math.max(0, duration - OUTRO_SECONDS);
    if (time < start) return;
    const progress = clamp((time - start) / OUTRO_SECONDS, 0, 1);
    ctx.save();
    ctx.fillStyle = `rgba(4,5,10,${0.88 * progress})`;
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = progress;
    ctx.fillStyle = '#f4cf78';
    ctx.font = '1000 132px -apple-system, sans-serif';
    ctx.fillText('FOLLOW', 0, -90);
    ctx.fillStyle = '#ffffff';
    ctx.font = '1000 94px -apple-system, sans-serif';
    ctx.fillText('@ZZTV', 0, 35);
    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.font = '700 34px -apple-system, sans-serif';
    ctx.fillText('MORE STORIES EVERY DAY', 0, 145);
    ctx.restore();
  }

  function drawFrame(time = 0, duration = 20) {
    const canvas = $('#canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    drawScene(ctx, width, height, time, duration);

    const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.18, width / 2, height / 2, height * 0.72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    const shade = ctx.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, 'rgba(0,0,0,.36)');
    shade.addColorStop(0.48, 'rgba(0,0,0,.05)');
    shade.addColorStop(1, 'rgba(0,0,0,.42)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);

    drawBranding(ctx, width, height, time);
    drawCaptions(ctx, width, height, time, duration);
    drawIntro(ctx, width, height, time);
    drawOutro(ctx, width, height, time, duration);
  }

  function previewCanvas() {
    cancelAnimationFrame(raf);
    const audio = $('#voiceAudio');
    if (!narrationUrl) {
      drawFrame(0, 20);
      return toast('Generate the voice to preview timing');
    }

    audio.currentTime = 0;
    audio.play().catch(() => {});
    const loop = () => {
      drawFrame(audio.currentTime, audio.duration || 20);
      $('#renderProgress').style.width = `${Math.min(100, (audio.currentTime / (audio.duration || 20)) * 100)}%`;
      if (!audio.paused && !audio.ended) raf = requestAnimationFrame(loop);
    };
    loop();
  }

  function recorderMime() {
    const list = [
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    return list.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || '';
  }

  function resetVisualPlayback() {
    visualAssets.forEach((asset) => {
      if (asset.type === 'video') {
        asset.el.currentTime = 0;
        asset.el.play().catch(() => {});
      }
    });
  }

  async function renderVideo() {
    if (!narrationBlob) return toast('Generate the voice first');
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      return toast('Video rendering is not supported in this browser');
    }

    const button = $('#renderVideo');
    button.disabled = true;
    button.textContent = 'Rendering 1080p…';
    $('#renderStatus').textContent = 'Keep this page open while ZZTV builds the 1080×1920 video.';
    $('#renderProgress').style.width = '0%';

    try {
      const canvas = $('#canvas');
      const narration = new Audio(narrationUrl);
      narration.preload = 'auto';
      await new Promise((resolve, reject) => {
        narration.onloadedmetadata = resolve;
        narration.onerror = () => reject(new Error('Narration could not load'));
      });

      const duration = narration.duration;
      const canvasStream = canvas.captureStream(30);
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const output = audioContext.createMediaStreamDestination();
      const voiceSource = audioContext.createMediaElementSource(narration);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      voiceSource.connect(analyser);
      analyser.connect(output);
      analyser.connect(audioContext.destination);

      let music = null;
      let musicGain = null;
      if (musicUrl) {
        music = new Audio(musicUrl);
        music.loop = true;
        const musicSource = audioContext.createMediaElementSource(music);
        musicGain = audioContext.createGain();
        musicGain.gain.value = Number($('#musicVolume').value);
        musicSource.connect(musicGain);
        musicGain.connect(output);
        musicGain.connect(audioContext.destination);
      }

      const stream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...output.stream.getAudioTracks()
      ]);
      const mime = recorderMime();
      const chunks = [];
      const recorder = new MediaRecorder(stream, mime ? {
        mimeType: mime,
        videoBitsPerSecond: 12000000,
        audioBitsPerSecond: 192000
      } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      const finished = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = () => reject(new Error('Recorder failed'));
      });

      recorder.start(1000);
      await audioContext.resume();
      resetVisualPlayback();
      if (music) await music.play().catch(() => {});
      await narration.play();

      const samples = new Uint8Array(analyser.fftSize);
      const baseMusic = Number($('#musicVolume').value);
      const start = performance.now();

      await new Promise((resolve) => {
        const loop = () => {
          const time = Math.min(duration, (performance.now() - start) / 1000);
          drawFrame(time, duration);
          $('#renderProgress').style.width = `${Math.min(100, (time / duration) * 100)}%`;

          if (musicGain) {
            analyser.getByteTimeDomainData(samples);
            let energy = 0;
            for (const value of samples) {
              const normalized = (value - 128) / 128;
              energy += normalized * normalized;
            }
            const rms = Math.sqrt(energy / samples.length);
            const target = rms > 0.028 ? baseMusic * 0.28 : baseMusic * 0.9;
            musicGain.gain.setTargetAtTime(target, audioContext.currentTime, 0.08);
          }

          if (narration.ended || time >= duration) {
            resolve();
            return;
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      });

      recorder.stop();
      await finished;
      narration.pause();
      if (music) music.pause();
      canvasStream.getTracks().forEach((track) => track.stop());
      await audioContext.close();

      const type = mime || recorder.mimeType || 'video/webm';
      const blob = new Blob(chunks, { type });
      revokeUrl(renderUrl);
      renderUrl = URL.createObjectURL(blob);
      $('#videoResult').src = renderUrl;
      $('#videoResult').hidden = false;
      $('#downloadVideo').href = renderUrl;
      $('#downloadVideo').download = `zztv-1080p-${Date.now()}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
      $('#downloadVideo').classList.add('show');
      $('#renderStatus').textContent = `Finished 1080×1920 ${type.includes('mp4') ? 'MP4' : 'video'} ready to save or share.`;
      toast('1080p video finished');
    } catch (error) {
      $('#renderStatus').textContent = error.message;
      toast(error.message);
    } finally {
      button.disabled = false;
      button.textContent = 'Build Finished Video';
    }
  }

  function downloadThumbnail() {
    drawFrame(0.95, 20);
    const link = document.createElement('a');
    link.download = `zztv-thumbnail-${Date.now()}.png`;
    link.href = $('#canvas').toDataURL('image/png');
    link.click();
    toast('1080×1920 thumbnail saved');
  }

  $('#generate').onclick = () => {
    const amount = Number($('#amount').value);
    for (let index = 0; index < amount; index += 1) {
      let video = makeVideo(index);
      let tries = 0;
      while (queue.some((item) => item.topic === video.topic) && tries++ < 12) {
        video = makeVideo(index + tries);
      }
      queue.push(video);
    }
    saveQueue();
    toast(`${amount} videos generated`);
  };

  $('#clear').onclick = () => {
    queue = [];
    saveQueue();
    current = null;
    $('#workspace').classList.remove('show');
    clearRenderUrls();
  };

  $('#generateVoice').onclick = generateVoice;
  $('#visualUpload').onchange = (event) => loadVisuals(event.target.files);
  $('#musicUpload').onchange = (event) => loadMusic(event.target.files[0]);
  $('#preview').onclick = previewCanvas;
  $('#renderVideo').onclick = renderVideo;
  $('#thumbnail').onclick = downloadThumbnail;
  $('#script').oninput = () => drawFrame(0.95, 20);
  $('#copy').onclick = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(`TITLE\n${current.title}\n\nSCRIPT\n${$('#script').value}\n\nCAPTION\n${current.caption}\n\n${current.hashtags}`);
      toast('Package copied');
    } catch (_) {
      toast('Copy unavailable');
    }
  };

  renderQueue();
  drawFrame(0, 20);
})();