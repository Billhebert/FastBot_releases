const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startRecording: (device) => ipcRenderer.invoke('start-recording', device),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  executeMacro: (config) => ipcRenderer.invoke('execute-macro', config),
  warmupProfile: (config) => ipcRenderer.invoke('warmup-profile', config),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback)
});