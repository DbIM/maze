// Модуль управления
const Controls = (function() {
    function init() {
        createControls();
        setupEventListeners();
        console.log('Controls initialized');
    }
    
    function createControls() {
        const container = document.getElementById('controls-container');
        container.innerHTML = '';
        
        // Создаем кнопки управления с подсказками клавиш
        const buttons = [
            { 
                id: 'btn-turn-left', 
                text: '↰ Поворот влево (Q)', 
                grid: [1, 1],
                keyHint: 'Q'
            },
            { 
                id: 'btn-forward', 
                text: '↑ Вперед (W)', 
                grid: [2, 1],
                keyHint: 'W'
            },
            { 
                id: 'btn-turn-right', 
                text: '↱ Поворот вправо (E)', 
                grid: [3, 1],
                keyHint: 'E'
            },
            { 
                id: 'btn-slide-left', 
                text: '↙ Сдвиг влево (A)', 
                grid: [1, 2],
                keyHint: 'A'
            },
            { 
                id: 'btn-back', 
                text: '↓ Назад (S)', 
                grid: [2, 2],
                keyHint: 'S'
            },
            { 
                id: 'btn-slide-right', 
                text: '↘ Сдвиг вправо (D)', 
                grid: [3, 2],
                keyHint: 'D'
            },
            { 
                id: 'btn-interact', 
                text: '🚪 Взаимодействовать (ПРОБЕЛ)', 
                grid: [2, 3], 
                colspan: 3,
                keyHint: 'ПРОБЕЛ'
            }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.id = btn.id;
            button.className = 'control-btn';
            
            // Создаем контейнер для текста
            const textContainer = document.createElement('div');
            textContainer.style.display = 'flex';
            textContainer.style.flexDirection = 'column';
            textContainer.style.alignItems = 'center';
            textContainer.style.justifyContent = 'center';
            textContainer.style.width = '100%';
            
            // Основной текст
            const mainText = document.createElement('div');
            mainText.textContent = btn.text.split(' (')[0];
            mainText.style.fontSize = '1.1em';
            mainText.style.marginBottom = '5px';
            
            // Подсказка клавиши
            const keyHint = document.createElement('div');
            keyHint.textContent = `[${btn.keyHint}]`;
            keyHint.style.fontSize = '0.9em';
            keyHint.style.opacity = '0.8';
            keyHint.style.fontWeight = 'bold';
            keyHint.style.color = '#ffffa0';
            
            textContainer.appendChild(mainText);
            textContainer.appendChild(keyHint);
            button.appendChild(textContainer);
            
            button.style.gridColumn = `${btn.grid[0]} / span ${btn.colspan || 1}`;
            button.style.gridRow = btn.grid[1];
            container.appendChild(button);
        });
        
        // Обновляем grid для контейнера
        container.style.gridTemplateRows = 'repeat(3, 1fr)';
        container.style.height = '200px';
    }
    
    function moveForward() {
        const state = Game.getLevel().getState();
        let dx = 0, dy = 0;
        
        switch (state.direction) {
            case 0: dy = -1; break; // Север
            case 1: dx = 1; break;  // Восток
            case 2: dy = 1; break;  // Юг
            case 3: dx = -1; break; // Запад
        }
        
        if (Game.getLevel().movePlayer(dx, dy)) {
            Game.updateGameDisplay();
        }
    }
    
    function moveBackward() {
        const state = Game.getLevel().getState();
        let dx = 0, dy = 0;
        
        switch (state.direction) {
            case 0: dy = 1; break;   // Север
            case 1: dx = -1; break;  // Восток
            case 2: dy = -1; break;  // Юг
            case 3: dx = 1; break;   // Запад
        }
        
        if (Game.getLevel().movePlayer(dx, dy)) {
            Game.updateGameDisplay();
        }
    }
    
    function turnLeft() {
        Game.getLevel().turnLeft();
        Game.updateGameDisplay();
    }
    
    function turnRight() {
        Game.getLevel().turnRight();
        Game.updateGameDisplay();
    }
    
    function slideLeft() {
        const state = Game.getLevel().getState();
        let dx = 0, dy = 0;
        
        switch (state.direction) {
            case 0: dx = -1; break; // Север - на запад
            case 1: dy = -1; break; // Восток - на север
            case 2: dx = 1; break;  // Юг - на восток
            case 3: dy = 1; break;  // Запад - на юг
        }
        
        if (Game.getLevel().movePlayer(dx, dy)) {
            Game.updateGameDisplay();
        }
    }
    
    function slideRight() {
        const state = Game.getLevel().getState();
        let dx = 0, dy = 0;
        
        switch (state.direction) {
            case 0: dx = 1; break;  // Север - на восток
            case 1: dy = 1; break;  // Восток - на юг
            case 2: dx = -1; break; // Юг - на запад
            case 3: dy = -1; break; // Запад - на север
        }
        
        if (Game.getLevel().movePlayer(dx, dy)) {
            Game.updateGameDisplay();
        }
    }
    
    function interact() {
        const result = Game.getLevel().interactWithEntityAhead();
        
        if (result) {
            Game.getLevel().addLogEntry(result.message);
            Game.updateGameDisplay();
        } else {
            Game.getLevel().addLogEntry("Здесь не с кем взаимодействовать.");
            Game.updateGameDisplay();
        }
    }
    
    function setupEventListeners() {
        document.getElementById('btn-forward').addEventListener('click', moveForward);
        document.getElementById('btn-back').addEventListener('click', moveBackward);
        document.getElementById('btn-turn-left').addEventListener('click', turnLeft);
        document.getElementById('btn-turn-right').addEventListener('click', turnRight);
        document.getElementById('btn-slide-left').addEventListener('click', slideLeft);
        document.getElementById('btn-slide-right').addEventListener('click', slideRight);
        document.getElementById('btn-interact').addEventListener('click', interact);
        
        // Поддержка клавиатуры
        document.addEventListener('keydown', handleKeyPress);
        
        // Добавляем подсказку про управление в лог
        setTimeout(() => {
            Game.getLevel().addLogEntry("Управление: W-вперед, S-назад, A-сдвиг влево, D-сдвиг вправо, Q/E-повороты, ПРОБЕЛ-взаимодействие");
            Game.updateGameDisplay();
        }, 1000);
    }
    
    function handleKeyPress(event) {
        // Игнорируем клавиши, если пользователь вводит текст где-то еще
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch(event.key.toLowerCase()) {
            case 'w':
            case 'ц': // Русская раскладка
                event.preventDefault();
                moveForward();
                highlightButton('btn-forward');
                break;
                
            case 's':
            case 'ы': // Русская раскладка
                event.preventDefault();
                moveBackward();
                highlightButton('btn-back');
                break;
                
            case 'a':
            case 'ф': // Русская раскладка
                event.preventDefault();
                slideLeft();
                highlightButton('btn-slide-left');
                break;
                
            case 'd':
            case 'в': // Русская раскладка
                event.preventDefault();
                slideRight();
                highlightButton('btn-slide-right');
                break;
                
            case 'q':
            case 'й': // Русская раскладка
                event.preventDefault();
                turnLeft();
                highlightButton('btn-turn-left');
                break;
                
            case 'e':
            case 'у': // Русская раскладка
                event.preventDefault();
                turnRight();
                highlightButton('btn-turn-right');
                break;
                
            case ' ':
            case 'spacebar':
                event.preventDefault();
                interact();
                highlightButton('btn-interact');
                break;
                
            // Старые клавиши для совместимости
            case 'arrowup':
                event.preventDefault();
                moveForward();
                highlightButton('btn-forward');
                break;
                
            case 'arrowdown':
                event.preventDefault();
                moveBackward();
                highlightButton('btn-back');
                break;
                
            case 'arrowleft':
                event.preventDefault();
                turnLeft();
                highlightButton('btn-turn-left');
                break;
                
            case 'arrowright':
                event.preventDefault();
                turnRight();
                highlightButton('btn-turn-right');
                break;
                
            case 'z':
            case 'я': // Русская раскладка
                event.preventDefault();
                slideLeft();
                highlightButton('btn-slide-left');
                break;
                
            case 'c':
            case 'с': // Русская раскладка
                event.preventDefault();
                slideRight();
                highlightButton('btn-slide-right');
                break;
                
            case 'enter':
                event.preventDefault();
                interact();
                highlightButton('btn-interact');
                break;
        }
    }
    
    function highlightButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            // Добавляем класс подсветки
            button.classList.add('key-pressed');
            
            // Убираем подсветку через 150ms
            setTimeout(() => {
                button.classList.remove('key-pressed');
            }, 150);
        }
    }
    
    return {
        init
    };
})();