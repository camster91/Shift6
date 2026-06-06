// Integrate landing page into PWA dist after build
// After vite build: landing page goes to /, PWA goes to /app/
import fs from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const landingSrcDir = join(rootDir, 'src', 'landing');
const landingDistDir = join(landingSrcDir, 'dist');

console.log('Building landing page...');
execSync('npm install', { cwd: landingSrcDir, stdio: 'pipe' });
execSync('npm run build', { cwd: landingSrcDir, stdio: 'pipe' });

console.log('Integrating landing page into PWA dist...');

// Landing page dist
const lAssets = join(landingDistDir, 'assets');
const lIndex = join(landingDistDir, 'index.html');

// Move PWA files to app/
const appDir = join(distDir, 'app');
fs.mkdirSync(appDir, { recursive: true });

const pwaFiles = [
  'assets', 'index.html', 'manifest.webmanifest', 'privacy-policy.html',
  'pwa-1024x1024.png', 'pwa-192x192.png', 'pwa-512x512.png',
  'registerSW.js', 'sw.js', 'workbox-66610c77.js'
];

for (const f of pwaFiles) {
  const srcPath = join(distDir, f);
  if (fs.existsSync(srcPath)) {
    if (f === 'assets') {
      // Copy assets dir contents to app/assets/ (cpSync handles existing dirs properly)
      fs.cpSync(srcPath, join(appDir, 'assets'), { recursive: true });
      fs.rmSync(srcPath, { recursive: true });
    } else {
      fs.renameSync(srcPath, join(appDir, f));
    }
  }
}

// Copy landing page assets to root assets/ (AFTER moving PWA assets so they aren't overwritten)
fs.mkdirSync(join(distDir, 'assets'), { recursive: true });
for (const f of fs.readdirSync(lAssets)) {
  const srcPath = join(lAssets, f);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, join(distDir, 'assets', f));
  }
}

// Write landing page index.html at root with relative asset paths
let lHtml = fs.readFileSync(lIndex, 'utf8');
lHtml = lHtml.replace(/src="\/assets\//g, 'src="./assets/');
lHtml = lHtml.replace(/href="\/assets\//g, 'href="./assets/');
fs.writeFileSync(join(distDir, 'index.html'), lHtml);

// Fix PWA index.html to use relative paths
const pwaIndexPath = join(appDir, 'index.html');
let pwaHtml = fs.readFileSync(pwaIndexPath, 'utf8');
pwaHtml = pwaHtml.replace(/src="\/assets\//g, 'src="./assets/');
pwaHtml = pwaHtml.replace(/href="\/assets\//g, 'href="./assets/');
pwaHtml = pwaHtml.replace(/href="\/pwa-/g, 'href="./pwa-');
pwaHtml = pwaHtml.replace(/href="\/manifest.webmanifest"/g, 'href="./manifest.webmanifest"');
pwaHtml = pwaHtml.replace(/src="\/registerSW.js"/g, 'src="./registerSW.js"');
fs.writeFileSync(pwaIndexPath, pwaHtml);

console.log('Done! Landing page at /, PWA at /app/');
