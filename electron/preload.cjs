const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    getSources: () => ipcRenderer.invoke('get-sources'),
    startTracking: (userData) => ipcRenderer.send('tracking-start', userData),
    stopTracking: () => ipcRenderer.send('tracking-stop'),
    onSystemIdle: (callback) => ipcRenderer.on('system-idle', (event, idleTime) => callback(idleTime))
});
