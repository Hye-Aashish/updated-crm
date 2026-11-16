const {
    app, BrowserWindow, desktopCapturer, ipcMain, powerMonitor, Menu, dialog, shell,
    Notification, screen, Tray, nativeImage
} = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let breakPopupWindow = null;
let loginPopupWindow = null;
let tray = null;
let isQuitting = false;

let isOnBreak = false;
let breakPromptOpen = false;
let lastIdlePromptAt = 0;

let isLoggedIn = false;
let loginPromptOpen = false;
let lastLoginPromptAt = 0;

const IDLE_SECONDS = 300;
const IDLE_PROMPT_COOLDOWN_MS = 60 * 1000;
const LOGIN_NUDGE_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
const LOGIN_NUDGE_FIRST_DELAY_MS = 8 * 1000;

function resolveLocalIndex() {
    const candidates = [
        path.join(app.getAppPath(), 'dist', 'index.html'),
        path.join(__dirname, '..', 'dist', 'index.html'),
        path.join(process.resourcesPath || '', 'app.asar.unpacked', 'dist', 'index.html'),
    ];
    for (const p of candidates) {
        try {
            if (p && fs.existsSync(p)) return p;
        } catch (_) { /* ignore */ }
    }
    return candidates[0];
}

function authStatusPath() {
    return path.join(app.getPath('userData'), 'auth-status.json');
}

function readAuthStatus() {
    try {
        const raw = fs.readFileSync(authStatusPath(), 'utf8');
        const data = JSON.parse(raw);
        return { loggedIn: !!data.loggedIn, email: data.email || null, name: data.name || null };
    } catch {
        return { loggedIn: false, email: null, name: null };
    }
}

function writeAuthStatus(status) {
    try {
        fs.writeFileSync(authStatusPath(), JSON.stringify({
            loggedIn: !!status.loggedIn,
            email: status.email || null,
            name: status.name || null,
            updatedAt: new Date().toISOString(),
        }, null, 2));
    } catch (err) {
        console.warn('[AUTH] Failed to persist status:', err?.message || err);
    }
}

function notifyMain(channel, payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, payload);
    }
}

function getCornerPosition(winW, winH) {
    const display = screen.getPrimaryDisplay();
    const area = display.workArea || display.bounds;
    return {
        x: Math.round(area.x + area.width - winW - 16),
        y: Math.round(area.y + area.height - winH - 16),
    };
}

function closeBreakPopup() {
    breakPromptOpen = false;
    if (breakPopupWindow && !breakPopupWindow.isDestroyed()) breakPopupWindow.close();
    breakPopupWindow = null;
}

function closeLoginPopup() {
    loginPromptOpen = false;
    if (loginPopupWindow && !loginPopupWindow.isDestroyed()) loginPopupWindow.close();
    loginPopupWindow = null;
}

function showBreakNativeToast() {
    try {
        if (!Notification.isSupported()) return;
        const n = new Notification({
            title: 'Taking a short break?',
            body: 'Update your Nexprism status so your team knows if you’re available.',
            urgency: 'critical',
            silent: false,
        });
        n.on('click', () => showBreakPopup());
        n.show();
    } catch (err) {
        console.warn('[BREAK] Notification failed:', err?.message || err);
    }
}

function showLoginNativeToast() {
    try {
        if (!Notification.isSupported()) return;
        const n = new Notification({
            title: 'Sign in to Nexprism',
            body: 'Open your company workspace to continue with projects and tasks.',
            urgency: 'normal',
            silent: false,
        });
        n.on('click', () => openMainToLogin());
        n.show();
    } catch (err) {
        console.warn('[LOGIN] Notification failed:', err?.message || err);
    }
}

