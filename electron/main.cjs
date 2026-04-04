const { app, BrowserWindow, desktopCapturer, ipcMain, powerMonitor, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
        title: 'Nexprism CRM - Employee Monitor',
        icon: path.join(__dirname, '..', 'public', 'vite.svg'),
        autoHideMenuBar: true // Hide by default, show on Alt
    });

    // Create a minimal menu
    const template = [
        {
            label: 'App',
            submenu: [
                { role: 'reload', label: 'Refresh' },
                { type: 'separator' },
                { role: 'quit', label: 'Exit Application' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        }
    ];

    if (!app.isPackaged) {
        template.push({
            label: 'Debug',
            submenu: [
                { role: 'toggleDevTools' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    const isPackaged = app.isPackaged;
    if (isPackaged) {
        // Correct path for packaged application
        const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
        mainWindow.loadFile(indexPath);
    } else {
        const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
        mainWindow.loadURL(startUrl);
    }

    // Always open DevTools for debugging packaged build (temp fix for white screen)
    // mainWindow.webContents.openDevTools();

    // Check system idle time every 10 seconds
    setInterval(() => {
        const idleTime = powerMonitor.getSystemIdleTime();
        if (idleTime >= 300) { // 300 seconds = 5 minutes
            mainWindow.webContents.send('system-idle', idleTime);
        }
    }, 10000);
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handler to get screen sources
ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
    return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
    }));
});

ipcMain.on('tracking-start', (event, userData) => {
    console.log(`[MONITOR] Starting tracking for ${userData.email}`);
});
