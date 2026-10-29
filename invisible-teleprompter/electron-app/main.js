const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = Math.min(680, screenWidth - 40);
  const windowHeight = 440;
  const startX = Math.round((screenWidth - windowWidth) / 2);
  const startY = 40; // Position directly underneath the top bezel webcam

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: startX,
    y: startY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    minWidth: 420,
    minHeight: 260,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Windows Screen Capture Protection
  // Calls SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE) under the hood.
  // Window remains fully visible to the user but is completely excluded from OBS, Zoom, Teams, Loom & Screen Shares.
  mainWindow.setContentProtection(true);

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Window Controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('toggle-protection', (event, enable) => {
  if (mainWindow) {
    mainWindow.setContentProtection(Boolean(enable));
    event.reply('protection-toggled', Boolean(enable));
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

