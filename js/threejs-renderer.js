// Three.js рендерер с поддержкой спрайтов
const ThreeJSRenderer = (function() {
    let scene, camera, renderer, sky;
    let initialized = false;
    let entitySprites = new Map();
    let wallMeshes = [];
    let floorMesh, ceilingMesh;
    let textureLoader;
    let spriteTextures = {};
    
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
        scene.fog = new THREE.Fog(COLORS.SKY, 5, 25);
        
        // Создаем камеру
        camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 1.6, 0);
        
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
        
        // Анимация спрайтов (поворот к камере)
        entitySprites.forEach((sprite, key) => {
            if (!sprite.parent) return;
            
            // Всегда поворачиваем спрайт к камере (billboard effect)
            sprite.lookAt(camera.position);
            
            // Легкая пульсация для некоторых типов
            if (sprite.userData.type === 'enemy') {
                const scale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
                sprite.scale.set(scale, scale, 1);
            } else if (sprite.userData.type === 'npc') {
                // Легкое покачивание для NPC
                sprite.position.y = 0.8 + Math.sin(Date.now() * 0.002) * 0.05;
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
    
    function clearOldMeshes() {
        // Удаляем все старые стены
        wallMeshes.forEach(mesh => {
            if (mesh.parent) {
                scene.remove(mesh);
            }
        });
        wallMeshes = [];
        
        // Удаляем только спрайты сущностей, которые больше не видны
        const entities = Game.getLevel().getAllEntities();
        const visibleEntities = new Set();
        
        // Собираем ключи видимых сущностей
        entities.forEach(entity => {
            const dx = entity.x - Game.getLevel().getPlayerX();
            const dz = entity.y - Game.getLevel().getPlayerY();
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
        switch(direction) {
            case 0: camera.rotation.y = 0; break;
            case 1: camera.rotation.y = -Math.PI / 2; break;
            case 2: camera.rotation.y = Math.PI; break;
            case 3: camera.rotation.y = Math.PI / 2; break;
        }
    }
    
    function createWalls(state) {
        const cellSize = 3;
        const wallHeight = 4;
        const wallTexture = createWallTexture();
        
        const viewDistance = 4;
        for (let x = -viewDistance; x <= viewDistance; x++) {
            for (let z = -viewDistance; z <= viewDistance; z++) {
                const worldX = state.playerX + x;
                const worldZ = state.playerY + z;
                
                if (x === 0 && z === 0) continue;
                
                if (Game.getLevel().isWall(worldX, worldZ) || 
                    Game.getLevel().isOutOfBounds(worldX, worldZ)) {
                    
                    if (isWallVisible(x, z, state.direction)) {
                        createWallAt(x, z, cellSize, wallHeight, wallTexture);
                    }
                }
            }
        }
    }
    
    function createWallAt(x, z, cellSize, wallHeight, wallTexture) {
        const wallGeometry = new THREE.BoxGeometry(cellSize, wallHeight, cellSize);
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            map: wallTexture,
            color: COLORS.WALL
        });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x * cellSize, wallHeight/2 - 0.5, z * cellSize);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        wallMeshes.push(wall);
        
        const capGeometry = new THREE.BoxGeometry(cellSize * 1.05, 0.2, cellSize * 1.05);
        const capMaterial = new THREE.MeshLambertMaterial({ 
            color: COLORS.WALL_DARK
        });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.set(x * cellSize, wallHeight - 0.4, z * cellSize);
        cap.castShadow = true;
        scene.add(cap);
        wallMeshes.push(cap);
    }
    
    function isWallVisible(x, z, direction) {
        const distance = Math.sqrt(x*x + z*z);
        if (distance > 4) return false;
        
        switch(direction) {
            case 0: return z <= 1 && Math.abs(x) <= 2;
            case 1: return x >= -1 && Math.abs(z) <= 2;
            case 2: return z >= -1 && Math.abs(x) <= 2;
            case 3: return x <= 1 && Math.abs(z) <= 2;
        }
        return false;
    }
    
        function createEntitySprites(state) {
            const entities = Game.getLevel().getAllEntities();
            const cellSize = 3;
            
            entities.forEach(entity => {
                // Проверяем, видна ли сущность
                const dx = entity.x - state.playerX;
                const dz = entity.y - state.playerY;
                const distance = Math.sqrt(dx*dx + dz*dz);
                
                if (distance > 5) return;
                
                // Если спрайт уже создан для этой сущности - обновляем позицию
                if (entitySprites.has(`${entity.x},${entity.y}`)) {
                    const existingSprite = entitySprites.get(`${entity.x},${entity.y}`);
                    // Обновляем позицию относительно игрока
                    existingSprite.position.set(
                        (entity.x - state.playerX) * cellSize,
                        existingSprite.userData.baseHeight || 1.0,
                        (entity.y - state.playerY) * cellSize
                    );
                    return;
                }
                
                // Используем сохраненный тип спрайта из данных сущности
                const spriteKey = entity.sprite || 'DEFAULT';
                
                // Если спрайт еще не загружен, используем заглушку
                const texture = spriteTextures[spriteKey] || spriteTextures.DEFAULT;
                if (!texture) return;
                
                // Создаем материал для спрайта
                const material = new THREE.SpriteMaterial({ 
                    map: texture,
                    transparent: true,
                    opacity: 0.9
                });
                
                // Создаем спрайт
                const sprite = new THREE.Sprite(material);
                
                // Размер спрайта
                let spriteSize = 1.5;
                let baseHeight = 1.0;
                if (entity.type === state.ENTITY_TYPES.TREE) {
                    spriteSize = 2.0;
                    baseHeight = 1.5;
                } else if (entity.type === state.ENTITY_TYPES.ENEMY) {
                    spriteSize = 1.3;
                    baseHeight = 0.8;
                } else if (entity.type === state.ENTITY_TYPES.NPC) {
                    spriteSize = 1.4;
                    baseHeight = 0.9;
                }
                
                sprite.scale.set(spriteSize, spriteSize, 1);
                
                // Позиционируем
                sprite.position.set(
                    (entity.x - state.playerX) * cellSize,
                    baseHeight,
                    (entity.y - state.playerY) * cellSize
                );
                
                sprite.userData = { 
                    type: entity.type, 
                    entity: entity,
                    spriteKey: spriteKey,
                    baseHeight: baseHeight // Сохраняем базовую высоту для анимации
                };
                
                scene.add(sprite);
                entitySprites.set(`${entity.x},${entity.y}`, sprite);
            });
        }
    
    return {
        init,
        updateView,
        // Метод для перезагрузки спрайтов (если нужно менять на лету)
        reloadSprites: function() {
            spriteTextures = {};
            loadSprites();
        }
    };
})();