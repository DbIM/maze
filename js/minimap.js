// Модуль мини-карты
const Minimap = (function() {
    // Символы для разных типов сущностей
    const ENTITY_SYMBOLS = {
        enemy: '☠',
        npc: '☺',
        tree: '♣'
    };
    
    function init() {
        update();
        console.log('Minimap initialized');
    }
    
    function update() {
        const container = document.getElementById('mini-map-container');
        const state = Game.getLevel().getState();
        
        container.innerHTML = `
            <div id="map-title">Карта подземелья (${state.MAP_SIZE}x${state.MAP_SIZE})</div>
            <div id="map-grid"></div>
        `;
        
        const mapGrid = document.getElementById('map-grid');
        mapGrid.style.gridTemplateColumns = `repeat(${state.MAP_SIZE}, 1fr)`;
        mapGrid.style.gridTemplateRows = `repeat(${state.MAP_SIZE}, 1fr)`;
        
        const walls = Game.getLevel().getWalls();
        const visited = Game.getLevel().getVisitedCells();
        const entities = Game.getLevel().getAllEntities();
        
        // Создаем карту сущностей для быстрого доступа
        const entityMap = new Map();
        entities.forEach(entity => {
            entityMap.set(`${entity.x},${entity.y}`, entity);
        });
        
        for (let y = 0; y < state.MAP_SIZE; y++) {
            for (let x = 0; x < state.MAP_SIZE; x++) {
                const cell = document.createElement('div');
                cell.className = 'map-cell';
                
                if (x === state.playerX && y === state.playerY) {
                    cell.classList.add('player-here');
                    
                    const dirSymbol = document.createElement('div');
                    dirSymbol.className = 'direction-indicator';
                    dirSymbol.textContent = state.DIRECTION_SYMBOLS[state.direction];
                    cell.appendChild(dirSymbol);
                } else if (walls.has(`${x},${y}`)) {
                    cell.classList.add('wall');
                    cell.textContent = '█';
                } else if (entityMap.has(`${x},${y}`)) {
                    const entity = entityMap.get(`${x},${y}`);
                    cell.classList.add('entity');
                    
                    // Добавляем класс в зависимости от типа сущности
                    cell.classList.add(`entity-${entity.type}`);
                    
                    // Отображаем символ сущности
                    cell.textContent = ENTITY_SYMBOLS[entity.type] || '?';
                    
                    // Добавляем всплывающую подсказку
                    cell.title = entity.name;
                } else if (visited.has(`${x},${y}`)) {
                    cell.classList.add('visited');
                    cell.textContent = '·';
                }
                
                mapGrid.appendChild(cell);
            }
        }
    }
    
    return {
        init,
        update
    };
})();