function showBreakPopup() {
    if (!isLoggedIn || isOnBreak || breakPromptOpen || loginPromptOpen) return;
    breakPromptOpen = true;
    lastIdlePromptAt = Date.now();

    notifyMain('system-idle', IDLE_SECONDS);
    notifyMain('break-prompt', { open: true });
    showBreakNativeToast();

    if (breakPopupWindow && !breakPopupWindow.isDestroyed()) {
        breakPopupWindow.show();
        breakPopupWindow.focus();
        return;
    }

    const winW = 420;
    const winH = 210;
    const { x, y } = getCornerPosition(winW, winH);

    breakPopupWindow = new BrowserWindow({
        width: winW,
        height: winH,
        x, y,
        show: false,
        frame: false,
        transparent: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        skipTaskbar: false,
        focusable: true,
        hasShadow: true,
        title: 'Status check — Nexprism',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'break-preload.cjs'),
        },
    });

    breakPopupWindow.setAlwaysOnTop(true, 'screen-saver');
    breakPopupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    breakPopupWindow.once('ready-to-show', () => {
        if (!breakPopupWindow || breakPopupWindow.isDestroyed()) return;
        breakPopupWindow.show();
        breakPopupWindow.focus();
        try { breakPopupWindow.moveTop(); } catch (_) { /* ignore */ }
    });

    breakPopupWindow.on('closed', () => {
        breakPopupWindow = null;
        if (breakPromptOpen && !isOnBreak) {
            breakPromptOpen = false;
            notifyMain('break-prompt', { open: false });
        }
    });

    breakPopupWindow.loadFile(path.join(__dirname, 'break-popup.html'));

    if (mainWindow && !mainWindow.isDestroyed()) {
        try {
            if (mainWindow.isMinimized() || !mainWindow.isFocused()) mainWindow.flashFrame(true);
        } catch (_) { /* ignore */ }
    }
}

function handleBreakResponse(action) {
    closeBreakPopup();
    if (mainWindow && !mainWindow.isDestroyed()) {
        try { mainWindow.flashFrame(false); } catch (_) { /* ignore */ }
    }
    if (action === 'start-break') {
        isOnBreak = true;
        notifyMain('break-action', { action: 'start-break' });
    } else if (action === 'still-working' || action === 'resume-work') {
        isOnBreak = false;
        notifyMain('break-action', { action });
    }
}

function ensureMainWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow({ show: true });
    }
    return mainWindow;
}

function openMainToLogin() {
    closeLoginPopup();
    const win = ensureMainWindow();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    try { win.moveTop(); } catch (_) { /* ignore */ }
    try { win.flashFrame(false); } catch (_) { /* ignore */ }

    const goLogin = () => {
        try {
            win.webContents.executeJavaScript(`window.location.hash = '#/login';`).catch(() => {});
        } catch (_) { /* ignore */ }
        notifyMain('open-login', {});
    };

    if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', goLogin);
    } else {
        goLogin();
    }
}

function showLoginPopup() {
    if (isLoggedIn || loginPromptOpen) return;
    loginPromptOpen = true;
    lastLoginPromptAt = Date.now();
    showLoginNativeToast();

    if (loginPopupWindow && !loginPopupWindow.isDestroyed()) {
        loginPopupWindow.show();
        loginPopupWindow.focus();
        return;
    }

    const winW = 430;
    const winH = 210;
    const { x, y } = getCornerPosition(winW, winH);

    loginPopupWindow = new BrowserWindow({
        width: winW,
        height: winH,
        x, y,
        show: false,
        frame: false,
        transparent: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        skipTaskbar: false,
        focusable: true,
        hasShadow: true,
        title: 'Nexprism workspace',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'login-preload.cjs'),
        },
    });

    loginPopupWindow.setAlwaysOnTop(true, 'screen-saver');
    loginPopupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    loginPopupWindow.once('ready-to-show', () => {
        if (!loginPopupWindow || loginPopupWindow.isDestroyed()) return;
        loginPopupWindow.show();
        loginPopupWindow.focus();
        try { loginPopupWindow.moveTop(); } catch (_) { /* ignore */ }
    });

    loginPopupWindow.on('closed', () => {
        loginPopupWindow = null;
        loginPromptOpen = false;
    });

    loginPopupWindow.loadFile(path.join(__dirname, 'login-popup.html'));

    if (mainWindow && !mainWindow.isDestroyed() && (mainWindow.isMinimized() || !mainWindow.isVisible())) {
        try { mainWindow.flashFrame(true); } catch (_) { /* ignore */ }
    }
}

function handleLoginPopupResponse(action) {
    if (action === 'open-login') {
        openMainToLogin();
        return;
    }
    // dismiss / remind later
    closeLoginPopup();
    lastLoginPromptAt = Date.now();
}

function setLoggedInState(next, meta = {}) {
    const was = isLoggedIn;
    isLoggedIn = !!next;
    writeAuthStatus({
        loggedIn: isLoggedIn,
        email: meta.email || null,
        name: meta.name || null,
    });
    if (isLoggedIn) {
        closeLoginPopup();
    } else if (was && !isLoggedIn) {
        // Just signed out — nudge soon
        lastLoginPromptAt = 0;
        setTimeout(() => {
            if (!isLoggedIn) showLoginPopup();
        }, 2500);
    }
    updateTrayMenu();
}

