// --- 定数とグローバル変数 ---
const GRID_SIZE = 4;
const MIN_NUM = 1;
const MAX_NUM = 9;
const TARGET_MISSIONS_PER_LEVEL = 10;
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
const giveUpButton = document.getElementById('give-up-button');
const gridArea = document.getElementById('grid-area');
const glowLayer = document.getElementById('glow-layer');
// PWAハンドラからも参照されるDOM要素
const updateNotification = document.getElementById('update-notification');
const updateButton = document.getElementById('update-button');
const manualCheckUpdateButton = document.getElementById('manual-check-update-button');

// --- Sound Initialization ---
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
