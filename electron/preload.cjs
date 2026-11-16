const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    getSources: () => ipcRenderer.invoke('get-sources'),
    startTracking: (userData) => ipcRenderer.send('tracking-start', userData),
    stopTracking: () => ipcRenderer.send('tracking-stop'),
    onSystemIdle: (callback) => {
        const handler = (_event, idleTime) => callback(idleTime);
        ipcRenderer.on('system-idle', handler);
        return () => ipcRenderer.removeListener('system-idle', handler);
    },
    onBreakPrompt: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('break-prompt', handler);
        return () => ipcRenderer.removeListener('break-prompt', handler);
    },
    onBreakAction: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('break-action', handler);
        return () => ipcRenderer.removeListener('break-action', handler);
    },
    onOpenLogin: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('open-login', handler);
        return () => ipcRenderer.removeListener('open-login', handler);
    },
    syncBreakState: (payload) => ipcRenderer.send('break-state-sync', payload),
    syncAuthState: (payload) => ipcRenderer.send('auth-state-sync', payload),
    openInstallFolder: () => ipcRenderer.invoke('open-install-folder'),
    requestNotificationPermission: () => ipcRenderer.invoke('notification-permission'),
    showDesktopNotification: (payload) => ipcRenderer.invoke('show-desktop-notification', payload),
});