function startIdleWatcher() {
    setInterval(() => {
        if (!isLoggedIn || isOnBreak || breakPromptOpen || loginPromptOpen) return;
        const idleTime = powerMonitor.getSystemIdleTime();
        if (idleTime < IDLE_SECONDS) return;
        if (Date.now() - lastIdlePromptAt < IDLE_PROMPT_COOLDOWN_MS) return;
        showBreakPopup();
    }, 5000);
}

function startLoginNudgeWatcher() {
    // First prompt shortly after launch if signed out
    setTimeout(() => {
        if (!isLoggedIn) showLoginPopup();
    }, LOGIN_NUDGE_FIRST_DELAY_MS);

    setInterval(() => {
        if (isLoggedIn || loginPromptOpen) return;
        if (Date.now() - lastLoginPromptAt < LOGIN_NUDGE_INTERVAL_MS) return;
        showLoginPopup();
    }, 30 * 1000);
}

function createTray() {
    if (tray) return;
    let image = nativeImage.createEmpty();
    const iconCandidates = [
        path.join(__dirname, '..', 'public', 'vite.svg'),
        path.join(process.resourcesPath || '', 'vite.svg'),
    ];
    for (const p of iconCandidates) {
        try {
            if (fs.existsSync(p)) {
                image = nativeImage.createFromPath(p);
                if (!image.isEmpty()) break;
            }
        } catch (_) { /* ignore */ }
    }
    // 16x16 fallback pixel so Tray still works without a real icon
    if (image.isEmpty()) {
        image = nativeImage.createFromDataURL(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAPElEQVQ4T2NkYGD4z0ABYBzVMKoBBgYGRvL8/5+BkYGBgZEUzf8ZGBgYGEnR/J+BgYGBkRTN/0nWDAB3XBMhGv8oVwAAAABJRU5ErkJggg=='
        );
    }

    tray = new Tray(image);
    tray.setToolTip('Nexprism — Company workspace');
    tray.on('double-click', () => {
        const win = ensureMainWindow();
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
    });
    updateTrayMenu();
}

function updateTrayMenu() {
    if (!tray) return;
    const menu = Menu.buildFromTemplate([
        {
            label: isLoggedIn ? 'Open Nexprism' : 'Open & sign in',
            click: () => (isLoggedIn ? ensureMainWindow().show() : openMainToLogin()),
        },
        {
            label: 'Show sign-in reminder',
            enabled: !isLoggedIn,
            click: () => {
                lastLoginPromptAt = 0;
                showLoginPopup();
            },
        },
        {
            label: 'Test status reminder',
            enabled: isLoggedIn,
            click: () => {
                isOnBreak = false;
                breakPromptOpen = false;
                lastIdlePromptAt = 0;
                showBreakPopup();
            },
        },
        { type: 'separator' },
        {
            label: 'Quit Nexprism',
            click: () => {
                isQuitting = true;
                app.quit();
            },
        },
    ]);
    tray.setContextMenu(menu);
}

