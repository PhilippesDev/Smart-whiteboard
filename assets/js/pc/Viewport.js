window.Viewport = class Viewport {
    constructor(canvas, canvasContainer) {
        this.canvas = canvas;
        this.container = canvasContainer;
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        
        this.minScale = 0.1;
        this.maxScale = 10.0;
        
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        
        this.setupMouseWheelZoom();
        this.setupPan();
    }
    
    setupMouseWheelZoom() {
        this.container.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const rect = this.container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
                this.zoom(zoomFactor, mouseX, mouseY);
            }
        }, { passive: false });
    }
    
    setupPan() {
        this.container.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) { // Middle mouse or Shift+Left
                e.preventDefault();
                this.isPanning = true;
                this.panStartX = e.clientX - this.offsetX;
                this.panStartY = e.clientY - this.offsetY;
                this.container.style.cursor = 'grabbing';
            }
        });
        
        window.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.offsetX = e.clientX - this.panStartX;
                this.offsetY = e.clientY - this.panStartY;
                this.applyTransform();
            }
        });
        
        window.addEventListener('mouseup', (e) => {
            if (this.isPanning) {
                this.isPanning = false;
                this.container.style.cursor = '';
            }
        });
    }
    
    zoom(factor, centerX, centerY) {
        let newScale = this.scale * factor;
        newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
        
        // Adjust offset to zoom relative to mouse center
        const actualFactor = newScale / this.scale;
        this.offsetX = centerX - (centerX - this.offsetX) * actualFactor;
        this.offsetY = centerY - (centerY - this.offsetY) * actualFactor;
        
        this.scale = newScale;
        this.applyTransform();
        
        if (window.app) window.app.updateZoomDisplay();
    }
    
    zoomIn() {
        const rect = this.container.getBoundingClientRect();
        this.zoom(1.2, rect.width/2, rect.height/2);
    }
    
    zoomOut() {
        const rect = this.container.getBoundingClientRect();
        this.zoom(1/1.2, rect.width/2, rect.height/2);
    }
    
    fitToScreen() {
        // Find bounding box of all objects
        if (!window.app || !window.app.objects || window.app.objects.length === 0) {
            this.reset();
            return;
        }
        
        // Simple fit for now
        this.reset();
    }
    
    reset() {
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.applyTransform();
        if (window.app) window.app.updateZoomDisplay();
    }
    
    pan(dx, dy) {
        this.offsetX += dx;
        this.offsetY += dy;
        this.applyTransform();
    }
    
    applyTransform() {
        this.canvas.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        this.canvas.style.transformOrigin = '0 0';
    }
    
    toViewportCoords(screenX, screenY) {
        const rect = this.container.getBoundingClientRect();
        const x = (screenX - rect.left - this.offsetX) / this.scale;
        const y = (screenY - rect.top - this.offsetY) / this.scale;
        return {x, y};
    }
    
    toScreenCoords(viewX, viewY) {
        const rect = this.container.getBoundingClientRect();
        const x = (viewX * this.scale) + this.offsetX + rect.left;
        const y = (viewY * this.scale) + this.offsetY + rect.top;
        return {x, y};
    }
    
    getZoomPercentage() {
        return Math.round(this.scale * 100);
    }
};
