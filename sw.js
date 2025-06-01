// sw.js

// キャッシュ名（バージョンを更新すると古いキャッシュと区別できる）
const CACHE_NAME = 'simple-number-connect-cache-v1'; // プロジェクトに合わせてバージョンを更新してください

// キャッシュするファイルのリスト
// index.html はルートパス '/' としてキャッシュすることが多いです。
// manifest.json やアイコンもキャッシュ対象にします。
const urlsToCache = [
  '/', // index.html に対応
  'index.html', // 明示的にindex.htmlも指定
  'manifest.json',
  'icons/icon-180x180.png', // HTMLで指定されているアイコンパス
  // 他にキャッシュしたいアセットがあればここに追加（例: CSSファイル、JSファイル、他の画像など）
  // 現在のHTMLではCSSとJSはインラインなので、index.htmlのキャッシュが重要です。
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
    })
  );
});

// フェッチ処理 (キャッシュ戦略)
self.addEventListener('fetch', (event) => {
  // ナビゲーションリクエスト（HTMLファイルの要求など）の場合、
  // ネットワークを優先し、失敗したらキャッシュから返す戦略（Network First, then Cache）
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // レスポンスが有効か確認
          if (!response || response.status !== 200 || response.type !== 'basic') {
            // 有効でない場合はキャッシュからフォールバック
            return caches.match(event.request)
              .then(cachedResponse => {
                if (cachedResponse) {
                  return cachedResponse;
                }
                // キャッシュにもなければ、オフラインページなどを表示することも可能
                // ここでは、ネットワークエラーをそのまま返す
                throw new Error('Network response was not ok, and no cache match.');
              });
          }

          // レスポンスをクローンしてキャッシュに保存
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // ネットワークエラー時、キャッシュから返す
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // キャッシュにもない場合のフォールバック (例: オフライン用のHTMLページ)
              // return caches.match('/offline.html'); // 必要に応じて
              console.warn('[ServiceWorker] Fetch failed, no network and no cache match for navigate request:', event.request.url);
              // エラーを返すか、特定のオフラインページを返す
              // この例では、エラーを発生させてブラウザのデフォルトのオフライン処理に任せる
              return new Response("Network error and no cache available.", {
                status: 404,
                statusText: "Network error and no cache available."
              });
            })
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

// (オプション) Service Workerの更新をユーザーに通知し、リロードを促す仕組み
// これはメインのJavaScript (index.html内) に記述します。
// self.addEventListener('message', (event) => {
//   if (event.data && event.data.type === 'SKIP_WAITING') {
//     self.skipWaiting();
//   }
// });
