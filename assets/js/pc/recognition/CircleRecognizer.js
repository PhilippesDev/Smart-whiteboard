window.CircleRecognizer = class CircleRecognizer {
    recognize(points) {
        if (!points || points.length < 5) return null;

        // Check if closed
        const p1 = points[0];
        const p2 = points[points.length - 1];
        const distToEnd = Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
        
        // Find bounding box to normalize scale check
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        
        const width = maxX - minX;
        const height = maxY - minY;
        const maxDim = Math.max(width, height);
        
        // If not fairly closed, reject
        if (distToEnd > maxDim * 0.3) {
            return null;
        }

        // Aspect ratio must be close to 1 for a circle (ellipses might fail this)
        const aspectRatio = width / height;
        if (aspectRatio < 0.6 || aspectRatio > 1.6) {
            return null; // Too elliptical
        }

        // Algebraic circle fit (simple least squares method)
        // x^2 + y^2 + ax + by + c = 0
        // We want to minimize sum of (x_i^2 + y_i^2 + a x_i + b y_i + c)^2
        // Linear system:
        // a*Sum(x^2) + b*Sum(x*y) + c*Sum(x) = -Sum(x*(x^2+y^2))
        // a*Sum(x*y) + b*Sum(y^2) + c*Sum(y) = -Sum(y*(x^2+y^2))
        // a*Sum(x) + b*Sum(y) + c*n = -Sum(x^2+y^2)
        
        let sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
        let sumXXX = 0, sumYYY = 0, sumXYY = 0, sumXXY = 0;
        const n = points.length;

        for (const p of points) {
            const x = p.x;
            const y = p.y;
            const x2 = x * x;
            const y2 = y * y;
            
            sumX += x;
            sumY += y;
            sumXX += x2;
            sumYY += y2;
            sumXY += x * y;
            sumXXX += x2 * x;
            sumYYY += y2 * y;
            sumXYY += x * y2;
            sumXXY += x2 * y;
        }

        // Solve 3x3 system using Cramer's rule or similar
        // A * [a, b, c]^T = B
        const A11 = sumXX, A12 = sumXY, A13 = sumX;
        const A21 = sumXY, A22 = sumYY, A23 = sumY;
        const A31 = sumX,  A32 = sumY,  A33 = n;

        const B1 = -(sumXXX + sumXYY);
        const B2 = -(sumXXY + sumYYY);
        const B3 = -(sumXX + sumYY);

        // Determinant of A
        const detA = A11*(A22*A33 - A23*A32) - A12*(A21*A33 - A23*A31) + A13*(A21*A32 - A22*A31);
        
        if (Math.abs(detA) < 1e-10) return null;

        const detA_a = B1*(A22*A33 - A23*A32) - A12*(B2*A33 - A23*B3) + A13*(B2*A32 - A22*B3);
        const detA_b = A11*(B2*A33 - A23*B3) - B1*(A21*A33 - A23*A31) + A13*(A21*B3 - B2*A31);
        const detA_c = A11*(A22*B3 - B2*A32) - A12*(A21*B3 - B2*A31) + B1*(A21*A32 - A22*A31);

        const a = detA_a / detA;
        const b = detA_b / detA;
        const c = detA_c / detA;

        // Center and radius
        const cx = -a / 2;
        const cy = -b / 2;
        const rSq = cx*cx + cy*cy - c;
        
        if (rSq <= 0) return null;
        const radius = Math.sqrt(rSq);

        // Calculate confidence
        let sumDeviation = 0;
        for (const p of points) {
            const dist = Math.sqrt((p.x - cx)**2 + (p.y - cy)**2);
            sumDeviation += Math.abs(dist - radius);
        }
        
        const meanDeviation = sumDeviation / n;
        const confidence = 1 - (meanDeviation / radius);

        if (confidence < 0.75) {
            return null;
        }

        return {
            type: 'circle',
            cx: cx,
            cy: cy,
            radius: radius,
            confidence: confidence
        };
    }
};
