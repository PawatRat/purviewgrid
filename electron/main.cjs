const { app, BrowserWindow, Menu, nativeImage } = require('electron');
const path = require('path');

app.setName('Purview');
app.name = 'Purview';

let mainWindow;
let initialFiles = [];

function setupMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: 'Purview',
      submenu: [
        { role: 'about', label: 'About Purview' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide Purview' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Purview' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' }
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
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const iconPath = path.join(__dirname, '../public/favicon.svg');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Purview',
    titleBarStyle: 'hiddenInset',
    icon: iconPath,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // allow accessing local file system images
    }
  });

  if (process.platform === 'darwin' && app.dock) {
    try {
      const icon = nativeImage.createFromPath(iconPath);
      app.dock.setIcon(icon);
    } catch {
      // fallback
    }
  }

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
  setupMenu();

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
