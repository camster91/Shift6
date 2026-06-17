/**
 * Minimal static file server for the Armor PWA.
 *
 * Why this exists: `serve@14 --single` rewrites ALL not-found requests
 * to index.html, which means /legal/ returns the SPA shell instead of
 * the privacy policy. The privacy policy IS at /legal/index.html on
 * disk, but --single masks it. Without --single, navigation 404s.
 *
 * Behavior:
 *   - If the requested path matches a real file: serve it (200).
 *   - If the requested path is a directory with an index.html: serve
 *     that index.html (200). /legal/ → /legal/index.html.
 *   - Otherwise: serve /index.html (200). The SPA's service worker
 *     handles routing on the client side.
 *
 * The service worker's navigateFallbackDenylist excludes /legal/* so
 * the browser does NOT cache the privacy page as the SPA shell.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || '.');
const PORT = parseInt(process.argv[3] || '3000', 10);

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.otf': 'font/otf',
};

function safeJoin(root, urlPath) {
    // Decode percent-encoded paths, then resolve and ensure result is under root.
    const decoded = decodeURIComponent(urlPath);
    const target = path.resolve(path.join(root, decoded));
    if (!target.startsWith(root + path.sep) && target !== root) return null;
    return target;
}

function send(res, status, body, headers = {}) {
    res.writeHead(status, {
        'Cache-Control': 'no-store',
        ...headers,
    });
    res.end(body);
}

const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    let target = safeJoin(ROOT, urlPath);
    if (!target) return send(res, 400, 'Bad request');

    fs.stat(target, (err, stat) => {
        if (!err && stat.isDirectory()) {
            // Try directory's index.html
            target = path.join(target, 'index.html');
            fs.stat(target, (e2, s2) => {
                if (e2 || !s2.isFile()) {
                    // Fall back to SPA index
                    target = path.join(ROOT, 'index.html');
                }
                serveFile(target);
            });
        } else if (!err && stat.isFile()) {
            serveFile(target);
        } else {
            // 404 → fall back to SPA index.html
            serveFile(path.join(ROOT, 'index.html'));
        }
    });

    function serveFile(p) {
        fs.readFile(p, (err, body) => {
            if (err) return send(res, 500, 'Internal server error');
            const ext = path.extname(p);
            const ct = MIME[ext] || 'application/octet-stream';
            send(res, 200, body, { 'Content-Type': ct });
        });
    }
});

server.listen(PORT, () => {
    console.log(`armor-static listening on http://127.0.0.1:${PORT}`);
    console.log(`serving from ${ROOT}`);
});
