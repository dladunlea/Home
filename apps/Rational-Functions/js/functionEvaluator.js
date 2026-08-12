export class FunctionEvaluator {
    constructor(state) {
        this.state = state;
    }

    evaluate(x) {
        let numerator = this.state.scalingFactor;
        let denominator = 1;
        
        // X-intercepts contribute to numerator
        for (let root of this.state.xIntercepts) {
            numerator *= (x - root);
        }
        
        // Asymptotes contribute to denominator
        for (let asym of this.state.asymptotes) {
            denominator *= (x - asym);
        }
        
        // Holes contribute to both (common factors)
        for (let hole of this.state.holes) {
            numerator *= (x - hole);
            denominator *= (x - hole);
        }
        
        if (Math.abs(denominator) < 0.001) return null;
        return numerator / denominator;
    }

    calculateHoleY(hole) {
        let numerator = this.state.scalingFactor;
        let denominator = 1;
        
        // X-intercepts contribute to numerator
        for (let root of this.state.xIntercepts) {
            numerator *= (hole - root);
        }
        
        // Asymptotes contribute to denominator
        for (let asym of this.state.asymptotes) {
            denominator *= (hole - asym);
        }
        
        // Other holes (not this one) contribute to both
        for (let otherHole of this.state.holes) {
            if (otherHole !== hole) {
                numerator *= (hole - otherHole);
                denominator *= (hole - otherHole);
            }
        }
        
        return denominator !== 0 ? numerator / denominator : null;
    }
}
