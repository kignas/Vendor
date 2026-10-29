/**
 * Build the React app in web/ and stage its production output as www/ — the
 * directory Capacitor packages into the Android APK.
 *
 * Usage:
 *   node scripts/prepare-www-web.mjs              # assumes web/dist already built
 *   node scripts/prepare-www-web.mjs --build      # runs the web build first
 *
 * The legacy `scripts/prepare-www.mjs` (flat HTML) is untouched and remains the
 * rollback path: `npm run android:prepare:legacy` rebuilds the old www/.
 *
 * The API origin is baked into the bundle at build time from VITE_API_ORIGIN
 * (default https://api.eatswada.com) — no URL is hardcoded in source.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const web = path.join(root, 'web');
const dist = path.join(web, 'dist');
const out = path.join(root, 'www');

const build = process.argv.includes('--build');
if (build) {
  execFileSync('npm', ['--prefix', web, 'run', 'build'], { stdio: 'inherit' });
}

if (!fs.existsSync(dist)) {
  throw new Error(
    'web/dist is missing. Run `npm --prefix web run build` first, or pass --build.',
  );
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

fs.cpSync(dist, out, { recursive: true });
console.log('Staged the React build into www/.');
