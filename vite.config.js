/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.js',
    },
    optimizeDeps: {
        include: ['lucide-react'],
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'icons': ['lucide-react'],
                }
            }
        }
    },
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'privacy-policy.html', 'legal/index.html'],
            workbox: {
                // Cache all pages for offline use
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                // The SPA's navigateFallback is index.html. /legal/ is the
                // static privacy policy page (precached as legal/index.html
                // above). Without the denylist, navigating to /legal/ via
                // the SPA's service worker returns index.html instead of
                // the privacy content. App Store and Google Play review
                // bots follow this URL.
                navigateFallbackDenylist: [/^\/legal\//, /^\/privacy-policy\.html$/],
                // Runtime caching for fonts
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
                        }
                    }
                ],
                // Clean up old caches
                cleanupOutdatedCaches: true,
                // Skip waiting on update
                skipWaiting: true,
                clientsClaim: true
            },
            manifest: {
                name: 'Armor — Metabolic Fitness',
                short_name: 'Armor',
                description: '6-week periodization, 2 strength pillars, 4 daily longevity habits, and contingency protocols for busy professionals',
                theme_color: '#020617',
                background_color: '#020617',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                scope: '/',
                categories: ['health', 'fitness', 'lifestyle'],
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
    server: {
        // Dev proxy removed — Shift6 is client-only PWA/mobile app
    }
})
