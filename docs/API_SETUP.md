# ZZTV API Setup

This repo now has a browser front-end plus a starter backend API layer.

## Important hosting note

GitHub Pages can host the phone app, but GitHub Pages cannot run backend API routes.

To use `/api/*`, deploy this repo to Vercel or another Node/serverless host.

Recommended flow:

1. Keep GitHub Pages for the simple phone demo if you want.
2. Deploy the same `GCreative850/zztv` repo to Vercel for live API mode.
3. Add the variables from `.env.example` into Vercel Project Settings > Environment Variables.
4. Use the Vercel URL for the production app with API.

## API routes included

### Health

```text
GET /api/health
```

Shows which keys are configured.

### AI package generation

```text
POST /api/generate-package
```

Body:

```json
{
  "sport": "basketball",
  "angle": "confidence and teamwork"
}
```

Returns a ZZTV YouTube/TikTok package. If `OPENAI_API_KEY` is missing, it safely returns a fallback package.

### Voice generation

```text
POST /api/tts
```

Body:

```json
{
  "script": ["Welcome back to ZZTV!", "Today we are practicing smarter."],
  "voice": "coral"
}
```

Returns an MP3 when `OPENAI_API_KEY` is set. Without the key, it returns a dry-run plan.

### Render plan

```text
POST /api/render-plan
```

Creates the timeline and render instructions. Real MP4 rendering should run in a worker because serverless functions are short-lived.

### YouTube OAuth URL

```text
GET /api/youtube/auth-url
```

Returns the Google authorization URL.

### YouTube callback

```text
GET /api/youtube/callback
```

Receives the OAuth code and shows a refresh token. Copy that refresh token into Vercel as `YOUTUBE_REFRESH_TOKEN`. Do not commit it.

### YouTube upload

```text
POST /api/youtube/upload
```

Body:

```json
{
  "videoUrl": "https://example.com/rendered-zztv-short.mp4",
  "title": "ZZTV: Practice Smarter 🏆",
  "description": "A kid-friendly sports short.",
  "tags": ["kids sports", "ZZTV"],
  "privacyStatus": "private",
  "selfDeclaredMadeForKids": true
}
```

The starter route supports small test uploads from a public/signed video URL. Production should use cloud storage and a resumable upload worker.

### TikTok status

```text
GET /api/tiktok/status
```

Shows TikTok readiness. Live TikTok posting still requires developer app approval and an OAuth/posting route.

## Keys needed

### OpenAI

Required for AI package generation and narration audio:

```text
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_TTS_MODEL
OPENAI_TTS_VOICE
```

### YouTube

Required for upload:

```text
YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET
YOUTUBE_REDIRECT_URI
YOUTUBE_REFRESH_TOKEN
```

The redirect URI must exactly match the Google Cloud OAuth client redirect URI.

### TikTok

Required later for live TikTok posting:

```text
TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET
TIKTOK_REDIRECT_URI
TIKTOK_ACCESS_TOKEN
```

TikTok posting depends on account eligibility and developer approval.

## Production warning

Do not paste API keys into `index.html`, `app.js`, or GitHub. Keys belong only in backend environment variables.
