export class FeatureManager {
    constructor(state, config) {
        this.state = state;
        this.config = config;
    }

    addXIntercept() {
        const newRoot = this.generateRandomPosition();
        this.state.addXIntercept(newRoot);
    }

    addAsymptote() {
        const newAsym = this.generateRandomPosition();
        this.state.addAsymptote(newAsym);
    }

    addHole() {
        const newHole = this.generateRandomPosition();
        this.state.addHole(newHole);
    }

    deleteFactor(type, value) {
        this.state.deleteFeature(type, value);
    }

    generateRandomPosition() {
        return Math.floor(Math.random() * 8) - 4;
    }
}