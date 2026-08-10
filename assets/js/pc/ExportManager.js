window.ExportManager = class ExportManager {
    constructor(canvasRenderer, app) {
        this.renderer = canvasRenderer;
        this.app = app; // For accessing objects list
    }

    exportPNG(filename = 'whiteboard.png') {
        const dataUrl = this.renderer.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
    }

    exportSVG(filename = 'whiteboard.svg') {
        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.renderer.canvas.width}" height="${this.renderer.canvas.height}" style="background-color: white;">\n`;
        
        for (const obj of this.app.objects) {
            if (obj.type === 'stroke') {
                svgContent += this.strokeToSVG(obj);
            } else if (obj.type === 'line') {
                svgContent += this.lineToSVG(obj);
            } else if (obj.type === 'circle') {
                svgContent += this.circleToSVG(obj);
            } else if (obj.type === 'rectangle') {
                svgContent += this.rectToSVG(obj);
            } else if (obj.type === 'triangle') {
                svgContent += this.triangleToSVG(obj);
            } else if (obj.type === 'arrow') {
                svgContent += this.arrowToSVG(obj);
            }
        }
        
        svgContent += `</svg>`;
        
        const blob = new Blob([svgContent], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    exportJSON(filename = 'whiteboard.json') {
        const data = {
            version: 1,
            timestamp: Date.now(),
            objects: this.app.objects
        };
        const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    async importJSON(file) {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.objects) {
            this.app.objects = data.objects;
            this.renderer.redrawAll(this.app.objects);
        }
    }

    strokeToSVG(stroke) {
        if (!stroke.points || stroke.points.length === 0) return '';
        const dpr = window.devicePixelRatio || 1;
        const cw = this.renderer.canvas.width / dpr;
        
        let d = `M ${stroke.points[0].x * cw} ${stroke.points[0].y * cw}`;
        for (let i = 1; i < stroke.points.length; i++) {
            d += ` L ${stroke.points[i].x * cw} ${stroke.points[i].y * cw}`;
        }
        return `<path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
    }

    lineToSVG(obj) {
        const cw = this.renderer.canvas.width / (window.devicePixelRatio || 1);
        return `<line x1="${obj.x1 * cw}" y1="${obj.y1 * cw}" x2="${obj.x2 * cw}" y2="${obj.y2 * cw}" stroke="${obj.color}" stroke-width="${obj.width}"/>\n`;
    }

    circleToSVG(obj) {
        const cw = this.renderer.canvas.width / (window.devicePixelRatio || 1);
        return `<circle cx="${obj.cx * cw}" cy="${obj.cy * cw}" r="${obj.radius * cw}" stroke="${obj.color}" stroke-width="${obj.width}" fill="none"/>\n`;
    }

    rectToSVG(obj) {
        const cw = this.renderer.canvas.width / (window.devicePixelRatio || 1);
        return `<rect x="${obj.x * cw}" y="${obj.y * cw}" width="${obj.width * cw}" height="${obj.height * cw}" stroke="${obj.color}" stroke-width="${obj.width}" fill="none"/>\n`;
    }
    
    triangleToSVG(obj) {
        const cw = this.renderer.canvas.width / (window.devicePixelRatio || 1);
        return `<polygon points="${obj.x1*cw},${obj.y1*cw} ${obj.x2*cw},${obj.y2*cw} ${obj.x3*cw},${obj.y3*cw}" stroke="${obj.color}" stroke-width="${obj.width}" fill="none"/>\n`;
    }
    
    arrowToSVG(obj) {
        const cw = this.renderer.canvas.width / (window.devicePixelRatio || 1);
        const x1 = obj.x1 * cw;
        const y1 = obj.y1 * cw;
        const x2 = obj.x2 * cw;
        const y2 = obj.y2 * cw;
        // Basic arrow head in SVG
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headSize = 20;
        const h1x = x2 - headSize * Math.cos(angle - Math.PI / 6);
        const h1y = y2 - headSize * Math.sin(angle - Math.PI / 6);
        const h2x = x2 - headSize * Math.cos(angle + Math.PI / 6);
        const h2y = y2 - headSize * Math.sin(angle + Math.PI / 6);
        
        return `<path d="M ${x1} ${y1} L ${x2} ${y2} L ${h1x} ${h1y} M ${x2} ${y2} L ${h2x} ${h2y}" stroke="${obj.color}" stroke-width="${obj.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
    }
};
