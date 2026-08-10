window.RectangleRecognizer = class RectangleRecognizer {
    recognize(points) {
        if (!points || points.length < 10) return null;

        // Simplify path first
        const simplified = window.ShapeRecognizer ? window.ShapeRecognizer.prototype.douglasPeucker(points, 0.05) : points;
        
        // Need roughly 4-5 points (corners + start/end overlap)
        if (simplified.length < 4 || simplified.length > 7) {
            return null;
        }

        // Check closed
        const p1 = points[0];
        const p2 = points[points.length - 1];
        
        // Bounding box for scaling
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        const maxDim = Math.max(maxX - minX, maxY - minY);
        
        const distToEnd = Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
        if (distToEnd > maxDim * 0.3) {
            return null; // Not closed enough
        }

        // Calculate confidence based on angles
        let angles = [];
        for (let i = 0; i < simplified.length - 2; i++) {
            const a = simplified[i];
            const b = simplified[i+1];
            const c = simplified[i+2];
            
            const dx1 = a.x - b.x, dy1 = a.y - b.y;
            const dx2 = c.x - b.x, dy2 = c.y - b.y;
            
            const dot = dx1*dx2 + dy1*dy2;
            const mag1 = Math.sqrt(dx1*dx1 + dy1*dy1);
            const mag2 = Math.sqrt(dx2*dx2 + dy2*dy2);
            
            if (mag1 > 0 && mag2 > 0) {
                const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1*mag2))));
                angles.push(angle * 180 / Math.PI);
            }
        }

        // A rectangle should have angles close to 90 degrees
        let rightAngleCount = 0;
        let sumError = 0;
        for (const angle of angles) {
            const error = Math.abs(angle - 90);
            if (error < 30) {
                rightAngleCount++;
                sumError += error;
            }
        }

        // Need at least 3 right angles
        if (rightAngleCount < 3) {
            return null;
        }

        const avgError = sumError / rightAngleCount;
        const confidence = 1 - (avgError / 90);

        if (confidence < 0.75) {
            return null;
        }

        // Basic AABB for now, for rotation would need min area bounding box
        return {
            type: 'rectangle',
            x: minX,
            y: minY,
            rectWidth:  maxX - minX,
            rectHeight: maxY - minY,
            rotation: 0,
            confidence: confidence
        };
    }
};
