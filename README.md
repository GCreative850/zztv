# ZZTV Auto Sports Studio

ZZTV is a phone-first kids sports content package generator for YouTube Shorts and TikTok.

## Current release

This release is a real static web app plus a starter backend API scaffold.

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
- `/api/health` readiness check
- `/api/generate-package` AI/fallback content route
- `/api/tts` OpenAI narration route
- `/api/render-plan` video timeline route
- `/api/youtube/auth-url` OAuth starter route
- `/api/youtube/callback` OAuth token callback route
- `/api/youtube/upload` private-first YouTube upload route
- `/api/tiktok/status` TikTok readiness route

## Live phone URL

After GitHub Pages is enabled for this repo, open this on iPhone Safari:

```text
https://gcreative850.github.io/zztv/
```

## GitHub Pages setup

1. Open the repo on GitHub.
2. Go to Settings.
3. Go to Pages.
4. Set Source to `GitHub Actions`.
5. Run the `Deploy ZZTV to GitHub Pages` workflow if it does not run automatically.
6. Open the live URL above.

## API/backend setup

GitHub Pages can host the front-end but cannot run `/api/*` routes. For API mode, deploy this repo to Vercel or another Node/serverless host.

Detailed API instructions are in:

```text
docs/API_SETUP.md
```

Copy `.env.example` into your Vercel environment variables. Do not commit real API keys to GitHub.

## Honest production status

- Phone web app: ready after GitHub Pages deploy.
- Backend code: scaffolded and ready to deploy to Vercel.
- OpenAI package/TTS: works after `OPENAI_API_KEY` is added.
- YouTube upload: works after Google OAuth app keys and `YOUTUBE_REFRESH_TOKEN` are added.
- TikTok posting: status route only; live posting still depends on TikTok developer approval and account/API eligibility.
- Real MP4 rendering: still needs a worker/cloud render service.

## Safety rules

ZZTV is built for original sports commentary and kid-friendly educational content. It should not scrape or repost copyrighted sports broadcasts.
