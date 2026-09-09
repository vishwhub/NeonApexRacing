import * as THREE from "https://esm.sh/three@0.186.0";

import { EffectComposer } from
    "https://esm.sh/three@0.186.0/examples/jsm/postprocessing/EffectComposer.js";

import { RenderPass } from
    "https://esm.sh/three@0.186.0/examples/jsm/postprocessing/RenderPass.js";

import { UnrealBloomPass } from
    "https://esm.sh/three@0.186.0/examples/jsm/postprocessing/UnrealBloomPass.js";

import { RoomEnvironment } from
    "https://esm.sh/three@0.186.0/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from
    "https://esm.sh/three@0.186.0/examples/jsm/loaders/GLTFLoader.js";

const container = document.getElementById("gameContainer");

const scoreElement = document.getElementById("score");
const distanceElement = document.getElementById("distance");
const livesElement = document.getElementById("lives");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const saveButton = document.getElementById("saveButton");

const playerNameInput = document.getElementById("playerName");
const finalStats = document.getElementById("finalStats");
const saveStatus = document.getElementById("saveStatus");
const cameraButtons = document.querySelectorAll(".camera-button");

let activeCamera = "chase";

container.style.height = "720px";

const scene = new THREE.Scene();
scene.background = new THREE.Color("#071321");
scene.fog = new THREE.FogExp2("#071321", 0.012);

const camera = new THREE.PerspectiveCamera(
    58,
    container.clientWidth / container.clientHeight,
    0.1,
    500
);

camera.position.set(0, 4.5, 12);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

container.appendChild(renderer.domElement);

// Post-processing: adds bright headlight/neon bloom.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    0.65,
    0.5,
    0.82
);

composer.addPass(bloomPass);

// Reflection environment for PBR-like car paint.
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(
    new RoomEnvironment(),
    0.04
).texture;

const clock = new THREE.Clock();
const keys = {};

let gameRunning = false;
let score = 0;
let distance = 0;
let lives = 3;
let raceTime = 0;
let spawnTimer = 0;
let invulnerableTime = 0;

const enemies = [];
const roadMarkers = [];

// Dynamic lighting.
const skyLight = new THREE.HemisphereLight("#8bbcff", "#1e160e", 1.7);
scene.add(skyLight);

const sunLight = new THREE.DirectionalLight("#fff2cb", 4.5);
sunLight.position.set(-8, 16, 10);
sunLight.castShadow = true;

sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.left = -25;
sunLight.shadow.camera.right = 25;
sunLight.shadow.camera.top = 25;
sunLight.shadow.camera.bottom = -25;

scene.add(sunLight);
scene.add(sunLight.target);

createRoad();
createEnvironment();

const playerCar = new THREE.Group();

const generatedPlayerCar = createCar("#20e5be");
playerCar.add(generatedPlayerCar);

playerCar.position.set(0, 0, 6);
scene.add(playerCar);

loadPlayerCarModel(generatedPlayerCar);

const rain = createRain(900);
scene.add(rain);

function createRoad() {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(300, 700),
        new THREE.MeshStandardMaterial({
            color: "#3b3024",
            roughness: 1
        })
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -260;
    ground.receiveShadow = true;
    scene.add(ground);

    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(13, 290),
        new THREE.MeshStandardMaterial({
            color: "#161b20",
            roughness: 0.76,
            metalness: 0.08
        })
    );

    road.rotation.x = -Math.PI / 2;
    road.position.z = -125;
    road.receiveShadow = true;
    scene.add(road);

    const edgeMaterial = new THREE.MeshStandardMaterial({
        color: "#d9e4ef",
        emissive: "#183442",
        emissiveIntensity: 0.5,
        roughness: 0.5
    });

    [-6.35, 6.35].forEach(x => {
        const edge = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.08, 290),
            edgeMaterial
        );

        edge.position.set(x, 0.05, -125);
        edge.receiveShadow = true;
        scene.add(edge);
    });

    const markerMaterial = new THREE.MeshStandardMaterial({
        color: "#ffbf2e",
        emissive: "#5a2c00",
        emissiveIntensity: 0.8,
        roughness: 0.35
    });

    [-2.15, 2.15].forEach(x => {
        for (let z = -230; z <= 25; z += 12) {
            const marker = new THREE.Mesh(
                new THREE.BoxGeometry(0.16, 0.04, 5),
                markerMaterial
            );

            marker.position.set(x, 0.04, z);
            marker.receiveShadow = true;

            roadMarkers.push(marker);
            scene.add(marker);
        }
    });
}

