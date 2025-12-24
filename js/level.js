// Модуль для управления уровнем и картой
const Level = (function() {
    const MAP_SIZE = 10; // Увеличили до 10x10
    const DIRECTIONS = ['Север', 'Восток', 'Юг', 'Запад'];
    const DIRECTION_SYMBOLS = ['↑', '→', '↓', '←'];
    
    // Типы сущностей
    const ENTITY_TYPES = {
        ENEMY: 'enemy',
        NPC: 'npc',
        TREE: 'tree'
    };
    
    // Состояние сущности
    const ENTITY_STATES = {
        ALIVE: 'alive',
        DEAD: 'dead',
        DESTROYED: 'destroyed'
    };
    
    // Игровое состояние
    const gameState = {
        playerX: 5, // Старт в центре 10x10 карты
        playerY: 5,
        direction: 0,
        visitedCells: new Set(),
        walls: new Set(),
        entities: new Map(), // Map<"x,y", {type, state, passable, ...}>
        gameLog: [
            "Вы начали свое приключение в подземелье.",
            "Вы слышите эхо вдалеке."
        ]
    };
    
    // Описание видов
    const viewDescriptions = {
        default: "Вы стоите в каменном коридоре. Воздух сырой и холодный.",
        special: {
            "0,0": "Вы в северо-западном углу подземелья. Здесь особенно холодно.",
            "9,9": "Вы достигли юго-восточного угла. Здесь на стене висит старый факел.",
            "5,0": "Вы у северной стены подземелья. Перед вами массивная дверь с железными скобами."
        }
    };
    
    // Описания сущностей
    const entityDescriptions = {
        [ENTITY_TYPES.ENEMY]: {
            name: "Гоблин",
            description: "Маленький зеленый гоблин с острыми когтями.",
            lookDescription: "Перед вами стоит злобный гоблин!",
            passable: false,
            health: 10,
            damage: 2
        },
        [ENTITY_TYPES.NPC]: {
            name: "Странник",
            description: "Закутанный в плащ странник.",
            lookDescription: "Перед вами стоит загадочный странник.",
            passable: false,
            dialogue: "ПРИВЕТ, путник! Я заблудился в этих подземельях..."
        },
        [ENTITY_TYPES.TREE]: {
            name: "Древнее дерево",
            description: "Старое, скрюченное дерево, растущее сквозь каменный пол.",
            lookDescription: "Перед вами древнее дерево, проросшее сквозь камни.",
            passable: true, // По умолчанию проходимое, но можно изменить
            variants: [
                { name: "Проходимое дерево", passable: true },
                { name: "Непроходимое дерево", passable: false }
            ]
        }
    };
    
    // Инициализация уровня
    function init() {
        generateWalls();
        generateEntities();
        gameState.visitedCells.add(`${gameState.playerX},${gameState.playerY}`);
        return gameState;
    }
    
    // Генерация стен
    function generateWalls() {
        gameState.walls.clear();
        
        // Внешние стены по периметру
        for (let x = 0; x < MAP_SIZE; x++) {
            gameState.walls.add(`${x},0`);
            gameState.walls.add(`${x},${MAP_SIZE-1}`);
        }
        for (let y = 0; y < MAP_SIZE; y++) {
            gameState.walls.add(`0,${y}`);
            gameState.walls.add(`${MAP_SIZE-1},${y}`);
        }
        
        // Лабиринт из стен
        const mazeWalls = [
            "2,2", "3,2", "4,2", "5,2",
            
            "2,7", "3,7", "4,7", "5,7", "6,7",
            "8,6", "8,7", "8,8",
            "1,5", "2,5", "3,5",
            "5,4", "6,4", "7,4",
            "4,8", "5,8", "6,8"
        ];
        
        mazeWalls.forEach(wall => gameState.walls.add(wall));
    }
    
    // Генерация сущностей
    function generateEntities() {
        gameState.entities.clear();
        
        // Добавляем несколько врагов
        addEntity(3, 3, ENTITY_TYPES.ENEMY);
        addEntity(7, 7, ENTITY_TYPES.ENEMY);
        addEntity(1, 8, ENTITY_TYPES.ENEMY);
        
        // Добавляем NPC
        addEntity(5, 3, ENTITY_TYPES.NPC);
        addEntity(8, 2, ENTITY_TYPES.NPC);
        
        // Добавляем деревья (случайно проходимые и непроходимые)
        const treePositions = [
            {x: 2, y: 4, passable: true},
            {x: 4, y: 5, passable: false},
            {x: 6, y: 3, passable: true},
            {x: 3, y: 6, passable: false},
            {x: 7, y: 5, passable: true},
            {x: 8, y: 8, passable: false}
        ];
        
        treePositions.forEach(pos => {
            addEntity(pos.x, pos.y, ENTITY_TYPES.TREE, {passable: pos.passable});
        });
    }
    
    // Добавление сущности
    function addEntity(x, y, type, options = {}) {
        const key = `${x},${y}`;
        const baseData = entityDescriptions[type];
        
        gameState.entities.set(key, {
            type,
            x,
            y,
            name: baseData.name,
            description: baseData.description,
            lookDescription: baseData.lookDescription,
            passable: options.passable !== undefined ? options.passable : baseData.passable,
            state: ENTITY_STATES.ALIVE,
            health: baseData.health,
            damage: baseData.damage,
            dialogue: baseData.dialogue,
            ...options
        });
    }
    
    // Получение сущности в клетке
    function getEntityAt(x, y) {
        return gameState.entities.get(`${x},${y}`);
    }
    
    // Удаление сущности
    function removeEntity(x, y) {
        return gameState.entities.delete(`${x},${y}`);
    }
    
    // Взаимодействие с сущностью перед игроком
    function interactWithEntityAhead() {
        const ahead = getCellAhead();
        const entity = getEntityAt(ahead.x, ahead.y);
        
        if (!entity) return null;
        
        let result = {
            success: true,
            message: "",
            entity: entity
        };
        
        switch(entity.type) {
            case ENTITY_TYPES.ENEMY:
                result.message = `${entity.name} рычит на вас! Готовьтесь к бою!`;
                break;
                
            case ENTITY_TYPES.NPC:
                if (entity.state === ENTITY_STATES.ALIVE) {
                    result.message = entity.dialogue || "ПРИВЕТ";
                } else {
                    result.message = `${entity.name} молча смотрит на вас.`;
                }
                break;
                
            case ENTITY_TYPES.TREE:
                result.message = `Это ${entity.name}. ${entity.passable ? 'Вы можете пройти сквозь него.' : 'Оно блокирует путь.'}`;
                break;
        }
        
        return result;
    }
    
    // Проверка, можно ли пройти через клетку
    function isPassable(x, y) {
        // Если это стена или вне границ - непроходимо
        if (isWall(x, y) || isOutOfBounds(x, y)) {
            return false;
        }
        
        // Если есть сущность - проверяем ее проходимость
        const entity = getEntityAt(x, y);
        if (entity) {
            return entity.passable;
        }
        
        // Пустая клетка - проходима
        return true;
    }
    
    // Получение клетки перед игроком
    function getCellAhead() {
        let x = gameState.playerX;
        let y = gameState.playerY;
        
        switch (gameState.direction) {
            case 0: y--; break; // Север
            case 1: x++; break; // Восток
            case 2: y++; break; // Юг
            case 3: x--; break; // Запад
        }
        
        return {x, y};
    }
    
    // Проверка на стену
    function isWall(x, y) {
        return gameState.walls.has(`${x},${y}`);
    }
    
    // Проверка границ
    function isOutOfBounds(x, y) {
        return x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE;
    }
    
    // Попытка перемещения
    function movePlayer(dx, dy) {
        const newX = gameState.playerX + dx;
        const newY = gameState.playerY + dy;
        
        if (isOutOfBounds(newX, newY)) {
            addLogEntry("Вы не можете выйти за пределы подземелья!");
            return false;
        }
        
        // Проверяем проходимость клетки
        if (!isPassable(newX, newY)) {
            const entity = getEntityAt(newX, newY);
            if (entity) {
                addLogEntry(`${entity.name} блокирует путь!`);
            } else {
                addLogEntry("Здесь стена! Вы не можете пройти.");
            }
            return false;
        }
        
        // Перемещаем игрока
        const oldX = gameState.playerX;
        const oldY = gameState.playerY;
        gameState.playerX = newX;
        gameState.playerY = newY;
        gameState.visitedCells.add(`${newX},${newY}`);
        
        addLogEntry(`Вы переместились в клетку (${newX}, ${newY}).`);
        
        // Проверяем, не встали ли мы на сущность
        const steppedOnEntity = getEntityAt(newX, newY);
        if (steppedOnEntity && steppedOnEntity.passable) {
            addLogEntry(`Вы прошли сквозь ${steppedOnEntity.name.toLowerCase()}.`);
        }
        
        return true;
    }
    
    // Добавление записи в лог
    function addLogEntry(text) {
        gameState.gameLog.push(text);
        if (gameState.gameLog.length > 15) { // Увеличили размер лога
            gameState.gameLog.shift();
        }
    }
    
    // Получение текущего описания
    function getCurrentDescription() {
        const currentPos = `${gameState.playerX},${gameState.playerY}`;
        let description = viewDescriptions.special[currentPos] || viewDescriptions.default;
        
        const dirText = DIRECTIONS[gameState.direction];
        description += ` Вы смотрите на ${dirText.toLowerCase()}.`;
        
        // Проверяем, что перед игроком
        const ahead = getCellAhead();
        const aheadEntity = getEntityAt(ahead.x, ahead.y);
        
        if (isWall(ahead.x, ahead.y) || isOutOfBounds(ahead.x, ahead.y)) {
            description += " Перед вами стена.";
        } else if (aheadEntity) {
            description += ` Перед вами ${aheadEntity.lookDescription || aheadEntity.name}.`;
        } else {
            description += " Перед вами проход.";
        }
        
        // Проверяем, на чем стоим
        const currentEntity = getEntityAt(gameState.playerX, gameState.playerY);
        if (currentEntity && currentEntity.passable) {
            description += ` Вы стоите ${currentEntity.passable ? 'внутри' : 'рядом с'} ${currentEntity.name.toLowerCase()}.`;
        }
        
        return description;
    }
    
    // Получение всех сущностей для отрисовки
    function getAllEntities() {
        return Array.from(gameState.entities.values());
    }
    
    // Публичные методы
    return {
        init,
        getState: () => ({...gameState, MAP_SIZE, DIRECTIONS, DIRECTION_SYMBOLS, ENTITY_TYPES, ENTITY_STATES}),
        updateState: (newState) => Object.assign(gameState, newState),
        getCellAhead,
        isWall,
        isOutOfBounds,
        isPassable,
        movePlayer,
        addLogEntry,
        getCurrentDescription,
        getEntityAt,
        removeEntity,
        getAllEntities,
        interactWithEntityAhead,
        
        // Геттеры для удобства
        getPlayerX: () => gameState.playerX,
        getPlayerY: () => gameState.playerY,
        getDirection: () => gameState.direction,
        getVisitedCells: () => new Set(gameState.visitedCells),
        getWalls: () => new Set(gameState.walls),
        getGameLog: () => [...gameState.gameLog],
        
        // Управление направлением
        turnLeft: () => {
            gameState.direction = (gameState.direction + 3) % 4;
            addLogEntry(`Вы повернули налево. Теперь вы смотрите на ${DIRECTIONS[gameState.direction].toLowerCase()}.`);
        },
        
        turnRight: () => {
            gameState.direction = (gameState.direction + 1) % 4;
            addLogEntry(`Вы повернули направо. Теперь вы смотрите на ${DIRECTIONS[gameState.direction].toLowerCase()}.`);
        }
    };
})();