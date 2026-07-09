# ZZTV Auto Sports Studio

ZZTV is a phone-first kids sports content package generator for YouTube Shorts and TikTok.

## Current release

This release is a real static web app, not an iPhone file preview mockup.

It includes:

- Live START ZZTV button
- Browser self-test log
- Kid-friendly sports idea generator
- YouTube title, description, tags, and script package
- TikTok caption and hashtag package
- Voice/sound production plan
- Thumbnail/video scene plan
- Copy package button
- Download JSON button
- PWA manifest and offline service worker

## Live phone URL

After GitHub Pages is enabled for this repo, open this on iPhone Safari:

```text
https://gcreative850.github.io/zztv/
```

## GitHub Pages setup

1. Open the repo on GitHub.
2. Go to Settings.
3. Go to Pages.
4. Set Source to `Deploy from a branch`.
5. Set Branch to `main` and folder to `/root`.
6. Save.
7. Open the live URL above.

## Honest production status

This front-end proves the phone app and button work from a live website.

Real auto-uploading still requires a backend because YouTube, TikTok, and AI-service keys must not be placed inside a browser app. The backend phase should add:

1. Private API server
2. YouTube OAuth upload route
3. TikTok Content Posting API or draft route
4. AI script/video/voice renderer workers
5. Cloud storage for media files
6. Queue scheduler
7. Retry logs and production dashboard

## Safety rules

ZZTV is built for original sports commentary and kid-friendly educational content. It should not scrape or repost copyrighted sports broadcasts.
