(()=>{
  'use strict';

  const nativeFetch = window.fetch.bind(window);
  const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
  const ALLOWED_MEDIA_HOSTS = new Set(['upload.wikimedia.org']);

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  function stripHtml(value = '') {
    const el = document.createElement('div');
    el.innerHTML = String(value);
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
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
    const raw = metadata(info, 'Duration', '0');
    const match = raw.match(/[\d.]+/);
    return match ? Number(match[0]) : 0;
  }

  function licenseDetails(info) {
    const name = metadata(info, 'LicenseShortName', metadata(info, 'UsageTerms', ''));
    const url = metadata(info, 'LicenseUrl', '');
    const normalized = `${name} ${url}`.toLowerCase();
    const blocked = /noncommercial|\bnc\b|no derivatives|\bnd\b/.test(normalized);
    const allowed = !blocked && /public domain|cc0|creative commons attribution|cc by\b|licenses\/by\//.test(normalized);
    return { name: name || 'Free license', url, allowed };
  }

  async function commonsSearch(query, kind) {
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
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Internet library request failed (${response.status}).`);

    const data = await response.json();
    const pages = data?.query?.pages || [];
    const results = [];

    for (const page of pages) {
      const info = page?.imageinfo?.[0];
      if (!info?.url) continue;
      const mime = String(info.mime || '').toLowerCase();
      const mediatype = String(info.mediatype || '').toUpperCase();
      const isAudio = mime.startsWith('audio/') || mediatype === 'AUDIO';
      const isVideo = mime.startsWith('video/') || mediatype === 'VIDEO' || mediatype === 'MULTIMEDIA';
      if (kind === 'music' ? !isAudio : !isVideo) continue;

      const license = licenseDetails(info);
      if (!license.allowed) continue;

      const creator = metadata(info, 'Artist', metadata(info, 'Credit', 'Wikimedia Commons contributor'));
      const pageUrl = info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`;
      const name = cleanTitle(page.title);

      if (kind === 'music') {
        results.push({
          id: page.pageid,
          name,
          artist: creator,
          duration: secondsFromMetadata(info),
          audio: info.url,
          image: info.thumburl || '',
          pageUrl,
          licenseUrl: license.url,
          licenseName: license.name,
          attribution: `${name} by ${creator} — ${license.name} via Wikimedia Commons`
        });
      } else {
        results.push({
          id: page.pageid,
          duration: secondsFromMetadata(info),
          width: Number(info.width) || 0,
          height: Number(info.height) || 0,
          url: info.url,
          preview: info.thumburl || '',
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
      const response = await nativeFetch(target.toString(), { mode: 'cors', credentials: 'omit' });
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
          note: 'Results are restricted to public-domain, CC0, or attribution-only licenses.'
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

  function correctProviderText() {
    const replacements = [
      ['Pexels', 'Wikimedia Commons'],
      ['Jamendo', 'Wikimedia Commons'],
      ['Pexels stock', 'Commons stock']
    ];
    for (const selector of ['#stockStatus', '#musicStatus', '#sceneList']) {
      const element = document.querySelector(selector);
      if (!element) continue;
      let html = element.innerHTML;
      for (const [from, to] of replacements) html = html.split(from).join(to);
      if (html !== element.innerHTML) element.innerHTML = html;
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    correctProviderText();
    const observer = new MutationObserver(correctProviderText);
    for (const selector of ['#stockStatus', '#musicStatus', '#sceneList']) {
      const element = document.querySelector(selector);
      if (element) observer.observe(element, { childList: true, subtree: true, characterData: true });
    }
  });
})();