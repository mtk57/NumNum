// js/title.js

// --- グローバルスコープに関数を公開 ---
var startStarAnimation = function() {};
var stopStarAnimation = function() {};

// --- タイトル画面のアニメーション ---
document.addEventListener('DOMContentLoaded', () => {
    const starCanvas = document.getElementById('star-canvas');
    if (!starCanvas) return;
    const starCtx = starCanvas.getContext('2d');
    if (!starCtx) return;

    let stars = [];
    const starImages = [];
    let starAnimationId = null;
    let areStarsReady = false;
    const numStars = 50;
    const starImageSources = [
        'images/star01.png', 'images/star02.png', 'images/star03.png',
        'images/star04.png', 'images/star05.png', 'images/star06.png'
    ];

    function preloadStarImages(callback) {
        let loaded = 0;
        starImageSources.forEach(src => {
            const img = new Image();
            img.onload = () => {
                loaded++;
                if (loaded === starImageSources.length) {
                    areStarsReady = true;
                    if (callback) callback();
                }
            };
            img.onerror = () => {
                console.error(`Failed to load star image: ${src}`);
                loaded++;
                 if (loaded === starImageSources.length) {
                    areStarsReady = true;
                    if (callback) callback();
                }
            };
            img.src = src;
            starImages.push(img);
        });
    }

    function resizeStarCanvas() {
        starCanvas.width = window.innerWidth;
        starCanvas.height = window.innerHeight;
    }

    function setupStars() {
        resizeStarCanvas();
        stars = [];
        if (starImages.length === 0) return;
        for (let i = 0; i < numStars; i++) {
            const img = starImages[Math.floor(Math.random() * starImages.length)];
            const size = Math.random() * 30 + 15;
            stars.push({
                x: Math.random() * starCanvas.width,
                y: Math.random() * starCanvas.height,
                size: size,
                speedY: Math.random() * 1 + 0.5,
                img: img,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.04
            });
        }
    }

    function drawStars() {
        starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
        stars.forEach(star => {
            if (star.img && star.img.complete) {
                starCtx.save();
                starCtx.translate(star.x + star.size / 2, star.y + star.size / 2);
                starCtx.rotate(star.rotation);
                starCtx.drawImage(star.img, -star.size / 2, -star.size / 2, star.size, star.size);
                starCtx.restore();
            }
        });
    }

    function updateStars() {
        stars.forEach(star => {
            star.y += star.speedY;
            star.rotation += star.rotationSpeed;
            if (star.y > starCanvas.height) {
                star.y = -star.size;
                star.x = Math.random() * starCanvas.width;
            }
        });
    }

    function animateStars() {
        updateStars();
        drawStars();
        starAnimationId = requestAnimationFrame(animateStars);
    }

    startStarAnimation = function() {
        if (!areStarsReady || starAnimationId) return;
        setupStars();
        animateStars();
    };

    stopStarAnimation = function() {
        if (starAnimationId) {
            cancelAnimationFrame(starAnimationId);
            starAnimationId = null;
        }
    };

    preloadStarImages(() => {
        if (!titleScreen.classList.contains('hidden')) {
            startStarAnimation();
        }
    });

    window.addEventListener('resize', () => {
        if (!titleScreen.classList.contains('hidden')) {
            resizeStarCanvas();
        }
    });
});


// --- イベントリスナー設定 ---
startButton.addEventListener('click', () => {
    startSound.play();
    if (typeof initGame === 'function') {
        initGame();
    }
    if (typeof showGameScreen === 'function') {
        showGameScreen();
    }
});