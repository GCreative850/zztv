import fs from 'node:fs';

const requiredFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'sw.js',
  'api/health.js',
  'api/generate-package.js',
  'api/tts.js',
  'api/youtube/auth-url.js',
  'api/youtube/callback.js',
  'api/youtube/upload.js',
  'api/tiktok/status.js',
  'api/render-plan.js',
  '.env.example'
];

let failed = false;
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL missing ${file}`);
    failed = true;
  } else {
    console.log(`PASS ${file}`);
  }
}

const index = fs.readFileSync('index.html', 'utf8');
if (!index.includes('id="startBtn"') || !index.includes('app.js')) {
  console.error('FAIL index.html does not wire the app correctly');
  failed = true;
} else {
  console.log('PASS index.html button/app wiring');
}

const app = fs.readFileSync('app.js', 'utf8');
if (!app.includes('addEventListener') || !app.includes('runZZTV')) {
  console.error('FAIL app.js does not wire START ZZTV');
  failed = true;
} else {
  console.log('PASS app.js START ZZTV wiring');
}

JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
console.log('PASS manifest JSON');

if (failed) process.exit(1);
console.log('FINAL RESULT: PASS');
