const CACHE_NAME = 'posture-pro-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './src/main.js',
    './src/core/detector.js',
    './src/core/scorer.js',
    './src/core/evaluator.js',
    './src/ui/camera.js',
    './src/ui/charts.js',
    './models/vision_bundle.js',
    './models/vision_wasm_internal.js',
    './models/vision_wasm_internal.wasm',
    './models/vision_wasm_nosimd_internal.js',
    './models/vision_wasm_nosimd_internal.wasm',
    './models/pose_landmarker.task',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching all assets for v2');
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
