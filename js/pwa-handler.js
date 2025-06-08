/**
 * このスクリプトは、PWA（Progressive Web App）に関連する機能（Service Worker、更新通知など）を処理します。
 * script.jsで定義されたグローバル変数（updateNotification, updateButton, manualCheckUpdateButton, messageArea, newWorker）に依存します。
 */

/**
 * 更新通知バーを表示します。
 */
function showUpdateNotification() {
    if (updateNotification) updateNotification.classList.add('show');
}

/**
 * 更新通知バーを非表示にします。
 */
function hideUpdateNotification() {
    if (updateNotification) updateNotification.classList.remove('show');
}

/**
 * 通知内の「更新」ボタンがクリックされたときの処理です。
 * 新しいService Workerに制御を渡すようメッセージを送信します。
 */
function handleUpdate() {
    if (newWorker) {
        newWorker.postMessage({ action: 'skipWaiting' });
    }
    hideUpdateNotification();
}

/**
 * インストール中のService Workerの状態を監視します。
 * インストールが完了し、すでにページがService Workerによって制御されている場合、更新通知を表示します。
 * @param {ServiceWorker} worker - 監視対象のService Worker
 */
function trackInstalling(worker) {
    worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker = worker;
            showUpdateNotification();
        }
    });
}

// --- PWA関連のイベントリスナー ---

if (updateButton) {
    updateButton.addEventListener('click', handleUpdate);
}

// タイトル画面のUPDATEボタンに対する処理
if (titleUpdateButton) {
    titleUpdateButton.addEventListener('click', () => {
        if (!titleMessageArea) return; // メッセージエリアの存在確認
        titleMessageArea.textContent = "";

        if (!navigator.serviceWorker?.getRegistration) {
            titleMessageArea.textContent = "Service Workerが利用できません。";
            return;
        }

        navigator.serviceWorker.getRegistration().then(registration => {
            if (!registration) {
                titleMessageArea.textContent = "更新チェック機能が有効ではありません。";
                return;
            }
            if (registration.waiting) {
                newWorker = registration.waiting;
                titleMessageArea.textContent = "新しいバージョンが待機中です！";
                showUpdateNotification();
                return;
            }

            titleMessageArea.textContent = "更新を確認中...";
            registration.update().then(updatedReg => {
                if (updatedReg.installing) {
                    titleMessageArea.textContent = "新しいバージョンをインストール中...";
                    trackInstalling(updatedReg.installing);
                } else if (updatedReg.waiting) {
                    newWorker = updatedReg.waiting;
                    titleMessageArea.textContent = "新しいバージョンが見つかりました！";
                    showUpdateNotification();
                } else {
                    titleMessageArea.textContent = "現在、最新バージョンです。";
                }
            }).catch(err => {
                console.error("Update check failed:", err);
                titleMessageArea.textContent = "更新チェックに失敗しました。";
            });
        }).catch(err => {
            console.error("Get registration failed:", err);
            titleMessageArea.textContent = "更新機能の状態取得に失敗しました。";
        });

        // メッセージを5秒後にクリアする
        setTimeout(() => {
            // メッセージ内容が変わっていない場合のみクリア
            const currentMessage = titleMessageArea.textContent;
            if(currentMessage.includes("更新") || currentMessage.includes("最新バージョンです") || currentMessage.includes("失敗")) {
               titleMessageArea.textContent = "";
            }
        }, 5000);
    });
}

// --- Service Worker の登録処理 ---

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
            .then(registration => {
                console.log('Service Worker registered successfully.');
                if (registration.waiting) {
                    newWorker = registration.waiting;
                    showUpdateNotification();
                }
                if (registration.installing) {
                    trackInstalling(registration.installing);
                }
                registration.addEventListener('updatefound', () => {
                    trackInstalling(registration.installing);
                });
            })
            .catch(error => console.error('Service Worker registration failed:', error));

        let refreshingReloadFlag;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshingReloadFlag) return;
            window.location.reload();
            refreshingReloadFlag = true;
        });
    });
}