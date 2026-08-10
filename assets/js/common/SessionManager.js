window.SessionManager = class SessionManager {
    constructor(wsClient) {
        this.ws = wsClient;
        this.sessionId = null;
        this.pcConnectedHandlers = [];
        this.mobileConnectedHandlers = [];
        this.pcDisconnectedHandlers = [];
        
        this.ws.onMessage((msg) => this._handleMessage(msg));
    }

    async createSession() {
        try {
            const res = await fetch('/backend/api/session.php?action=create');
            const data = await res.json();
            if (data.session_id) {
                this.sessionId = data.session_id;
                return this.sessionId;
            }
            throw new Error("Failed to create session");
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    async joinSession(sessionId, role) {
        this.sessionId = sessionId;
        if (!this.ws.isConnected) {
            await this.ws.connect();
        }
        this.ws.send({
            type: "join_session",
            session_id: sessionId,
            role: role
        });
    }

    getSessionId() {
        return this.sessionId;
    }

    setSessionId(id) {
        this.sessionId = id;
    }

    onPCConnected(handler) {
        this.pcConnectedHandlers.push(handler);
    }

    onMobileConnected(handler) {
        this.mobileConnectedHandlers.push(handler);
    }

    onPCDisconnected(handler) {
        this.pcDisconnectedHandlers.push(handler);
    }

    _handleMessage(msg) {
        if (msg.type === 'pc_connected') {
            this.pcConnectedHandlers.forEach(h => h());
        } else if (msg.type === 'mobile_connected' || (msg.type === 'join_confirmed' && msg.role === 'mobile')) {
            this.mobileConnectedHandlers.forEach(h => h());
        } else if (msg.type === 'pc_disconnected') {
            this.pcDisconnectedHandlers.forEach(h => h());
        }
    }
}
