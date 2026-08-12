export class EventHandlers {
    constructor(canvas, state, coordinateSystem, config, onUpdate) {
        this.canvas = canvas;
        this.state = state;
        this.coordSystem = coordinateSystem;
        this.config = config;
        this.onUpdate = onUpdate;
        this.lastTap = 0;
        
        // Panning state
        this.isPanning = false;
        this.panStart = null;
        this.panStartBounds = null;
    }

    init() {
        // Mouse events (for desktop)
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        
        // Touch events (for iPad)
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    }

    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    handleMouseDown(e) {
        const pos = this.getCanvasCoordinates(e.clientX, e.clientY);
        
        // Check if Shift key is pressed for zoom drag
        if (e.shiftKey) {
            this.state.startShiftDrag(pos.x, pos.y);
            return;
        }
        
        // Try to grab a feature first
        const featureGrabbed = this.checkFeatureDrag(pos.x, pos.y);
        
        // If no feature grabbed, start panning
        if (!featureGrabbed) {
            this.startPanning(pos.x, pos.y);
        }
    }

    handleMouseMove(e) {
        const pos = this.getCanvasCoordinates(e.clientX, e.clientY);
        
        // Handle Shift+drag zoom
        if (this.state.shiftDragging) {
            const deltaY = this.state.shiftDragStart.y - pos.y;
            this.state.updateShiftDrag(deltaY, this.config);
            this.onUpdate();
            return;
        }
        
        // Handle panning
        if (this.isPanning) {
            this.updatePanning(pos.x, pos.y);
            return;
        }
        
        // Handle feature dragging
        if (!this.state.dragging) return;
        
        const graphPos = this.coordSystem.canvasToGraph(pos.x - this.state.dragOffset, 0);
        
        let newValue = Math.round(graphPos.x / this.config.interaction.snapIncrement) * 
                      this.config.interaction.snapIncrement;
        newValue = Math.max(this.state.xMin, Math.min(this.state.xMax, newValue));
        
        this.state.updateDraggingValue(newValue);
        this.onUpdate();
    }

    handleMouseUp(e) {
        if (this.state.shiftDragging) {
            this.state.stopShiftDrag();
        }
        if (this.isPanning) {
            this.stopPanning();
        }
        this.state.stopDragging();
    }

    handleWheel(e) {
        e.preventDefault();
        
        const pos = this.getCanvasCoordinates(e.clientX, e.clientY);
        const graphPos = this.coordSystem.canvasToGraph(pos.x, pos.y);
        
        const zoomFactor = e.deltaY < 0 ? (1 - this.config.interaction.zoomSensitivity) : (1 + this.config.interaction.zoomSensitivity);
        
        this.state.zoom(zoomFactor, graphPos.x, graphPos.y, this.config);
        this.onUpdate();
    }

    handleTouchStart(e) {
        e.preventDefault();
        this.state.touches = Array.from(e.touches);
        
        if (this.state.touches.length === 1) {
            // Single touch - check for feature drag, otherwise pan
            const touch = this.state.touches[0];
            const pos = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            const featureGrabbed = this.checkFeatureDrag(pos.x, pos.y);
            
            if (!featureGrabbed) {
                this.startPanning(pos.x, pos.y);
            }
        } else if (this.state.touches.length === 2) {
            // Two fingers - stop panning and start pinch-to-zoom
            this.stopPanning();
            const touch1 = this.state.touches[0];
            const touch2 = this.state.touches[1];
            this.state.lastPinchDistance = this.getTouchDistance(touch1, touch2);
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1 && this.state.dragging) {
            // Single touch drag of feature
            const touch = e.touches[0];
            const pos = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            const graphPos = this.coordSystem.canvasToGraph(pos.x - this.state.dragOffset, 0);
            
            let newValue = Math.round(graphPos.x / this.config.interaction.snapIncrement) * 
                          this.config.interaction.snapIncrement;
            newValue = Math.max(this.state.xMin, Math.min(this.state.xMax, newValue));
            
            this.state.updateDraggingValue(newValue);
            this.onUpdate();
        } else if (e.touches.length === 1 && this.isPanning) {
            // Single touch panning
            const touch = e.touches[0];
            const pos = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            this.updatePanning(pos.x, pos.y);
        } else if (e.touches.length === 2 && this.state.lastPinchDistance !== null) {
            // Pinch-to-zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = this.getTouchDistance(touch1, touch2);
            
            const centerPos = this.getCanvasCoordinates(
                (touch1.clientX + touch2.clientX) / 2,
                (touch1.clientY + touch2.clientY) / 2
            );
            const graphCenter = this.coordSystem.canvasToGraph(centerPos.x, centerPos.y);
            
            const zoomFactor = this.state.lastPinchDistance / currentDistance;
            this.state.zoom(zoomFactor, graphCenter.x, graphCenter.y, this.config);
            
            this.state.lastPinchDistance = currentDistance;
            this.onUpdate();
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.state.touches = Array.from(e.touches);
        
        if (this.state.touches.length < 2) {
            this.state.lastPinchDistance = null;
        }
        
        if (this.state.touches.length === 0) {
            this.stopPanning();
            this.state.stopDragging();
        }
    }

    startPanning(x, y) {
        this.isPanning = true;
        this.panStart = { x, y };
        this.panStartBounds = {
            xMin: this.state.xMin,
            xMax: this.state.xMax,
            yMin: this.state.yMin,
            yMax: this.state.yMax
        };
        this.canvas.style.cursor = 'grabbing';
    }

    updatePanning(x, y) {
    if (!this.isPanning || !this.panStart) return;
    
    const deltaX = x - this.panStart.x;
    const deltaY = y - this.panStart.y;
    
    // Convert pixel delta to graph units
    const xRange = this.panStartBounds.xMax - this.panStartBounds.xMin;
    const yRange = this.panStartBounds.yMax - this.panStartBounds.yMin;
    
    const graphDeltaX = -(deltaX / this.coordSystem.graphWidth) * xRange;
    const graphDeltaY = (deltaY / this.coordSystem.graphHeight) * yRange;
    
    this.state.xMin = this.panStartBounds.xMin + graphDeltaX;
    this.state.xMax = this.panStartBounds.xMax + graphDeltaX;
    this.state.yMin = this.panStartBounds.yMin + graphDeltaY;
    this.state.yMax = this.panStartBounds.yMax + graphDeltaY;
    
    // Enforce absolute bounds
    const absXMin = this.config.graph.absoluteXMin;
    const absXMax = this.config.graph.absoluteXMax;
    const absYMin = this.config.graph.absoluteYMin;
    const absYMax = this.config.graph.absoluteYMax;
    
    if (this.state.xMin < absXMin) {
        this.state.xMax += (absXMin - this.state.xMin);
        this.state.xMin = absXMin;
    }
    if (this.state.xMax > absXMax) {
        this.state.xMin -= (this.state.xMax - absXMax);
        this.state.xMax = absXMax;
    }
    if (this.state.yMin < absYMin) {
        this.state.yMax += (absYMin - this.state.yMin);
        this.state.yMin = absYMin;
    }
    if (this.state.yMax > absYMax) {
        this.state.yMin -= (this.state.yMax - absYMax);
        this.state.yMax = absYMax;
    }
    
    this.onUpdate();
    }

    stopPanning() {
        if (this.isPanning) {
            this.isPanning = false;
            this.panStart = null;
            this.panStartBounds = null;
            this.canvas.style.cursor = 'crosshair';
        }
    }

    checkFeatureDrag(mouseX, mouseY) {
        // Check for x-intercepts
        for (let root of this.state.xIntercepts) {
            const pos = this.coordSystem.graphToCanvas(root, 0);
            const dist = Math.sqrt(Math.pow(mouseX - pos.x, 2) + Math.pow(mouseY - pos.y, 2));
            
            if (dist < this.config.interaction.dragThreshold) {
                this.state.startDragging('intercept', this.state.xIntercepts.indexOf(root), mouseX - pos.x);
                return true;
            }
        }
        
        // Check for asymptotes
        for (let asym of this.state.asymptotes) {
            const pos = this.coordSystem.graphToCanvas(asym, 0);
            
            if (Math.abs(mouseX - pos.x) < this.config.interaction.dragThreshold) {
                this.state.startDragging('asymptote', this.state.asymptotes.indexOf(asym), mouseX - pos.x);
                return true;
            }
        }
        
        // Check for holes
        for (let hole of this.state.holes) {
            const y = this.calculateHoleY(hole);
            
            if (y !== null) {
                const pos = this.coordSystem.graphToCanvas(hole, y);
                const dist = Math.sqrt(Math.pow(mouseX - pos.x, 2) + Math.pow(mouseY - pos.y, 2));
                
                if (dist < this.config.interaction.dragThreshold) {
                    this.state.startDragging('hole', this.state.holes.indexOf(hole), mouseX - pos.x);
                    return true;
                }
            }
        }
        
        return false;
    }

    getTouchDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    calculateHoleY(hole) {
        let numerator = this.state.scalingFactor;
        let denominator = 1;
        
        for (let root of this.state.xIntercepts) {
            numerator *= (hole - root);
        }
        
        for (let asym of this.state.asymptotes) {
            denominator *= (hole - asym);
        }
        
        for (let otherHole of this.state.holes) {
            if (otherHole !== hole) {
                numerator *= (hole - otherHole);
                denominator *= (hole - otherHole);
            }
        }
        
        return denominator !== 0 ? numerator / denominator : null;
    }
}