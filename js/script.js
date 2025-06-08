// --- Game State Variables ---
let cellsData = [];
let selectedCells = [];
let currentMission = { type: 'sum', target: 0, text: "" };
let score = 0;
let isDrawing = false;
let isAnimating = false;
let missionsSinceLastLevelUp = 0;
let currentLevel = 1;
// PWAハンドラからも参照されるグローバル変数
let newWorker = null;

// --- 画面遷移ロジック ---
function showGameScreen() {
    stopStarAnimation(); // ★ 星のアニメーションを停止
    titleScreen.style.opacity = '0';
    titleScreen.addEventListener('transitionend', () => {
        titleScreen.classList.add('hidden');
    }, { once: true });

    gameContainer.classList.remove('hidden');
    
    gameContainer.addEventListener('transitionend', () => {
        resizeCanvasAndCells();
    }, { once: true });
    
    setTimeout(() => {
        gameContainer.style.opacity = '1';
    }, 10);
}

function showTitleScreen() {
    startStarAnimation(); // ★ 星のアニメーションを開始
    gameContainer.style.opacity = '0';
    gameContainer.addEventListener('transitionend', () => {
        gameContainer.classList.add('hidden');
    }, { once: true });

    titleScreen.classList.remove('hidden');
    setTimeout(() => {
        titleScreen.style.opacity = '1';
    }, 10);
}

// --- ゲームロジック ---

function initGame() {
    gridContainer.innerHTML = '';
    cellsData = [];
    missionsSinceLastLevelUp = 0;
    currentLevel = 1;
    score = 0;
    currentMission.target = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
        const rowData = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            const cellValue = Math.floor(Math.random() * (MAX_NUM - MIN_NUM + 1)) + MIN_NUM;
            const cellElement = createCellElement(r, c, cellValue);
            const cellObj = { value: cellValue, element: cellElement, row: r, col: c, id: `cell-${r}-${c}-${Date.now()}`, centerX: 0, centerY: 0, collisionRadius: 0 };
            gridContainer.appendChild(cellElement);
            rowData.push(cellObj);
        }
        cellsData.push(rowData);
    }

    updateAllCellDisplays();
    generateNewMission();
    updateScoreDisplay();
    clearSelection();
}

function createCellElement(row, col, value) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.row = row;
    cell.dataset.col = col;
    return cell;
}

function updateAllCellDisplays() {
    if (!cellsData || cellsData.length === 0) return;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cellObj = cellsData[r][c];
            if (cellObj?.element) {
                 cellObj.element.textContent = cellObj.value === null ? '' : cellObj.value.toString();
            }
        }
    }
}

function resizeCanvasAndCells() {
    const gridRect = gridContainer.getBoundingClientRect();
    lineCanvas.width = gridRect.width;
    lineCanvas.height = gridRect.height;
    
    if (!cellsData || cellsData.length === 0) return;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cellObj = cellsData[r][c];
            if (!cellObj?.element) continue;
            const cellRect = cellObj.element.getBoundingClientRect();
            cellObj.centerX = (cellRect.left - gridRect.left) + (cellRect.width / 2);
            cellObj.centerY = (cellRect.top - gridRect.top) + (cellRect.height / 2);
            cellObj.collisionRadius = cellRect.width * 0.40;
        }
    }
    drawLines();
}

function updateMissionDisplay() {
    missionDisplay.textContent = `レベル ${currentLevel} (${missionsSinceLastLevelUp}/${TARGET_MISSIONS_PER_LEVEL}) - ${currentMission.text || 'ミッション準備中...'}`;
}

function generateNewMission() {
    let targetValue;
    if (missionsSinceLastLevelUp === 0 || currentMission.target === 0) {
        let availableCells = cellsData.flat().filter(c => c && c.value !== null);
        if (availableCells.length < 2) {
            currentMission = { type: 'sum', target: 0, text: "数字が足りません！" };
            updateMissionDisplay();
            return;
        }
        let numToPick = Math.min(Math.floor(Math.random() * 2) + 2, availableCells.length);
        let potentialSolutionCells = [];
        for(let i=0; i<numToPick; i++) {
             if(availableCells.length === 0) break;
            potentialSolutionCells.push(availableCells.splice(Math.floor(Math.random() * availableCells.length), 1)[0]);
        }
        if (potentialSolutionCells.length < 2) {
             currentMission = { type: 'sum', target: 0, text: "ミッション作成不可" };
             updateMissionDisplay();
             return;
        }
        targetValue = potentialSolutionCells.reduce((acc, cell) => acc + cell.value, 0);
        if (targetValue > 50 && potentialSolutionCells.length > 2) targetValue = Math.floor(Math.random() * 30) + 10;
        else if (targetValue > 30 && potentialSolutionCells.length === 2) targetValue = Math.floor(Math.random() * 20) + 5;
        else if (targetValue < 5) targetValue = Math.floor(Math.random() * 5) + 5;
        currentMission.target = targetValue;
    }
    currentMission.type = 'sum';
    currentMission.text = `合計して ${currentMission.target} にしよう！`;
    updateMissionDisplay();
}

