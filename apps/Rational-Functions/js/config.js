export const CONFIG = {
    canvas: {
        width: 800,
        height: 600,
        padding: 40
    },
    graph: {
        xMin: -10,
        xMax: 10,
        yMin: -10,
        yMax: 10,
        defaultXMin: -10,
        defaultXMax: 10,
        defaultYMin: -10,
        defaultYMax: 10,
        minZoom: 2,
        maxZoom: 1000,
        // Add absolute bounds for calculations
        absoluteXMin: -500,
        absoluteXMax: 500,
        absoluteYMin: -500,
        absoluteYMax: 500
    },
    rendering: {
        step: 0.05,
        maxJump: 100
    },
    colors: {
        asymptote: '#f44336',
        xIntercept: '#4caf50',
        hole: '#ff9800',
        function: '#667eea',
        grid: '#e0e0e0',
        axes: '#333'
    },
    interaction: {
        dragThreshold: 20,
        snapIncrement: 0.5,
        zoomSensitivity: 0.1,
        shiftDragZoomSensitivity: 0.02
    },
    history: {
        maxLength: 20
    }
};