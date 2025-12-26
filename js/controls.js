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

        // Создаем кнопки управления ТОЛЬКО со стрелками
        const buttons = [
            {
                id: 'btn-turn-left',
                symbol: '↰', // Поворот влево
                grid: [1, 1],
                keyHint: 'Q'
            },
            {
                id: 'btn-forward',
                symbol: '↑', // Вперед
                grid: [2, 1],
                keyHint: 'W'
            },
            {
                id: 'btn-turn-right',
                symbol: '↱', // Поворот вправо
                grid: [3, 1],
                keyHint: 'E'
            },
            {
                id: 'btn-slide-left',
                symbol: '←', // Сдвиг влево
                grid: [1, 2],
                keyHint: 'A'
            },
            {
                id: 'btn-back',
                symbol: '↓', // Назад
                grid: [2, 2],
                keyHint: 'S'
            },
            {
                id: 'btn-slide-right',
                symbol: '→', // Сдвиг вправо
                grid: [3, 2],
                keyHint: 'D'
            },
            {
                id: 'btn-interact',
                symbol: '🚪', // Взаимодействовать
                grid: [2, 3],
                colspan: 3,
                keyHint: 'ПРОБЕЛ'
            }
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.id = btn.id;
            button.className = 'control-btn';
            button.innerHTML = btn.symbol; // Только символ, без текста
            button.title = getButtonTitle(btn.id, btn.keyHint); // Добавляем подсказку при наведении

            button.style.gridColumn = `${btn.grid[0]} / span ${btn.colspan || 1}`;
            button.style.gridRow = btn.grid[1];
            container.appendChild(button);
        });

        // Обновляем grid для контейнера
        container.style.gridTemplateRows = 'repeat(3, 1fr)';
        container.style.height = '200px';
    }

    function getButtonTitle(buttonId, keyHint) {
        // Возвращаем текстовое описание для подсказки при наведении
        switch(buttonId) {
            case 'btn-turn-left': return 'Поворот влево (Q)';
            case 'btn-forward': return 'Вперед (W)';
            case 'btn-turn-right': return 'Поворот вправо (E)';
            case 'btn-slide-left': return 'Сдвиг влево (A)';
            case 'btn-back': return 'Назад (S)';
            case 'btn-slide-right': return 'Сдвиг вправо (D)';
            case 'btn-interact': return 'Взаимодействовать (ПРОБЕЛ)';
            default: return '';
        }
    }

    function moveForward() {
        if (ThreeJSRenderer.isMoving) return;

        const level = Game.getLevel();
        const state = level.getState();
        let dx = 0, dy = 0;

        switch (state.direction) {
            case 0: dy = -1; break; // Север
            case 1: dx = 1; break;  // Восток
            case 2: dy = 1; break;  // Юг
            case 3: dx = -1; break; // Запад
        }

        ThreeJSRenderer.startMovement(dx, dy);
    }

    function moveBackward() {
        if (ThreeJSRenderer.isMoving) return;

        const level = Game.getLevel();
        const state = level.getState();
        let dx = 0, dy = 0;

        // Назад - это противоположно направлению взгляда
        switch (state.direction) {
            case 0: dy = 1; break;   // Север -> Юг
            case 1: dx = -1; break;  // Восток -> Запад
            case 2: dy = -1; break;  // Юг -> Север
            case 3: dx = 1; break;   // Запад -> Восток
        }

        ThreeJSRenderer.startMovement(dx, dy);
    }

    function turnLeft() {
        // Поворот не требует анимации движения, только изменение направления
        Game.getLevel().turnLeft();

        // Обновляем Three.js рендерер для отображения нового направления
        ThreeJSRenderer.updateView();
        Game.updateGameDisplay();
    }

    function turnRight() {
        // Поворот не требует анимации движения, только изменение направления
        Game.getLevel().turnRight();

        // Обновляем Three.js рендерер для отображения нового направления
        ThreeJSRenderer.updateView();
        Game.updateGameDisplay();
    }

    function slideLeft() {
        if (ThreeJSRenderer.isMoving) return;

        const level = Game.getLevel();
        const state = level.getState();
        let dx = 0, dy = 0;

        // Скольжение влево относительно направления взгляда
        switch (state.direction) {
            case 0: dx = -1; break; // Север -> Запад
            case 1: dy = -1; break; // Восток -> Север
            case 2: dx = 1; break;  // Юг -> Восток
            case 3: dy = 1; break;  // Запад -> Юг
        }

        ThreeJSRenderer.startMovement(dx, dy);
    }

    function slideRight() {
        if (ThreeJSRenderer.isMoving) return;

        const level = Game.getLevel();
        const state = level.getState();
        let dx = 0, dy = 0;

        // Скольжение вправо относительно направления взгляда
        switch (state.direction) {
            case 0: dx = 1; break;  // Север -> Восток
            case 1: dy = 1; break;  // Восток -> Юг
            case 2: dx = -1; break; // Юг -> Запад
            case 3: dy = -1; break; // Запад -> Север
        }

        ThreeJSRenderer.startMovement(dx, dy);
    }

    function interact() {
        // Взаимодействие не требует движения
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