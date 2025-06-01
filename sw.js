// sw.js

// キャッシュ名（バージョンを更新すると古いキャッシュと区別できる）
const CACHE_NAME = 'simple-number-connect-cache-v10';  // ver1.0

// キャッシュするファイルのリスト
const urlsToCache = [
  '/', // index.html に対応
  'index.html', // 明示的にindex.htmlも指定
  'manifest.json',
  'icons/icon-180x180.png', // HTMLで指定されているアイコンパス
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// インストール処理
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // 新しいService Workerをすぐにアクティベートする
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[ServiceWorker] Cache addAll failed:', error);
      })
  );
});

// アクティベート処理
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 古いバージョンのキャッシュを削除
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // クライアントの制御を直ちに開始する
      return self.clients.claim();
    }).then(() => {
      // 全てのクライアントにキャッシュ更新を通知
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_UPDATED' });
        });
      });
    })
  );
});

// メッセージイベントのリスナー
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// フェッチ処理 (キャッシュ戦略)
self.addEventListener('fetch', (event) => {
  // ナビゲーションリクエスト（HTMLファイルの要求など）の場合
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // まずキャッシュをチェック
      caches.match(event.request)
        .then(cachedResponse => {
          // キャッシュがある場合は、ネットワークからも取得を試みる（バックグラウンド更新）
          if (cachedResponse) {
            // バックグラウンドでネットワークから最新版を取得してキャッシュを更新
            fetch(event.request)
              .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                  const responseToCache = networkResponse.clone();
                  caches.open(CACHE_NAME)
                    .then(cache => {
                      cache.put(event.request, responseToCache);
                    });
                }
              })
              .catch(() => {
                // ネットワークエラーは無視（オフライン対応）
              });
            
            return cachedResponse; // キャッシュされたバージョンを即座に返す
          }
          
          // キャッシュがない場合はネットワークから取得
          return fetch(event.request)
            .then(networkResponse => {
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                return networkResponse;
              }
              
              // レスポンスをクローンしてキャッシュに保存
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              return networkResponse;
            })
            .catch(() => {
              // ネットワークエラー時のフォールバック
              return new Response("ネットワークエラー：オフラインです", {
                status: 503,
                statusText: "Service Unavailable"
              });
            });
        })
    );
    return;
  }

  // その他のリクエスト（CSS, JS, 画像など）はキャッシュ優先 (Cache First)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }
        // キャッシュになければネットワークから取得
        return fetch(event.request).then(
          (networkResponse) => {
            // レスポンスが有効か確認
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse; // エラーレスポンスなどもそのまま返す
            }
            // レスポンスをクローンしてキャッシュに保存
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        ).catch(error => {
          console.warn('[ServiceWorker] Fetch failed for non-navigate request:', event.request.url, error);
          // オフライン時の画像プレースホルダーなどを返すことも可能
        });
      })
  );
});