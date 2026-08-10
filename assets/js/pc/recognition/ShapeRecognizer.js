window.ShapeRecognizer = class ShapeRecognizer {
    constructor(config = {}) {
        this.config = Object.assign({
            confidenceThreshold: 0.85,
            autoApplyThreshold: 0.92
        }, config);

        this.recognizers = {
            line: new window.LineRecognizer(),
            circle: new window.CircleRecognizer(),
            rectangle: new window.RectangleRecognizer(),
            triangle: new window.TriangleRecognizer(),
            arrow: new window.ArrowRecognizer()
        };
    }

    async recognize(points, mode) {
        if (mode === 'raw' || !points || points.length < 5) {
            return null;
        }

        const resampled = this.resamplePoints(points, 50);

        let bestResult = null;
        
        const results = [
            this.recognizers.line.recognize(resampled),
            this.recognizers.circle.recognize(resampled),
            this.recognizers.rectangle.recognize(resampled),
            this.recognizers.triangle.recognize(resampled),
            this.recognizers.arrow.recognize(resampled)
        ];

        for (const res of results) {
            if (res && res.confidence >= this.config.confidenceThreshold) {
                if (!bestResult || res.confidence > bestResult.confidence) {
                    bestResult = res;
                }
            }
        }

        return bestResult;
    }

    resamplePoints(inputPoints, targetCount) {
        if (!inputPoints || inputPoints.length <= 1) return inputPoints || [];
        // Copie défensive - ne pas muter le tableau original
        const points = inputPoints.slice();
        
        let pathLength = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i-1].x;
            const dy = points[i].y - points[i-1].y;
            pathLength += Math.sqrt(dx*dx + dy*dy);
        }
        if (pathLength === 0) return points.slice(0, targetCount);

        const interval = pathLength / (targetCount - 1);
        const resampled = [points[0]];
        let accumulated = 0;
        let j = 1;

        while (resampled.length < targetCount && j < points.length) {
            const p1 = points[j-1];
            const p2 = points[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx*dx + dy*dy);

            if (accumulated + segLen >= interval) {
                const ratio = (interval - accumulated) / segLen;
                const nx = p1.x + ratio * dx;
                const ny = p1.y + ratio * dy;
                resampled.push({ x: nx, y: ny });
                // Insère le point et reprend depuis là (sans muter l'original)
                points.splice(j, 0, { x: nx, y: ny });
                accumulated = 0;
                j++;
            } else {
                accumulated += segLen;
                j++;
            }
        }

        if (resampled.length < targetCount) {
            resampled.push(points[points.length - 1]);
        }
        return resampled;
    }

    douglasPeucker(points, epsilon) {
        if (points.length <= 2) return points;

        let dmax = 0;
        let index = 0;
        const end = points.length - 1;

        for (let i = 1; i < end; i++) {
            const d = this.perpendicularDistance(points[i], points[0], points[end]);
            if (d > dmax) {
                index = i;
                dmax = d;
            }
        }

        if (dmax > epsilon) {
            const recResults1 = this.douglasPeucker(points.slice(0, index + 1), epsilon);
            const recResults2 = this.douglasPeucker(points.slice(index), epsilon);
            return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
        } else {
            return [points[0], points[end]];
        }
    }

    perpendicularDistance(p, p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const l2 = dx*dx + dy*dy;
        if (l2 === 0) return Math.sqrt((p.x - p1.x)**2 + (p.y - p1.y)**2);
        
        let t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        return Math.sqrt((p.x - projX)**2 + (p.y - projY)**2);
    }
};
