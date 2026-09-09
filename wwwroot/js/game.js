const canvas = document.getElementById("raceCanvas");
const ctx = canvas.getContext("2d");

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

const keys = {};

let gameRunning = false;
let animationFrameId;
let lastFrameTime = 0;

let score = 0;
let distance = 0;
let lives = 3;
let elapsedTime = 0;
let roadOffset = 0;
let spawnTimer = 0;
let invulnerableTime = 0;
let enemies = [];

const player = {
    x: 205,
    y: 585,
    width: 70,
    height: 115,
    speed: 370,
    color: "#2af5c8"
};

function resetGame() {
    score = 0;
    distance = 0;
    lives = 3;
    elapsedTime = 0;
    roadOffset = 0;
    spawnTimer = 0;
    invulnerableTime = 0;
    enemies = [];

    player.x = 205;

    updateHud();
}

function startGame() {
    cancelAnimationFrame(animationFrameId);

    resetGame();

    gameRunning = true;
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");

    saveStatus.textContent = "";
    saveButton.disabled = false;

    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {
    if (!gameRunning) {
        return;
    }

    // Convert frame time from milliseconds to seconds.
    const deltaTime = Math.min((currentTime - lastFrameTime) / 1000, 0.05);
    lastFrameTime = currentTime;

    updateGame(deltaTime);
    drawGame();

    animationFrameId = requestAnimationFrame(gameLoop);
}

function updateGame(deltaTime) {
    elapsedTime += deltaTime;

    // Difficulty progression: speed rises while the player survives.
    const roadSpeed = 290 + elapsedTime * 10;

    // Difficulty progression: enemies appear faster over time.
    const spawnInterval = Math.max(0.38, 1.15 - elapsedTime * 0.018);

    roadOffset += roadSpeed * deltaTime;
    distance += Math.floor(roadSpeed * deltaTime * 0.06);
    score += Math.floor(roadSpeed * deltaTime * 0.12);

    movePlayer(deltaTime);

    spawnTimer += deltaTime;

    if (spawnTimer >= spawnInterval) {
        spawnEnemy(roadSpeed);
        spawnTimer = 0;
    }

    enemies.forEach(enemy => {
        enemy.y += enemy.speed * deltaTime;
    });

    // Remove cars that move below the game screen.
    enemies = enemies.filter(enemy => enemy.y < canvas.height + 140);

    if (invulnerableTime > 0) {
        invulnerableTime -= deltaTime;
    } else {
        checkCollisions();
    }

    updateHud();
}

function movePlayer(deltaTime) {
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
        player.x -= player.speed * deltaTime;
    }

    if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
        player.x += player.speed * deltaTime;
    }

    // Keep the player inside the road.
    const leftRoadEdge = 68;
    const rightRoadEdge = canvas.width - player.width - 68;

    player.x = Math.max(leftRoadEdge, Math.min(rightRoadEdge, player.x));
}

function spawnEnemy(roadSpeed) {
    const lanes = [82, 170, 258, 346];
    const colors = ["#ff3e70", "#ffd43b", "#20c7ff", "#a66cff"];

    const laneIndex = Math.floor(Math.random() * lanes.length);
    const colorIndex = Math.floor(Math.random() * colors.length);

    enemies.push({
        x: lanes[laneIndex],
        y: -130,
        width: 64,
        height: 110,
        speed: roadSpeed * (0.75 + Math.random() * 0.4),
        color: colors[colorIndex]
    });
}

function checkCollisions() {
    for (const enemy of enemies) {
        if (isColliding(player, enemy)) {
            handleCrash(enemy);
            break;
        }
    }
}

function isColliding(firstCar, secondCar) {
    const xPadding = 10;
    const yPadding = 12;

    return (
        firstCar.x + xPadding < secondCar.x + secondCar.width - xPadding &&
        firstCar.x + firstCar.width - xPadding > secondCar.x + xPadding &&
        firstCar.y + yPadding < secondCar.y + secondCar.height - yPadding &&
        firstCar.y + firstCar.height - yPadding > secondCar.y + yPadding
    );
}

function handleCrash(hitEnemy) {
    lives--;

    // The player gets a short protection period after a crash.
    invulnerableTime = 1.2;

    enemies = enemies.filter(enemy => enemy !== hitEnemy);

    if (lives <= 0) {
        endGame();
    }
}

