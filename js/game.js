// Основной игровой движок
const Game = (function() {
    let initialized = false;
    
    function init() {
        if (initialized) return;
        
        // Инициализируем уровень
        Level.init();
        
        // Обновляем отображение
        updateGameDisplay();
        
        initialized = true;
        console.log('Game initialized');
    }
    
    function updateGameDisplay() {
        // Обновляем текстовое описание
        const description = Level.getCurrentDescription();
        document.getElementById('view-display').textContent = description;
        
        // Обновляем информацию об игроке
        const state = Level.getState();
        document.getElementById('player-position').textContent = 
            `Позиция: X=${state.playerX}, Y=${state.playerY}`;
        document.getElementById('player-direction').textContent = 
            `Направление: ${state.DIRECTIONS[state.direction]}`;
        
        // Обновляем статус
        updateStatus();
        
        // Обновляем журнал
        updateGameLog();
        
        // Обновляем мини-карту
        if (typeof Minimap !== 'undefined' && Minimap.update) {
            Minimap.update();
        }
        
        // Обновляем 3D вид
        if (typeof ThreeJSRenderer !== 'undefined' && ThreeJSRenderer.updateView) {
            ThreeJSRenderer.updateView();
        }
    }
    
    function updateStatus() {
        const statusElement = document.getElementById('game-status');
        const state = Level.getState();
        
        // Проверяем, что перед игроком
        const ahead = Level.getCellAhead();
        const entityAhead = Level.getEntityAt(ahead.x, ahead.y);
        
        if (entityAhead) {
            statusElement.textContent = `Перед вами: ${entityAhead.name}`;
        } else {
            statusElement.textContent = 'Статус: Исследование';
        }
    }
    
    function updateGameLog() {
        const logEntries = Level.getGameLog();
        const logContainer = document.getElementById('log-entries');
        logContainer.innerHTML = '';
        
        logEntries.forEach(entry => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.textContent = entry;
            logContainer.appendChild(logEntry);
        });
        
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    
    // Публичные методы
    return {
        init,
        updateGameDisplay,
        getLevel: () => Level
    };
})();