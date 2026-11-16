const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('breakPopupAPI', {
    startBreak: () => ipcRenderer.send('break-popup-response', 'start-break'),
    stillWorking: () => ipcRenderer.send('break-popup-response', 'still-working'),
});