function checkMission() {
    if (selectedCells.length < 2) return false;
    const result = selectedCells.reduce((acc, cell) => acc + Number(cell.value), 0);
    return result === currentMission.target;
}

function handleInteractionStart(event) {
    if (isAnimating) return; 
    if (gridContainer.contains(event.target) || event.target === gridContainer) event.preventDefault();
    clearSelection();
    isDrawing = true;
    addCellToSelection(event);
}

function handleInteractionMove(event) {
    if (!isDrawing || isAnimating) return;
    if (gridContainer.contains(event.target) || event.target === gridContainer || event.type === 'touchmove') event.preventDefault();
    addCellToSelection(event);
}

function handleInteractionEnd(event) {
    if (!isDrawing) return;
    isDrawing = false;
    if (checkMission()) {
        messageArea.textContent = "ミッション成功！";
        score += selectedCells.length * 10;
        updateScoreDisplay();
        missionsSinceLastLevelUp++;
        if (missionsSinceLastLevelUp >= TARGET_MISSIONS_PER_LEVEL) {
            currentLevel++;
            missionsSinceLastLevelUp = 0;
            currentMission.target = 0;
            messageArea.textContent = `レベル ${currentLevel -1} クリア！レベル ${currentLevel} スタート！`;
        }
        processClearedCells();
    } else {
        if (selectedCells.length > 0) {
            failureSound.play();
            const failedCells = [...selectedCells];
            clearSelection();
            failedCells.forEach(cell => {
                if (cell.element) cell.element.classList.add('failed');
            });
            setTimeout(() => {
                failedCells.forEach(cell => {
                    cell.element?.classList.remove('failed');
                });
            }, 500);
        }
    }
    if (!checkMission()) {
        clearCanvas();
    }
}

function handleGiveUp() {
    if (isAnimating) return;
    clearSelection();
    currentLevel++;
    missionsSinceLastLevelUp = 0;
    currentMission.target = 0;
    generateNewMission();
    messageArea.textContent = `次のレベル (${currentLevel}) に進みます！`;
    setTimeout(() => {
        if (messageArea.textContent === `次のレベル (${currentLevel}) に進みます！`) messageArea.textContent = "";
    }, 2000);
}

function addCellToSelection(event) {
    const targetCellData = getCellFromEvent(event);
    if (!targetCellData || selectedCells.find(sc => sc.id === targetCellData.id)) return;
    if (selectedCells.length > 0) {
        const lastCell = selectedCells[selectedCells.length - 1];
        if (Math.abs(lastCell.row - targetCellData.row) > 1 || Math.abs(lastCell.col - targetCellData.col) > 1) return;
    }
    selectedCells.push(targetCellData);
    if(targetCellData.element) targetCellData.element.classList.add('selected');
    
    try {
        selectSounds[Math.min(selectedCells.length - 1, selectSounds.length - 1)].play();
    } catch (e) {
        console.error("サウンドの再生に失敗しました: ", e);
    }
    drawLines();
}

function getCellFromEvent(event) {
    const gridRect = gridContainer.getBoundingClientRect();
    let clientX, clientY;
    if (event.touches?.length) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else if (event.changedTouches?.length) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }
    const pointerX = clientX - gridRect.left;
    const pointerY = clientY - gridRect.top;
    for (const row of cellsData) {
        for (const cell of row) {
            if (!cell) continue;
            const distance = Math.hypot(pointerX - cell.centerX, pointerY - cell.centerY);
            if (distance < cell.collisionRadius) return cell;
        }
    }
    return null;
}

function clearSelection() {
    selectedCells.forEach(cell => cell.element?.classList.remove('selected'));
    selectedCells = [];
    clearCanvas();
}

