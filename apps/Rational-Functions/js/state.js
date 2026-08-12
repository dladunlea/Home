export class AppState {
    constructor(config) {
        this.xIntercepts = [2];
        this.asymptotes = [-3];
        this.holes = [];
        this.scalingFactor = 1;
        this.history = [];
        this.dragging = null;
        this.dragOffset = 0;
        
        // Zoom state
        this.xMin = config.graph.xMin;
        this.xMax = config.graph.xMax;
        this.yMin = config.graph.yMin;
        this.yMax = config.graph.yMax;
        
        // Touch state for pinch-to-zoom
        this.touches = [];
        this.lastPinchDistance = null;
        
        // Shift+drag zoom state
        this.shiftDragging = false;
        this.shiftDragStart = null;
    }

    saveState() {
        this.history.push({
            xIntercepts: [...this.xIntercepts],
            asymptotes: [...this.asymptotes],
            holes: [...this.holes],
            xMin: this.xMin,
            xMax: this.xMax,
            yMin: this.yMin,
            yMax: this.yMax
        });
        
        if (this.history.length > 20) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history.length > 1) {
            this.history.pop();
            const prevState = this.history[this.history.length - 1];
            this.xIntercepts = [...prevState.xIntercepts];
            this.asymptotes = [...prevState.asymptotes];
            this.holes = [...prevState.holes];
            this.xMin = prevState.xMin;
            this.xMax = prevState.xMax;
            this.yMin = prevState.yMin;
            this.yMax = prevState.yMax;
            return true;
        }
        return false;
    }

    addXIntercept(value) {
        this.saveState();
        this.xIntercepts.push(value);
    }

    addAsymptote(value) {
        this.saveState();
        this.asymptotes.push(value);
    }

    addHole(value) {
        this.saveState();
        this.holes.push(value);
    }

    deleteFeature(type, value) {
        this.saveState();
        
        if (type === 'intercept') {
            this.xIntercepts = this.xIntercepts.filter(r => r !== value);
        } else if (type === 'asymptote') {
            this.asymptotes = this.asymptotes.filter(a => a !== value);
        } else if (type === 'hole') {
            this.holes = this.holes.filter(h => h !== value);
        }
    }

    clearAll() {
        this.saveState();
        this.xIntercepts = [];
        this.asymptotes = [];
        this.holes = [];
    }

    startDragging(type, index, offset) {
        this.dragging = { type, index };
        this.dragOffset = offset;
    }

    updateDraggingValue(newValue) {
        if (!this.dragging) return;
        
        if (this.dragging.type === 'intercept') {
            this.xIntercepts[this.dragging.index] = newValue;
        } else if (this.dragging.type === 'asymptote') {
            this.asymptotes[this.dragging.index] = newValue;
        } else if (this.dragging.type === 'hole') {
            this.holes[this.dragging.index] = newValue;
        }
    }

    stopDragging() {
        if (this.dragging) {
            this.saveState();
            this.dragging = null;
            this.dragOffset = 0;
        }
    }

    zoom(factor, centerX, centerY, config) {
        const xRange = this.xMax - this.xMin;
        const yRange = this.yMax - this.yMin;
        
        let newXRange = xRange * factor;
        let newYRange = yRange * factor;
        
        const minRange = config.graph.minZoom;
        const maxRange = config.graph.maxZoom;
        
        newXRange = Math.max(minRange, Math.min(maxRange, newXRange));
        newYRange = Math.max(minRange, Math.min(maxRange, newYRange));
        
        const xRatio = (centerX - this.xMin) / xRange;
        const yRatio = (centerY - this.yMin) / yRange;
        
        this.xMin = centerX - newXRange * xRatio;
        this.xMax = centerX + newXRange * (1 - xRatio);
        this.yMin = centerY - newYRange * yRatio;
        this.yMax = centerY + newYRange * (1 - yRatio);
        
        // Enforce absolute bounds
        this.xMin = Math.max(config.graph.absoluteXMin, this.xMin);
        this.xMax = Math.min(config.graph.absoluteXMax, this.xMax);
        this.yMin = Math.max(config.graph.absoluteYMin, this.yMin);
        this.yMax = Math.min(config.graph.absoluteYMax, this.yMax);
    }

    resetZoom(config) {
        // Always reset to default symmetric bounds centered on origin
        this.xMin = -10;
        this.xMax = 10;
        this.yMin = -10;
        this.yMax = 10;
        this.saveState();
    }

    startShiftDrag(x, y) {
        this.shiftDragging = true;
        this.shiftDragStart = { x, y, xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax };
    }

    updateShiftDrag(deltaY, config) {
        if (!this.shiftDragging || !this.shiftDragStart) return;
        
        const zoomFactor = 1 + (deltaY * config.interaction.shiftDragZoomSensitivity);
        
        const centerX = (this.shiftDragStart.xMin + this.shiftDragStart.xMax) / 2;
        const centerY = (this.shiftDragStart.yMin + this.shiftDragStart.yMax) / 2;
        
        const xRange = this.shiftDragStart.xMax - this.shiftDragStart.xMin;
        const yRange = this.shiftDragStart.yMax - this.shiftDragStart.yMin;
        
        let newXRange = xRange * zoomFactor;
        let newYRange = yRange * zoomFactor;
        
        const minRange = config.graph.minZoom;
        const maxRange = config.graph.maxZoom;
        
        newXRange = Math.max(minRange, Math.min(maxRange, newXRange));
        newYRange = Math.max(minRange, Math.min(maxRange, newYRange));
        
        this.xMin = centerX - newXRange / 2;
        this.xMax = centerX + newXRange / 2;
        this.yMin = centerY - newYRange / 2;
        this.yMax = centerY + newYRange / 2;
    }

    stopShiftDrag() {
        this.shiftDragging = false;
        this.shiftDragStart = null;
    }
}