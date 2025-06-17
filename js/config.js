// --- 定数とグローバル変数 ---
const GRID_SIZE = 4;
// MIN_NUMとMAX_NUMはレベル別設定に移行するため、直接は使用されなくなります。
const MIN_NUM = 1;
const MAX_NUM = 9;

// 【追加】レベルごとの難易度設定テーブル
const LEVEL_DIFFICULTY_SETTINGS = [
    // Level 1
    { cellMin: 1, cellMax: 5, missionMin: 4, missionMax: 8 },
    // Level 2
    { cellMin: 1, cellMax: 6, missionMin: 5, missionMax: 10 },
    // Level 3
    { cellMin: 1, cellMax: 7, missionMin: 6, missionMax: 12 },
    // Level 4
    { cellMin: 1, cellMax: 8, missionMin: 7, missionMax: 14 },
    // Level 5
    { cellMin: 1, cellMax: 9, missionMin: 8, missionMax: 18 },
    // Level 6
    { cellMin: 1, cellMax: 9, missionMin: 9, missionMax: 22 },
    // Level 7
    { cellMin: 1, cellMax: 9, missionMin: 10, missionMax: 30 },
];

const TARGET_MISSIONS_PER_LEVEL = 5;
const MAX_LEVEL = 7;
const DEBUG_SHOW_COLLISION_CIRCLES = false;

// --- ★の表示設定 ---
const MAX_SMALL_STARS_DISPLAY = 10;
const MAX_BIG_STARS_DISPLAY = 35;
// 繋げた数ともらえる小さい★の数の対応表
const STAR_REWARDS_TABLE = {
      2: 1,
      3: 2,
      4: 3,
      5: 4,
      6: 5,
      7: 6,
      8: 7,
      9: 8,
     10: 9,
     11: 10,
     12: 11,
     13: 12,
     14: 13,
     15: 14,
     16: 15
};
// 繋げた数と表示する★の画像の対応表
const STAR_IMAGE_MAPPING = {
    2: 'images/star01.png',
    3: 'images/star02.png',
    4: 'images/star03.png',
    5: 'images/star04.png',
    6: 'images/star05.png',
    7: 'images/star06.png',
    8: 'images/star06.png' // 8個以上の場合
};

// --- 【変更点】派手な演出に関する設定 ---
const SPECIAL_CLEAR_THRESHOLD = 4; // この数以上を消すと派手な演出が発動
const NUM_PARTICLES_PER_CELL = 12; // 通常時のパーティクル数
const NUM_PARTICLES_PER_CELL_SPECIAL = 25; // 派手な演出時のパーティクル数
const PARTICLE_BASE_SIZE_PX = 12;


// --- DOM Element Selections ---
const gridContainer = document.getElementById('grid-container');
const lineCanvas = document.getElementById('line-canvas');
const canvasCtx = lineCanvas.getContext('2d');
// messageAreaは削除
const gridArea = document.getElementById('grid-area');
const glowLayer = document.getElementById('glow-layer');
// PWAハンドラからも参照されるDOM要素
const updateNotification = document.getElementById('update-notification');
const updateButton = document.getElementById('update-button');
const manualCheckUpdateButton = document.getElementById('manual-check-update-button');

// --- Sound Initialization ---
const startSound = new Howl({ src: ['sounds/start.mp3'] });
const selectSounds = [ new Howl({ src: ['sounds/se1.mp3'], volume: 0.7 }) ];
const successSound = new Howl({ src: ['sounds/success.mp3'] });
const failureSound = new Howl({ src: ['sounds/failure.mp3'] });
const clearSound = new Howl({ src: ['sounds/clear.mp3'] });
// 【提案】もし用意できれば、4個以上消した時用の派手な効果音を読み込む
// const specialClearSound = new Howl({ src: ['sounds/special_clear.mp3'] });

// --- タイトル画面のDOM要素 ---
const titleScreen = document.getElementById('title-screen');
const startButton = document.getElementById('start-button');
const quitButton = document.getElementById('quit-button');
const titleMessageArea = document.getElementById('title-message-area');
const titleUpdateButton = document.getElementById('update-button-title');
const gameContainer = document.getElementById('game-container');

// --- ゲームの背景色パレット ---
const BACKGROUND_COLORS = [
    // パステルカラー (16色)
    '#fff0f5', // ラベンダーブラッシュ
    '#f0fff0', // ハニーデュー
    '#f5fffa', // ミントクリーム
    '#fff5ee', // シーシェル
    '#f0f8ff', // アリスブルー
    '#fafad2', // ライトゴールデンロッドイエロー
    '#ffe4e1', // ミスティーローズ
    '#E1BEE7', // ソフトなラベンダー
    '#FFCCBC', // ピーチパフ
    '#B3E5FC', // ペールシアン
    '#C8E6C9', // パステルグリーン
    '#FFF9C4', // クリーミーイエロー
    '#F8BBD0', // ベビーピンク
    '#D1C4E9', // ライトパープル
    '#FFE0B2', // ソフトオレンジ
    '#ECEFF1', // ブルーグレー

    // ビビッドカラー (4色)
    '#FF4081', // ショッキングピンク
    '#00BCD4', // ブライトシアン
    '#FFEB3B', // サニーイエロー
    '#4CAF50', // リーフグリーン
];