function createEnvironment() {
    const buildingMaterial = new THREE.MeshStandardMaterial({
        color: "#182636",
        roughness: 0.84,
        metalness: 0.25
    });

    const windowMaterial = new THREE.MeshStandardMaterial({
        color: "#8ac8ff",
        emissive: "#3388d0",
        emissiveIntensity: 1.7,
        roughness: 0.35
    });

    for (let i = 0; i < 42; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const height = 5 + Math.random() * 18;
        const width = 4 + Math.random() * 6;
        const depth = 5 + Math.random() * 8;

        const building = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            buildingMaterial
        );

        building.position.set(
            side * (12 + Math.random() * 18),
            height / 2,
            -20 - i * 7
        );

        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);

        const windows = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.82, height * 0.56, 0.08),
            windowMaterial
        );

        windows.position.set(
            building.position.x,
            building.position.y + 0.4,
            building.position.z + depth / 2 + 0.06
        );

        scene.add(windows);
    }

    const poleMaterial = new THREE.MeshStandardMaterial({
        color: "#2f3944",
        metalness: 0.8,
        roughness: 0.35
    });

    const lampMaterial = new THREE.MeshStandardMaterial({
        color: "#e9fdff",
        emissive: "#73e9ff",
        emissiveIntensity: 5
    });

    for (let z = 10; z > -230; z -= 18) {
        [-9, 9].forEach(x => {
            const pole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.12, 7),
                poleMaterial
            );

            pole.position.set(x, 3.5, z);
            pole.castShadow = true;
            scene.add(pole);

            const lamp = new THREE.Mesh(
                new THREE.SphereGeometry(0.28, 12, 12),
                lampMaterial
            );

            lamp.position.set(x, 7, z);
            scene.add(lamp);
        });
    }
}

function createCar(color) {
    const car = new THREE.Group();

    const paintMaterial = new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.8,
        roughness: 0.19,
        clearcoat: 1,
        clearcoatRoughness: 0.08
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
        color: "#081018",
        metalness: 0.6,
        roughness: 0.22
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: "#1c4158",
        metalness: 0.25,
        roughness: 0.08,
        transparent: true,
        opacity: 0.78
    });

    const tireMaterial = new THREE.MeshStandardMaterial({
        color: "#050607",
        roughness: 0.92
    });

    const lightMaterial = new THREE.MeshStandardMaterial({
        color: "#f5fbff",
        emissive: "#bfeeff",
        emissiveIntensity: 5
    });

    // Main vehicle body.
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.45, 3.5),
        paintMaterial
    );

    body.position.y = 0.52;
    car.add(body);

    const hood = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.25, 1.3),
        paintMaterial
    );

    hood.position.set(0, 0.8, -0.85);
    car.add(hood);

    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.32, 0.58, 1.48),
        glassMaterial
    );

    cabin.position.set(0, 1.02, 0.35);
    car.add(cabin);

    const bumper = new THREE.Mesh(
        new THREE.BoxGeometry(1.76, 0.2, 0.3),
        darkMaterial
    );

    bumper.position.set(0, 0.38, -1.72);
    car.add(bumper);

    const spoiler = new THREE.Mesh(
        new THREE.BoxGeometry(1.32, 0.09, 0.32),
        darkMaterial
    );

    spoiler.position.set(0, 1.05, 1.55);
    car.add(spoiler);

    // Wheels.
    const wheelPositions = [
        [-0.93, 0.34, -1.12],
        [0.93, 0.34, -1.12],
        [-0.93, 0.34, 1.12],
        [0.93, 0.34, 1.12]
    ];

    wheelPositions.forEach(position => {
        const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.37, 0.37, 0.28, 20),
            tireMaterial
        );

        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(position[0], position[1], position[2]);
        wheel.castShadow = true;
        car.add(wheel);
    });

    // Headlights.
    [-0.52, 0.52].forEach(x => {
        const headlight = new THREE.Mesh(
            new THREE.BoxGeometry(0.34, 0.13, 0.08),
            lightMaterial
        );

        headlight.position.set(x, 0.68, -1.76);
        car.add(headlight);
    });

    car.traverse(item => {
        if (item.isMesh) {
            item.castShadow = true;
            item.receiveShadow = true;
        }
    });

    return car;
}