function createWindow(opts = {}) {
    const shouldShow = opts.show !== false;

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
        title: 'Nexprism',
        icon: path.join(__dirname, '..', 'public', 'vite.svg'),
        autoHideMenuBar: true
    });

    const template = [
        {
            label: 'App',
            submenu: [
                { role: 'reload', label: 'Refresh' },
                { type: 'separator' },
                {
                    label: 'Quit Nexprism',
                    click: () => {
                        isQuitting = true;
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
                { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
            ]
        },
        {
            label: 'Workspace',
            submenu: [
                {
                    label: 'Test sign-in reminder',
                    click: () => {
                        isLoggedIn = false;
                        writeAuthStatus({ loggedIn: false });
                        lastLoginPromptAt = 0;
                        showLoginPopup();
                    }
                },
                {
                    label: 'Test status reminder',
                    click: () => {
                        isOnBreak = false;
                        breakPromptOpen = false;
                        lastIdlePromptAt = 0;
                        const prev = isLoggedIn;
                        isLoggedIn = true;
                        showBreakPopup();
                        isLoggedIn = prev;
                    }
                }
            ]
        }
    ];

    if (!app.isPackaged) {
        template.push({
            label: 'Debug',
            submenu: [{ role: 'toggleDevTools' }]
        });
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    if (shouldShow) {
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
            mainWindow.focus();
        });
        setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
                mainWindow.show();
            }
        }, 2500);
    }

    const isPackaged = app.isPackaged;
    const remoteUrl = process.env.ELECTRON_REMOTE_URL || '';

    if (!isPackaged) {
        const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
        mainWindow.loadURL(startUrl);
    } else if (remoteUrl) {
        mainWindow.loadURL(remoteUrl).catch(() => {
            mainWindow.loadFile(resolveLocalIndex());
        });
    } else {
        const indexPath = resolveLocalIndex();
        mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
            console.error('did-fail-load', code, desc, url);
            dialog.showErrorBox(
                'Nexprism',
                `Failed to load UI (${code}): ${desc}\n\n${url || indexPath}`
            );
        });
        mainWindow.loadFile(indexPath).catch((err) => {
            dialog.showErrorBox(
                'Nexprism',
                `Could not load the app UI.\n\nTried: ${indexPath}\n\n${err?.message || err}`
            );
        });
    }

    // Close to tray (keep login reminders alive while PC is on)
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        openMainToLogin();
    });

    app.whenReady().then(() => {
        if (process.platform === 'win32') {
            app.setAppUserModelId('com.nexprism.workspace');
        }

        // Start with Windows so sign-in reminders work after reboot
        try {
            app.setLoginItemSettings({
                openAtLogin: true,
                openAsHidden: true,
                path: process.execPath,
                args: app.isPackaged ? [] : ['.'],
            });
        } catch (err) {
            console.warn('[STARTUP] setLoginItemSettings failed:', err?.message || err);
        }

        const saved = readAuthStatus();
        isLoggedIn = !!saved.loggedIn;

        const startedHidden = app.getLoginItemSettings().wasOpenedAsHidden === true
            || process.argv.includes('--hidden');

        createWindow({ show: !startedHidden });
        createTray();
        startIdleWatcher();
        startLoginNudgeWatcher();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow({ show: true });
            else if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        });
    });
}

app.on('before-quit', () => {
    isQuitting = true;
    closeBreakPopup();
    closeLoginPopup();
});

app.on('window-all-closed', () => {
    // Keep process alive for tray + periodic login nudges on Windows
    if (process.platform === 'darwin') return;
});

ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
    return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
    }));
});

ipcMain.on('tracking-start', (_event, userData) => {
    console.log(`[WORKSPACE] Session ready for ${userData.email}`);
});

ipcMain.on('break-popup-response', (_event, action) => {
    handleBreakResponse(action);
});

ipcMain.on('break-state-sync', (_event, payload = {}) => {
    if (typeof payload.isOnBreak === 'boolean') {
        isOnBreak = payload.isOnBreak;
    }
    if (payload.isOnBreak === false) closeBreakPopup();
    if (payload.showPrompt) {
        isOnBreak = false;
        breakPromptOpen = false;
        lastIdlePromptAt = 0;
        showBreakPopup();
    }
});

ipcMain.on('login-popup-response', (_event, action) => {
    handleLoginPopupResponse(action);
});

ipcMain.on('auth-state-sync', (_event, payload = {}) => {
    setLoggedInState(!!payload.loggedIn, {
        email: payload.email,
        name: payload.name,
    });
});

ipcMain.handle('open-install-folder', async () => {
    const dir = path.dirname(process.execPath);
    await shell.openPath(dir);
    return dir;
});

ipcMain.handle('notification-permission', async () => {
    return Notification.isSupported();
});

ipcMain.handle('show-desktop-notification', async (_event, payload = {}) => {
    try {
        if (!Notification.isSupported()) return { ok: false, reason: 'unsupported' };
        const title = String(payload.title || 'Nexprism').trim() || 'Nexprism';
        const body = String(payload.body || '').trim();
        const n = new Notification({
            title,
            body: body || undefined,
            silent: !!payload.silent,
            urgency: 'normal',
            timeoutType: 'default',
        });
        n.on('click', () => {
            try {
                const win = ensureMainWindow();
                if (win.isMinimized()) win.restore();
                win.show();
                win.focus();
            } catch (_) { /* ignore */ }
        });
        n.show();
        return { ok: true };
    } catch (err) {
        console.warn('[NOTIFY] Failed:', err?.message || err);
        return { ok: false, reason: err?.message || 'error' };
    }
});
