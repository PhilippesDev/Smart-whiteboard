window.PointerManager = class PointerManager {
    constructor(canvas, { onStart, onMove, onEnd }) {
        this.canvas = canvas;
        this.onStart = onStart;
        this.onMove = onMove;
        this.onEnd = onEnd;
        
        this.activePointerId = null;
        
        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('pointercancel', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        
        // Prevent default touch actions (scrolling, zooming)
        this.canvas.style.touchAction = 'none';
    }

    _getNormalizedCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Calculate normalized coordinates considering the element's actual size vs internal resolution
        let x = (e.clientX - rect.left) / rect.width;
        let y = (e.clientY - rect.top) / rect.height;
        
        // Clamp to 0-1 range
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));
        
        return { x, y };
    }

    _getPressure(e) {
        return e.pressure !== undefined && e.pressure !== 0 ? e.pressure : 0.5;
    }

    handlePointerDown(e) {
        e.preventDefault();
        
        if (this.activePointerId !== null) return; // Only track one pointer
        
        this.activePointerId = e.pointerId;
        this.canvas.setPointerCapture(e.pointerId);
        
        const { x, y } = this._getNormalizedCoords(e);
        const pressure = this._getPressure(e);
        
        // Eraser detection (pen + barrel button)
        const isEraser = e.pointerType === 'pen' && (e.buttons & 32);
        
        this.onStart(x, y, pressure, isEraser);
    }

    handlePointerMove(e) {
        e.preventDefault();
        
        if (this.activePointerId !== e.pointerId) return;
        
        const { x, y } = this._getNormalizedCoords(e);
        const pressure = this._getPressure(e);
        
        // Coalesced events for higher frequency reporting
        if (e.getCoalescedEvents) {
            const events = e.getCoalescedEvents();
            for (let ev of events) {
                const coords = this._getNormalizedCoords(ev);
                const p = this._getPressure(ev);
                this.onMove(coords.x, coords.y, p);
            }
        } else {
            this.onMove(x, y, pressure);
        }
    }

    handlePointerUp(e) {
        e.preventDefault();
        
        if (this.activePointerId !== e.pointerId) return;
        
        const { x, y } = this._getNormalizedCoords(e);
        this.onEnd(x, y);
        
        this.canvas.releasePointerCapture(e.pointerId);
        this.activePointerId = null;
    }
}
