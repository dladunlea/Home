// physics.js - Physics calculations and ball state

// Physics constants
const GRAVITY = 9.8; // m/s²
const DT = 0.016; // time step (60 FPS)
const MAX_TIME = 10; // Maximum time before reset (10 seconds)

// Ball state
const ball = {
    x: 5,  // meters
    y: 5,  // meters
    vx: 0, // m/s
    vy: 0, // m/s
    radius: 0.3, // meters
    color: '#ff6b6b'
};

// Simulation state
let time = 0;
let isAnimating = false;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let timeGraphMode = 'yt'; // 'yt' (y vs time), 'xt' (x vs time), 'tx' (time vs x)

// Trail data
let xtTrail = [];
let ytTrail = [];
let xyTrail = [];

// Convert canvas coordinates to physics coordinates
function canvasToPhysics(canvasX, canvasY, canvasWidth, canvasHeight) {
    const SCALE = canvasWidth / 10;
    return {
        x: canvasX / SCALE,
        y: (canvasHeight - canvasY) / SCALE
    };
}

// Convert physics coordinates to canvas coordinates
function physicsToCanvas(x, y, canvasHeight) {
    const SCALE = canvasHeight / 10;
    return {
        x: x * SCALE,
        y: canvasHeight - y * SCALE
    };
}

// Update physics simulation
function updatePhysics() {
    // Update velocity (gravity only affects y)
    ball.vy -= GRAVITY * DT;
    
    // Update position
    ball.x += ball.vx * DT;
    ball.y += ball.vy * DT;
    
    // Boundary collision
    if (ball.x < ball.radius) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx) * 0.8;
    }
    if (ball.x > 10 - ball.radius) {
        ball.x = 10 - ball.radius;
        ball.vx = -Math.abs(ball.vx) * 0.8;
    }
    if (ball.y < ball.radius) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy) * 0.8;
    }
    if (ball.y > 10 - ball.radius) {
        ball.y = 10 - ball.radius;
        ball.vy = -Math.abs(ball.vy) * 0.8;
    }
    
    // Update time
    time += DT;
    
    // Check if time exceeds grid bounds - if so, reset time and clear trails
    if (time > MAX_TIME) {
        time = 0;
        xtTrail = [{ t: 0, x: ball.x }];
        ytTrail = [{ t: 0, y: ball.y }];
        // Keep xy trail since it doesn't depend on time
    } else {
        // Record trail normally
        xtTrail.push({ t: time, x: ball.x });
        ytTrail.push({ t: time, y: ball.y });
    }
    
    xyTrail.push({ x: ball.x, y: ball.y });
    
    // Limit trail length
    if (xtTrail.length > 500) xtTrail.shift();
    if (ytTrail.length > 500) ytTrail.shift();
    if (xyTrail.length > 500) xyTrail.shift();
    
    // Stop if ball is at rest
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed < 0.1 && ball.y < ball.radius + 0.1) {
        isAnimating = false;
        ball.vx = 0;
        ball.vy = 0;
    }
}

// Reset simulation
function resetSimulation() {
    ball.x = 5;
    ball.y = 5;
    ball.vx = 0;
    ball.vy = 0;
    time = 0;
    isAnimating = false;
    xtTrail = [];
    ytTrail = [];
    xyTrail = [];
}

// Clear trails
function clearTrails() {
    xtTrail = (ball.vx !== 0 || ball.vy !== 0) ? [{ t: time, x: ball.x }] : [];
    ytTrail = (ball.vx !== 0 || ball.vy !== 0) ? [{ t: time, y: ball.y }] : [];
    xyTrail = (ball.vx !== 0 || ball.vy !== 0) ? [{ x: ball.x, y: ball.y }] : [];
}

// Set time graph mode
function setTimeGraphMode(mode) {
    timeGraphMode = mode;
}