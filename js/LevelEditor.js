const LevelEditor = (function() {
    const EDITOR_MODE = {
        WALL: 'wall',
        ENTITY: 'entity',
        ERASE: 'erase'
    };

    let currentMode = EDITOR_MODE.WALL;
    let currentEntityType = 'enemy';
    let currentSprite = 'ENEMY';
    let currentPassable = false;

    const entityTypes = {
        enemy: { name: 'Враг', sprites: ['ENEMY', 'ENEMY2'] },
        npc: { name: 'NPC', sprites: ['NPC', 'NPC2'] },
        tree: { name: 'Дерево', sprites: ['TREE'] }
    };

    let isActive = false;

    // Вспомогательная функция для преобразования типов
    function convertEntityType(stringType) {
        const state = Level.getState();
        switch(stringType?.toLowerCase()) {
            case 'enemy':
                return state.ENTITY_TYPES.ENEMY;
            case 'npc':
                return state.ENTITY_TYPES.NPC;
            case 'tree':
                return state.ENTITY_TYPES.TREE;
            default:
                console.error('Неизвестный тип сущности:', stringType);
                return state.ENTITY_TYPES.ENEMY;
        }
    }

    function init() {
        createEditorUI();
        setupEventListeners();
        console.log('Level Editor initialized');
    }

    function createEditorUI() {
        // Создаем контейнер для редактора
        const editorContainer = document.createElement('div');
        editorContainer.id = 'level-editor';
        editorContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            z-index: 1000;
            font-family: Arial, sans-serif;
            min-width: 250px;
            max-width: 300px;
            max-height: 80vh;
            overflow-y: auto;
            display: none;
        `;

        // Заголовок редактора
        editorContainer.innerHTML = `
            <h3 style="margin-top: 0; color: #4CAF50;">Редактор Уровня</h3>
            
            <div style="margin-bottom: 15px;">
                <strong>Режим:</strong><br>
                <label>
                    <input type="radio" name="mode" value="wall" checked> Стена
                </label><br>
                <label>
                    <input type="radio" name="mode" value="entity"> Сущность
                </label><br>
                <label>
                    <input type="radio" name="mode" value="erase"> Ластик
                </label>
            </div>
            
            <div id="entity-settings" style="display: none; margin-bottom: 15px;">
                <strong>Тип сущности:</strong><br>
                <select id="entity-type" style="width: 100%; margin-bottom: 10px;">
                    <option value="enemy">Враг</option>
                    <option value="npc">NPC</option>
                    <option value="tree">Дерево</option>
                </select>
                
                <strong>Спрайт:</strong><br>
                <select id="sprite-select" style="width: 100%; margin-bottom: 10px;">
                    <option value="ENEMY">Гоблин (красный)</option>
                    <option value="ENEMY2">Гоблин (синий)</option>
                </select>
                
                <label>
                    <input type="checkbox" id="entity-passable"> Проходимый
                </label>
            </div>
            
            <div style="margin-bottom: 15px;">
                <strong>Инструменты:</strong><br>
                <button id="save-level" style="margin: 5px 0; width: 100%;">💾 Сохранить уровень</button>
                <button id="load-level" style="margin: 5px 0; width: 100%;">📂 Загрузить уровень</button>
                <button id="test-level" style="margin: 5px 0; width: 100%; background: #4CAF50;">▶️ Тестировать</button>
                <button id="clear-level" style="margin: 5px 0; width: 100%; background: #f44336;">🗑️ Очистить</button>
            </div>
            
            <div style="font-size: 12px; color: #aaa;">
                <strong>Управление:</strong><br>
                • ЛКМ - Добавить<br>
                • ПКМ - Удалить<br>
                • Ctrl+Z - Отменить<br>
                • Ctrl+S - Сохранить
            </div>
        `;

        document.body.appendChild(editorContainer);
        updateEntitySettings();
        createEditGrid();
    }

    function updateEntitySettings() {
        const entitySettings = document.getElementById('entity-settings');
        const spriteSelect = document.getElementById('sprite-select');
        const entityTypeSelect = document.getElementById('entity-type');

        if (!entityTypeSelect) return;

        spriteSelect.innerHTML = '';
        const sprites = entityTypes[currentEntityType].sprites;

        sprites.forEach(sprite => {
            const option = document.createElement('option');
            option.value = sprite;

            let label = sprite;
            if (sprite === 'ENEMY') label = 'Гоблин (красный)';
            else if (sprite === 'ENEMY2') label = 'Гоблин (синий)';
            else if (sprite === 'NPC') label = 'Странник (зеленый)';
            else if (sprite === 'NPC2') label = 'Странник (синий)';
            else if (sprite === 'TREE') label = 'Дерево';

            option.textContent = label;
            spriteSelect.appendChild(option);
        });

        if (currentMode === EDITOR_MODE.ENTITY) {
            entitySettings.style.display = 'block';
        } else {
            entitySettings.style.display = 'none';
        }
    }

    function setupEventListeners() {
        document.querySelectorAll('input[name="mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentMode = e.target.value;
                updateEntitySettings();
            });
        });

        document.getElementById('entity-type').addEventListener('change', (e) => {
            currentEntityType = e.target.value;
            currentSprite = entityTypes[currentEntityType].sprites[0];
            updateEntitySettings();
        });

        document.getElementById('sprite-select').addEventListener('change', (e) => {
            currentSprite = e.target.value;
        });

        document.getElementById('entity-passable').addEventListener('change', (e) => {
            currentPassable = e.target.checked;
        });

        document.getElementById('save-level').addEventListener('click', saveLevel);
        document.getElementById('load-level').addEventListener('click', loadLevel);
        document.getElementById('test-level').addEventListener('click', testLevel);
        document.getElementById('clear-level').addEventListener('click', clearLevel);

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                undoLastAction();
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                saveLevel();
            }
            if (e.key === 'Escape' && isActive) {
                toggleEditor();
            }
        });
    }

    function createEditGrid() {
        if (document.getElementById('editor-grid')) {
            return;
        }

        const grid = document.createElement('div');
        grid.id = 'editor-grid';
        grid.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: grid;
            grid-template-columns: repeat(10, 30px);
            grid-template-rows: repeat(10, 30px);
            gap: 2px;
            background: #333;
            padding: 10px;
            border-radius: 5px;
            z-index: 999;
            display: none;
        `;

        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                const cell = document.createElement('div');
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.style.cssText = `
                    background: #555;
                    border: 1px solid #444;
                    cursor: pointer;
                    transition: background 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                `;
                cell.addEventListener('mouseover', () => {
                    cell.style.background = '#666';
                });
                cell.addEventListener('mouseout', () => {
                    updateCellVisual(x, y, cell);
                });
                cell.addEventListener('click', handleMapClick);
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    handleMapRightClick(e);
                });

                updateCellVisual(x, y, cell);
                grid.appendChild(cell);
            }
        }

        document.body.appendChild(grid);
        return grid;
    }

    function updateCellVisual(x, y, cell) {
        const state = Level.getState();
        const key = `${x},${y}`;

        cell.style.background = '#555';
        cell.innerHTML = '';

        if (state.walls.has(key)) {
            cell.style.background = '#888';
            cell.innerHTML = '🧱';
            return;
        }

        const entity = state.entities.get(key);
        if (entity) {
            switch(entity.type) {
                case 'enemy':
                    cell.style.background = '#d32f2f';
                    cell.innerHTML = '👹';
                    break;
                case 'npc':
                    cell.style.background = '#1976d2';
                    cell.innerHTML = '🧙';
                    break;
                case 'tree':
                    cell.style.background = '#388e3c';
                    cell.innerHTML = '🌳';
                    break;
            }
        }

        if (x === state.playerX && y === state.playerY) {
            let playerSymbol = '👤';
            switch(state.direction) {
                case 0: playerSymbol = '👆'; break;
                case 1: playerSymbol = '👉'; break;
                case 2: playerSymbol = '👇'; break;
                case 3: playerSymbol = '👈'; break;
            }
            cell.style.background = '#ff9800';
            cell.innerHTML = playerSymbol;
        }
    }

    function handleMapClick(e) {
        const cell = e.target.closest('[data-x][data-y]');
        if (!cell) return;

        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);

        switch(currentMode) {
            case EDITOR_MODE.WALL:
                toggleWall(x, y);
                break;
            case EDITOR_MODE.ENTITY:
                addEntity(x, y);
                break;
            case EDITOR_MODE.ERASE:
                removeFromCell(x, y);
                break;
        }

        updateCellVisual(x, y, cell);
        updateAllCells();
    }

    function handleMapRightClick(e) {
        const cell = e.target.closest('[data-x][data-y]');
        if (!cell) return;

        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);

        removeFromCell(x, y);
        updateCellVisual(x, y, cell);
        updateAllCells();
    }

    function toggleWall(x, y) {
        const state = Level.getState();
        const key = `${x},${y}`;

        if (x === state.playerX && y === state.playerY) {
            alert("Нельзя ставить стену на игрока!");
            return;
        }

        if (state.walls.has(key)) {
            state.walls.delete(key);
        } else {
            state.walls.add(key);
            Level.removeEntity(x, y);
        }
    }

    function addEntity(x, y) {
        const state = Level.getState();

        if (x === state.playerX && y === state.playerY) {
            alert("Нельзя ставить сущность на игрока!");
            return;
        }

        Level.removeEntity(x, y);

        // ⭐ ИСПРАВЛЕННЫЙ КОД: Используем конвертер типов
        const entityTypeConstant = convertEntityType(currentEntityType);

        Level.addEntity(x, y, entityTypeConstant, {
            sprite: currentSprite,
            passable: currentPassable
        });

        const key = `${x},${y}`;
        if (state.walls.has(key)) {
            state.walls.delete(key);
        }
    }

    function removeFromCell(x, y) {
        const state = Level.getState();
        const key = `${x},${y}`;

        Level.removeEntity(x, y);
        state.walls.delete(key);
    }

    function updateAllCells() {
        const cells = document.querySelectorAll('#editor-grid [data-x][data-y]');
        cells.forEach(cell => {
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);
            updateCellVisual(x, y, cell);
        });
    }

    function saveLevel() {
        const state = Level.getState();
        const levelData = {
            walls: Array.from(state.walls),
            entities: Array.from(state.entities.values()),
            player: {
                x: state.playerX,
                y: state.playerY,
                direction: state.direction
            },
            metadata: {
                created: new Date().toISOString(),
                name: prompt("Название уровня:", "Мой уровень") || "Без названия"
            }
        };

        const dataStr = JSON.stringify(levelData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = `level_${Date.now()}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        alert(`Уровень сохранен как ${exportFileDefaultName}`);
    }

    function loadLevel() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const levelData = JSON.parse(event.target.result);
                    applyLevelData(levelData);
                    alert("Уровень загружен!");
                } catch (error) {
                    alert("Ошибка загрузки уровня: " + error.message);
                }
            };

            reader.readAsText(file);
        };

        input.click();
    }

    function applyLevelData(levelData) {
        const state = Level.getState();
        state.walls.clear();
        state.entities.clear();

        levelData.walls.forEach(wall => {
            state.walls.add(wall);
        });

        const gameState = Level.getState();
        levelData.entities.forEach(entityData => {
            // ⭐ ИСПРАВЛЕНИЕ: Конвертируем строку типа
            let entityType;
            if (typeof entityData.type === 'string') {
                entityType = convertEntityType(entityData.type);
            } else {
                entityType = entityData.type;
            }

            Level.addEntity(
                entityData.x,
                entityData.y,
                entityType,
                entityData
            );
        });

        if (levelData.player) {
            state.playerX = levelData.player.x;
            state.playerY = levelData.player.y;
            state.direction = levelData.player.direction || 0;
        }

        updateAllCells();
        Game.updateGameDisplay();
        if (typeof ThreeJSRenderer !== 'undefined' && ThreeJSRenderer.updateView) {
            ThreeJSRenderer.updateView();
        }
    }

    function testLevel() {
        const editor = document.getElementById('level-editor');
        const grid = document.getElementById('editor-grid');

        if (editor) editor.style.display = 'none';
        if (grid) grid.style.display = 'none';

        if (typeof ThreeJSRenderer !== 'undefined' && ThreeJSRenderer.resetRenderer) {
            ThreeJSRenderer.resetRenderer();
        }

        alert("Тестовый режим активирован. Для возврата в редактор нажмите F5.");
    }

    function clearLevel() {
        if (confirm("Вы уверены, что хотите очистить весь уровень?")) {
            const state = Level.getState();
            state.walls.clear();
            state.entities.clear();

            for (let x = 0; x < 10; x++) {
                state.walls.add(`${x},0`);
                state.walls.add(`${x},9`);
            }
            for (let y = 0; y < 10; y++) {
                state.walls.add(`0,${y}`);
                state.walls.add(`9,${y}`);
            }

            updateAllCells();
            alert("Уровень очищен!");
        }
    }

    function undoLastAction() {
        alert("Отмена последнего действия (нужно реализовать историю)");
    }

    function toggleEditor() {
        const editor = document.getElementById('level-editor');
        const grid = document.getElementById('editor-grid');

        if (!editor || !grid) {
            init();
            editor = document.getElementById('level-editor');
            grid = document.getElementById('editor-grid');
        }

        isActive = !isActive;

        if (isActive) {
            editor.style.display = 'block';
            grid.style.display = 'grid';
            console.log("Редактор уровня активирован!");
        } else {
            editor.style.display = 'none';
            grid.style.display = 'none';
            console.log("Редактор уровня скрыт!");
        }
    }

    return {
        init,
        toggleEditor,
        saveLevel,
        loadLevel,
        testLevel
    };
})();

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (typeof LevelEditor !== 'undefined') {
            LevelEditor.init();
            console.log('LevelEditor инициализирован автоматически');
        }
    }, 500);
});