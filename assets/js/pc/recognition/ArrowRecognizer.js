window.ArrowRecognizer = class ArrowRecognizer {
    recognize(points) {
        if (!points || points.length < 10) return null;
        
        // Simplification helps identify the long line and the head
        const epsilon = this.getMaxDim(points) * 0.05;
        const simplified = window.ShapeRecognizer ? window.ShapeRecognizer.prototype.douglasPeucker(points, epsilon) : points;
        
        // Arrow typically has 3-5 segments (long line, then sharp turn for head, maybe back)
        if (simplified.length < 3) return null;

        // Heuristic: start point and end point should not be close
        const pStart = points[0];
        const pEnd = points[points.length - 1];
        const totalDist = Math.sqrt((pStart.x - pEnd.x)**2 + (pStart.y - pEnd.y)**2);
        
        if (totalDist < this.getMaxDim(points) * 0.5) {
            return null; // Too closed, likely not an arrow
        }

        // Just basic detection: return a generic arrow from start to end
        // if it passed the RDP and open curve tests.
        // The head will be generated in renderer.
        
        // We assume high confidence if it's open and has > 2 segments but < 6
        let confidence = 0.8;
        if (simplified.length > 2 && simplified.length < 6) {
            confidence = 0.9;
        } else {
            return null;
        }

        return {
            type: 'arrow',
            x1: pStart.x,
            y1: pStart.y,
            x2: pEnd.x,
            y2: pEnd.y,
            headSize: 20, // default head size for renderer
            confidence: confidence
        };
    }

    getMaxDim(points) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return Math.max(maxX - minX, maxY - minY);
    }
};
