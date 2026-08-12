export class CoordinateSystem {
    constructor(canvas, state, config) {
        this.canvas = canvas;
        this.state = state;
        this.config = config;
    }

    get padding() {
        return this.config.canvas.padding;
    }

    get graphWidth() {
        // Always use the config width (which is set from CSS dimensions)
        return this.config.canvas.width - 2 * this.padding;
    }

    get graphHeight() {
        // Always use the config height (which is set from CSS dimensions)
        return this.config.canvas.height - 2 * this.padding;
    }

    canvasToGraph(canvasX, canvasY) {
        const x = this.state.xMin + (canvasX - this.padding) / this.graphWidth * (this.state.xMax - this.state.xMin);
        const y = this.state.yMax - (canvasY - this.padding) / this.graphHeight * (this.state.yMax - this.state.yMin);
        return { x, y };
    }

    graphToCanvas(x, y) {
        const canvasX = this.padding + (x - this.state.xMin) / (this.state.xMax - this.state.xMin) * this.graphWidth;
        const canvasY = this.padding + (this.state.yMax - y) / (this.state.yMax - this.state.yMin) * this.graphHeight;
        return { x: canvasX, y: canvasY };
    }
}