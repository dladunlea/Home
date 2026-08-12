export class FeatureManager {
    constructor(state, config) {
        this.state = state;
        this.config = config;
    }

    addXIntercept() {
        const newRoot = this.findAvailablePosition();
        if (newRoot !== null) {
            this.state.addXIntercept(newRoot);
        }
    }

    addAsymptote() {
        const newAsym = this.findAvailablePosition();
        if (newAsym !== null) {
            this.state.addAsymptote(newAsym);
        }
    }

    addHole() {
        const newHole = this.findAvailablePosition();
        if (newHole !== null) {
            this.state.addHole(newHole);
        }
    }

    findAvailablePosition() {
        const { xMin, xMax } = this.state;
        const increment = this.config.interaction.snapIncrement;
        
        // Get all occupied positions
        const occupied = new Set([
            ...this.state.xIntercepts,
            ...this.state.asymptotes,
            ...this.state.holes
        ]);
        
        // Generate all possible positions within current view
        const possiblePositions = [];
        for (let x = xMin; x <= xMax; x += increment) {
            // Round to avoid floating point issues
            const rounded = Math.round(x / increment) * increment;
            if (!occupied.has(rounded)) {
                possiblePositions.push(rounded);
            }
        }
        
        // If we found available positions, pick a random one
        if (possiblePositions.length > 0) {
            const randomIndex = Math.floor(Math.random() * possiblePositions.length);
            return possiblePositions[randomIndex];
        }
        
        // No space available - need to zoom out
        console.log('No space available - zooming out...');
        this.autoZoomOut();
        
        // Try again after zooming
        return this.findAvailablePosition();
    }

    autoZoomOut() {
        const { xMin, xMax, yMin, yMax } = this.state;
        const currentXRange = xMax - xMin;
        const currentYRange = yMax - yMin;
        
        // Zoom out by 50%
        const zoomFactor = 1.5;
        const newXRange = currentXRange * zoomFactor;
        const newYRange = currentYRange * zoomFactor;
        
        // Center the zoom on current view
        const centerX = (xMin + xMax) / 2;
        const centerY = (yMin + yMax) / 2;
        
        this.state.xMin = centerX - newXRange / 2;
        this.state.xMax = centerX + newXRange / 2;
        this.state.yMin = centerY - newYRange / 2;
        this.state.yMax = centerY + newYRange / 2;
        
        // Enforce absolute bounds
        this.state.xMin = Math.max(this.config.graph.absoluteXMin, this.state.xMin);
        this.state.xMax = Math.min(this.config.graph.absoluteXMax, this.state.xMax);
        this.state.yMin = Math.max(this.config.graph.absoluteYMin, this.state.yMin);
        this.state.yMax = Math.min(this.config.graph.absoluteYMax, this.state.yMax);
        
        console.log('Auto-zoomed out to:', this.state.xMin, 'to', this.state.xMax);
    }

    deleteFactor(type, value) {
        this.state.deleteFeature(type, value);
    }

    generateRandomPosition() {
        return Math.floor(Math.random() * 8) - 4;
    }
}
