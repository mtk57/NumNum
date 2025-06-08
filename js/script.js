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
    titleScreen.style.opacity = '0';
    titleScreen.addEventListener('transitionend', () => {
        titleScreen.classList.add('hidden');
    }, { once: true });

    gameContainer.classList.remove('hidden');
    // displayプロパティが反映されてからopacityを変更するため、わずかな遅延を入れる
    setTimeout(() => {
        gameContainer.style.opacity = '1';
    }, 10);
}

function showTitleScreen() {
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
    resizeCanvasAndCells();
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

    // 半透明のピンク色を指定
    canvasCtx.strokeStyle = 'rgba(255, 128, 171, 0.7)';
    
    // 線の太さをセルの半径程度に設定
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

    // game-containerからgrid-containerまでの相対オフセットを計算
    const offsetX = gridContainerRect.left - gameContainerRect.left;
    const offsetY = gridContainerRect.top - gameContainerRect.top;
    
    // セルの中心座標を game-container の左上からの相対座標に変換
    const startX = offsetX + cell.centerX;
    const startY = offsetY + cell.centerY;

    for (let i = 0; i < NUM_PARTICLES_PER_CELL; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 60 + 30;
        
        // パーティクルの初期位置を game-container を基準に設定
        particle.style.left = `${startX - PARTICLE_BASE_SIZE_PX / 2}px`;
        particle.style.top = `${startY - PARTICLE_BASE_SIZE_PX / 2}px`;

        particle.style.setProperty('--particle-x', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--particle-y', `${Math.sin(angle) * distance}px`);
        particle.style.setProperty('--particle-mid-x', `${Math.cos(angle) * distance * 0.5}px`);
        particle.style.setProperty('--particle-mid-y', `${Math.sin(angle) * distance * 0.5}px`);
        particle.style.animationDelay = `${Math.random() * 0.25}s`;
        
        // パーティクルを game-container に追加
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

        // 修正：パーティクル生成の前にコンテナの情報を一度だけ取得
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
    initGame(); // ゲームを初期化
    showGameScreen(); // ゲーム画面へ遷移
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
// initGame(); // 初期化はSTARTボタン押下時に行うので、ここはコメントアウトまたは削除
document.body.style.opacity = 1; // ちらつき防止のため、JS読み込み完了後に表示
