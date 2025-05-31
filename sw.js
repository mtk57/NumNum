// sw.js (サービスワーカーファイル)

// インストールイベント
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  // 必要であれば、ここでキャッシュするファイルを指定できます
  // event.waitUntil(
  //   caches.open('your-cache-name').then((cache) => {
  //     return cache.addAll([
  //       '/',
  //       'index.html',
  //       'style.css',
  //       'script.js',
  //       // 他のキャッシュしたいアセット
  //     ]);
  //   })
  // );
});

// アクティベートイベント
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
});

// フェッチイベント (オフライン対応などを行う場合)
self.addEventListener('fetch', (event) => {
  // console.log('Service Worker: Fetching');
  // event.respondWith(
  //   caches.match(event.request).then((response) => {
  //     return response || fetch(event.request);
  //   })
  // );
});