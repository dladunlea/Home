export class Renderer {
    constructor(canvas, coordinateSystem, config) {
        this.ctx = canvas.getContext('2d');
        this.canvas = canvas;
        this.coordSystem = coordinateSystem;
        this.config = config;
    }

    draw(state, evaluator) {
        this.clear();
        this.drawGrid(state);
        this.drawAxes(state);
        this.drawAsymptotes(state);
        this.drawFunction(state, evaluator);
        this.drawXIntercepts(state);
        this.drawHoles(state, evaluator);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid(state) {
        this.ctx.strokeStyle = this.config.colors.grid;
        this.ctx.lineWidth = 1;
        
        const { xMin, xMax, yMin, yMax } = state;
        
        let xSpacing = this.calculateGridSpacing(xMax - xMin);
        let ySpacing = this.calculateGridSpacing(yMax - yMin);
        
        // Vertical grid lines with labels
        const xStart = Math.ceil(xMin / xSpacing) * xSpacing;
        for (let x = xStart; x <= xMax; x += xSpacing) {
            const pos = this.coordSystem.graphToCanvas(x, 0);
            
            // Draw grid line
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, this.coordSystem.padding);
            this.ctx.lineTo(pos.x, this.config.canvas.height - this.coordSystem.padding);
            this.ctx.stroke();
            
            // Draw label (skip zero, it's handled by axes)
            if (Math.abs(x) > 0.001) {
                this.ctx.fillStyle = '#666';
                this.ctx.font = '11px Arial';
                this.ctx.textAlign = 'center';
                
                // Position label below x-axis if visible, otherwise at bottom
                const labelY = (state.yMin <= 0 && state.yMax >= 0) 
                    ? this.coordSystem.graphToCanvas(0, 0).y + 15 
                    : this.config.canvas.height - this.coordSystem.padding + 15;
                
                this.ctx.fillText(this.formatNumber(x), pos.x, labelY);
            }
        }
        
        // Horizontal grid lines with labels
        const yStart = Math.ceil(yMin / ySpacing) * ySpacing;
        for (let y = yStart; y <= yMax; y += ySpacing) {
            const pos = this.coordSystem.graphToCanvas(0, y);
            
            // Draw grid line
            this.ctx.beginPath();
            this.ctx.moveTo(this.coordSystem.padding, pos.y);
            this.ctx.lineTo(this.config.canvas.width - this.coordSystem.padding, pos.y);
            this.ctx.stroke();
            
            // Draw label (skip zero, it's handled by axes)
            if (Math.abs(y) > 0.001) {
                this.ctx.fillStyle = '#666';
                this.ctx.font = '11px Arial';
                this.ctx.textAlign = 'right';
                
                // Position label left of y-axis if visible, otherwise at left edge
                const labelX = (state.xMin <= 0 && state.xMax >= 0) 
                    ? this.coordSystem.graphToCanvas(0, 0).x - 8 
                    : this.coordSystem.padding - 8;
                
                this.ctx.fillText(this.formatNumber(y), labelX, pos.y + 4);
            }
        }
    }

    calculateGridSpacing(range) {
        // Calculate appropriate grid spacing based on range
        const targetLines = 10;
        const rawSpacing = range / targetLines;
        
        // Round to nice numbers (1, 2, 5, 10, 20, 50, etc.)
        const magnitude = Math.pow(10, Math.floor(Math.log10(rawSpacing)));
        const normalized = rawSpacing / magnitude;
        
        let niceSpacing;
        if (normalized < 1.5) niceSpacing = 1;
        else if (normalized < 3) niceSpacing = 2;
        else if (normalized < 7) niceSpacing = 5;
        else niceSpacing = 10;
        
        return niceSpacing * magnitude;
    }

    formatNumber(num) {
        // Format numbers nicely for labels
        if (Math.abs(num) < 0.001) return '0';
        
        // For very small or very large numbers, use exponential notation
        if (Math.abs(num) < 0.01 || Math.abs(num) > 10000) {
            return num.toExponential(1);
        }
        
        // For decimals, limit to 2 decimal places
        if (num % 1 !== 0) {
            return num.toFixed(2).replace(/\.?0+$/, '');
        }
        
        // For integers, just return as-is
        return num.toString();
    }

    drawAxes(state) {
        this.ctx.strokeStyle = this.config.colors.axes;
        this.ctx.lineWidth = 2;
        
        const origin = this.coordSystem.graphToCanvas(0, 0);
        
        if (state.xMin <= 0 && state.xMax >= 0) {
            // Y-axis
            this.ctx.beginPath();
            this.ctx.moveTo(origin.x, this.coordSystem.padding);
            this.ctx.lineTo(origin.x, this.config.canvas.height - this.coordSystem.padding);
            this.ctx.stroke();
            
            // Y-axis label
            this.ctx.fillStyle = this.config.colors.axes;
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('y', origin.x, this.coordSystem.padding - 20);
        }
        
        if (state.yMin <= 0 && state.yMax >= 0) {
            // X-axis
            this.ctx.beginPath();
            this.ctx.moveTo(this.coordSystem.padding, origin.y);
            this.ctx.lineTo(this.config.canvas.width - this.coordSystem.padding, origin.y);
            this.ctx.stroke();
            
            // X-axis label
            this.ctx.fillStyle = this.config.colors.axes;
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('x', this.config.canvas.width - this.coordSystem.padding + 20, origin.y);
        }
        
        // Draw "0" at origin if both axes are visible
        if (state.xMin <= 0 && state.xMax >= 0 && state.yMin <= 0 && state.yMax >= 0) {
            this.ctx.fillStyle = '#666';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText('0', origin.x - 8, origin.y + 15);
        }
    }

    drawAsymptotes(state) {
        this.ctx.strokeStyle = this.config.colors.asymptote;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        for (let asym of state.asymptotes) {
            // Only draw if visible
            if (asym < state.xMin || asym > state.xMax) continue;
            
            const pos = this.coordSystem.graphToCanvas(asym, 0);
            
            // Draw asymptote line
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, this.coordSystem.padding);
            this.ctx.lineTo(pos.x, this.config.canvas.height - this.coordSystem.padding);
            this.ctx.stroke();
            
            // Draw draggable handle
            this.ctx.fillStyle = this.config.colors.asymptote;
            this.ctx.fillRect(pos.x - 10, this.coordSystem.padding - 16, 20, 14);
            
            // Label
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('VA', pos.x, this.coordSystem.padding - 5);
        }
        
        this.ctx.setLineDash([]);
    }

    drawFunction(state, evaluator) {
        this.ctx.strokeStyle = this.config.colors.function;
        this.ctx.lineWidth = 3;
        
        const { xMin, xMax, yMin, yMax } = state;
        const step = (xMax - xMin) / 2000;
        const yRange = yMax - yMin;
        
        // Skip drawing if completely outside absolute bounds
        if (xMax < this.config.graph.absoluteXMin || 
            xMin > this.config.graph.absoluteXMax) {
            return;
        }
        
        // Clip drawing to visible canvas area (use config dimensions)
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(
            this.coordSystem.padding,
            this.coordSystem.padding,
            this.config.canvas.width - 2 * this.coordSystem.padding,
            this.config.canvas.height - 2 * this.coordSystem.padding
        );
        this.ctx.clip();
        
        this.ctx.beginPath();
        let isDrawing = false;
        let prevY = null;
        
        // Only calculate within visible x range
        const calcXMin = Math.max(xMin, this.config.graph.absoluteXMin);
        const calcXMax = Math.min(xMax, this.config.graph.absoluteXMax);
        
        for (let x = calcXMin; x <= calcXMax; x += step) {
            const y = evaluator.evaluate(x);
            
            // Skip extreme values
            if (y !== null && !isNaN(y) && isFinite(y) && 
                y >= this.config.graph.absoluteYMin && 
                y <= this.config.graph.absoluteYMax) {
                
                const pos = this.coordSystem.graphToCanvas(x, y);
                
                // Check for discontinuity
                if (prevY !== null && Math.abs(y - prevY) > yRange * 2) {
                    // Large jump - likely asymptote
                    if (isDrawing) {
                        this.ctx.stroke();
                        this.ctx.beginPath();
                        isDrawing = false;
                    }
                } else {
                    if (!isDrawing) {
                        this.ctx.moveTo(pos.x, pos.y);
                        isDrawing = true;
                    } else {
                        this.ctx.lineTo(pos.x, pos.y);
                    }
                }
                
                prevY = y;
            } else {
                if (isDrawing) {
                    this.ctx.stroke();
                    this.ctx.beginPath();
                    isDrawing = false;
                }
                prevY = null;
            }
        }
        
        if (isDrawing) {
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawXIntercepts(state) {
        for (let root of state.xIntercepts) {
            // Only draw if visible
            if (root < state.xMin || root > state.xMax) continue;
            
            const pos = this.coordSystem.graphToCanvas(root, 0);
            
            this.ctx.fillStyle = this.config.colors.xIntercept;
            
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    drawHoles(state, evaluator) {
        const { xMin, xMax, yMin, yMax } = state;
        
        for (let hole of state.holes) {
            // Only draw if visible
            if (hole < xMin || hole > xMax) continue;
            
            const y = evaluator.calculateHoleY(hole);
            
            if (y !== null && y >= yMin && y <= yMax) {
                const pos = this.coordSystem.graphToCanvas(hole, y);
                
                this.ctx.strokeStyle = this.config.colors.hole;
                this.ctx.fillStyle = 'white';
                this.ctx.lineWidth = 3;
                
                this.ctx.beginPath();
                this.ctx.arc(pos.x, pos.y, 7, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
            }
        }
    }
}