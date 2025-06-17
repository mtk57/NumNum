// js/game.js

// --- グローバルスコープに関数を公開 ---
var initGame = function() {};
var resizeCanvasAndCells = function() {};

document.addEventListener('DOMContentLoaded', () => {
    // --- Game State Variables ---
    let cellsData = [];
    let selectedCells = [];
    let currentMission = { type: 'sum', target: 0, text: "" };
    let score = 0;
    let isDrawing = false;
    let isAnimating = false;
    let missionsSinceLastLevelUp = 0;
    let currentLevel = 1;
    let lastTap = 0;
    let gameStartTime = null;

    // --- Star Variables ---
    let smallStars = [];
    let bigStarCount = 0;

    /**
     * 現在のレベルに応じた難易度設定を取得するヘルパー関数
     */
    function getCurrentLevelSettings() {
        const levelIndex = Math.max(0, Math.min(currentLevel - 1, LEVEL_DIFFICULTY_SETTINGS.length - 1));
        return LEVEL_DIFFICULTY_SETTINGS[levelIndex];
    }

    /**
     * ミドルエリアの背景色をランダムに変更
     */
    function changeBackgroundColor() {
        const middleArea = document.getElementById('middle-area');
        if (middleArea && typeof BACKGROUND_COLORS !== 'undefined' && BACKGROUND_COLORS.length > 0) {
            const randomColor = BACKGROUND_COLORS[Math.floor(Math.random() * BACKGROUND_COLORS.length)];
            middleArea.style.backgroundColor = randomColor;
        }
    }

    // --- Star Logic Functions ---

    /**
     * 指定された数の★を追加し、表示を更新
     * @param {number} count 追加する★の数
     * @param {string} imageSrc 表示する★の画像パス
     */
    function addStars(count, imageSrc) {
        if (bigStarCount >= MAX_BIG_STARS_DISPLAY) {
            return; // 大きい★が上限に達していたら何もしない
        }

        for (let i = 0; i < count; i++) {
            smallStars.push({ src: imageSrc });
        }

        if (smallStars.length >= MAX_SMALL_STARS_DISPLAY) {
            const newBigStars = Math.floor(smallStars.length / MAX_SMALL_STARS_DISPLAY);
            bigStarCount = Math.min(MAX_BIG_STARS_DISPLAY, bigStarCount + newBigStars);
            
            const remainingSmallStarCount = smallStars.length % MAX_SMALL_STARS_DISPLAY;
            smallStars.splice(0, smallStars.length - remainingSmallStarCount);

            // 大きい★が上限に達した場合、小さい★は0にする
            if (bigStarCount >= MAX_BIG_STARS_DISPLAY) {
                smallStars = [];
            }
        }
        updateStarDisplay();
    }

    /**
     * 【変更点】現在の★の数に応じて画面表示を更新し、アニメーションを追加
     */
    function updateStarDisplay() {
        const smallStarContainer = document.getElementById('small-star-container');
        const bigStarContainer = document.getElementById('big-star-container');
        if (!smallStarContainer || !bigStarContainer) return;

        smallStarContainer.innerHTML = '';
        bigStarContainer.innerHTML = '';

        smallStars.forEach(star => {
            const starImg = document.createElement('img');
            starImg.src = star.src;
            starImg.classList.add('small-star');
            // アニメーションの開始タイミングをランダムにずらす
            starImg.style.animationDelay = `${Math.random() * 2.5}s`;
            smallStarContainer.appendChild(starImg);
        });

        for (let i = 0; i < bigStarCount; i++) {
            const starImg = document.createElement('img');
            starImg.src = 'images/star01.png'; // 大きい★はデザイン固定
            starImg.classList.add('big-star');
            // アニメーションの開始タイミングをランダムにずらす
            starImg.style.animationDelay = `${Math.random() * 2.5}s`;
            bigStarContainer.appendChild(starImg);
        }
    }


    // --- ゲームロジック ---
    initGame = function() {
        gameStartTime = Date.now();
        gridContainer.innerHTML = '';
        cellsData = [];
        missionsSinceLastLevelUp = 0;
        currentLevel = 1;
        score = 0;
        currentMission.target = 0;
        
        // ★の数をリセット
        smallStars = [];
        bigStarCount = 0;
        updateStarDisplay();

        changeBackgroundColor();
        
        const settings = getCurrentLevelSettings();
        for (let r = 0; r < GRID_SIZE; r++) {
            const rowData = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                const cellValue = Math.floor(Math.random() * (settings.cellMax - settings.cellMin + 1)) + settings.cellMin;
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

    resizeCanvasAndCells = function() {
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
        const stageLabel = document.getElementById('stage-label');
        const progressBar = document.getElementById('progress-bar');
        const missionText = document.getElementById('mission-text');

        if (!stageLabel || !progressBar || !missionText) return;

        stageLabel.textContent = `ステージ ${currentLevel}`;

        const progress = missionsSinceLastLevelUp >= TARGET_MISSIONS_PER_LEVEL
            ? 100
            : (missionsSinceLastLevelUp / TARGET_MISSIONS_PER_LEVEL) * 100;
        progressBar.style.width = `${progress}%`;

        missionText.textContent = currentMission.text || 'ミッション準備中...';
    }

    function generateNewMission() {
        if (missionsSinceLastLevelUp === 0 || currentMission.target === 0) {
            let availableCells = cellsData.flat().filter(c => c && c.value !== null);
            if (availableCells.length < 2) {
                currentMission = { type: 'sum', target: 0, text: "数字が足りません！" };
                updateMissionDisplay();
                return;
            }

            const settings = getCurrentLevelSettings();
            const targetValue = Math.floor(Math.random() * (settings.missionMax - settings.missionMin + 1)) + settings.missionMin;
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
        if (event.type === 'touchend') {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                event.preventDefault();
                clearSelection(); 
                isDrawing = false; 
                resetAllCellValues(); 
                lastTap = 0; 
                return; 
            }
            lastTap = currentTime;
        }

        if (!isDrawing) return;
        isDrawing = false;

        if (checkMission()) {
            const clearedCellCount = selectedCells.length;
            const starsToAdd = STAR_REWARDS_TABLE[clearedCellCount];

            if (starsToAdd) {
                let imageSrc = STAR_IMAGE_MAPPING[clearedCellCount] || STAR_IMAGE_MAPPING[8];
                addStars(starsToAdd, imageSrc);
            }

            score += clearedCellCount * 10;
            updateScoreDisplay();
            missionsSinceLastLevelUp++;
            updateMissionDisplay();

            const isLevelUp = missionsSinceLastLevelUp >= TARGET_MISSIONS_PER_LEVEL;
            const isFinalClear = isLevelUp && currentLevel >= MAX_LEVEL;

            if (isFinalClear) {
                processClearedCells(true); 

                const timeTaken = Date.now() - gameStartTime;
                const minutes = Math.floor(timeTaken / 60000);
                const seconds = Math.round((timeTaken % 60000) / 1000);

                setTimeout(() => {
                    alert(
                        `🎉 全ステージクリア！おめでとうございます！ 🎉\n\n` +
                        `最終スコア: ${score}\n` +
                        `クリアタイム: ${minutes}分 ${seconds}秒\n\n` +
                        `OKボタンを押すとタイトルに戻ります。`
                    );
                    if (typeof showTitleScreen === 'function') {
                        showTitleScreen();
                    }
                }, 800);

            } else {
                if (isLevelUp) {
                    currentLevel++;
                    missionsSinceLastLevelUp = 0;
                    currentMission.target = 0;
                    changeBackgroundColor();
                    updateMissionDisplay();
                }
                processClearedCells();
            }

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

    /**
     * 【変更点】パーティクルを生成する関数。生成する数を引数で受け取れるように変更。
     * @param {object} cell - パーティクルを発生させるセルオブジェクト
     * @param {HTMLElement} gameContainer - ゲームコンテナ要素
     * @param {DOMRect} gameContainerRect - ゲームコンテナの矩形情報
     * @param {DOMRect} gridContainerRect - グリッドコンテナの矩形情報
     * @param {number} numParticles - 生成するパーティクルの数
     */
    function createParticles(cell, gameContainer, gameContainerRect, gridContainerRect, numParticles) {
        if (!cell) return;
        const offsetX = gridContainerRect.left - gameContainerRect.left;
        const offsetY = gridContainerRect.top - gameContainerRect.top;
        const startX = offsetX + cell.centerX;
        const startY = offsetY + cell.centerY;

        for (let i = 0; i < numParticles; i++) {
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
    
    /**
     * 【変更点】クリア処理。4個以上消した際に派手な演出を追加。
     */
    async function processClearedCells(suppressNewMission = false) {
        isAnimating = true;
        try {
            const cellsToClear = [...selectedCells];
            const clearedCount = cellsToClear.length; // 消したセルの数を取得
            clearSelection();
            
            const isSpecialClear = clearedCount >= SPECIAL_CLEAR_THRESHOLD;

            // --- 派手な演出の実行 ---
            if (isSpecialClear) {
                // 派手な効果音があればここで再生
                // if (typeof specialClearSound !== 'undefined') specialClearSound.play();
                // else clearSound.play();
                clearSound.play(); // 差し当たり通常のクリア音を再生

                // 画面シェイク
                const gameBoard = document.getElementById('game-board');
                if (gameBoard) {
                    gameBoard.classList.add('shake-effect');
                    setTimeout(() => gameBoard.classList.remove('shake-effect'), 300);
                }

                // 閃光エフェクト
                if (glowLayer) {
                    glowLayer.classList.add('flash-effect');
                    setTimeout(() => glowLayer.classList.remove('flash-effect'), 400);
                }
            } else {
                clearSound.play(); // 通常のクリア音
            }

            const gameContainer = document.getElementById('game-container');
            const gameContainerRect = gameContainer.getBoundingClientRect();
            const gridContainerRect = gridContainer.getBoundingClientRect();

            // パーティクルの数を条件によって変更
            const particleCount = isSpecialClear ? NUM_PARTICLES_PER_CELL_SPECIAL : NUM_PARTICLES_PER_CELL;
            cellsToClear.forEach(cell => createParticles(cell, gameContainer, gameContainerRect, gridContainerRect, particleCount));
            
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
            if (!suppressNewMission) {
                generateNewMission();
            }
        } finally {
            isAnimating = false;
        }
    }

    async function applyGravityAndRefill() {
        const animationPromises = [];
        const settings = getCurrentLevelSettings();

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
                cellToFill.value = Math.floor(Math.random() * (settings.cellMax - settings.cellMin + 1)) + settings.cellMin;
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
        // scoreDisplay.textContent = score; // スコア表示がなくなったため不要
    }

    function resetAllCellValues() {
        if (isAnimating) return;
    
        clearSelection(); 
    
        const allCells = cellsData.flat();
        allCells.forEach(cell => {
            if(cell.element) {
                cell.element.classList.add('clearing');
            }
        });
    
        const settings = getCurrentLevelSettings();
        setTimeout(() => {
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (cellsData[r] && cellsData[r][c]) {
                        const newValue = Math.floor(Math.random() * (settings.cellMax - settings.cellMin + 1)) + settings.cellMin;
                        cellsData[r][c].value = newValue;
                        if(cellsData[r][c].element) {
                            cellsData[r][c].element.classList.remove('clearing');
                            cellsData[r][c].element.classList.add('new-cell');
                        }
                    }
                }
            }
            updateAllCellDisplays(); 
    
            setTimeout(() => {
                 allCells.forEach(cell => {
                    if(cell.element) {
                        cell.element.classList.remove('new-cell');
                    }
                });
            }, 500);
    
        }, 600);
    }


    // --- イベントリスナー設定 ---
    quitButton.addEventListener('click', () => {
        if (confirm('タイトルに戻りますか？\n現在の進行状況はリセットされます。')) {
            if(typeof showTitleScreen === 'function') {
                showTitleScreen();
            }
        }
    });

    const eventAreaForInteraction = document.getElementById('grid-area');
    eventAreaForInteraction.addEventListener('mousedown', handleInteractionStart);
    document.addEventListener('mousemove', handleInteractionMove);
    document.addEventListener('mouseup', handleInteractionEnd);
    eventAreaForInteraction.addEventListener('touchstart', handleInteractionStart, { passive: false });
    document.addEventListener('touchmove', handleInteractionMove, { passive: false });
    document.addEventListener('touchend', handleInteractionEnd);
    document.addEventListener('touchcancel', handleInteractionEnd);
    window.addEventListener('resize', resizeCanvasAndCells);
    eventAreaForInteraction.addEventListener('dblclick', resetAllCellValues);
});