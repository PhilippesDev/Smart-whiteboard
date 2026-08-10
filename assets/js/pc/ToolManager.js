window.ToolManager = class ToolManager {
    constructor() {
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.currentWidth = 3;
        this.currentOpacity = 1.0;
        this.eraserType = 'object';
        this.eraserSize = 20;
        this.mode = 'hybrid';
        this.font = {
            family: 'Inter',
            size: 32,
            bold: false,
            italic: false
        };
        this.toolChangeHandlers = [];
        this.settingsChangeHandlers = [];
    }

    setTool(tool) {
        this.currentTool = tool;
        this._notifyToolChange();
    }

    setColor(color) {
        this.currentColor = color;
        this._notifySettingsChange();
    }

    setWidth(width) {
        this.currentWidth = width;
        this._notifySettingsChange();
    }

    setMode(mode) {
        this.mode = mode;
        this._notifySettingsChange();
    }

    setEraserType(type) {
        this.eraserType = type;
        this._notifySettingsChange();
    }

    onToolChange(handler) {
        this.toolChangeHandlers.push(handler);
    }

    onSettingsChange(handler) {
        this.settingsChangeHandlers.push(handler);
    }

    getSettings() {
        return {
            tool: this.currentTool,
            color: this.currentColor,
            width: this.currentWidth,
            opacity: this.currentOpacity,
            mode: this.mode,
            eraserType: this.eraserType,
            eraserSize: this.eraserSize,
            font: this.font
        };
    }

    applyPreset(preset) {
        switch (preset) {
            case 'pen-thin':
                this.setWidth(2);
                break;
            case 'pen-thick':
                this.setWidth(5);
                break;
            case 'marker':
                this.setWidth(12);
                this.currentOpacity = 0.5;
                break;
        }
    }

    _notifyToolChange() {
        for (const h of this.toolChangeHandlers) h(this.currentTool);
    }

    _notifySettingsChange() {
        for (const h of this.settingsChangeHandlers) h(this.getSettings());
    }
};
