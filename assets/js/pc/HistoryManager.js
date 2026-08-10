window.HistoryManager = class HistoryManager {
    constructor(maxHistory = 100) {
        this.maxHistory = maxHistory;
        this.undoStack = [];
        this.redoStack = [];
    }

    push(action) {
        this.undoStack.push(action);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo on new action
    }

    undo() {
        if (!this.canUndo()) return null;
        const action = this.undoStack.pop();
        this.redoStack.push(action);
        return action;
    }

    redo() {
        if (!this.canRedo()) return null;
        const action = this.redoStack.pop();
        this.undoStack.push(action);
        return action;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    getHistoryLength() {
        return this.undoStack.length;
    }

    getRedoLength() {
        return this.redoStack.length;
    }
};
