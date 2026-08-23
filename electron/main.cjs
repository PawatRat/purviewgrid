const { app, BrowserWindow, Menu, nativeImage, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

app.setName('Purview');
app.name = 'Purview';

let mainWindow;
let initialFiles = [];

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif', '.heic', '.heif', '.tiff', '.tif', '.ico'
]);

function getFileCreationTime(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.birthtimeMs && stat.birthtimeMs > 0 && stat.birthtimeMs < Date.now() + 86400000) {
        return Math.floor(stat.birthtimeMs);
      }
      if (stat.mtimeMs && stat.mtimeMs > 0) {
        return Math.floor(stat.mtimeMs);
      }
      if (stat.ctimeMs && stat.ctimeMs > 0) {
        return Math.floor(stat.ctimeMs);
      }
    }
  } catch (err) {
    console.error('Error reading file stat:', filePath, err);
  }
  return Date.now();
}

function getFileContentHash(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;

    // Compute exact binary SHA-256 checksum for 100% accurate deduplication
    const buffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return `${stat.size}_${hash}`;
  } catch (err) {
    console.error('Error computing file hash:', filePath, err);
    return null;
  }
}

function scanPathRecursively(targetPath, results, hashToItemMap) {
  try {
    if (!fs.existsSync(targetPath)) return results;
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(targetPath);
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        scanPathRecursively(path.join(targetPath, entry), results, hashToItemMap);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(targetPath).toLowerCase();
      if (SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
        if (!results.has(targetPath)) {
          const hash = getFileContentHash(targetPath);
          
          // Record duplicate paths if exact binary hash matches
          if (hash && hashToItemMap.has(hash)) {
            const primaryItem = hashToItemMap.get(hash);
            if (!primaryItem.duplicatePaths) {
              primaryItem.duplicatePaths = [primaryItem.path];
            }
            if (!primaryItem.duplicatePaths.includes(targetPath)) {
              primaryItem.duplicatePaths.push(targetPath);
            }
            return results; // Deduplicated for main gallery
          }

          const createdAt = (stat.birthtimeMs && stat.birthtimeMs > 0 && stat.birthtimeMs < Date.now() + 86400000)
            ? Math.floor(stat.birthtimeMs)
            : Math.floor(stat.mtimeMs || Date.now());

          const item = { path: targetPath, createdAt, hash, duplicatePaths: [targetPath] };
          if (hash) {
            hashToItemMap.set(hash, item);
          }
          results.set(targetPath, item);
        }
      }
    }
  } catch (err) {
    console.error('Error scanning path:', targetPath, err);
  }
  return results;
}

function resolveImageFiles(inputPaths) {
  const imageMap = new Map();
  const hashToItemMap = new Map();
  const pathsArray = Array.isArray(inputPaths) ? inputPaths : [inputPaths];
  for (const p of pathsArray) {
    if (typeof p === 'string' && p.trim()) {
      scanPathRecursively(p, imageMap, hashToItemMap);
    }
  }
  return Array.from(imageMap.values());
}

async function handleOpenDialog() {
  if (!mainWindow || mainWindow.isDestroyed()) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Images or Folders to Import',
    properties: ['openFile', 'openDirectory', 'multiSelections']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const images = resolveImageFiles(result.filePaths);
    if (images.length > 0) {
      mainWindow.webContents.send('opened-files', images);
      return images;
    }
  }
  return [];
}

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
        {
          label: 'Import Images or Folders...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            handleOpenDialog();
          }
        },
        { type: 'separator' },
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
  const iconPath = path.join(__dirname, '../public/purview-logo-3d-v2.png');

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

// IPC Handlers
ipcMain.handle('scan-paths', async (_event, paths) => {
  return resolveImageFiles(paths);
});

ipcMain.handle('get-file-stats', async (_event, paths) => {
  const statsMap = {};
  if (!Array.isArray(paths)) return statsMap;
  for (const p of paths) {
    if (typeof p === 'string') {
      statsMap[p] = {
        createdAt: getFileCreationTime(p),
        hash: getFileContentHash(p)
      };
    }
  }
  return statsMap;
});

ipcMain.handle('open-file-dialog', async () => {
  return handleOpenDialog();
});

ipcMain.handle('show-in-folder', async (_event, filePath) => {
  if (typeof filePath === 'string' && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

ipcMain.handle('rescan-duplicates', async (_event, existingItems) => {
  if (!Array.isArray(existingItems) || existingItems.length === 0) return {};
  
  const localPaths = existingItems
    .map(i => (typeof i === 'string' ? i : i.path))
    .filter(p => typeof p === 'string' && path.isAbsolute(p) && fs.existsSync(p));

  if (localPaths.length === 0) return {};

  const homeDir = os.homedir();
  for (const p of localPaths) {
    let dir = path.dirname(p);
    for (let i = 0; i < 2; i++) {
      const parent = path.dirname(dir);
      if (parent && parent !== dir && parent !== '/' && parent !== homeDir && parent !== path.dirname(parent)) {
        dir = parent;
      }
    }
    rootDirs.add(dir);
  }

  const imageMap = new Map();
  const hashToItemMap = new Map();
  for (const root of rootDirs) {
    if (fs.existsSync(root)) {
      scanPathRecursively(root, imageMap, hashToItemMap);
    }
  }

  const duplicateMap = {};
  for (const [, item] of hashToItemMap.entries()) {
    if (item.hash && item.duplicatePaths && item.duplicatePaths.length > 1) {
      duplicateMap[item.hash] = item.duplicatePaths;
    }
  }

  return duplicateMap;
});

// macOS 'open-file' event (fired when user right-clicks and opens with app, or drags onto dock icon)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  const images = resolveImageFiles(filePath);
  if (images.length === 0) return;

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send('opened-files', images);
  } else {
    initialFiles.push(...images);
    if (app.isReady()) {
      createWindow();
    }
  }
});

app.whenReady().then(() => {
  setupMenu();

  // Check command line arguments for Windows/Linux (or terminal runs)
  const args = process.argv.slice(1);
  const fileArgs = args.filter(a => !a.startsWith('--') && (path.isAbsolute(a) || path.extname(a) !== ''));
  
  if (fileArgs.length > 0) {
    const images = resolveImageFiles(fileArgs);
    initialFiles.push(...images);
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