function drawLines() {
    clearCanvas();
    if (selectedCells.length < 2) return;

    canvasCtx.strokeStyle = 'rgba(255, 128, 171, 0.7)';
    
    const radius = (selectedCells[0].element.offsetWidth / 2);
    canvasCtx.lineWidth = radius;
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';

    canvasCtx.beginPath();
    canvasCtx.moveTo(selectedCells[0].centerX, selectedCells[0].centerY);
    for (let i = 1; i < selectedCells.length; i++) {
        canvasCtx.lineTo(selectedCells[i].centerX, selectedCells[i].centerY);
    }
    canvasCtx.stroke();
}

function clearCanvas() {
    canvasCtx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
}

function createParticles(cell, gameContainer, gameContainerRect, gridContainerRect) {
    if (!cell) return;
    const offsetX = gridContainerRect.left - gameContainerRect.left;
    const offsetY = gridContainerRect.top - gameContainerRect.top;
    const startX = offsetX + cell.centerX;
    const startY = offsetY + cell.centerY;

    for (let i = 0; i < NUM_PARTICLES_PER_CELL; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 60 + 30;
        
        particle.style.left = `${startX - PARTICLE_BASE_SIZE_PX / 2}px`;
        particle.style.top = `${startY - PARTICLE_BASE_SIZE_PX / 2}px`;

        particle.style.setProperty('--particle-x', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--particle-y', `${Math.sin(angle) * distance}px`);
        particle.style.setProperty('--particle-mid-x', `${Math.cos(angle) * distance * 0.5}px`);
        particle.style.setProperty('--particle-mid-y', `${Math.sin(angle) * distance * 0.5}px`);
        particle.style.animationDelay = `${Math.random() * 0.25}s`;
        
        gameContainer.appendChild(particle);
        
        particle.addEventListener('animationend', () => particle.remove());
    }
}

async function processClearedCells() {
    isAnimating = true;
    try {
        const cellsToClear = [...selectedCells];
        clearSelection();
        clearSound.play();

        const gameContainer = document.getElementById('game-container');
        const gameContainerRect = gameContainer.getBoundingClientRect();
        const gridContainerRect = gridContainer.getBoundingClientRect();

        cellsToClear.forEach(cell => createParticles(cell, gameContainer, gameContainerRect, gridContainerRect));
        
        const removalPromises = cellsToClear.map(cell => {
            if(cell?.element) {
                cell.element.classList.add('clearing');
                return new Promise(resolve => setTimeout(resolve, 600));
            }
            return Promise.resolve();
        });
        await Promise.all(removalPromises);
        cellsToClear.forEach(clearedCell => {
            if (clearedCell?.row !== undefined && cellsData[clearedCell.row]?.[clearedCell.col]) {
                cellsData[clearedCell.row][clearedCell.col].value = null;
                clearedCell.element?.classList.remove('clearing');
            }
        });
        await applyGravityAndRefill();
        generateNewMission();
    } finally {
        isAnimating = false;
    }
}

async function applyGravityAndRefill() {
    const animationPromises = [];
    for (let c = 0; c < GRID_SIZE; c++) {
        let emptySlotsInCol = 0;
        for (let r = GRID_SIZE - 1; r >= 0; r--) {
            if (!cellsData[r]?.[c]) continue;
            const currentCellData = cellsData[r][c];
            if (currentCellData.value === null) {
                emptySlotsInCol++;
            } else if (emptySlotsInCol > 0) {
                const newRow = r + emptySlotsInCol;
                const cellToMove = cellsData[r][c];
                if (!cellToMove.element) continue;
                const cellHeight = cellToMove.element.offsetHeight;
                const gap = parseFloat(window.getComputedStyle(gridContainer).gap) || 8;
                const fallDistance = emptySlotsInCol * (cellHeight + gap);
                cellToMove.element.style.transform = `translateY(${fallDistance}px)`;
                cellToMove.element.classList.add('falling');
                cellsData[newRow][c] = cellToMove;
                cellsData[r][c] = { value: null, element: cellsData[r][c].element, row: r, col: c, id: `empty-temp-${r}-${c}-${Date.now()}` };
                cellToMove.row = newRow;
                animationPromises.push(new Promise(resolve => {
                    setTimeout(() => {
                        if (cellToMove.element) {
                            cellToMove.element.style.transform = '';
                            cellToMove.element.classList.remove('falling');
                        }
                        resolve();
                    }, 500);
                }));
            }
        }
        for (let i = 0; i < emptySlotsInCol; i++) {
            const cellToFill = cellsData[i][c];
            if (!cellToFill?.element) continue;
            cellToFill.value = Math.floor(Math.random() * (MAX_NUM - MIN_NUM + 1)) + MIN_NUM;
            cellToFill.element.classList.add('new-cell');
            animationPromises.push(new Promise(resolve => {
                setTimeout(() => {
                    cellToFill.element?.classList.remove('new-cell');
                    resolve();
                }, 500);
            }));
        }
    }
    await Promise.all(animationPromises);
    const tempGridDataValuesOnly = cellsData.map(row => row.map(cell => ({ value: cell.value })));
    gridContainer.innerHTML = '';
    const newMasterCellsData = [];
    for(let r=0; r<GRID_SIZE; r++) {
        const newRowData = [];
        for(let c=0; c<GRID_SIZE; c++) {
            const valueToSet = tempGridDataValuesOnly[r][c].value;
            const newElement = createCellElement(r,c, valueToSet);
            gridContainer.appendChild(newElement);
            newRowData.push({ value: valueToSet, element: newElement, row: r, col: c, id: `cell-${r}-${c}-${Date.now()}` });
        }
        newMasterCellsData.push(newRowData);
    }
    cellsData = newMasterCellsData;
    resizeCanvasAndCells();
    updateAllCellDisplays();
}

function updateScoreDisplay() {
    scoreDisplay.textContent = score;
}

// --- イベントリスナー設定 ---
// タイトル画面のボタン
startButton.addEventListener('click', () => {
    startSound.play();
    initGame();
    showGameScreen();
});

quitButton.addEventListener('click', () => {
    if (confirm('タイトルに戻りますか？\n現在のスコアやレベルはリセットされます。')) {
        showTitleScreen();
    }
});

// ゲーム画面の操作エリア
const eventAreaForInteraction = document.getElementById('grid-area');
eventAreaForInteraction.addEventListener('mousedown', handleInteractionStart);
document.addEventListener('mousemove', handleInteractionMove);
document.addEventListener('mouseup', handleInteractionEnd);
eventAreaForInteraction.addEventListener('touchstart', handleInteractionStart, { passive: false });
document.addEventListener('touchmove', handleInteractionMove, { passive: false });
document.addEventListener('touchend', handleInteractionEnd);
document.addEventListener('touchcancel', handleInteractionEnd);
giveUpButton.addEventListener('click', handleGiveUp);
window.addEventListener('resize', resizeCanvasAndCells);

// --- 初期化 ---
document.body.style.opacity = 1;

// --- ここからが追加部分：タイトル画面の星アニメーション ---
const starCanvas = document.getElementById('star-canvas');
const starCtx = starCanvas ? starCanvas.getContext('2d') : null;

let stars = [];
const starImages = [];
let starAnimationId = null;
let areStarsReady = false;

// アニメーション関連の関数をグローバルに定義
var startStarAnimation = function() {};
var stopStarAnimation = function() {};
var resizeStarCanvas = function() {};

if (starCanvas && starCtx) {
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
                    callback();
                }
            };
            img.onerror = () => {
                console.error(`Failed to load star image: ${src}`);
                loaded++;
                if (loaded === starImageSources.length) {
                    areStarsReady = true;
                    callback();
                }
            };
            img.src = src;
            starImages.push(img);
        });
    }

    resizeStarCanvas = function() {
        starCanvas.width = window.innerWidth;
        starCanvas.height = window.innerHeight;
    };

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
                rotation: Math.random() * Math.PI * 2, // 初期回転角度
                rotationSpeed: (Math.random() - 0.5) * 0.04 // 回転速度 (正と負の値)
            });
        }
    }

    function drawStars() {
        starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
        stars.forEach(star => {
            if (star.img && star.img.complete) {
                starCtx.save(); // 現在の描画状態を保存
                // 星の中心に原点を移動
                starCtx.translate(star.x + star.size / 2, star.y + star.size / 2);
                // キャンバスを回転
                starCtx.rotate(star.rotation);
                // 中心合わせで画像を描画
                starCtx.drawImage(star.img, -star.size / 2, -star.size / 2, star.size, star.size);
                starCtx.restore(); // 描画状態を元に戻す
            }
        });
    }

    function updateStars() {
        stars.forEach(star => {
            star.y += star.speedY;
            star.rotation += star.rotationSpeed; // 回転角度を更新
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

    // 最初に画像を読み込んでアニメーションを開始
    preloadStarImages(() => {
        if (!titleScreen.classList.contains('hidden')) {
            startStarAnimation();
        }
    });

    // リサイズイベントに星空キャンバスのリサイズ処理も追加
    window.addEventListener('resize', () => {
        if (!titleScreen.classList.contains('hidden')) {
            resizeStarCanvas();
        }
    });
}