function loadPlayerCarModel(placeholderCar) {
    const loader = new GLTFLoader();

    loader.load(
        "/models/player-car.glb",

        function (gltf) {
            const model = gltf.scene;

            // Enable shadows and improve PBR material reflections.
            model.traverse(item => {
                if (item.isMesh) {
                    item.castShadow = true;
                    item.receiveShadow = true;

                    if (item.material) {
                        item.material.envMapIntensity = 1.7;
                        item.material.needsUpdate = true;
                    }
                }
            });

            // Resize the model to match the current game car size.
            const initialBox = new THREE.Box3().setFromObject(model);
            const initialSize = initialBox.getSize(new THREE.Vector3());

            const largestSide = Math.max(
                initialSize.x,
                initialSize.y,
                initialSize.z
            );

            const scale = 3.5 / largestSide;
            model.scale.setScalar(scale);

            // Center the 3D model on the game car position.
            const finalBox = new THREE.Box3().setFromObject(model);
            const finalCenter = finalBox.getCenter(new THREE.Vector3());

            model.position.x = -finalCenter.x;
            model.position.z = -finalCenter.z;
            model.position.y = -finalBox.min.y;

            // Hide the generated placeholder car.
            placeholderCar.visible = false;

            playerCar.add(model);

            console.log("High-detail player car model loaded.");
        },

        undefined,

        function (error) {
            console.warn(
                "Could not load player-car.glb. Using generated fallback car.",
                error
            );
        }
    );
}

function createRain(count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 25;
        positions[i * 3 + 1] = Math.random() * 15;
        positions[i * 3 + 2] = 20 - Math.random() * 180;
    }

    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
        color: "#c9efff",
        size: 0.055,
        transparent: true,
        opacity: 0.62
    });

    return new THREE.Points(geometry, material);
}

function startGame() {
    removeAllEnemies();

    score = 0;
    distance = 0;
    lives = 3;
    raceTime = 0;
    spawnTimer = 0;
    invulnerableTime = 0;

    gameRunning = true;

    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");

    saveStatus.textContent = "";
    saveButton.disabled = false;

    updateHud();
}

function updateGame(deltaTime) {
    raceTime += deltaTime;

    const roadSpeed = 28 + raceTime * 0.5;
    const spawnInterval = Math.max(0.58, 1.5 - raceTime * 0.018);

    score += Math.floor(roadSpeed * deltaTime * 2.5);
    distance += Math.floor(roadSpeed * deltaTime * 0.22);

    movePlayer(deltaTime);
    moveRoad(roadSpeed, deltaTime);

    spawnTimer += deltaTime;

    if (spawnTimer >= spawnInterval) {
        spawnEnemy(roadSpeed);
        spawnTimer = 0;
    }

    enemies.forEach(enemy => {
        enemy.group.position.z += enemy.speed * deltaTime;
        enemy.group.rotation.z = Math.sin(raceTime * 4 + enemy.offset) * 0.015;
    });

    for (let index = enemies.length - 1; index >= 0; index--) {
        const enemy = enemies[index];

        if (enemy.group.position.z > 18) {
            scene.remove(enemy.group);
            enemies.splice(index, 1);
        }
    }

    if (invulnerableTime > 0) {
        invulnerableTime -= deltaTime;
    } else {
        checkCollisions();
    }

    updateCamera();
    updateHud();
}

function movePlayer(deltaTime) {
    const steerSpeed = 7.5;

    if (keys.ArrowLeft || keys.a || keys.A) {
        playerCar.position.x -= steerSpeed * deltaTime;
    }

    if (keys.ArrowRight || keys.d || keys.D) {
        playerCar.position.x += steerSpeed * deltaTime;
    }

    playerCar.position.x = THREE.MathUtils.clamp(
        playerCar.position.x,
        -4.9,
        4.9
    );

    playerCar.rotation.z = THREE.MathUtils.lerp(
        playerCar.rotation.z,
        -playerCar.position.x * 0.05,
        0.08
    );
}

function moveRoad(speed, deltaTime) {
    roadMarkers.forEach(marker => {
        marker.position.z += speed * deltaTime;

        if (marker.position.z > 26) {
            marker.position.z -= 264;
        }
    });
}

function spawnEnemy(roadSpeed) {
    const lanePositions = [-3.8, 0, 3.8];
    const colors = ["#ec365b", "#ffb820", "#438dff", "#a54dff"];

    const car = createCar(
        colors[Math.floor(Math.random() * colors.length)]
    );

    car.position.set(
        lanePositions[Math.floor(Math.random() * lanePositions.length)],
        0,
        -125 - Math.random() * 30
    );

    car.rotation.y = Math.PI;
    scene.add(car);

    enemies.push({
        group: car,
        speed: roadSpeed * (0.88 + Math.random() * 0.32),
        offset: Math.random() * 10
    });
}

function checkCollisions() {
    for (const enemy of enemies) {
        const horizontalDistance = Math.abs(
            playerCar.position.x - enemy.group.position.x
        );

        const verticalDistance = Math.abs(
            playerCar.position.z - enemy.group.position.z
        );

        if (horizontalDistance < 1.45 && verticalDistance < 2.5) {
            crash(enemy);
            break;
        }
    }
}

function crash(enemy) {
    scene.remove(enemy.group);
    enemies.splice(enemies.indexOf(enemy), 1);

    lives--;
    invulnerableTime = 1.2;

    if (lives <= 0) {
        endGame();
    }
}

