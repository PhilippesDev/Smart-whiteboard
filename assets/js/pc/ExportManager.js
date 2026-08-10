/**
 * ExportManager — export PNG, SVG, JSON du tableau blanc
 * Coordonnées normalisées (0→1) converties vers pixels logiques
 * en respectant width/height séparément (même logique que CanvasRenderer)
 */
window.ExportManager = class ExportManager {
    constructor(canvasRenderer, app) {
        this.renderer = canvasRenderer;
        this.app = app;
    }

    // ─── Dimensions logiques ──────────────────────────────────────────────────
    get cw() { return this.renderer.logicalWidth; }
    get ch() { return this.renderer.logicalHeight; }
    nx(x)    { return x * this.cw; }
    ny(y)    { return y * this.ch; }
    nr(r)    { return r * Math.min(this.cw, this.ch); }

    // ─── PNG ──────────────────────────────────────────────────────────────────
    exportPNG(filename = 'whiteboard.png') {
        const dataUrl = this.renderer.toDataURL('image/png');
        this._download(dataUrl, filename);
    }

    // ─── SVG ──────────────────────────────────────────────────────────────────
    exportSVG(filename = 'whiteboard.svg') {
        const w = this.cw;
        const h = this.ch;
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="background-color:white;">\n`;

        for (const obj of this.app.objects) {
            switch (obj.type) {
                case 'stroke':    svg += this.strokeToSVG(obj);    break;
                case 'line':      svg += this.lineToSVG(obj);      break;
                case 'circle':    svg += this.circleToSVG(obj);    break;
                case 'rectangle': svg += this.rectToSVG(obj);      break;
                case 'triangle':  svg += this.triangleToSVG(obj);  break;
                case 'arrow':     svg += this.arrowToSVG(obj);     break;
                case 'text':      svg += this.textToSVG(obj);      break;
            }
        }

        svg += `</svg>`;
        this._downloadBlob(svg, 'image/svg+xml', filename);
    }

    // ─── JSON ─────────────────────────────────────────────────────────────────
    exportJSON(filename = 'whiteboard.json') {
        const data = { version: 1, timestamp: Date.now(), objects: this.app.objects };
        this._downloadBlob(JSON.stringify(data, null, 2), 'application/json', filename);
    }

    async importJSON(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (Array.isArray(data.objects)) {
                this.app.objects = data.objects;
                this.renderer.redrawAll(this.app.objects);
            }
        } catch (e) {
            alert('Erreur lors de l\'import : ' + e.message);
        }
    }

    // ─── Convertisseurs SVG ───────────────────────────────────────────────────
    strokeToSVG(stroke) {
        if (!stroke.points || stroke.points.length < 2) return '';
        let d = `M ${this.nx(stroke.points[0].x).toFixed(2)} ${this.ny(stroke.points[0].y).toFixed(2)}`;
        for (let i = 1; i < stroke.points.length; i++) {
            d += ` L ${this.nx(stroke.points[i].x).toFixed(2)} ${this.ny(stroke.points[i].y).toFixed(2)}`;
        }
        const op = stroke.opacity != null ? ` opacity="${stroke.opacity}"` : '';
        return `<path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"${op}/>\n`;
    }

    lineToSVG(obj) {
        const sw = obj.strokeWidth || obj.width || 3;
        return `<line x1="${this.nx(obj.x1).toFixed(2)}" y1="${this.ny(obj.y1).toFixed(2)}" x2="${this.nx(obj.x2).toFixed(2)}" y2="${this.ny(obj.y2).toFixed(2)}" stroke="${obj.color}" stroke-width="${sw}" stroke-linecap="round"/>\n`;
    }

    circleToSVG(obj) {
        const sw = obj.strokeWidth || obj.width || 3;
        return `<circle cx="${this.nx(obj.cx).toFixed(2)}" cy="${this.ny(obj.cy).toFixed(2)}" r="${this.nr(obj.radius).toFixed(2)}" stroke="${obj.color}" stroke-width="${sw}" fill="none"/>\n`;
    }

    rectToSVG(obj) {
        const sw = obj.strokeWidth || 3;
        // rectWidth/rectHeight sont les dimensions du rectangle (≠ épaisseur du trait)
        const rw = this.nx(obj.rectWidth  || obj.rw || 0.1);
        const rh = this.ny(obj.rectHeight || obj.rh || 0.1);
        const x  = this.nx(obj.x);
        const y  = this.ny(obj.y);

        if (obj.rotation) {
            const cx = x + rw / 2;
            const cy = y + rh / 2;
            const deg = (obj.rotation * 180 / Math.PI).toFixed(2);
            return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${rw.toFixed(2)}" height="${rh.toFixed(2)}" stroke="${obj.color}" stroke-width="${sw}" fill="none" transform="rotate(${deg},${cx.toFixed(2)},${cy.toFixed(2)})"/>\n`;
        }
        return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${rw.toFixed(2)}" height="${rh.toFixed(2)}" stroke="${obj.color}" stroke-width="${sw}" fill="none"/>\n`;
    }

    triangleToSVG(obj) {
        const sw = obj.strokeWidth || obj.width || 3;
        const pts = [
            `${this.nx(obj.x1).toFixed(2)},${this.ny(obj.y1).toFixed(2)}`,
            `${this.nx(obj.x2).toFixed(2)},${this.ny(obj.y2).toFixed(2)}`,
            `${this.nx(obj.x3).toFixed(2)},${this.ny(obj.y3).toFixed(2)}`
        ].join(' ');
        return `<polygon points="${pts}" stroke="${obj.color}" stroke-width="${sw}" fill="none" stroke-linejoin="round"/>\n`;
    }

    arrowToSVG(obj) {
        const sw = obj.strokeWidth || obj.width || 3;
        const x1 = this.nx(obj.x1); const y1 = this.ny(obj.y1);
        const x2 = this.nx(obj.x2); const y2 = this.ny(obj.y2);

        const angle    = Math.atan2(y2 - y1, x2 - x1);
        const headSize = obj.headSize || Math.max(15, sw * 4);
        const h1x = (x2 - headSize * Math.cos(angle - Math.PI / 6)).toFixed(2);
        const h1y = (y2 - headSize * Math.sin(angle - Math.PI / 6)).toFixed(2);
        const h2x = (x2 - headSize * Math.cos(angle + Math.PI / 6)).toFixed(2);
        const h2y = (y2 - headSize * Math.sin(angle + Math.PI / 6)).toFixed(2);

        return `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} L ${h1x} ${h1y} M ${x2.toFixed(2)} ${y2.toFixed(2)} L ${h2x} ${h2y}" stroke="${obj.color}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
    }

    textToSVG(obj) {
        const bold   = obj.bold   ? 'bold '   : '';
        const italic = obj.italic ? 'italic ' : '';
        return `<text x="${this.nx(obj.x).toFixed(2)}" y="${this.ny(obj.y).toFixed(2)}" font-family="${obj.fontFamily || 'Inter, Arial, sans-serif'}" font-size="${obj.fontSize || 32}" font-weight="${bold.trim() || 'normal'}" font-style="${italic.trim() || 'normal'}" fill="${obj.color}">${this._escapeXml(obj.value || '')}</text>\n`;
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────
    _escapeXml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    _download(dataUrl, filename) {
        const a = document.createElement('a');
        a.download = filename;
        a.href = dataUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    _downloadBlob(content, mimeType, filename) {
        const blob = new Blob([content], { type: mimeType });
        const url  = URL.createObjectURL(blob);
        this._download(url, filename);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
};
