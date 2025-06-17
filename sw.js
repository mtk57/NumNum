// sw.js

// キャッシュ名（バージョンを更新すると古いキャッシュと区別できる）
// ユーザーが新しいバージョンをデプロイする際は、このバージョン番号を必ず変更してください (例: v1.2 -> v1.3)
const CACHE_NAME = 'NumNum-cache-ver1.50'; // ← 新しいバージョン名に変更

// キャッシュするファイルのリスト
const urlsToCache = [
  '/', // index.html に対応
  'index.html', // 明示的にindex.htmlも指定
  'manifest.json',
  'icons/icon-180x180.png',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
  // アプリケーションに必要な他のアセットがあればここに追加してください
  // 例: 'css/style.css', 'js/main.js'
];

// インストール処理
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install event fired. Caching app shell.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell resources:', urlsToCache);
        // ネットワークエラー時に install が失敗しないように、個別にキャッシュし、エラーを許容する
        const cachePromises = urlsToCache.map(urlToCache => {
            return cache.add(urlToCache).catch(err => {
                // 個々のキャッシュ失敗はログに記録するが、インストールは続行
                console.warn(`[ServiceWorker] Failed to cache ${urlToCache} during install:`, err);
            });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        // 新しいService WorkerをすぐにアクティベートするためにskipWaiting()を呼び出す
        console.log('[ServiceWorker] App shell cached. Calling skipWaiting().');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[ServiceWorker] Cache addAll or skipWaiting failed during install:', error);
      })
  );
});

// アクティベート処理
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate event fired.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 現在のキャッシュ名と異なる古いキャッシュを削除
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // クライアントの制御を直ちに開始する
      // これにより、新しいService Workerがアクティブになったときに 'controllerchange' イベントがクライアントで発火する
      console.log('[ServiceWorker] Old caches removed. Claiming clients.');
      return self.clients.claim();
    }).catch(error => {
        console.error('[ServiceWorker] Failed to clear old caches or claim clients during activate:', error);
    })
  );
});

// メッセージイベントのリスナー (クライアントからのskipWaiting要求を処理)
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    console.log('[ServiceWorker] skipWaiting message received from client. Calling self.skipWaiting().');
    self.skipWaiting(); // これにより、新しいSWがインストール後すぐにアクティベートされる
  }
});

// フェッチ処理 (キャッシュ戦略)
self.addEventListener('fetch', (event) => {
  // ナビゲーションリクエスト（HTMLファイルの要求など）の場合: Network first, then cache
  // これにより、オンライン時は常に最新の index.html を取得しようとし、
  // オフライン時やネットワークエラー時にキャッシュされたバージョンを使用します。
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // ネットワークから取得成功
          if (networkResponse && networkResponse.status === 200) {
            // レスポンスをクローンしてキャッシュに保存
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('[ServiceWorker] Fetched and cached navigate request from network:', event.request.url);
              });
          }
          return networkResponse;
        })
        .catch(() => {
          // ネットワークエラーの場合、キャッシュから返す
          console.log('[ServiceWorker] Network request failed for navigate. Attempting to serve from cache:', event.request.url);
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // フォールバックとしてルートのキャッシュを試みる (もしあれば)
              // または、専用のオフラインページを返すことも検討できます
              return caches.match('/')
                .then(rootCache => {
                    if (rootCache) return rootCache;
                    // 本当に何もない場合の最終フォールバック
                    return new Response("You are offline and the requested page is not cached.", {
                        status: 404,
                        statusText: "Not Found",
                        headers: { 'Content-Type': 'text/plain' }
                    });
                });
            });
        })
    );
    return;
  }

  // その他のリクエスト（CSS, JS, 画像など）はキャッシュ優先 (Cache First), then network, then update cache
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // ネットワークから最新版を取得し、キャッシュを更新する非同期処理
        const fetchAndUpdatePromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              // リクエストが同一オリジンからのものか、または 'basic' タイプであることを確認
              // (CORSリクエストなどでキャッシュすべきでないものを避けるため)
              if (event.request.url.startsWith(self.location.origin) || networkResponse.type === 'basic') {
                  const responseToCache = networkResponse.clone();
                  caches.open(CACHE_NAME)
                    .then(cache => {
                      cache.put(event.request, responseToCache);
                      // console.log('[ServiceWorker] Fetched, cached, and serving from network (for non-navigate):', event.request.url);
                    });
              }
            }
            return networkResponse;
          })
          .catch(error => {
            // ネットワークエラーが発生しても、キャッシュがあればそれが既に返されているので、ここではエラーをログに出力する程度
            console.warn('[ServiceWorker] Network fetch failed for non-navigate request (cache might be used if available):', event.request.url, error);
            // キャッシュがなくてネットワークも失敗した場合、エラーを伝播させる
            if (!cachedResponse) {
                throw error;
            }
            // キャッシュがあるので、このエラーは無視できる
          });

        // キャッシュにあればそれを返し、バックグラウンドでネットワークから更新を試みる (Stale-While-Revalidate風)
        if (cachedResponse) {
          // console.log('[ServiceWorker] Serving from cache (for non-navigate):', event.request.url);
          return cachedResponse;
        }

        // キャッシュになければネットワークから取得 (fetchAndUpdatePromise は既に開始されている)
        // console.log('[ServiceWorker] Not in cache, serving from network (for non-navigate):', event.request.url);
        return fetchAndUpdatePromise;
      })
  );
});
