const CACHE_NAME = 'posture-pro-v' + new Date().getTime(); // 使用時間戳作為版本號
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './src/main.js',
    './src/core/detector.js',
    './src/core/scorer.js',
    './src/core/communicator.js',
    './src/ui/camera.js',
    './src/ui/charts.js',
    './models/vision_bundle.js',
    './models/vision_wasm_internal.js',
    './models/vision_wasm_internal.wasm',
    './models/pose_landmarker.task',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// 1. 安裝階段：強制跳過等待，立刻準備啟動
self.addEventListener('install', (event) => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching new assets');
            return cache.addAll(ASSETS);
        })
    );
});

// 2. 啟動階段：清理舊快取，並立刻接管頁面
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            clients.claim(), // 立刻接管所有客戶端頁面
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((name) => {
                        if (name !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
