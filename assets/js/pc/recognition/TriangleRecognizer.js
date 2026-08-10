window.TriangleRecognizer = class TriangleRecognizer {
    recognize(points) {
        if (!points || points.length < 5) return null;

        const maxDim = this.getMaxDim(points);
        const epsilon = maxDim * 0.08; 
        
        // RDP Simplification
        const simplified = window.ShapeRecognizer ? window.ShapeRecognizer.prototype.douglasPeucker(points, epsilon) : points;
        
        // A triangle should simplify to ~3-4 points (start, 2 corners, end near start)
        if (simplified.length < 3 || simplified.length > 5) {
            return null;
        }

        // Check if path is closed
        const p1 = points[0];
        const p2 = points[points.length - 1];
        const distToEnd = Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
        
        if (distToEnd > maxDim * 0.3) {
            return null;
        }

        // Find the 3 most significant vertices
        // We know simplified[0] and simplified[end] are near each other.
        let vertices = [];
        if (simplified.length === 4) {
            vertices = [simplified[0], simplified[1], simplified[2]];
        } else if (simplified.length === 5) {
            // Need to drop one point that's least significant
            vertices = [simplified[0], simplified[1], simplified[2], simplified[3]];
            vertices.pop(); // Simplification for now
        } else {
            vertices = [simplified[0], simplified[1], simplified[2]];
        }

        if (vertices.length < 3) return null;

        // Confidence: how well do the original points fit the 3 segments?
        let sumDist = 0;
        for (const p of points) {
            const d1 = this.distToSegment(p, vertices[0], vertices[1]);
            const d2 = this.distToSegment(p, vertices[1], vertices[2]);
            const d3 = this.distToSegment(p, vertices[2], vertices[0]);
            sumDist += Math.min(d1, d2, d3);
        }

        const avgDist = sumDist / points.length;
        const confidence = Math.max(0, 1 - (avgDist / (maxDim * 0.1)));

        if (confidence < 0.75) return null;

        return {
            type: 'triangle',
            x1: vertices[0].x,
            y1: vertices[0].y,
            x2: vertices[1].x,
            y2: vertices[1].y,
            x3: vertices[2].x,
            y3: vertices[2].y,
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

    distToSegment(p, v, w) {
        const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
        if (l2 === 0) return Math.sqrt((p.x - v.x)**2 + (p.y - v.y)**2);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = v.x + t * (w.x - v.x);
        const projY = v.y + t * (w.y - v.y);
        return Math.sqrt((p.x - projX)**2 + (p.y - projY)**2);
    }
};
