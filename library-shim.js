(()=>{
  'use strict';

  const nativeFetch = window.fetch.bind(window);
  const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
  const ALLOWED_MEDIA_HOSTS = new Set(['upload.wikimedia.org']);
  const VIDEO_PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22640%22 height=%22360%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23141722%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23f4cf78%22 font-family=%22Arial%22 font-size=%2232%22%3EZZTV STOCK VIDEO%3C/text%3E%3C/svg%3E';
  const audioProbe = document.createElement('audio');

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  function stripHtml(value = '') {
    const element = document.createElement('div');
    element.innerHTML = String(value);
    return (element.textContent || element.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function metadata(info, key, fallback = '') {
    return stripHtml(info?.extmetadata?.[key]?.value || fallback);
  }

  function cleanTitle(title = '') {
    return String(title)
      .replace(/^File:/i, '')
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function secondsFromMetadata(info) {
    const direct = Number(info?.duration || info?.commonmetadata?.duration || 0);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const match = metadata(info, 'Duration', '0').match(/[\d.]+/);
    return match ? Number(match[0]) : 0;
  }

  function licenseDetails(info) {
    const name = metadata(info, 'LicenseShortName', metadata(info, 'UsageTerms', ''));
    const url = metadata(info, 'LicenseUrl', '');
    const normalized = `${name} ${url}`.toLowerCase();
    const blocked = /noncommercial|\bnc\b|no derivatives|\bnd\b|share alike|by-sa/.test(normalized);
    const allowed = !blocked && /public domain|cc0|creative commons attribution|cc by\b|licenses\/by\//.test(normalized);
    return { name: name || 'Free license', url, allowed };
  }

  function normalizeMediaUrl(value = '') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('//')) return `https:${raw}`;
    return raw;
  }

  function playableAudioScore(candidate) {
    const url = normalizeMediaUrl(candidate?.src || candidate?.url || '');
    const type = String(candidate?.type || candidate?.mime || '').toLowerCase();
    const key = String(candidate?.transcodekey || candidate?.shorttitle || '').toLowerCase();
    if (!url) return -1;

    const mp3 = type.includes('audio/mpeg') || type.includes('audio/mp3') || /\.mp3(?:$|\?)/i.test(url) || key.includes('mp3');
    const m4a = type.includes('audio/mp4') || type.includes('audio/aac') || /\.(m4a|aac)(?:$|\?)/i.test(url) || key.includes('m4a');
    const wav = type.includes('audio/wav') || type.includes('audio/x-wav') || /\.wav(?:$|\?)/i.test(url);
    const ogg = type.includes('audio/ogg') || /\.(ogg|oga|opus)(?:$|\?)/i.test(url);
    const flac = type.includes('audio/flac') || /\.flac(?:$|\?)/i.test(url);

    if (mp3) return 100;
    if (m4a) return 90;
    if (wav) return 80;
    if (ogg && audioProbe.canPlayType('audio/ogg; codecs="vorbis"')) return 40;
    if (flac && audioProbe.canPlayType('audio/flac')) return 30;
    if (type && audioProbe.canPlayType(type)) return 20;
    return -1;
  }

  function choosePlayableAudio(info) {
    const candidates = [
      ...(Array.isArray(info?.derivatives) ? info.derivatives : []),
      { src: info?.url, type: info?.mime }
    ];
    return candidates
      .map((candidate) => ({ ...candidate, src: normalizeMediaUrl(candidate.src || candidate.url) }))
      .filter((candidate) => candidate.src)
      .sort((a, b) => playableAudioScore(b) - playableAudioScore(a))
      .find((candidate) => playableAudioScore(candidate) >= 0) || null;
  }

  function chooseVideoSource(info) {
    const candidates = [
      { src: info?.url, type: info?.mime, width: info?.width, height: info?.height },
      ...(Array.isArray(info?.derivatives) ? info.derivatives : [])
    ]
      .map((candidate) => ({ ...candidate, src: normalizeMediaUrl(candidate.src || candidate.url) }))
      .filter((candidate) => candidate.src && String(candidate.type || '').startsWith('video/'));

    const mp4 = candidates.filter((candidate) => String(candidate.type || '').includes('mp4') || /\.mp4(?:$|\?)/i.test(candidate.src));
    const webm = candidates.filter((candidate) => String(candidate.type || '').includes('webm') || /\.webm(?:$|\?)/i.test(candidate.src));
    const pool = mp4.length ? mp4 : webm.length ? webm : candidates;
    return pool.sort((a, b) => {
      const aPortrait = Number(a.height || 0) >= Number(a.width || 0) ? 1 : 0;
      const bPortrait = Number(b.height || 0) >= Number(b.width || 0) ? 1 : 0;
      if (aPortrait !== bPortrait) return bPortrait - aPortrait;
      return Number(b.height || 0) - Number(a.height || 0);
    })[0] || null;
  }

  async function fetchSearchPages(query, kind) {
    const fileType = kind === 'music' ? 'audio' : 'video';
    const params = new URLSearchParams({
      origin: '*',
      action: 'query',
      format: 'json',
      formatversion: '2',
      generator: 'search',
      gsrnamespace: '6',
      gsrlimit: '40',
      gsrsearch: `${String(query || '').trim()} filetype:${fileType}`,
      prop: 'imageinfo',
      iiprop: 'url|size|mime|mediatype|extmetadata',
      iiurlwidth: '640',
      iiextmetadatalanguage: 'en',
      iiextmetadatafilter: 'Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|Duration|ImageDescription'
    });

    const response = await nativeFetch(`${COMMONS_API}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      mode: 'cors',
      credentials: 'omit'
    });
    if (!response.ok) throw new Error(`Internet library request failed (${response.status}).`);
    const data = await response.json();
    return Array.isArray(data?.query?.pages) ? data.query.pages : [];
  }

  async function fetchTimedMediaInfo(pageIds) {
    if (!pageIds.length) return new Map();
    const params = new URLSearchParams({
      origin: '*',
      action: 'query',
      format: 'json',
      formatversion: '2',
      pageids: pageIds.join('|'),
      prop: 'videoinfo',
      viprop: 'url|size|mime|mediatype|derivatives|extmetadata',
      viextmetadatalanguage: 'en',
      viextmetadatafilter: 'Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|Duration|ImageDescription'
    });
    const response = await nativeFetch(`${COMMONS_API}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      mode: 'cors',
      credentials: 'omit'
    });
    if (!response.ok) throw new Error(`Media compatibility request failed (${response.status}).`);
    const data = await response.json();
    const map = new Map();
    for (const page of data?.query?.pages || []) {
      const info = page?.videoinfo?.[0];
      if (info) map.set(Number(page.pageid), { page, info });
    }
    return map;
  }

  async function commonsSearch(query, kind) {
    const searchPages = await fetchSearchPages(query, kind);
    const licensed = searchPages.filter((page) => {
      const info = page?.imageinfo?.[0];
      return info?.url && licenseDetails(info).allowed;
    });
    const details = await fetchTimedMediaInfo(licensed.map((page) => Number(page.pageid)).filter(Boolean));
    const results = [];

    for (const searchPage of licensed) {
      const detail = details.get(Number(searchPage.pageid));
      const info = detail?.info || searchPage?.imageinfo?.[0];
      if (!info?.url) continue;
      const license = licenseDetails(info);
      if (!license.allowed) continue;
      const page = detail?.page || searchPage;
      const creator = metadata(info, 'Artist', metadata(info, 'Credit', 'Wikimedia Commons contributor'));
      const pageUrl = info.descriptionurl || searchPage?.imageinfo?.[0]?.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`;
      const name = cleanTitle(page.title);

      if (kind === 'music') {
        const playable = choosePlayableAudio(info);
        if (!playable) continue;
        results.push({
          id: page.pageid,
          name,
          artist: creator,
          duration: secondsFromMetadata(info),
          audio: playable.src,
          mime: playable.type || info.mime || 'audio/mpeg',
          image: '',
          pageUrl,
          licenseUrl: license.url,
          licenseName: license.name,
          attribution: `${name} by ${creator} — ${license.name} via Wikimedia Commons`
        });
      } else {
        const playable = chooseVideoSource(info);
        if (!playable) continue;
        results.push({
          id: page.pageid,
          duration: secondsFromMetadata(info),
          width: Number(playable.width || info.width) || 0,
          height: Number(playable.height || info.height) || 0,
          url: playable.src,
          preview: searchPage?.imageinfo?.[0]?.thumburl || VIDEO_PLACEHOLDER,
          pageUrl,
          creator,
          creatorUrl: pageUrl,
          attribution: `Video by ${creator} — ${license.name} via Wikimedia Commons`
        });
      }

      if (results.length >= 12) break;
    }
    return results;
  }

  async function directMedia(url) {
    let target;
    try {
      target = new URL(url);
    } catch (_) {
      return jsonResponse({ error: 'Invalid media URL.' }, 400);
    }

    if (target.protocol !== 'https:' || !ALLOWED_MEDIA_HOSTS.has(target.hostname)) {
      return jsonResponse({ error: 'That media source is not allowed.' }, 403);
    }

    try {
      const response = await nativeFetch(target.toString(), {
        mode: 'cors',
        credentials: 'omit',
        cache: 'force-cache'
      });
      if (!response.ok) return jsonResponse({ error: `Media download failed (${response.status}).` }, response.status);
      return response;
    } catch (_) {
      return jsonResponse({ error: 'The internet media file could not be downloaded.' }, 502);
    }
  }

  window.fetch = async (input, init) => {
    const raw = typeof input === 'string' ? input : input?.url;
    let parsed;
    try {
      parsed = new URL(raw, window.location.href);
    } catch (_) {
      return nativeFetch(input, init);
    }

    if (parsed.origin === window.location.origin && parsed.pathname === '/api/stock') {
      try {
        const query = parsed.searchParams.get('q') || 'cinematic';
        const results = await commonsSearch(query, 'stock');
        return jsonResponse({ query, results, provider: 'Wikimedia Commons' });
      } catch (error) {
        return jsonResponse({ error: error.message || 'Stock search failed.' }, 502);
      }
    }

    if (parsed.origin === window.location.origin && parsed.pathname === '/api/music') {
      try {
        const query = parsed.searchParams.get('q') || 'cinematic instrumental';
        const results = await commonsSearch(query, 'music');
        return jsonResponse({
          query,
          results,
          provider: 'Wikimedia Commons',
          note: 'Only phone-compatible audio is shown. MP3 transcodes are preferred automatically.'
        });
      } catch (error) {
        return jsonResponse({ error: error.message || 'Music search failed.' }, 502);
      }
    }

    if (parsed.origin === window.location.origin && parsed.pathname === '/api/media') {
      return directMedia(parsed.searchParams.get('url') || '');
    }

    return nativeFetch(input, init);
  };

  function replaceText(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const original = node.nodeValue || '';
      const updated = original
        .replaceAll('Pexels stock', 'Commons stock')
        .replaceAll('Pexels', 'Wikimedia Commons')
        .replaceAll('Jamendo', 'Wikimedia Commons');
      if (updated !== original) node.nodeValue = updated;
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const targets = ['#stockStatus', '#musicStatus', '#sceneList'];
    for (const selector of targets) {
      const element = document.querySelector(selector);
      if (!element) continue;
      replaceText(element);
      const observer = new MutationObserver(() => replaceText(element));
      observer.observe(element, { childList: true, subtree: true, characterData: true });
    }
  });
})();