window.LineRecognizer = class LineRecognizer {
    recognize(points) {
        if (!points || points.length < 2) return null;

        // Linear regression
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
        const n = points.length;

        for (const p of points) {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumXX += p.x * p.x;
            sumYY += p.y * p.y;
        }

        const meanX = sumX / n;
        const meanY = sumY / n;

        // Calculate slope (m) and intercept (b)
        const denominator = sumXX - n * meanX * meanX;
        
        let isVertical = false;
        let m, b;
        let rSquared = 0;

        if (Math.abs(denominator) < 1e-10) {
            isVertical = true;
        } else {
            m = (sumXY - n * meanX * meanY) / denominator;
            b = meanY - m * meanX;
            
            // Calculate R^2 (confidence)
            let ssTot = 0, ssRes = 0;
            for (const p of points) {
                ssTot += (p.y - meanY) ** 2;
                const expectedY = m * p.x + b;
                ssRes += (p.y - expectedY) ** 2;
            }
            if (ssTot > 0) {
                rSquared = 1 - (ssRes / ssTot);
            } else {
                rSquared = 1;
            }
        }

        // Special case for nearly vertical lines where R^2 from y = mx+b fails
        let rSquaredX = 0;
        const denominatorY = sumYY - n * meanY * meanY;
        if (Math.abs(denominatorY) >= 1e-10) {
            const mX = (sumXY - n * meanX * meanY) / denominatorY;
            const bX = meanX - mX * meanY;
            
            let ssTotX = 0, ssResX = 0;
            for (const p of points) {
                ssTotX += (p.x - meanX) ** 2;
                const expectedX = mX * p.y + bX;
                ssResX += (p.x - expectedX) ** 2;
            }
            if (ssTotX > 0) {
                rSquaredX = 1 - (ssResX / ssTotX);
            } else {
                rSquaredX = 1;
            }
        }

        const confidence = Math.max(rSquared, rSquaredX);

        if (confidence < 0.80) {
            return null;
        }

        // Find endpoints by projecting first and last points onto the line
        const p1 = points[0];
        const p2 = points[points.length - 1];
        
        let proj1, proj2;
        if (isVertical || confidence === rSquaredX && rSquaredX > rSquared) {
            // Use x = mX * y + bX
            const mX = (sumXY - n * meanX * meanY) / denominatorY;
            const bX = meanX - mX * meanY;
            
            // Simplified projection for vertical-ish lines
            proj1 = { x: mX * p1.y + bX, y: p1.y };
            proj2 = { x: mX * p2.y + bX, y: p2.y };
        } else {
            // Project (xp, yp) onto y = mx + b
            const projectPoint = (p) => {
                const x = (p.x + m * p.y - m * b) / (1 + m * m);
                const y = m * x + b;
                return {x, y};
            };
            proj1 = projectPoint(p1);
            proj2 = projectPoint(p2);
        }

        return {
            type: 'line',
            x1: proj1.x,
            y1: proj1.y,
            x2: proj2.x,
            y2: proj2.y,
            confidence: confidence
        };
    }
};
