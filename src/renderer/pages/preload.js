const path = require('path');
const { ipcRenderer } = require('electron');

const appVersion = (() => {
  try {
    const pkg = require(path.resolve(__dirname, '../../../package.json'));
    return pkg.version || '0.0.0';
  } catch (error) {
    console.warn('Unable to load app version:', error.message);
    return '0.0.0';
  }
})();

window.electronAPI = {
  startRecording: (options) => ipcRenderer.invoke('start-recording', options),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  executeMacro: (config) => ipcRenderer.invoke('execute-macro', config),
  warmupProfile: (config) => ipcRenderer.invoke('warmup-profile', config),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  windowControls: {
    minimize: () => ipcRenderer.invoke('window-control', 'minimize'),
    maximize: () => ipcRenderer.invoke('window-control', 'maximize'),
    close: () => ipcRenderer.invoke('window-control', 'close')
  },
  mobileShell: {
    create: (options) => ipcRenderer.invoke('mobile-shell:create', options),
    load: ({ id, url }) => ipcRenderer.invoke('mobile-shell:load', { id, url }),
    show: (id) => ipcRenderer.invoke('mobile-shell:show', id),
    focus: (id) => ipcRenderer.invoke('mobile-shell:focus', id),
    close: (id) => ipcRenderer.invoke('mobile-shell:close', id)
  },
  browserGrid: {
    open: (config) => ipcRenderer.invoke('open-browser-grid', config),
    getHTML: (config) => ipcRenderer.invoke('get-browser-html', config),
    executeAction: (config) => ipcRenderer.invoke('execute-llm-action', config),
    close: (config) => ipcRenderer.invoke('close-browser', config),
    getStatus: () => ipcRenderer.invoke('get-grid-status')
  }
};

window.fastbotVersion = appVersion;
