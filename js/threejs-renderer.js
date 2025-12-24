// Three.js рендерер для 3D вида
const ThreeJSRenderer = (function() {
    let scene, camera, renderer, sky;
    let initialized = false;
    let entityMeshes = new Map();
    let wallMeshes = [];
    let floorMesh, ceilingMesh;
    
    // Цвета
    const COLORS = {
        SKY: 0x87CEEB,
        WALL: 0xF5F5DC,
        WALL_DARK: 0xE0D8C0,
        FLOOR: 0x4A4A4A,
        FLOOR_LIGHT: 0x5A5A5A,
        TREE: 0x2E8B57,
        NPC: 0x4682B4,
        ENEMY: 0x8B0000,
        GRASS: 0x7CFC00
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
        
        // Создаем небо
        createSky();
        
        // Добавляем освещение
        setupLighting();
        
        // Создаем пол и потолок (они постоянные)
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
    
    function createSky() {
        // Создаем небо как большой купол
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
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
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
            color: 0xE8F4F8 // Светлый голубоватый
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
        
        // Анимация сущностей
        entityMeshes.forEach((mesh, key) => {
            if (!mesh.parent) return; // Если меш был удален
            
            if (mesh.userData.type === 'tree') {
                mesh.rotation.y += 0.005;
                if (mesh.userData.trunk) {
                    mesh.userData.trunk.position.y = Math.sin(Date.now() * 0.001 + mesh.userData.offset) * 0.05;
                }
            } else if (mesh.userData.type === 'npc') {
                mesh.position.y = 0.75 + Math.sin(Date.now() * 0.002) * 0.05;
                mesh.rotation.y += 0.01;
            } else if (mesh.userData.type === 'enemy') {
                const scale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
                mesh.scale.set(scale, scale, scale);
                mesh.position.y = 0.4 + Math.sin(Date.now() * 0.005) * 0.1;
            }
        });
        
        renderer.render(scene, camera);
    }
    
    function updateView() {
        if (!initialized) return;
        
        // Очищаем старые стены и сущности
        clearOldMeshes();
        
        const state = Game.getLevel().getState();
        
        // Устанавливаем направление камеры
        updateCameraDirection(state.direction);
        
        // Создаем стены в видимой области
        createWalls(state);
        
        // Добавляем сущности в видимой области
        createEntities(state);
    }
    
    function clearOldMeshes() {
        // Удаляем все старые стены
        wallMeshes.forEach(mesh => {
            if (mesh.parent) {
                scene.remove(mesh);
            }
        });
        wallMeshes = [];
        
        // Удаляем все старые сущности
        entityMeshes.forEach((mesh, key) => {
            if (mesh.parent) {
                scene.remove(mesh);
            }
        });
        entityMeshes.clear();
    }
    
    function updateCameraDirection(direction) {
        switch(direction) {
            case 0: camera.rotation.y = 0; break;        // Север
            case 1: camera.rotation.y = -Math.PI / 2; break; // Восток
            case 2: camera.rotation.y = Math.PI; break;     // Юг
            case 3: camera.rotation.y = Math.PI / 2; break; // Запад
        }
    }
    
    function createWalls(state) {
        const cellSize = 3;
        const wallHeight = 4;
        const wallTexture = createWallTexture();
        
        // Создаем стены только в видимой области
        const viewDistance = 4;
        for (let x = -viewDistance; x <= viewDistance; x++) {
            for (let z = -viewDistance; z <= viewDistance; z++) {
                const worldX = state.playerX + x;
                const worldZ = state.playerY + z;
                
                if (x === 0 && z === 0) continue; // Позиция игрока
                
                if (Game.getLevel().isWall(worldX, worldZ) || 
                    Game.getLevel().isOutOfBounds(worldX, worldZ)) {
                    
                    // Проверяем, видна ли стена с текущей позиции
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
        
        // Добавляем верхнюю часть стены
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
            case 0: // Север
                return z <= 1 && Math.abs(x) <= 2;
            case 1: // Восток
                return x >= -1 && Math.abs(z) <= 2;
            case 2: // Юг
                return z >= -1 && Math.abs(x) <= 2;
            case 3: // Запад
                return x <= 1 && Math.abs(z) <= 2;
        }
        return false;
    }
    
    function createEntities(state) {
        const entities = Game.getLevel().getAllEntities();
        const cellSize = 3;
        
        entities.forEach(entity => {
            // Проверяем, видна ли сущность с текущей позиции
            const dx = entity.x - state.playerX;
            const dz = entity.y - state.playerY;
            const distance = Math.sqrt(dx*dx + dz*dz);
            
            if (distance > 5) return; // Слишком далеко
            
            // Создаем меш в зависимости от типа сущности
            const mesh = createEntityMesh(entity, state);
            if (mesh) {
                // Позиционируем относительно игрока
                mesh.position.set(
                    (entity.x - state.playerX) * cellSize,
                    0,
                    (entity.y - state.playerY) * cellSize
                );
                
                mesh.userData = { 
                    type: entity.type, 
                    entity: entity,
                    offset: Math.random() * Math.PI * 2
                };
                
                mesh.castShadow = true;
                scene.add(mesh);
                entityMeshes.set(`${entity.x},${entity.y}`, mesh);
            }
        });
    }
    
    function createEntityMesh(entity, state) {
        switch(entity.type) {
            case state.ENTITY_TYPES.TREE:
                return createTreeMesh();
            case state.ENTITY_TYPES.NPC:
                return createNPCMesh();
            case state.ENTITY_TYPES.ENEMY:
                return createEnemyMesh();
            default:
                return null;
        }
    }
    
    function createTreeMesh() {
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        const leavesGeometry = new THREE.ConeGeometry(0.8, 2, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ 
            color: COLORS.TREE
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 1.2;
        
        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(leaves);
        tree.userData.trunk = trunk;
        
        return tree;
    }
    
    function createNPCMesh() {
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: COLORS.NPC
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFE4B5
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.85;
        
        const npc = new THREE.Group();
        npc.add(body);
        npc.add(head);
        
        return npc;
    }
    
    function createEnemyMesh() {
        const enemyGeometry = new THREE.SphereGeometry(0.5, 10, 10);
        const enemyMaterial = new THREE.MeshLambertMaterial({ 
            color: COLORS.ENEMY,
            emissive: 0x440000,
            emissiveIntensity: 0.2
        });
        const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
        
        // Добавляем шипы
        const spikeGeometry = new THREE.ConeGeometry(0.1, 0.3, 4);
        const spikeMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFF0000
        });
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            spike.position.set(
                Math.cos(angle) * 0.6,
                0,
                Math.sin(angle) * 0.6
            );
            spike.lookAt(0, 0, 0);
            enemy.add(spike);
        }
        
        return enemy;
    }
    
    return {
        init,
        updateView
    };
})();