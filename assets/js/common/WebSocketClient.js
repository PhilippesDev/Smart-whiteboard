window.WebSocketClient = class WebSocketClient {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.url = `ws://${host}:${port}`;
        this.ws = null;
        this.connected = false;
        
        this.reconnectAttempts = 0;
        this.maxReconnectDelay = 30000;
        
        this.messageHandlers = [];
        this.connectHandlers = [];
        this.disconnectHandlers = [];
        
        this.messageQueue = [];
        this.maxQueueSize = 100;
        
        this.pingInterval = null;
    }

    get isConnected() {
        return this.connected;
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
                resolve();
                return;
            }

            try {
                this.ws = new WebSocket(this.url);
            } catch (e) {
                reject(e);
                return;
            }

            this.ws.onopen = () => {
                this.connected = true;
                this.reconnectAttempts = 0;
                this._startHeartbeat();
                this._flushQueue();
                this.connectHandlers.forEach(h => h());
                resolve();
            };

            this.ws.onclose = () => {
                const wasConnected = this.connected;
                this.connected = false;
                this._stopHeartbeat();
                if (wasConnected) {
                    this.disconnectHandlers.forEach(h => h());
                }
                this._scheduleReconnect();
            };

            this.ws.onerror = (err) => {
                console.error("WebSocket error", err);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.messageHandlers.forEach(h => h(data));
                } catch (e) {
                    console.error("Failed to parse WS message", e);
                }
            };
        });
    }

    disconnect() {
        this.reconnectAttempts = Infinity; // Prevent reconnect
        if (this.ws) {
            this.ws.close();
        }
    }

    send(message) {
        const msgStr = typeof message === 'string' ? message : JSON.stringify(message);
        
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(msgStr);
        } else {
            if (this.messageQueue.length < this.maxQueueSize) {
                this.messageQueue.push(msgStr);
            }
        }
    }

    onMessage(handler) {
        this.messageHandlers.push(handler);
    }

    onConnect(handler) {
        this.connectHandlers.push(handler);
    }

    onDisconnect(handler) {
        this.disconnectHandlers.push(handler);
    }

    _scheduleReconnect() {
        if (this.reconnectAttempts === Infinity) return;
        
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
        this.reconnectAttempts++;
        
        setTimeout(() => {
            console.log(`Reconnecting (attempt ${this.reconnectAttempts})...`);
            this.connect().catch(() => {});
        }, delay);
    }

    _startHeartbeat() {
        this._stopHeartbeat();
        this.pingInterval = setInterval(() => {
            this.send({ type: "ping" });
        }, 30000);
    }

    _stopHeartbeat() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    _flushQueue() {
        while (this.messageQueue.length > 0 && this.connected) {
            const msg = this.messageQueue.shift();
            this.ws.send(msg);
        }
    }
}
