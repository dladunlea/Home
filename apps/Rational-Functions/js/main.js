import { CONFIG } from './config.js';
import { AppState } from './state.js';
import { CoordinateSystem } from './coordinateSystem.js';
import { FunctionEvaluator } from './functionEvaluator.js';
import { Renderer } from './renderer.js';
import { EventHandlers } from './eventHandlers.js';
import { FeatureManager } from './featureManager.js';
import { EquationDisplay } from './equationDisplay.js';

class RationalFunctionExplorer {
    constructor() {
        this.canvas = document.getElementById('graphCanvas');
        this.lastDPR = window.devicePixelRatio || 1;
        
        // Wait for layout to be ready
        requestAnimationFrame(() => {
            this.setupCanvas();
            this.initialize();
        });
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.setupCanvas();
                if (this.coordSystem) {
                    this.draw();
                }
            }, 200);
        });
        
        // Handle window resize AND DPI changes
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.setupCanvas();
                if (this.coordSystem) {
                    this.draw();
                }
            }, 100);
        });
        
        // Monitor for DPI changes (when dragging between monitors)
        this.startDPRMonitoring();
    }

    startDPRMonitoring() {
        // Check for DPI changes every 500ms
        setInterval(() => {
            const currentDPR = window.devicePixelRatio || 1;
            if (currentDPR !== this.lastDPR) {
                console.log('DPI changed from', this.lastDPR, 'to', currentDPR);
                this.lastDPR = currentDPR;
                this.setupCanvas();
                if (this.renderer) {
                    this.draw();
                }
            }
        }, 500);
    }

    initialize() {
        this.state = new AppState(CONFIG);
        this.coordSystem = new CoordinateSystem(this.canvas, this.state, CONFIG);
        this.evaluator = new FunctionEvaluator(this.state);
        this.renderer = new Renderer(this.canvas, this.coordSystem, CONFIG);
        this.featureManager = new FeatureManager(this.state, CONFIG);
        this.equationDisplay = new EquationDisplay('equationDisplay');
        this.eventHandlers = new EventHandlers(
            this.canvas,
            this.state,
            this.coordSystem,
            CONFIG,
            () => this.draw()
        );
        
        this.init();
    }

    setupCanvas() {
        const canvas = this.canvas;
        const graphSection = canvas.parentElement;
        
        // Force a reflow to get accurate measurements
        graphSection.offsetHeight;
        
        // Get the equation display element
        const equationDisplay = graphSection.querySelector('.equation-display');
        
        // Get parent dimensions
        const sectionRect = graphSection.getBoundingClientRect();
        
        // Calculate available space
        const equationHeight = equationDisplay ? equationDisplay.getBoundingClientRect().height : 0;
        const gap = 12; // Gap between equation and canvas
        const sectionPadding = 32; // 16px padding on each side
        
        // Calculate actual available dimensions
        const availableWidth = sectionRect.width - sectionPadding;
        const availableHeight = sectionRect.height - equationHeight - gap - sectionPadding;
        
        // Use device pixel ratio for crisp rendering on retina displays
        const dpr = window.devicePixelRatio || 1;
        
        // Set display size (CSS size - what user sees)
        const canvasWidth = availableWidth;
        const canvasHeight = availableHeight;
        
        // Set CSS size
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';
        
        // Set actual canvas size in memory (scaled for retina)
        canvas.width = Math.floor(canvasWidth * dpr);
        canvas.height = Math.floor(canvasHeight * dpr);
        
        // Get context and scale for retina
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        ctx.scale(dpr, dpr);
        
        // IMPORTANT: Store CSS dimensions in config (not memory dimensions)
        CONFIG.canvas.width = canvasWidth;
        CONFIG.canvas.height = canvasHeight;
        
        // Adjust padding for smaller screens
        if (canvasWidth < 600) {
            CONFIG.canvas.padding = 35;
        } else {
            CONFIG.canvas.padding = 40;
        }
        
        console.log('setupCanvas called:');
        console.log('  DPR:', dpr);
        console.log('  CSS size:', canvasWidth, 'x', canvasHeight);
        console.log('  Memory size:', canvas.width, 'x', canvas.height);
        console.log('  Config size:', CONFIG.canvas.width, 'x', CONFIG.canvas.height);
    }

    init() {
        this.state.saveState();
        this.eventHandlers.init();
        this.attachButtonHandlers();
        this.draw();
    }

    draw() {
        if (!this.renderer) return;
        this.renderer.draw(this.state, this.evaluator);
        this.equationDisplay.update(this.state);
        this.attachFactorDeleteHandlers();
    }

    attachButtonHandlers() {
        document.getElementById('addXInterceptBtn').addEventListener('click', () => {
            this.featureManager.addXIntercept();
            this.draw();
        });

        document.getElementById('addAsymptoteBtn').addEventListener('click', () => {
            this.featureManager.addAsymptote();
            this.draw();
        });

        document.getElementById('addHoleBtn').addEventListener('click', () => {
            this.featureManager.addHole();
            this.draw();
        });

        document.getElementById('resetZoomBtn').addEventListener('click', () => {
            // Force recalculation of canvas for current monitor
            this.lastDPR = window.devicePixelRatio || 1;
            this.setupCanvas();
            
            console.log('=== Reset Zoom Debug ===');
            console.log('DPR:', window.devicePixelRatio);
            console.log('Canvas CSS size:', this.canvas.style.width, 'x', this.canvas.style.height);
            console.log('Canvas memory size:', this.canvas.width, 'x', this.canvas.height);
            console.log('Config size:', CONFIG.canvas.width, 'x', CONFIG.canvas.height);
            
            // Small delay to ensure canvas is ready
            setTimeout(() => {
                this.state.resetZoom(CONFIG);
                console.log('After reset - bounds:', 
                    'xMin:', this.state.xMin, 
                    'xMax:', this.state.xMax, 
                    'yMin:', this.state.yMin, 
                    'yMax:', this.state.yMax);
                this.draw();
                
                // Test origin position
                const originCanvas = this.coordSystem.graphToCanvas(0, 0);
                console.log('Origin canvas position:', originCanvas);
                console.log('Canvas center should be:', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);
                console.log('Graph width:', this.coordSystem.graphWidth);
                console.log('Graph height:', this.coordSystem.graphHeight);
            }, 50);
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all features?')) {
                this.state.clearAll();
                this.draw();
            }
        });

        document.getElementById('undoBtn').addEventListener('click', () => {
            if (this.state.undo()) {
                this.draw();
            }
        });
    }

    attachFactorDeleteHandlers() {
        const factors = document.querySelectorAll('.factor');
        factors.forEach(factor => {
            const deleteBtn = factor.querySelector('.delete-x');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const type = factor.dataset.type;
                    const value = parseFloat(factor.dataset.value);
                    this.featureManager.deleteFactor(type, value);
                    this.draw();
                });
            }
            
            // Also allow tap on factor itself to delete (mobile-friendly)
            factor.addEventListener('click', (e) => {
                if (e.target === factor || e.target.classList.contains('delete-x')) {
                    const type = factor.dataset.type;
                    const value = parseFloat(factor.dataset.value);
                    this.featureManager.deleteFactor(type, value);
                    this.draw();
                }
            });
        });
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new RationalFunctionExplorer();
});