function endGame() {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);

    finalStats.textContent =
        `Score: ${score.toLocaleString()} | Distance: ${distance.toLocaleString()} m`;

    gameOverScreen.classList.remove("hidden");
}

function updateHud() {
    scoreElement.textContent = score.toLocaleString();
    distanceElement.textContent = `${distance.toLocaleString()} m`;
    livesElement.textContent = "♥ ".repeat(Math.max(0, lives)).trim();
}

function drawGame() {
    drawRoad();
    enemies.forEach(drawCar);

    // Blink player while protected just after a collision.
    const shouldDrawPlayer =
        invulnerableTime <= 0 || Math.floor(invulnerableTime * 10) % 2 === 0;

    if (shouldDrawPlayer) {
        drawCar(player);
    }
}

function drawRoad() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer background.
    ctx.fillStyle = "#06101b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Main road.
    ctx.fillStyle = "#252c35";
    ctx.fillRect(55, 0, canvas.width - 110, canvas.height);

    // White outer road boundaries.
    ctx.fillStyle = "#f5f8ff";
    ctx.fillRect(55, 0, 7, canvas.height);
    ctx.fillRect(canvas.width - 62, 0, 7, canvas.height);

    // Neon road edge glow.
    ctx.fillStyle = "rgba(42, 245, 200, 0.22)";
    ctx.fillRect(62, 0, 5, canvas.height);
    ctx.fillRect(canvas.width - 67, 0, 5, canvas.height);

    // Animated yellow lane markings.
    ctx.fillStyle = "#f5cb3b";

    const laneLinePositions = [160, 320];

    laneLinePositions.forEach(x => {
        for (let y = -80 + (roadOffset % 80); y < canvas.height; y += 80) {
            ctx.fillRect(x - 4, y, 8, 42);
        }
    });
}

function drawCar(car) {
    ctx.save();

    ctx.translate(
        car.x + car.width / 2,
        car.y + car.height / 2
    );

    // Shadow.
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(
        -car.width / 2 + 6,
        -car.height / 2 + 8,
        car.width,
        car.height
    );

    // Wheels.
    ctx.fillStyle = "#080b0d";

    ctx.fillRect(-car.width / 2 - 5, -car.height / 2 + 18, 11, 25);
    ctx.fillRect(car.width / 2 - 6, -car.height / 2 + 18, 11, 25);
    ctx.fillRect(-car.width / 2 - 5, car.height / 2 - 43, 11, 25);
    ctx.fillRect(car.width / 2 - 6, car.height / 2 - 43, 11, 25);

    // Car body.
    ctx.fillStyle = car.color;
    roundRect(
        -car.width / 2,
        -car.height / 2,
        car.width,
        car.height,
        12
    );

    // Windshield.
    ctx.fillStyle = "#101a27";
    roundRect(
        -car.width / 2 + 11,
        -car.height / 2 + 19,
        car.width - 22,
        38,
        7
    );

    // Racing stripe.
    ctx.fillStyle = "#f5f8ff";
    ctx.fillRect(-4, -car.height / 2 + 5, 8, car.height - 10);

    // Headlights.
    ctx.fillStyle = "#fff5a3";
    ctx.fillRect(-car.width / 2 + 8, -car.height / 2 + 5, 13, 8);
    ctx.fillRect(car.width / 2 - 21, -car.height / 2 + 5, 13, 8);

    ctx.restore();
}

function roundRect(x, y, width, height, radius) {
    ctx.beginPath();

    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);

    ctx.closePath();
    ctx.fill();
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
            throw new Error("Score could not be saved.");
        }

        saveStatus.innerHTML =
            'Score saved! <a href="/leaderboard">View leaderboard</a>';
    } catch (error) {
        saveStatus.textContent =
            "Could not save your score. Please try again.";

        saveButton.disabled = false;
    }
}

document.addEventListener("keydown", event => {
    keys[event.key] = true;

    if (event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.code === "Space") {
        event.preventDefault();
    }

    if (event.code === "Space" && !gameRunning) {
        startGame();
    }
});

document.addEventListener("keyup", event => {
    keys[event.key] = false;
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
saveButton.addEventListener("click", saveScore);

// Draw the road behind the initial start screen.
drawGame();