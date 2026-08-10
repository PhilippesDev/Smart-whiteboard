window.Smoother = class Smoother {
    constructor(level = 0) {
        this.level = level;
        this.points = [];
    }

    reset() {
        this.points = [];
    }

    addPoint(x, y, pressure) {
        this.points.push({ x, y, p: pressure, t: Date.now() });
    }

    getSmoothedPoints() {
        if (this.points.length === 0) return [];
        
        if (this.level === 0 || this.points.length < 3) {
            return [...this.points];
        }

        const smoothed = [];
        const n = this.points.length;
        
        // Always keep the first point exact
        smoothed.push({ ...this.points[0] });

        if (this.level === 1) {
            // 3-point moving average
            for (let i = 1; i < n - 1; i++) {
                const prev = this.points[i - 1];
                const curr = this.points[i];
                const next = this.points[i + 1];
                smoothed.push({
                    x: (prev.x + curr.x + next.x) / 3,
                    y: (prev.y + curr.y + next.y) / 3,
                    p: (prev.p + curr.p + next.p) / 3,
                    t: curr.t
                });
            }
        } else if (this.level === 2) {
            // 5-point weighted average (1, 2, 4, 2, 1)
            for (let i = 1; i < n - 1; i++) {
                if (i < 2 || i > n - 3) {
                    smoothed.push({ ...this.points[i] }); // fallback near edges
                } else {
                    let wx = 0, wy = 0, wp = 0;
                    const weights = [1, 2, 4, 2, 1];
                    const sum = 10;
                    for (let j = -2; j <= 2; j++) {
                        const pt = this.points[i + j];
                        const w = weights[j + 2];
                        wx += pt.x * w;
                        wy += pt.y * w;
                        wp += pt.p * w;
                    }
                    smoothed.push({
                        x: wx / sum,
                        y: wy / sum,
                        p: wp / sum,
                        t: this.points[i].t
                    });
                }
            }
        } else if (this.level === 3) {
            // 7-point Gaussian-like
            for (let i = 1; i < n - 1; i++) {
                if (i < 3 || i > n - 4) {
                    smoothed.push({ ...this.points[i] });
                } else {
                    let wx = 0, wy = 0, wp = 0;
                    const weights = [1, 4, 11, 16, 11, 4, 1];
                    const sum = 48;
                    for (let j = -3; j <= 3; j++) {
                        const pt = this.points[i + j];
                        const w = weights[j + 3];
                        wx += pt.x * w;
                        wy += pt.y * w;
                        wp += pt.p * w;
                    }
                    smoothed.push({
                        x: wx / sum,
                        y: wy / sum,
                        p: wp / sum,
                        t: this.points[i].t
                    });
                }
            }
        }

        // Always keep the last point exact
        smoothed.push({ ...this.points[n - 1] });

        return smoothed;
    }
}
