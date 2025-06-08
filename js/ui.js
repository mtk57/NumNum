// js/ui.js

// PWAハンドラからも参照されるグローバル変数
let newWorker = null;

// --- 画面遷移ロジック ---

/**
 * ゲーム画面を表示します。
 */
function showGameScreen() {
    // タイトル画面の星アニメーションを停止
    if (typeof stopStarAnimation === 'function') {
        stopStarAnimation();
    }

    titleScreen.style.opacity = '0';
    titleScreen.addEventListener('transitionend', () => {
        titleScreen.classList.add('hidden');
    }, { once: true });

    gameContainer.classList.remove('hidden');
    
    // ゲーム画面が表示された後にセルのサイズを再計算
    gameContainer.addEventListener('transitionend', () => {
        if (typeof resizeCanvasAndCells === 'function') {
            resizeCanvasAndCells();
        }
    }, { once: true });
    
    setTimeout(() => {
        gameContainer.style.opacity = '1';
    }, 10);
}

/**
 * タイトル画面を表示します。
 */
function showTitleScreen() {
    // タイトル画面の星アニメーションを開始
    if (typeof startStarAnimation === 'function') {
        startStarAnimation();
    }

    gameContainer.style.opacity = '0';
    gameContainer.addEventListener('transitionend', () => {
        gameContainer.classList.add('hidden');
    }, { once: true });

    titleScreen.classList.remove('hidden');
    setTimeout(() => {
        titleScreen.style.opacity = '1';
    }, 10);
}

// --- 初期化 ---
// 画面のちらつきを防ぐため、JS読み込み後にbodyを表示
document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity = 1;
});