window.HandwritingRecognizer = class HandwritingRecognizer {
    constructor(config = {}) {
        this.config = config;
    }
    
    async recognize(strokes) {
        // Stub implementation as requested
        return null;
    }
    
    isAvailable() {
        return false;
    }
    
    getEngineName() {
        return "stub";
    }
};