function endGame() {
    gameRunning = false;

    finalStats.textContent =
        `Score: ${score.toLocaleString()} | Distance: ${distance.toLocaleString()} m`;

    gameOverScreen.classList.remove("hidden");
}

function updateCamera() {
    let targetPosition;
    let lookAtPosition;

    if (activeCamera === "hood") {
        targetPosition = new THREE.Vector3(
            playerCar.position.x,
            1.35,
            playerCar.position.z - 1.15
        );

        lookAtPosition = new THREE.Vector3(
            playerCar.position.x,
            0.9,
            -22
        );
    }
    else if (activeCamera === "cockpit") {
        targetPosition = new THREE.Vector3(
            playerCar.position.x,
            1.25,
            playerCar.position.z + 0.25
        );

        lookAtPosition = new THREE.Vector3(
            playerCar.position.x,
            1.15,
            -22
        );
    }
    else if (activeCamera === "cinematic") {
        const orbitAngle = clock.elapsedTime * 0.28;

        targetPosition = new THREE.Vector3(
            playerCar.position.x + Math.sin(orbitAngle) * 11,
            5.8,
            playerCar.position.z + Math.cos(orbitAngle) * 11
        );

        lookAtPosition = new THREE.Vector3(
            playerCar.position.x,
            0.8,
            playerCar.position.z - 10
        );
    }
    else {
        // Default chase camera.
        targetPosition = new THREE.Vector3(
            playerCar.position.x * 0.38,
            4.4,
            12
        );

        lookAtPosition = new THREE.Vector3(
            playerCar.position.x * 0.15,
            0.7,
            -10
        );
    }

    camera.position.lerp(targetPosition, 0.09);
    camera.lookAt(lookAtPosition);

    sunLight.position.x = playerCar.position.x - 8;
    sunLight.target.position.set(playerCar.position.x, 0, -30);
}

function updateWeather(deltaTime) {
    const positions = rain.geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 17 * deltaTime;
        positions[i + 2] += 7 * deltaTime;

        if (positions[i + 1] < 0) {
            positions[i + 1] = 14;
            positions[i] = (Math.random() - 0.5) * 25;
            positions[i + 2] = -100 + Math.random() * 120;
        }
    }

    rain.geometry.attributes.position.needsUpdate = true;

    const cycle = (Math.sin(clock.elapsedTime * 0.035) + 1) / 2;

    skyLight.intensity = 0.55 + cycle * 1.3;
    sunLight.intensity = 1.4 + cycle * 3.2;

    scene.background.setHSL(0.6, 0.42, 0.05 + cycle * 0.12);
}

function updateHud() {
    scoreElement.textContent = score.toLocaleString();
    distanceElement.textContent = `${distance.toLocaleString()} m`;
    livesElement.textContent = "♥ ".repeat(Math.max(lives, 0)).trim();
}

function removeAllEnemies() {
    enemies.forEach(enemy => scene.remove(enemy.group));
    enemies.length = 0;
}

async function saveScore() {
    saveButton.disabled = true;
    saveStatus.textContent = "Saving score...";

    try {
        const response = await fetch("/api/leaderboard", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                playerName: playerNameInput.value,
                points: score,
                distance: distance
            })
        });

        if (!response.ok) {
            throw new Error("Unable to save score.");
        }

        saveStatus.innerHTML =
            'Score saved! <a href="/leaderboard">View leaderboard</a>';
    } catch {
        saveStatus.textContent =
            "Could not save the score. Please try again.";

        saveButton.disabled = false;
    }
}

function onResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
}

document.addEventListener("keydown", event => {
    keys[event.key] = true;

    if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.code === "Space"
    ) {
        event.preventDefault();
    }

    const typingInInput = document.activeElement === playerNameInput;

    if (event.code === "Space" && !gameRunning && !typingInInput) {
        startGame();
    }
});

document.addEventListener("keyup", event => {
    keys[event.key] = false;
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
saveButton.addEventListener("click", saveScore);

cameraButtons.forEach(button => {
    button.addEventListener("click", () => {
        activeCamera = button.dataset.camera;

        cameraButtons.forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        updateCamera();
    });
});

window.addEventListener("resize", onResize);

function animate() {
    const deltaTime = Math.min(clock.getDelta(), 0.05);

    updateWeather(deltaTime);

    if (gameRunning) {
        updateGame(deltaTime);

        // Player blinks briefly after a collision.
        playerCar.visible =
            invulnerableTime <= 0 ||
            Math.floor(invulnerableTime * 10) % 2 === 0;
    } else {
        playerCar.visible = true;
    }

    composer.render();
}

renderer.setAnimationLoop(animate);