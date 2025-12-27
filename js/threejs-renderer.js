// Three.js рендерер с поддержкой спрайтов
const ThreeJSRenderer = (function() {
    let scene, camera, renderer, sky;
    let initialized = false;
    let entitySprites = new Map();
    let wallMeshes = [];
    let floorMesh, ceilingMesh;
    let textureLoader;
    let spriteTextures = {};

    let targetCameraRotation = 0;
    const CAMERA_ROTATION_SPEED = 0.1;

    // Плавное движение
    let targetPosition = new THREE.Vector3();
    let _isMoving = false;
    const MOVEMENT_SPEED = 0.1; // Скорость движения (0.05 — медленно, 0.2 — быстро)
    let _pendingMove = null;

    let cachedWallTexture = null; // ✅ Добавьте сюда

    // Цвета
    const COLORS = {
        SKY: 0x87CEEB,
        WALL: 0xF5F5DC,
        WALL_DARK: 0xE0D8C0,
        FLOOR: 0x4A4A4A,
        FLOOR_LIGHT: 0x5A5A5A
    };
    
    // Пути к спрайтам (относительные от index.html)
    const SPRITE_PATHS = {
        ENEMY: 'assets/sprites/enemy.png',
        ENEMY2: 'assets/sprites/enemy2.png',
        NPC: 'assets/sprites/npc.png',
        NPC2: 'assets/sprites/npc2.png',
        TREE: 'assets/sprites/tree.png',
        DEFAULT: 'assets/sprites/default.png' // Запасной спрайт
    };

    function init() {
        if (initialized) return;

        const container = document.getElementById('graphics-display');

        // Создаем сцену
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(COLORS.SKY, 8, 15); // Начало: 8, конец: 15

        // Создаем камеру
        camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);

        // Синхронизируем позицию камеры с позицией игрока
        syncCameraWithPlayerPosition();

        // Создаем рендерер
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(COLORS.SKY);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);
        
        // Создаем загрузчик текстур
        textureLoader = new THREE.TextureLoader();
        
        // Загружаем спрайты
        loadSprites();
        
        // Создаем небо
        createSky();
        
        // Добавляем освещение
        setupLighting();
        
        // Создаем пол и потолок
        createFloorAndCeiling();
        
        // Обновляем вид
        updateView();
        
        // Обработка изменения размера окна
        window.addEventListener('resize', onWindowResize);
        
        initialized = true;
        console.log('Three.js renderer initialized');
        
        // Запускаем анимацию
        animate();
    }

    function syncCameraWithPlayerPosition() {
        const cellSize = 3;
        const level = Game.getLevel();
        const state = level.getState();

        camera.position.set(
            state.playerX * cellSize,
            1.6, // Высота камеры
            state.playerY * cellSize
        );

        // Также сбрасываем targetPosition
        targetPosition.copy(camera.position);
    }
    
    function loadSprites() {
        // Загружаем все спрайты
        Object.keys(SPRITE_PATHS).forEach(key => {
            textureLoader.load(
                SPRITE_PATHS[key],
                // Успешная загрузка
                (texture) => {
                    spriteTextures[key] = texture;
                    console.log(`Спрайт ${key} загружен`);
                    
                    // Если это первый загруженный спрайт, обновляем вид
                    if (Object.keys(spriteTextures).length === 1) {
                        updateView();
                    }
                },
                // Прогресс загрузки
                (xhr) => {
                    console.log(`${key}: ${(xhr.loaded / xhr.total * 100)}% загружено`);
                },
                // Ошибка загрузки
                (error) => {
                    console.error(`Ошибка загрузки спрайта ${key}:`, error);
                    // Создаем простой спрайт вместо отсутствующего
                    createFallbackSprite(key);
                }
            );
        });
    }
    
    function createFallbackSprite(spriteType) {
        // Создаем простой цветной спрайт для замены
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Разные цвета для разных типов сущностей
        let color;
        switch(spriteType) {
            case 'ENEMY':
            case 'ENEMY2':
                color = '#FF0000'; // Красный для врагов
                break;
            case 'NPC':
            case 'NPC2':
                color = '#00FF00'; // Зеленый для NPC
                break;
            case 'TREE':
                color = '#008800'; // Темно-зеленый для деревьев
                break;
            default:
                color = '#888888'; // Серый по умолчанию
        }
        
        // Рисуем круг с тенью
        ctx.fillStyle = color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fill();
        
        // Добавляем букву для идентификации
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let letter = '?';
        switch(spriteType) {
            case 'ENEMY': letter = 'E'; break;
            case 'NPC': letter = 'N'; break;
            case 'TREE': letter = 'T'; break;
        }
        
        ctx.fillText(letter, 32, 32);
        
        spriteTextures[spriteType] = new THREE.CanvasTexture(canvas);
    }
    
    function createSky() {
        const skyGeometry = new THREE.SphereGeometry(100, 32, 32);
        const skyTexture = createSkyTexture();
        const skyMaterial = new THREE.MeshBasicMaterial({ 
            map: skyTexture,
            side: THREE.BackSide
        });
        
        sky = new THREE.Mesh(skyGeometry, skyMaterial);
        scene.add(sky);
    }
    
    function createSkyTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.5, '#B0E2FF');
        gradient.addColorStop(0.7, '#E0F7FF');
        gradient.addColorStop(1, '#FFFFFF');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * canvas.width;
            const y = 50 + Math.random() * 100;
            const size = 30 + Math.random() * 40;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.ellipse(x, y, size, size/3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.x = 2;
        return texture;
    }
    
    function setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.7);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
        directionalLight.position.set(10, 20, 10);
        scene.add(directionalLight);
        
        const fillLight = new THREE.DirectionalLight(0xFFFFFF, 0.3);
        fillLight.position.set(-10, 10, -10);
        scene.add(fillLight);
    }
    
    function createFloorAndCeiling() {
        const cellSize = 3;
        const wallHeight = 4;
        
        // Создаем пол
        const floorTexture = createFloorTexture();
        const floorGeometry = new THREE.PlaneGeometry(cellSize * 20, cellSize * 20);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            map: floorTexture,
            side: THREE.DoubleSide
        });
        floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.rotation.x = Math.PI / 2;
        floorMesh.position.y = -0.5;
        floorMesh.receiveShadow = true;
        scene.add(floorMesh);
        
        // Создаем потолок
        const ceilingGeometry = new THREE.PlaneGeometry(cellSize * 20, cellSize * 20);
        const ceilingMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xE8F4F8
        });
        ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceilingMesh.rotation.x = -Math.PI / 2;
        ceilingMesh.position.y = wallHeight - 0.5;
        ceilingMesh.receiveShadow = true;
        scene.add(ceilingMesh);
    }
    
    function createFloorTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#4A4A4A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const tileSize = 64;
        for (let y = 0; y < canvas.height; y += tileSize) {
            for (let x = 0; x < canvas.width; x += tileSize) {
                const brightness = 70 + Math.random() * 30;
                ctx.fillStyle = `rgb(${brightness}, ${brightness-10}, ${brightness-10})`;
                ctx.fillRect(x, y, tileSize, tileSize);
                
                ctx.strokeStyle = `rgba(30, 30, 30, 0.5)`;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, tileSize, tileSize);
                
                for (let i = 0; i < 3; i++) {
                    const startX = x + Math.random() * tileSize;
                    const startY = y + Math.random() * tileSize;
                    const endX = startX + (Math.random() - 0.5) * 20;
                    const endY = startY + (Math.random() - 0.5) * 20;
                    
                    ctx.strokeStyle = `rgba(20, 20, 20, ${0.3 + Math.random() * 0.3})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(8, 8);
        return texture;
    }
    
    function createWallTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = `rgb(245, 245, 220)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const brightness = 200 + Math.random() * 40;
            
            ctx.fillStyle = `rgba(${brightness}, ${brightness-20}, ${brightness-40}, ${0.05 + Math.random() * 0.1})`;
            ctx.beginPath();
            ctx.arc(x, y, 1 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (let x = 0; x < canvas.width; x += 20) {
            ctx.fillStyle = `rgba(200, 190, 170, ${0.1 + Math.random() * 0.1})`;
            ctx.fillRect(x + Math.random() * 5, 0, 2 + Math.random() * 3, canvas.height);
        }
        
        for (let y = 0; y < canvas.height; y += 15) {
            ctx.fillStyle = `rgba(210, 200, 180, ${0.05 + Math.random() * 0.05})`;
            ctx.fillRect(0, y + Math.random() * 3, canvas.width, 1);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        return texture;
    }
    
    function onWindowResize() {
        const container = document.getElementById('graphics-display');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    function animate() {
        requestAnimationFrame(animate);

        // === Плавный поворот ===
        const angleDifference = targetCameraRotation - camera.rotation.y;
        const normalizedDiff = THREE.MathUtils.euclideanModulo(angleDifference + Math.PI, Math.PI * 2) - Math.PI;

        if (Math.abs(normalizedDiff) > 0.001) {
            camera.rotation.y += normalizedDiff * CAMERA_ROTATION_SPEED;
        } else {
            camera.rotation.y = targetCameraRotation;
        }

        // === Плавное движение ===
        if (_isMoving && _pendingMove) {
            const moveDiff = targetPosition.clone().sub(camera.position);
            const distance = moveDiff.length();

            if (distance > 0.01) {
                const step = moveDiff.normalize().multiplyScalar(Math.min(distance, MOVEMENT_SPEED));
                camera.position.add(step);
            } else {
                // Движение завершено
                camera.position.copy(targetPosition);

                // Обновляем игровую логику ПОСЛЕ завершения анимации
                const level = Game.getLevel();
                const currentState = level.getState(); // Получаем состояние здесь

                // Проверяем еще раз перед фактическим перемещением
                if (level.isPassable(
                    currentState.playerX + _pendingMove.dx,
                    currentState.playerY + _pendingMove.dy
                )) {
                    level.movePlayer(_pendingMove.dx, _pendingMove.dy);
                } else {
                    console.log("Клетка стала непроходимой во время движения");
                    // Возвращаем камеру на исходную позицию
                    targetPosition.copy(camera.position);
                    camera.position.copy(targetPosition);
                }

                // Сбрасываем флаги движения
                _isMoving = false;
                _pendingMove = null;

                // Обновляем отображение
                updateView();
                Game.updateGameDisplay();
            }
        }

        // === Анимация спрайтов ===
        entitySprites.forEach((sprite, key) => {
            if (!sprite.parent) return;
            sprite.lookAt(camera.position);

            const floorHeight = -0.5;
            const heightAboveFloor = sprite.userData.heightAboveFloor || 1.0;

            if (sprite.userData.type === 'enemy') {
                const scale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
                sprite.scale.set(4, 4, 4);
                sprite.position.y = floorHeight + 1.7;
                // Враг стоит на месте, только пульсирует
            } else if (sprite.userData.type === 'npc') {
                if (sprite.userData.entity.sprite === 'NPC2') {
                    // NPC2 — парит в воздухе
                    sprite.scale.set(2, 2, 2);
                    const float = Math.sin(Date.now() * 0.002) * 0.3;
                    sprite.position.y = floorHeight + 1.5 + float;
                } else {
                    // NPC1 — лёгкое дыхание на своей высоте
                    sprite.scale.set(3, 3, 3);
                    sprite.position.y = floorHeight + 1.5;
                }
            } else if (sprite.userData.type === 'tree') {
                // Дерево — лёгкое покачивание на своей высоте
                sprite.scale.set(4, 4, 4);
                sprite.position.y = floorHeight + 2;
            }
        });

        renderer.render(scene, camera);
    }

    function updateView() {
        if (!initialized) return;

        // Очищаем старые стены и спрайты
        clearOldMeshes();

        const state = Game.getLevel().getState();

        // Устанавливаем направление камеры
        updateCameraDirection(state.direction);

        // Создаем стены в видимой области
        createWalls(state);

        // Добавляем спрайты сущностей в видимой области
        createEntitySprites(state);
    }

    function resetRenderer() {
        // Очищаем все спрайты
        entitySprites.forEach((sprite, key) => {
            if (sprite.parent) {
                scene.remove(sprite);
            }
        });
        entitySprites.clear();

        // Очищаем стены
        clearOldMeshes();

        // Синхронизируем камеру
        syncCameraWithPlayerPosition();

        // Обновляем вид
        updateView();
    }

    function clearOldMeshes() {
        // Удаляем все старые стены
        wallMeshes.forEach(mesh => {
            if (mesh.parent) {
                scene.remove(mesh);
            }
        });
        wallMeshes = [];

        // Удаляем спрайты сущностей, которые находятся слишком далеко
        const state = Game.getLevel().getState();
        const entities = Game.getLevel().getAllEntities();
        const visibleEntities = new Set();

        // Собираем ключи видимых сущностей
        entities.forEach(entity => {
            const dx = entity.x - state.playerX;
            const dz = entity.y - state.playerY;
            const distance = Math.sqrt(dx*dx + dz*dz);

            if (distance <= 5) {
                visibleEntities.add(`${entity.x},${entity.y}`);
            }
        });

        // Удаляем спрайты невидимых сущностей
        entitySprites.forEach((sprite, key) => {
            if (!visibleEntities.has(key) && sprite.parent) {
                scene.remove(sprite);
                entitySprites.delete(key);
            }
        });
    }

    function updateCameraDirection(direction) {
        let targetY = 0;
        switch(direction) {
            case 0: targetY = 0; break;
            case 1: targetY = -Math.PI / 2; break;
            case 2: targetY = Math.PI; break;
            case 3: targetY = Math.PI / 2; break;
            default: targetY = 0;
        }
        targetCameraRotation = targetY;
    }

    function getWallTexture() {
        if (!cachedWallTexture) {
            cachedWallTexture = createWallTexture();
        }
        return cachedWallTexture;
    }

    function createWalls(state) {
        const cellSize = 3;
        const wallHeight = 4;
        const wallTexture = getWallTexture();

        // ⭐ Увеличиваем расстояние просмотра с 4 до 5
        const viewDistance = 7;
        for (let x = -viewDistance; x <= viewDistance; x++) {
            for (let z = -viewDistance; z <= viewDistance; z++) {
                const worldX = state.playerX + x;
                const worldZ = state.playerY + z;

                // Пропускаем клетку, где стоит игрок
                if (x === 0 && z === 0) continue;

                if (Game.getLevel().isWall(worldX, worldZ) ||
                    Game.getLevel().isOutOfBounds(worldX, worldZ)) {

                    if (isWallVisible(x, z, state.direction)) {
                        // Позиция стены В МИРОВЫХ КООРДИНАТАХ
                        const wallWorldX = worldX * cellSize;
                        const wallWorldZ = worldZ * cellSize;

                        createWallAt(wallWorldX, wallWorldZ, cellSize, wallHeight, wallTexture);
                    }
                }
            }
        }
    }

    function createWallAt(worldX, worldZ, cellSize, wallHeight, wallTexture) {
        const wallGeometry = new THREE.BoxGeometry(cellSize, wallHeight, cellSize);
        const wallMaterial = new THREE.MeshLambertMaterial({
            map: wallTexture,
            color: COLORS.WALL
        });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(worldX, wallHeight/2 - 0.5, worldZ);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        wallMeshes.push(wall);

        const capGeometry = new THREE.BoxGeometry(cellSize * 1.05, 0.2, cellSize * 1.05);
        const capMaterial = new THREE.MeshLambertMaterial({
            color: COLORS.WALL_DARK
        });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.set(worldX, wallHeight - 0.4, worldZ);
        cap.castShadow = true;
        scene.add(cap);
        wallMeshes.push(cap);
    }


    function isWallVisible(x, z, direction) {
        const distance = Math.sqrt(x*x + z*z);
        // ⭐ Увеличиваем дальность с 4 до 5.5 (чуть больше, чем у сущностей)
        if (distance > 7) return false;

        // ⭐ Расширяем углы обзора
        switch(direction) {
            case 0: // Смотрим на север
                return z <= 2 && Math.abs(x) <= 3; // Видим 2 клетки вперед и 3 в стороны
            case 1: // Смотрим на восток
                return x >= -2 && Math.abs(z) <= 3;
            case 2: // Смотрим на юг
                return z >= -2 && Math.abs(x) <= 3;
            case 3: // Смотрим на запад
                return x <= 2 && Math.abs(z) <= 3;
        }
        return false;
    }

    function createEntitySprites(state) {
        const entities = Game.getLevel().getAllEntities();
        const cellSize = 3;

        // Высота пола (пол находится на y = -0.5)
        const FLOOR_HEIGHT = -0.5;

        entities.forEach(entity => {
            // Проверяем, видна ли сущность (расстояние от игрока)
            const dx = entity.x - state.playerX;
            const dz = entity.y - state.playerY;
            const distance = Math.sqrt(dx*dx + dz*dz);

            if (distance > 5) return;

            const spriteKey = `${entity.x},${entity.y}`;

            // Если спрайт уже существует - обновляем позицию в мировых координатах
            if (entitySprites.has(spriteKey)) {
                const existingSprite = entitySprites.get(spriteKey);
                // ⭐ Обновляем высоту относительно пола ⭐
                existingSprite.position.set(
                    entity.x * cellSize,
                    FLOOR_HEIGHT + existingSprite.userData.heightAboveFloor || 0,
                    entity.y * cellSize
                );
                return;
            }

            // Используем сохраненный тип спрайта из данных сущности
            const textureKey = entity.sprite || 'DEFAULT';

            // Если спрайт еще не загружен, используем заглушку
            const texture = spriteTextures[textureKey] || spriteTextures.DEFAULT;
            if (!texture) return;

            // Создаем материал для спрайта
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.9
            });

            // Создаем спрайт
            const sprite = new THREE.Sprite(material);

            // ⭐ ВЫСОТА ОТНОСИТЕЛЬНО ПОЛА ⭐
            let spriteSize = 1.5;
            let heightAboveFloor = 0; // Насколько выше пола стоит спрайт

            if (entity.type === state.ENTITY_TYPES.TREE) {
                spriteSize = 2.0;
                heightAboveFloor = 2.0; // Дерево высотой 2 метра от пола
            } else if (entity.type === state.ENTITY_TYPES.ENEMY) {
                spriteSize = 1.3;
                heightAboveFloor = 1.3; // Враг высотой 1.3 метра
            } else if (entity.type === state.ENTITY_TYPES.NPC) {
                if (entity.sprite === 'NPC') {
                    // NPC1 — стоит на земле
                    spriteSize = 1.4;
                    heightAboveFloor = 1.4; // NPC высотой 1.4 метра
                } else if (entity.sprite === 'NPC2') {
                    // NPC2 — парит в воздухе
                    spriteSize = 1.4;
                    heightAboveFloor = 2.2; // Парит выше
                }
            }

            sprite.scale.set(spriteSize, spriteSize, 1);

            // ⭐ Позиция В МИРОВЫХ КООРДИНАТАХ с правильной высотой ⭐
            sprite.position.set(
                entity.x * cellSize,
                FLOOR_HEIGHT + heightAboveFloor, // Пол + высота спрайта
                entity.y * cellSize
            );

            sprite.userData = {
                type: entity.type === state.ENTITY_TYPES.TREE ? 'tree' : entity.type,
                entity: entity,
                spriteKey: textureKey,
                heightAboveFloor: heightAboveFloor, // Сохраняем высоту над полом
                baseHeight: FLOOR_HEIGHT + heightAboveFloor // Общая высота
            };

            scene.add(sprite);
            entitySprites.set(spriteKey, sprite);
        });
    }

    function startMovement(dx, dy) {
        if (_isMoving) return;

        const cellSize = 3;
        const level = Game.getLevel();
        const state = level.getState();

        // Проверяем, можно ли переместиться (включая сущности)
        const newX = state.playerX + dx;
        const newY = state.playerY + dy;

        console.log(`Попытка движения: (${state.playerX},${state.playerY}) + (${dx},${dy}) = (${newX},${newY})`);

        // Проверяем проходимость клетки через метод уровня
        if (!level.isPassable(newX, newY)) {
            console.log("Нельзя двигаться - препятствие");
            return; // Нельзя двигаться
        }

        // Плавное движение камеры
        _isMoving = true;
        _pendingMove = { dx, dy };

        // Устанавливаем целевые координаты
        targetPosition.x = camera.position.x + dx * cellSize;
        targetPosition.y = camera.position.y; // Сохраняем высоту
        targetPosition.z = camera.position.z + dy * cellSize;

        console.log(`Целевая позиция камеры: (${targetPosition.x.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
        console.log(`Текущая позиция камеры: (${camera.position.x.toFixed(2)}, ${camera.position.z.toFixed(2)})`);

        // НЕ вызываем level.movePlayer() здесь - это будет сделано после анимации
    }

    return {
        init,
        updateView,
        startMovement,
        resetRenderer, // Добавьте эту строку
        get isMoving() {
            return _isMoving;
        }
    };
})();