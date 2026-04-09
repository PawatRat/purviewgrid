const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let initialFiles = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // allow accessing local file system images
    }
  });

  const startUrl = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow.loadURL(startUrl);

  mainWindow.webContents.on('did-finish-load', () => {
    if (initialFiles.length > 0) {
      mainWindow.webContents.send('opened-files', initialFiles);
      initialFiles = []; // clear them after sending
    }
  });

  // Open the DevTools for debugging if in dev mode
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// macOS 'open-file' event (fired when user right-clicks and opens with app, or drags onto dock icon)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send('opened-files', [filePath]);
  } else {
    initialFiles.push(filePath);
    if (app.isReady()) {
      createWindow();
    }
  }
});

app.whenReady().then(() => {
  // Check command line arguments for Windows/Linux (or terminal runs)
  const args = process.argv.slice(1);
  const fileArgs = args.filter(a => !a.startsWith('--') && path.isAbsolute(a) || path.extname(a) !== '');
  
  if (fileArgs.length > 0) {
    initialFiles.push(...fileArgs);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
