window.StrokeTransmitter = class StrokeTransmitter {
    constructor(wsClient) {
        this.ws = wsClient;
        this.pointBuffer = [];
        this.currentStrokeId = null;
        this.rafId = null;
        
        this.offlineBuffer = [];
        this.maxOfflineStrokes = 1000;
        
        this.transmitLoop = this.transmitLoop.bind(this);
    }

    startStroke(id, color, width, tool, mode, opacity) {
        this.currentStrokeId = id;
        this.pointBuffer = [];
        
        const msg = {
            type: "stroke_start",
            id: id,
            color: color,
            width: width,
            tool: tool,
            mode: mode,
            opacity: opacity
        };
        
        if (this.ws.isConnected) {
            this.ws.send(msg);
        } else {
            this._bufferOfflineMessage(msg);
        }
        
        if (!this.rafId) {
            this.rafId = requestAnimationFrame(this.transmitLoop);
        }
    }

    addPoint(id, x, y, pressure) {
        if (this.currentStrokeId !== id) return;
        
        this.pointBuffer.push({
            x: Number(x.toFixed(4)),
            y: Number(y.toFixed(4)),
            p: Number(pressure.toFixed(2)),
            t: Date.now()
        });
    }

    transmitLoop() {
        if (this.pointBuffer.length > 0 && this.currentStrokeId) {
            const msg = {
                type: "stroke_points",
                id: this.currentStrokeId,
                points: [...this.pointBuffer]
            };
            
            if (this.ws.isConnected) {
                this.ws.send(msg);
            } else {
                this._bufferOfflineMessage(msg);
            }
            
            this.pointBuffer = [];
        }
        
        this.rafId = requestAnimationFrame(this.transmitLoop);
    }

    endStroke(id) {
        if (this.currentStrokeId !== id) return;
        
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        // Flush remaining
        if (this.pointBuffer.length > 0) {
            const pointsMsg = {
                type: "stroke_points",
                id: id,
                points: [...this.pointBuffer]
            };
            if (this.ws.isConnected) this.ws.send(pointsMsg);
            else this._bufferOfflineMessage(pointsMsg);
            
            this.pointBuffer = [];
        }
        
        const endMsg = { type: "stroke_end", id: id };
        if (this.ws.isConnected) this.ws.send(endMsg);
        else this._bufferOfflineMessage(endMsg);
        
        this.currentStrokeId = null;
    }

    sendCommand(action) {
        const msg = { type: "command", action: action };
        if (this.ws.isConnected) {
            this.ws.send(msg);
        } else {
            this._bufferOfflineMessage(msg);
        }
    }

    _bufferOfflineMessage(msg) {
        this.offlineBuffer.push(msg);
        if (this.offlineBuffer.length > this.maxOfflineStrokes) {
            this.offlineBuffer.shift();
        }
    }
}
