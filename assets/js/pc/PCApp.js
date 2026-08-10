window.PCApp = class PCApp {
    constructor() {
        this.objects = [];
        this.activeStrokes = new Map();
        this.sessionId = null;
        
        this.history = new window.HistoryManager();
        this.toolManager = new window.ToolManager();
        this.shapeRecognizer = new window.ShapeRecognizer();
        
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        
        this.tempRecognizedShape = null;
        this.tempOriginalStroke = null;
    }

    init() {
        this.canvas = document.getElementById('whiteboard-canvas');
        this.canvasRenderer = new window.CanvasRenderer(this.canvas);
        this.viewport = new window.Viewport(this.canvas, document.getElementById('canvas-container'));
        this.exportManager = new window.ExportManager(this.canvasRenderer, this);
        
        this.setupUI();
        this.connect();
        this.startFPSCounter();
    }

    connect() {
        this.updateConnectionStatus('connecting');
        // If WebSocketClient exists, use it. Otherwise mockup for now.
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.SW_CONFIG ? window.SW_CONFIG.WS_HOST : window.location.hostname;
        const port = window.SW_CONFIG ? window.SW_CONFIG.WS_PORT : 8080;
        
        try {
            this.ws = new WebSocket(`${protocol}//${host}:${port}`);
            
            this.ws.onopen = () => {
                this.updateConnectionStatus('connected');
            };
            
            this.ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    this.handleMessage(msg);
                } catch (err) {
                    console.error("Failed to parse message", err);
                }
            };
            
            this.ws.onclose = () => {
                this.updateConnectionStatus('disconnected');
                setTimeout(() => this.connect(), 3000);
            };
        } catch (e) {
            console.error(e);
            this.updateConnectionStatus('disconnected');
        }
    }

    handleMessage(msg) {
        switch (msg.type) {
            case 'session_created':
                this.sessionId = msg.session_id;
                document.getElementById('session-code').textContent = `Session: ${this.sessionId}`;
                this.generateQRCode();
                break;
            case 'phone_connected':
                this.updateConnectionStatus('phone_connected');
                break;
            case 'phone_disconnected':
                this.updateConnectionStatus('connected');
                break;
            case 'stroke_start':
                this.onStrokeStart(msg);
                break;
            case 'stroke_points':
                this.onStrokePoints(msg);
                break;
            case 'stroke_end':
                this.onStrokeEnd(msg);
                break;
            case 'command':
                this.onCommand(msg.action);
                break;
        }
    }

    onStrokeStart(msg) {
        this.canvasRenderer.beginStroke(msg.id, msg.color, msg.width, msg.opacity, msg.tool);
    }

    onStrokePoints(msg) {
        this.canvasRenderer.addPointsToStroke(msg.id, msg.points);
    }

    async onStrokeEnd(msg) {
        const stroke = this.canvasRenderer.endStroke(msg.id);
        if (!stroke || stroke.points.length === 0) return;
        
        stroke.type = 'stroke';

        if (this.toolManager.mode === 'raw' || stroke.tool === 'eraser') {
            this.commitStroke(stroke);
        } else {
            // smart or hybrid
            const recognized = await this.shapeRecognizer.recognize(stroke.points, this.toolManager.mode);
            if (recognized) {
                // Apply styling from original stroke
                // Transfert du style du trait original vers la forme reconnue
                // ATTENTION: ne pas écraser .width/.height qui sont les dimensions de la forme
                recognized.color = stroke.color;
                recognized.strokeWidth = stroke.width; // épaisseur du trait (≠ largeur forme)
                
                if (recognized.confidence >= window.SW_CONFIG.AUTO_APPLY_THRESHOLD) {
                    this.commitShape(recognized);
                } else if (recognized.confidence >= window.SW_CONFIG.CONFIDENCE_THRESHOLD) {
                    this.showRecognitionConfirm(stroke, recognized);
                } else {
                    this.commitStroke(stroke);
                }
            } else {
                this.commitStroke(stroke);
            }
        }
    }
    
    commitStroke(stroke) {
        this.objects.push(stroke);
        this.history.push({ type: 'add_object', data: stroke });
        this.canvasRenderer.redrawAll(this.objects);
        this.updateStats();
    }
    
    commitShape(shape) {
        this.objects.push(shape);
        this.history.push({ type: 'add_object', data: shape });
        this.canvasRenderer.redrawAll(this.objects);
        this.updateStats();
    }

    onCommand(action) {
        switch (action) {
            case 'clear':
                this.objects = [];
                this.history.push({ type: 'clear', data: [...this.objects] });
                this.canvasRenderer.redrawAll(this.objects);
                break;
            case 'undo':
                this.undo();
                break;
            case 'redo':
                this.redo();
                break;
        }
    }

    undo() {
        const action = this.history.undo();
        if (action) {
            if (action.type === 'add_object') {
                this.objects = this.objects.filter(obj => obj !== action.data);
            } else if (action.type === 'clear') {
                this.objects = action.data;
            }
            this.canvasRenderer.redrawAll(this.objects);
        }
    }

    redo() {
        const action = this.history.redo();
        if (action) {
            if (action.type === 'add_object') {
                this.objects.push(action.data);
            } else if (action.type === 'clear') {
                this.objects = [];
            }
            this.canvasRenderer.redrawAll(this.objects);
        }
    }

    setupUI() {
        document.getElementById('btn-export-png').onclick = () => this.exportManager.exportPNG();
        document.getElementById('btn-export-svg').onclick = () => this.exportManager.exportSVG();
        document.getElementById('btn-export-json').onclick = () => this.exportManager.exportJSON();
        document.getElementById('btn-import').onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = e => {
                if (e.target.files.length) this.exportManager.importJSON(e.target.files[0]);
            };
            input.click();
        };
        
        document.getElementById('btn-clear-all').onclick = () => {
            if (confirm('Vider tout le tableau ?')) this.onCommand('clear');
        };
        
        if (document.getElementById('btn-debug')) {
            document.getElementById('btn-debug').onclick = () => this.toggleDebug();
        }
        if (document.getElementById('btn-settings')) {
            document.getElementById('btn-settings').onclick = () => this.toggleSettings();
        }
        
        // Mode tabs
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.toolManager.setMode(tab.dataset.mode);
                this.updateModeDisplay();
            };
        });
        
        // Zoom controls
        document.getElementById('btn-zoom-in').onclick = () => this.viewport.zoomIn();
        document.getElementById('btn-zoom-out').onclick = () => this.viewport.zoomOut();
        document.getElementById('btn-zoom-fit').onclick = () => this.viewport.fitToScreen();
        document.getElementById('btn-zoom-reset').onclick = () => this.viewport.reset();
        
        // Undo / Redo
        document.getElementById('btn-undo').onclick = () => this.undo();
        document.getElementById('btn-redo').onclick = () => this.redo();
        
        // Recognition overlay actions
        document.getElementById('btn-accept-recognition').onclick = () => this.applyRecognizedShape();
        document.getElementById('btn-reject-recognition').onclick = () => this.rejectRecognizedShape();
        
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            if(btn.id !== 'btn-undo' && btn.id !== 'btn-redo') {
                btn.onclick = () => {
                    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if (btn.dataset.tool) this.toolManager.setTool(btn.dataset.tool);
                };
            }
        });
        
        // Properties
        const colorPicker = document.getElementById('color-picker');
        if (colorPicker) colorPicker.onchange = (e) => this.toolManager.setColor(e.target.value);
        
        const widthSlider = document.getElementById('width-slider');
        if (widthSlider) widthSlider.oninput = (e) => {
            this.toolManager.setWidth(parseInt(e.target.value));
            document.getElementById('width-display').textContent = `${e.target.value}px`;
        };
    }

    generateQRCode() {
        if (!this.sessionId) return;
        // Dérive le chemin de mobile.html depuis l'emplacement actuel de pc.html
        const basePath = window.location.pathname.replace(/pc\.html$/, '');
        const url = `${window.location.protocol}//${window.location.host}${basePath}mobile.html?session=${this.sessionId}`;
        const container = document.getElementById('qr-container');
        container.innerHTML = '';
        new QRCode(container, {
            text: url,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.L
        });
    }

    updateConnectionStatus(status) {
        const dot  = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        const statusMap = {
            'phone_connected': { bg: '#6c63ff', shadow: 'rgba(108,99,255,0.6)', label: '📱 Téléphone connecté' },
            'connected':       { bg: '#00d4aa', shadow: 'rgba(0,212,170,0.5)', label: '🟢 Serveur connecté' },
            'connecting':      { bg: '#ffd166', shadow: 'rgba(255,209,102,0.5)', label: '⏳ Connexion...' },
            'disconnected':    { bg: '#ef4444', shadow: 'rgba(239,68,68,0.5)', label: '🔴 Déconnecté' },
        };
        const s = statusMap[status] || statusMap['disconnected'];
        dot.style.background  = s.bg;
        dot.style.boxShadow   = `0 0 10px ${s.shadow}`;
        text.textContent      = s.label;
    }
    
    updateModeDisplay() {
        const modeMap = { 'raw': 'RAW', 'hybrid': 'Hybride', 'smart': 'SMART' };
        document.getElementById('stat-mode').textContent = `Mode: ${modeMap[this.toolManager.mode] || this.toolManager.mode}`;
    }
    
    updateZoomDisplay() {
        const zoom = this.viewport.getZoomPercentage();
        document.getElementById('stat-zoom').textContent = `Zoom: ${zoom}%`;
        const zDisplay = document.getElementById('zoom-display');
        if (zDisplay) zDisplay.textContent = `${zoom}%`;
    }
    
    updateStats() {
        document.getElementById('stat-objects').textContent = `Objets: ${this.objects.length}`;
        const wDisplay = document.getElementById('stat-width');
        if (wDisplay) wDisplay.textContent = `Trait: ${this.toolManager.currentWidth}px`;
    }

    startFPSCounter() {
        const loop = (now) => {
            this.frameCount++;
            if (now - this.lastFrameTime >= 1000) {
                this.fps = this.frameCount;
                this.frameCount = 0;
                this.lastFrameTime = now;
                document.getElementById('stat-fps').textContent = `FPS: ${this.fps}`;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    showRecognitionConfirm(original, recognized) {
        this.tempOriginalStroke = original;
        this.tempRecognizedShape = recognized;
        
        // Show temporary recognized shape on top
        const names = {
            'line': 'Ligne', 'circle': 'Cercle', 'rectangle': 'Rectangle', 
            'triangle': 'Triangle', 'arrow': 'Flèche'
        };
        
        document.getElementById('recognition-text').textContent = `${names[recognized.type] || 'Forme'} détecté(e)`;
        document.getElementById('recognition-overlay').classList.remove('hidden');
        
        // Render it
        this.canvasRenderer.renderObject(recognized);
    }
    
    applyRecognizedShape() {
        document.getElementById('recognition-overlay').classList.add('hidden');
        if (this.tempRecognizedShape) {
            this.commitShape(this.tempRecognizedShape);
        }
        this.tempOriginalStroke = null;
        this.tempRecognizedShape = null;
    }
    
    rejectRecognizedShape() {
        document.getElementById('recognition-overlay').classList.add('hidden');
        if (this.tempOriginalStroke) {
            this.commitStroke(this.tempOriginalStroke);
        }
        this.canvasRenderer.redrawAll(this.objects);
        this.tempOriginalStroke = null;
        this.tempRecognizedShape = null;
    }

    toggleSettings() {
        const panel = document.getElementById('right-panel');
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    }
    
    toggleDebug() {
        const panel = document.getElementById('debug-panel');
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => { 
    window.app = new PCApp(); 
    window.app.init(); 
});
