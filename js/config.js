// --- 定数とグローバル変数 ---
const GRID_SIZE = 4;
// MIN_NUMとMAX_NUMはレベル別設定に移行するため、直接は使用されなくなります。
const MIN_NUM = 1;
const MAX_NUM = 9;

// 【追加】レベルごとの難易度設定テーブル
const LEVEL_DIFFICULTY_SETTINGS = [
    // Level 1
    { cellMin: 1, cellMax: 5, missionMin: 2, missionMax: 9 },
    // Level 2
    { cellMin: 1, cellMax: 6, missionMin: 4, missionMax: 13 },
    // Level 3
    { cellMin: 1, cellMax: 7, missionMin: 10, missionMax: 16 },
    // Level 4
    { cellMin: 1, cellMax: 8, missionMin: 12, missionMax: 19 },
    // Level 5
    { cellMin: 1, cellMax: 9, missionMin: 20, missionMax: 40 },
];

const TARGET_MISSIONS_PER_LEVEL = 5;
const MAX_LEVEL = 5;
const DEBUG_SHOW_COLLISION_CIRCLES = false;
const NUM_PARTICLES_PER_CELL = 12;
const PARTICLE_BASE_SIZE_PX = 12;

// --- DOM Element Selections ---
const gridContainer = document.getElementById('grid-container');
const lineCanvas = document.getElementById('line-canvas');
const canvasCtx = lineCanvas.getContext('2d');
const missionDisplay = document.getElementById('mission-display');
const scoreDisplay = document.getElementById('score');
const messageArea = document.getElementById('message-area');
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