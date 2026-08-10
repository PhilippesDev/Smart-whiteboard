window.MobileApp = class MobileApp {
    constructor() {
        this.config = window.SW_CONFIG || { WS_PORT: 8080 };
        this.ws = new window.WebSocketClient(window.location.hostname, this.config.WS_PORT);
        this.sessionManager = new window.SessionManager(this.ws);
        this.transmitter = new window.StrokeTransmitter(this.ws);
        this.smoother = new window.Smoother(0);
        
        this.canvas = document.getElementById('drawCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.state = {
            tool: 'pen', // pen, eraser
            color: '#000000',
            width: 4,
            mode: 'raw', // raw, smart, hybrid
            opacity: 1.0,
            smoothingLevel: 0
        };
        
        this.currentStrokeId = null;
        
        this.initDOM();
        this.initEvents();
        this.resizeCanvas();
        
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.pointerManager = new window.PointerManager(this.canvas, {
            onStart: this.onDrawStart.bind(this),
            onMove: this.onDrawMove.bind(this),
            onEnd: this.onDrawEnd.bind(this)
        });
        
        this.checkUrlForSession();
    }

    initDOM() {
        this.joinScreen = document.getElementById('joinScreen');
        this.drawScreen = document.getElementById('drawScreen');
        this.sessionInput = document.getElementById('sessionInput');
        this.connectBtn = document.getElementById('connectBtn');
        
        this.statusDot = document.getElementById('statusDot');
        this.sessionCodeDisplay = document.getElementById('sessionCodeDisplay');
        
        this.toolPen = document.getElementById('toolPen');
        this.toolEraser = document.getElementById('toolEraser');
        this.btnUndo = document.getElementById('btnUndo');
        this.btnRedo = document.getElementById('btnRedo');
        this.btnSettings = document.getElementById('btnSettings');
        this.colorPicker = document.getElementById('colorPicker');
        
        this.settingsPanel = document.getElementById('settingsPanel');
        this.sliderWidth = document.getElementById('sliderWidth');
        this.btnClear = document.getElementById('btnClear');
        
        // Settings bindings
        document.querySelectorAll('input[name="smoothing"]').forEach(el => {
            el.addEventListener('change', (e) => {
                this.state.smoothingLevel = parseInt(e.target.value);
                this.smoother.level = this.state.smoothingLevel;
            });
        });
        
        document.querySelectorAll('.tab').forEach(el => {
            el.addEventListener('click', (e) => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.state.mode = e.target.dataset.mode;
            });
        });
    }

    initEvents() {
        this.sessionInput.addEventListener('input', (e) => {
            let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (val.length > 4) val = val.slice(0, 4) + '-' + val.slice(4, 8);
            e.target.value = val;
        });

        this.connectBtn.addEventListener('click', () => {
            const code = this.sessionInput.value;
            if (code.length === 9) {
                this.joinSession(code);
            } else {
                alert("Please enter a valid session code (XXXX-XXXX)");
            }
        });

        this.ws.onConnect(() => this.updateStatus('yellow'));
        this.ws.onDisconnect(() => this.updateStatus('red'));
        this.sessionManager.onPCConnected(() => this.updateStatus('green'));
        this.sessionManager.onPCDisconnected(() => this.updateStatus('yellow'));
        
        this.toolPen.addEventListener('click', () => this.setTool('pen'));
        this.toolEraser.addEventListener('click', () => this.setTool('eraser'));
        
        this.colorPicker.addEventListener('input', (e) => {
            this.state.color = e.target.value;
            this.setTool('pen');
        });
        
        this.btnUndo.addEventListener('click', () => this.transmitter.sendCommand('undo'));
        this.btnRedo.addEventListener('click', () => this.transmitter.sendCommand('redo'));
        this.btnClear.addEventListener('click', () => {
            this.transmitter.sendCommand('clear');
            this.clearLocalCanvas();
            this.settingsPanel.classList.remove('active');
        });
        
        this.btnSettings.addEventListener('click', () => {
            this.settingsPanel.classList.toggle('active');
        });
        
        this.sliderWidth.addEventListener('input', (e) => {
            this.state.width = parseInt(e.target.value);
        });
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    checkUrlForSession() {
        const params = new URLSearchParams(window.location.search);
        const session = params.get('session');
        if (session) {
            this.sessionInput.value = session;
            this.joinSession(session);
        }
    }

    async joinSession(code) {
        try {
            await this.ws.connect();
            await this.sessionManager.joinSession(code, 'mobile');
            
            this.joinScreen.style.display = 'none';
            this.drawScreen.style.display = 'block';
            this.sessionCodeDisplay.textContent = code;
            this.resizeCanvas();
        } catch (e) {
            alert("Connection failed: " + e.message);
        }
    }

    updateStatus(color) {
        this.statusDot.className = 'status-dot ' + color;
    }

    setTool(tool) {
        this.state.tool = tool;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        if (tool === 'pen') this.toolPen.classList.add('active');
        if (tool === 'eraser') this.toolEraser.classList.add('active');
    }

    generateId() {
        return 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    onDrawStart(x, y, pressure, isEraserHardware) {
        this.currentStrokeId = this.generateId();
        this.smoother.reset();
        
        const effectiveTool = isEraserHardware ? 'eraser' : this.state.tool;
        const color = effectiveTool === 'eraser' ? '#000000' : this.state.color; // backend can handle black as erase or use tool type
        
        this.transmitter.startStroke(
            this.currentStrokeId,
            color,
            this.state.width,
            effectiveTool,
            this.state.mode,
            this.state.opacity
        );
        
        this.smoother.addPoint(x, y, pressure);
        this.transmitter.addPoint(this.currentStrokeId, x, y, pressure);
        
        // Local rendering start
        this.ctx.beginPath();
        const px = x * this.canvas.offsetWidth;
        const py = y * this.canvas.offsetHeight;
        this.ctx.moveTo(px, py);
        
        this.lastX = px;
        this.lastY = py;
    }

    onDrawMove(x, y, pressure) {
        if (!this.currentStrokeId) return;
        
        this.smoother.addPoint(x, y, pressure);
        this.transmitter.addPoint(this.currentStrokeId, x, y, pressure);
        
        // Quick local feedback (unsmoothed for zero latency feel)
        const px = x * this.canvas.offsetWidth;
        const py = y * this.canvas.offsetHeight;
        
        this.ctx.lineTo(px, py);
        this.ctx.strokeStyle = this.state.tool === 'eraser' ? '#1a1a2e' : this.state.color; // Hack for local eraser visualization
        this.ctx.lineWidth = this.state.width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
        
        this.lastX = px;
        this.lastY = py;
    }

    onDrawEnd(x, y) {
        if (!this.currentStrokeId) return;
        
        this.transmitter.endStroke(this.currentStrokeId);
        this.currentStrokeId = null;
        
        // Optional: Redraw local stroke with smoothed points for perfect fidelity
    }

    clearLocalCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new window.MobileApp();
});
