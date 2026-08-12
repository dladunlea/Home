// app.js - Main application logic and event handlers

// Get canvas elements
const xyCanvas = document.getElementById('xyCanvas');
const yCanvas = document.getElementById('yCanvas');
const xCanvas = document.getElementById('xCanvas');
const timeCanvas = document.getElementById('timeCanvas');

const xyCtx = xyCanvas.getContext('2d');
const yCtx = yCanvas.getContext('2d');
const xCtx = xCanvas.getContext('2d');
const timeCtx = timeCanvas.getContext('2d');

let animationStarted = false;

// Resize canvases to fit their containers
function resizeCanvases() {
    const canvases = [
        { canvas: xyCanvas, hasButtons: false },
        { canvas: yCanvas, hasButtons: false },
        { canvas: xCanvas, hasButtons: false },
        { canvas: timeCanvas, hasButtons: true }
    ];
    
    canvases.forEach(({ canvas, hasButtons }) => {
        const wrapper = canvas.parentElement;
        const rect = wrapper.getBoundingClientRect();
        
        // Account for buttons and borders
        const buttons = hasButtons ? wrapper.querySelector('.graph-buttons') : null;
        const buttonHeight = buttons ? buttons.offsetHeight : 0;
        const borderWidth = 4; // 2px border on each side
        
        const availableWidth = rect.width - borderWidth;
        const availableHeight = rect.height - buttonHeight - borderWidth;
        
        const size = Math.min(availableWidth, availableHeight);
        
        canvas.width = size;
        canvas.height = size;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
    });
}

// Animation loop
function animate() {
    if (isAnimating) {
        updatePhysics();
    }
    
    drawXYGrid(xyCtx, xyCanvas);
    drawYPosition(yCtx, yCanvas);
    drawXPosition(xCtx, xCanvas);
    drawTimeGraph(timeCtx, timeCanvas, timeGraphMode);
    
    requestAnimationFrame(animate);
}

// Helper function to get mouse position relative to canvas
function getMousePos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// Launch ball with velocity from current position
function launchBall(targetX, targetY) {
    dragStartX = ball.x;
    dragStartY = ball.y;
    
    ball.x = targetX;
    ball.y = targetY;
    
    ball.vx = (ball.x - dragStartX) * 3;
    ball.vy = (ball.y - dragStartY) * 3;
    
    isAnimating = true;
    isDragging = false;
    
    xtTrail = [{ t: 0, x: ball.x }];
    ytTrail = [{ t: 0, y: ball.y }];
    xyTrail = [{ x: ball.x, y: ball.y }];
    time = 0;
}

// Mouse event handlers for XY canvas
xyCanvas.addEventListener('mousedown', (e) => {
    const mousePos = getMousePos(xyCanvas, e);
    const pos = canvasToPhysics(mousePos.x, mousePos.y, xyCanvas.width, xyCanvas.height);
    
    const dx = pos.x - ball.x;
    const dy = pos.y - ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < ball.radius * 2) {
        isDragging = true;
        isAnimating = false;
        dragStartX = ball.x;
        dragStartY = ball.y;
    } else {
        const targetX = Math.max(ball.radius, Math.min(10 - ball.radius, pos.x));
        const targetY = Math.max(ball.radius, Math.min(10 - ball.radius, pos.y));
        launchBall(targetX, targetY);
    }
});

xyCanvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const mousePos = getMousePos(xyCanvas, e);
        const pos = canvasToPhysics(mousePos.x, mousePos.y, xyCanvas.width, xyCanvas.height);
        
        ball.x = Math.max(ball.radius, Math.min(10 - ball.radius, pos.x));
        ball.y = Math.max(ball.radius, Math.min(10 - ball.radius, pos.y));
    }
});

function handleDragEnd() {
    if (isDragging) {
        ball.vx = (ball.x - dragStartX) * 3;
        ball.vy = (ball.y - dragStartY) * 3;
        isDragging = false;
        isAnimating = true;
        
        xtTrail = [{ t: 0, x: ball.x }];
        ytTrail = [{ t: 0, y: ball.y }];
        xyTrail = [{ x: ball.x, y: ball.y }];
        time = 0;
    }
}

xyCanvas.addEventListener('mouseup', handleDragEnd);
xyCanvas.addEventListener('mouseleave', handleDragEnd);

// Touch support
xyCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mousePos = getMousePos(xyCanvas, touch);
    const pos = canvasToPhysics(mousePos.x, mousePos.y, xyCanvas.width, xyCanvas.height);
    
    const dx = pos.x - ball.x;
    const dy = pos.y - ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < ball.radius * 2) {
        isDragging = true;
        isAnimating = false;
        dragStartX = ball.x;
        dragStartY = ball.y;
    } else {
        const targetX = Math.max(ball.radius, Math.min(10 - ball.radius, pos.x));
        const targetY = Math.max(ball.radius, Math.min(10 - ball.radius, pos.y));
        launchBall(targetX, targetY);
    }
});

xyCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isDragging) {
        const touch = e.touches[0];
        const mousePos = getMousePos(xyCanvas, touch);
        const pos = canvasToPhysics(mousePos.x, mousePos.y, xyCanvas.width, xyCanvas.height);
        
        ball.x = Math.max(ball.radius, Math.min(10 - ball.radius, pos.x));
        ball.y = Math.max(ball.radius, Math.min(10 - ball.radius, pos.y));
    }
});

xyCanvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleDragEnd();
});

// Time graph mode buttons
document.getElementById('btnYT').addEventListener('click', () => {
    setTimeGraphMode('yt');
    document.querySelectorAll('.graph-btn').forEach(b => b.classList.remove('active-time'));
    document.getElementById('btnYT').classList.add('active-time');
});

document.getElementById('btnXT').addEventListener('click', () => {
    setTimeGraphMode('xt');
    document.querySelectorAll('.graph-btn').forEach(b => b.classList.remove('active-time'));
    document.getElementById('btnXT').classList.add('active-time');
});

document.getElementById('btnTX').addEventListener('click', () => {
    setTimeGraphMode('tx');
    document.querySelectorAll('.graph-btn').forEach(b => b.classList.remove('active-time'));
    document.getElementById('btnTX').classList.add('active-time');
});

// Initialize function
function initialize() {
    resizeCanvases();
    if (!animationStarted) {
        animationStarted = true;
        animate();
    }
}

// Handle resize with debounce
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvases, 100);
});

// Multiple initialization attempts to ensure proper sizing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

window.addEventListener('load', () => {
    setTimeout(initialize, 100);
});

// Extra initialization after a delay to catch late renders
setTimeout(initialize, 200);
setTimeout(initialize, 500);