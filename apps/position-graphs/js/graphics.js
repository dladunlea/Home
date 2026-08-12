// graphics.js - Drawing functions for all canvases

// Calculate scale based on canvas size
function getScale(canvas) {
    return canvas.width / 10; // 10 meters across the canvas
}

// Draw XY position grid (TOP RIGHT) - NO AXES
function drawXYGrid(ctx, canvas) {
    const SCALE = getScale(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid lines
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i * SCALE, 0);
        ctx.lineTo(i * SCALE, canvas.height);
        ctx.stroke();
        
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, i * SCALE);
        ctx.lineTo(canvas.width, i * SCALE);
        ctx.stroke();
    }
    
    // Labels only (no axes)
    ctx.fillStyle = '#666';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('x', canvas.width - 20, canvas.height - 10);
    ctx.fillText('y', 10, 20);
    
    // Draw trail
    if (xyTrail.length > 1) {
        ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < xyTrail.length; i++) {
            const x = xyTrail[i].x * SCALE;
            const y = canvas.height - xyTrail[i].y * SCALE;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    // Draw ball
    const ballX = ball.x * SCALE;
    const ballY = canvas.height - ball.y * SCALE;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ballX, ballY, ball.radius * SCALE, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw velocity vector
    if (isAnimating || isDragging) {
        const vx = isDragging ? (ball.x - dragStartX) * 3 : ball.vx;
        const vy = isDragging ? (ball.y - dragStartY) * 3 : ball.vy;
        
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > 0.1) {
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(ballX, ballY);
            const endX = (ball.x + vx * 0.5) * SCALE;
            const endY = canvas.height - (ball.y + vy * 0.5) * SCALE;
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Arrow head
            const angle = Math.atan2(endY - ballY, endX - ballX);
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - 10 * Math.cos(angle - Math.PI / 6), endY - 10 * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - 10 * Math.cos(angle + Math.PI / 6), endY - 10 * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        }
    }
}

// Draw Y Position (TOP LEFT - horizontal bar) - NO AXES
function drawYPosition(ctx, canvas) {
    const SCALE = getScale(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * SCALE);
        ctx.lineTo(canvas.width, i * SCALE);
        ctx.stroke();
    }
    
    // Current Y position as horizontal bar
    const yPos = canvas.height - ball.y * SCALE;
    ctx.strokeStyle = '#FF5722';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, yPos);
    ctx.lineTo(canvas.width, yPos);
    ctx.stroke();
    
    // Label only (no axis)
    ctx.fillStyle = '#666';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('y', 10, 20);
    
    // Ball indicator - smaller size
    ctx.fillStyle = '#FF5722';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, yPos, ball.radius * SCALE, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Trail dots
    if (ytTrail.length > 1) {
        ctx.fillStyle = 'rgba(255, 87, 34, 0.3)';
        for (let i = 0; i < ytTrail.length; i++) {
            const y = canvas.height - ytTrail[i].y * SCALE;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Draw X Position (BOTTOM RIGHT - vertical bar) - NO AXES
function drawXPosition(ctx, canvas) {
    const SCALE = getScale(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * SCALE, 0);
        ctx.lineTo(i * SCALE, canvas.height);
        ctx.stroke();
    }
    
    // Current X position as vertical bar
    const xPos = ball.x * SCALE;
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(xPos, 0);
    ctx.lineTo(xPos, canvas.height);
    ctx.stroke();
    
    // Label only (no axis)
    ctx.fillStyle = '#666';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('x', canvas.width - 20, canvas.height - 10);
    
    // Ball indicator - smaller size
    ctx.fillStyle = '#2196F3';
    ctx.beginPath();
    ctx.arc(xPos, canvas.height / 2, ball.radius * SCALE, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Trail dots
    if (xtTrail.length > 1) {
        ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
        for (let i = 0; i < xtTrail.length; i++) {
            const x = xtTrail[i].x * SCALE;
            ctx.beginPath();
            ctx.arc(x, canvas.height / 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Draw Time Graph (BOTTOM LEFT - toggleable) - NO AXES
function drawTimeGraph(ctx, canvas, mode) {
    const SCALE = getScale(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * SCALE);
        ctx.lineTo(canvas.width, i * SCALE);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(i * SCALE, 0);
        ctx.lineTo(i * SCALE, canvas.height);
        ctx.stroke();
    }
    
    if (mode === 'yt') {
        // Y vs Time
        // Labels only (no axes)
        ctx.fillStyle = '#666';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('t', canvas.width - 20, canvas.height - 10);
        ctx.fillText('y', 10, 20);
        
        if (ytTrail.length > 1) {
            ctx.strokeStyle = '#9C27B0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < ytTrail.length; i++) {
                const x = ytTrail[i].t * SCALE;
                const y = canvas.height - ytTrail[i].y * SCALE;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            
            const lastPoint = ytTrail[ytTrail.length - 1];
            ctx.fillStyle = '#9C27B0';
            ctx.beginPath();
            ctx.arc(lastPoint.t * SCALE, canvas.height - lastPoint.y * SCALE, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (mode === 'xt') {
        // X vs Time
        // Labels only (no axes)
        ctx.fillStyle = '#666';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('t', canvas.width - 20, canvas.height - 10);
        ctx.fillText('x', 10, 20);
        
        if (xtTrail.length > 1) {
            ctx.strokeStyle = '#9C27B0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < xtTrail.length; i++) {
                const x = xtTrail[i].t * SCALE;
                const y = canvas.height - xtTrail[i].x * SCALE;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            
            const lastPoint = xtTrail[xtTrail.length - 1];
            ctx.fillStyle = '#9C27B0';
            ctx.beginPath();
            ctx.arc(lastPoint.t * SCALE, canvas.height - lastPoint.x * SCALE, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (mode === 'tx') {
        // Time vs X
        // Labels only (no axes)
        ctx.fillStyle = '#666';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('x', canvas.width - 20, canvas.height - 10);
        ctx.fillText('t', 10, 20);
        
        if (xtTrail.length > 1) {
            ctx.strokeStyle = '#9C27B0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < xtTrail.length; i++) {
                const x = xtTrail[i].x * SCALE;
                const y = canvas.height - xtTrail[i].t * SCALE;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            
            const lastPoint = xtTrail[xtTrail.length - 1];
            ctx.fillStyle = '#9C27B0';
            ctx.beginPath();
            ctx.arc(lastPoint.x * SCALE, canvas.height - lastPoint.t * SCALE, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}