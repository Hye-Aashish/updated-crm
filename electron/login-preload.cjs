const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('loginPopupAPI', {
    openLogin: () => ipcRenderer.send('login-popup-response', 'open-login'),
    dismiss: () => ipcRenderer.send('login-popup-response', 'dismiss'),
});
