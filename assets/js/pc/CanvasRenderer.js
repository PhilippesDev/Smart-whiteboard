/**
 * CanvasRenderer — rendu haute résolution du tableau blanc PC
 * Gère les coordonnées normalisées (0→1) → pixels canvas
 * Supporte: traits libres, lignes, cercles, rectangles, triangles, flèches, texte
 */
window.CanvasRenderer = class CanvasRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.activeStrokes = new Map();
        this.isDirty = true;
        this.dpr = window.devicePixelRatio || 1;

        this.setupHiDPI();
        this.startRenderLoop();
    }

    // ─── Dimensions logiques ──────────────────────────────────────────────────
    get logicalWidth()  { return this.canvas.width  / this.dpr; }
    get logicalHeight() { return this.canvas.height / this.dpr; }

    /** Convertit une coordonnée X normalisée (0–1) en pixels logiques */
    nx(x) { return x * this.logicalWidth; }
    /** Convertit une coordonnée Y normalisée (0–1) en pixels logiques */
    ny(y) { return y * this.logicalHeight; }
    /** Convertit un rayon normalisé (0–1) en pixels logiques (garde les cercles ronds) */
    nr(r) { return r * Math.min(this.logicalWidth, this.logicalHeight); }

    // ─── HiDPI & Redimensionnement ────────────────────────────────────────────
    setupHiDPI() {
        const container = this.canvas.parentElement;
        this.resize(container.clientWidth, container.clientHeight);

        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                this.resize(entry.contentRect.width, entry.contentRect.height);
            }
        });
        observer.observe(container);
    }

    resize(width, height) {
        this.dpr = window.devicePixelRatio || 1;
        this.canvas.width  = width  * this.dpr;
        this.canvas.height = height * this.dpr;
        this.canvas.style.width  = width  + 'px';
        this.canvas.style.height = height + 'px';
        this.ctx.scale(this.dpr, this.dpr);
        this.markDirty();
        if (window.app) this.redrawAll(window.app.objects);
    }

    // ─── Gestion des traits actifs ────────────────────────────────────────────
    beginStroke(id, color, width, opacity, tool) {
        this.activeStrokes.set(id, { id, color, width, opacity, tool, points: [] });
    }

    addPointsToStroke(id, points) {
        const stroke = this.activeStrokes.get(id);
        if (stroke) {
            stroke.points.push(...points);
            this.markDirty();
        }
    }

    endStroke(id) {
        const stroke = this.activeStrokes.get(id);
        this.activeStrokes.delete(id);
        this.markDirty();
        return stroke; // retourné à PCApp pour analyse
    }

    // ─── Boucle de rendu ─────────────────────────────────────────────────────
    startRenderLoop() {
        const loop = () => {
            this.render();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    render() {
        if (!this.isDirty) return;
        this.clear();

        // Objets finalisés
        if (window.app && window.app.objects) {
            for (const obj of window.app.objects) {
                this.renderObject(obj);
            }
        }
        // Traits en cours (feedback immédiat)
        for (const [, stroke] of this.activeStrokes) {
            this.renderStroke(stroke);
        }
        this.isDirty = false;
    }

    markDirty() { this.isDirty = true; }

    redrawAll(objects) {
        // PCApp appelle cette méthode après chaque modification de la liste
        this.markDirty();
    }

    // ─── Rendu des objets ─────────────────────────────────────────────────────
    renderObject(obj) {
        if (!obj) return;
        switch (obj.type) {
            case 'stroke':    this.renderStroke(obj);   break;
            case 'line':      this.renderLine(obj);     break;
            case 'circle':    this.renderCircle(obj);   break;
            case 'rectangle': this.renderRect(obj);     break;
            case 'triangle':  this.renderTriangle(obj); break;
            case 'arrow':     this.renderArrow(obj);    break;
            case 'text':      this.renderText(obj);     break;
        }
    }

    renderStroke(stroke) {
        if (!stroke.points || stroke.points.length < 2) return;

        this.ctx.save();
        this.ctx.globalAlpha  = stroke.opacity || 1.0;
        this.ctx.strokeStyle  = stroke.color || '#000000';
        this.ctx.lineWidth    = stroke.width  || 3;
        this.ctx.lineCap      = 'round';
        this.ctx.lineJoin     = 'round';

        if (stroke.tool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
        }

        this.ctx.beginPath();
        this.ctx.moveTo(this.nx(stroke.points[0].x), this.ny(stroke.points[0].y));
        for (let i = 1; i < stroke.points.length; i++) {
            // Catmull-Rom smooth interpolation pour traits fluides
            if (i < stroke.points.length - 1) {
                const xc = (stroke.points[i].x + stroke.points[i+1].x) / 2;
                const yc = (stroke.points[i].y + stroke.points[i+1].y) / 2;
                this.ctx.quadraticCurveTo(
                    this.nx(stroke.points[i].x), this.ny(stroke.points[i].y),
                    this.nx(xc), this.ny(yc)
                );
            } else {
                this.ctx.lineTo(this.nx(stroke.points[i].x), this.ny(stroke.points[i].y));
            }
        }
        this.ctx.stroke();
        this.ctx.restore();
    }

    renderLine(obj) {
        this.ctx.save();
        this.ctx.strokeStyle = obj.color || '#000000';
        this.ctx.lineWidth   = obj.strokeWidth || obj.width || 3;
        this.ctx.lineCap     = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(this.nx(obj.x1), this.ny(obj.y1));
        this.ctx.lineTo(this.nx(obj.x2), this.ny(obj.y2));
        this.ctx.stroke();
        this.ctx.restore();
    }

    renderCircle(obj) {
        this.ctx.save();
        this.ctx.strokeStyle = obj.color || '#000000';
        this.ctx.lineWidth   = obj.strokeWidth || obj.width || 3;
        this.ctx.beginPath();
        // Utilise this.nr() pour conserver la circularité indépendamment du ratio
        this.ctx.arc(
            this.nx(obj.cx),
            this.ny(obj.cy),
            this.nr(obj.radius),
            0, Math.PI * 2
        );
        this.ctx.stroke();
        this.ctx.restore();
    }

    renderRect(obj) {
        const x = this.nx(obj.x);
        const y = this.ny(obj.y);
        const w = this.nx(obj.rectWidth  || obj.rw || 0.1);
        const h = this.ny(obj.rectHeight || obj.rh || 0.1);

        this.ctx.save();
        this.ctx.strokeStyle = obj.color || '#000000';
        this.ctx.lineWidth   = obj.strokeWidth || 3;
        this.ctx.lineCap     = 'square';

        if (obj.rotation) {
            this.ctx.translate(x + w / 2, y + h / 2);
            this.ctx.rotate(obj.rotation);
            this.ctx.strokeRect(-w / 2, -h / 2, w, h);
        } else {
            this.ctx.strokeRect(x, y, w, h);
        }
        this.ctx.restore();
    }

    renderTriangle(obj) {
        this.ctx.save();
        this.ctx.strokeStyle = obj.color || '#000000';
        this.ctx.lineWidth   = obj.strokeWidth || obj.width || 3;
        this.ctx.lineCap     = 'round';
        this.ctx.lineJoin    = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(this.nx(obj.x1), this.ny(obj.y1));
        this.ctx.lineTo(this.nx(obj.x2), this.ny(obj.y2));
        this.ctx.lineTo(this.nx(obj.x3), this.ny(obj.y3));
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();
    }

    renderArrow(obj) {
        const x1 = this.nx(obj.x1), y1 = this.ny(obj.y1);
        const x2 = this.nx(obj.x2), y2 = this.ny(obj.y2);

        this.ctx.save();
        this.ctx.strokeStyle = obj.color || '#000000';
        this.ctx.lineWidth   = obj.strokeWidth || obj.width || 3;
        this.ctx.lineCap     = 'round';
        this.ctx.lineJoin    = 'round';

        // Corps de la flèche
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);

        // Tête de flèche
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headSize = obj.headSize || Math.max(15, (obj.strokeWidth || 3) * 4);
        this.ctx.lineTo(
            x2 - headSize * Math.cos(angle - Math.PI / 6),
            y2 - headSize * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(
            x2 - headSize * Math.cos(angle + Math.PI / 6),
            y2 - headSize * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();
        this.ctx.restore();
    }

    renderText(obj) {
        this.ctx.save();
        this.ctx.fillStyle   = obj.color || '#000000';
        const bold   = obj.bold   ? 'bold '   : '';
        const italic = obj.italic ? 'italic ' : '';
        this.ctx.font          = `${italic}${bold}${obj.fontSize || 32}px ${obj.fontFamily || 'Inter, Arial, sans-serif'}`;
        this.ctx.textBaseline  = 'top';
        this.ctx.fillText(obj.value || '', this.nx(obj.x), this.ny(obj.y));
        this.ctx.restore();
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────
    clear() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
    }

    /** Convertit des coordonnées normalisées en pixels logiques */
    normalizedToCanvas(x, y) {
        return { x: this.nx(x), y: this.ny(y) };
    }

    toDataURL(format = 'image/png') {
        return this.canvas.toDataURL(format);
    }

    toBlob(format = 'image/png') {
        return new Promise(resolve => this.canvas.toBlob(resolve, format));
    }
};
