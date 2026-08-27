const { app, BrowserWindow, Menu, nativeImage, ipcMain, dialog, shell, utilityProcess } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Purview');
app.name = 'Purview';

let mainWindow;
let pendingImports = [];
let characterScanPromise = null;
let fileTaskQueue = Promise.resolve();
let activeImageInspector = null;
let imageInspectorRequestId = 0;
const sourceWatchers = new Map();
const sourceRefreshTimers = new Map();
const CHARACTER_MODEL_VERSION = 'yunet-2023mar+ccip-caformer24+sface-linked-families-v7';

function runFileTaskNow(request) {
  return new Promise((resolve, reject) => {
    const worker = utilityProcess.fork(path.join(__dirname, 'file-worker.cjs'), [], {
      serviceName: 'Purview File Analysis',
      stdio: 'ignore'
    });
    let settled = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
      worker.kill();
    };

    worker.on('message', message => {
      if (message?.type === 'complete') {
        finish(resolve, message.result);
      } else if (message?.type === 'error') {
        finish(reject, new Error(message.error || 'File analysis failed'));
      }
    });
    worker.on('exit', code => {
      if (!settled) finish(reject, new Error(`File analysis stopped unexpectedly (${code})`));
    });
    worker.postMessage(request);
  });
}

function runFileTask(request) {
  const task = fileTaskQueue.then(() => runFileTaskNow(request));
  fileTaskQueue = task.catch(() => undefined);
  return task;
}

function runImageInspectorNow(request) {
  if (request.requestId !== imageInspectorRequestId) {
    return Promise.resolve({ status: 'cancelled', metadata: null, exif: {}, related: [] });
  }
  return new Promise((resolve, reject) => {
    const worker = utilityProcess.fork(path.join(__dirname, 'image-inspector-worker.cjs'), [], {
      serviceName: 'Purview Image Inspector',
      stdio: 'ignore'
    });
    let settled = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      if (activeImageInspector === worker) activeImageInspector = null;
      callback(value);
      worker.kill();
    };

    worker.on('message', message => {
      if (message?.type === 'complete') finish(resolve, message.result);
      else if (message?.type === 'error') finish(reject, new Error(message.error || 'Image inspection failed'));
    });
    worker.on('exit', code => {
      if (!settled) finish(reject, new Error(`Image inspection stopped unexpectedly (${code})`));
    });
    activeImageInspector = worker;
    worker.postMessage(request);
  });
}

function runImageInspector(item, candidates) {
  imageInspectorRequestId += 1;
  if (activeImageInspector) activeImageInspector.kill();
  const request = {
    requestId: imageInspectorRequestId,
    item,
    candidates,
    cachePath: path.join(app.getPath('userData'), 'image-inspector-index.json')
  };
  const task = fileTaskQueue.then(() => runImageInspectorNow(request));
  fileTaskQueue = task.catch(() => undefined);
  return task;
}

function deliverImportResult(result) {
  const payload = Array.isArray(result) ? { images: result, sourceFolders: [] } : result;
  if (!payload || (!payload.images?.length && !payload.sourceFolders?.length)) return;
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isLoadingMainFrame()) {
    mainWindow.webContents.send('opened-files', payload);
  } else {
    pendingImports.push(payload);
  }
}

async function ingestPaths(inputPaths) {
  const result = await runFileTask({ type: 'import-paths', paths: inputPaths });
  deliverImportResult(result);
  return result;
}

function closeSourceWatcher(sourcePath) {
  const watcher = sourceWatchers.get(sourcePath);
  if (watcher) watcher.close();
  sourceWatchers.delete(sourcePath);
  const timer = sourceRefreshTimers.get(sourcePath);
  if (timer) clearTimeout(timer);
  sourceRefreshTimers.delete(sourcePath);
}

function watchSourceFolders(inputPaths) {
  const sourcePaths = [...new Set((Array.isArray(inputPaths) ? inputPaths : [])
    .filter(sourcePath => typeof sourcePath === 'string' && path.isAbsolute(sourcePath))
    .map(sourcePath => path.resolve(sourcePath))
    .filter(sourcePath => {
      try {
        return fs.statSync(sourcePath).isDirectory();
      } catch {
        return false;
      }
    }))];
  const requestedPaths = new Set(sourcePaths);

  for (const watchedPath of sourceWatchers.keys()) {
    if (!requestedPaths.has(watchedPath)) closeSourceWatcher(watchedPath);
  }

  for (const sourcePath of sourcePaths) {
    if (sourceWatchers.has(sourcePath)) continue;
    try {
      const watcher = fs.watch(sourcePath, { recursive: true }, () => {
        const previousTimer = sourceRefreshTimers.get(sourcePath);
        if (previousTimer) clearTimeout(previousTimer);
        sourceRefreshTimers.set(sourcePath, setTimeout(() => {
          sourceRefreshTimers.delete(sourcePath);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('source-folder-changed', sourcePath);
          }
        }, 700));
      });
      watcher.on('error', () => closeSourceWatcher(sourcePath));
      sourceWatchers.set(sourcePath, watcher);
    } catch {
      // Startup synchronization still works when recursive watching is unavailable.
    }
  }

  return sourcePaths;
}

async function handleOpenDialog() {
  if (!mainWindow || mainWindow.isDestroyed()) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Images or Folders to Import',
    properties: ['openFile', 'openDirectory', 'multiSelections']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return ingestPaths(result.filePaths);
  }
  return [];
}

function getCharacterModelsPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'models', 'characters')
    : path.join(__dirname, '..', 'models', 'characters');
}

function getCachedCharacterData() {
  try {
    const index = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'characters-index.json'), 'utf8'));
    if (index.modelVersion !== CHARACTER_MODEL_VERSION) {
      return { status: 'idle', groups: [], sections: [], scannedImageCount: 0, detectedFaceCount: 0 };
    }
    const imageEntries = Object.values(index.images || {});
    return {
      status: 'ready',
      updatedAt: index.updatedAt,
      scannedImageCount: imageEntries.length,
      detectedFaceCount: imageEntries.reduce((count, entry) => count + (entry.faces?.length || 0), 0),
      groups: Array.isArray(index.groups) ? index.groups : [],
      sections: Array.isArray(index.sections) ? index.sections : []
    };
  } catch {
    return { status: 'idle', groups: [], sections: [], scannedImageCount: 0, detectedFaceCount: 0 };
  }
}

function scanCharacters(items) {
  if (characterScanPromise) return characterScanPromise;

  characterScanPromise = new Promise((resolve, reject) => {
    const worker = utilityProcess.fork(path.join(__dirname, 'character-worker.cjs'), [], {
      serviceName: 'Purview Character Analysis',
      stdio: 'ignore'
    });
    let settled = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
      worker.kill();
    };

    worker.on('message', message => {
      if (message?.type === 'progress') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('characters-progress', message.progress);
        }
      } else if (message?.type === 'complete') {
        finish(resolve, message.result);
      } else if (message?.type === 'error') {
        finish(reject, new Error(message.error || 'Character analysis failed'));
      }
    });

    worker.on('exit', code => {
      if (!settled) finish(reject, new Error(`Character analysis stopped unexpectedly (${code})`));
    });

    worker.postMessage({
      items,
      modelsPath: getCharacterModelsPath(),
      indexPath: path.join(app.getPath('userData'), 'characters-index.json'),
      thumbnailsPath: path.join(app.getPath('userData'), 'character-thumbnails')
    });
  }).finally(() => {
    characterScanPromise = null;
  });

  return characterScanPromise;
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
    if (pendingImports.length > 0) {
      pendingImports.forEach(result => mainWindow.webContents.send('opened-files', result));
      pendingImports = [];
    }
  });

  // Open the DevTools for debugging if in dev mode
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    for (const sourcePath of [...sourceWatchers.keys()]) closeSourceWatcher(sourcePath);
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('scan-paths', async (_event, paths) => {
  return runFileTask({ type: 'scan-paths', paths });
});

ipcMain.handle('import-paths', async (_event, paths) => {
  return runFileTask({ type: 'import-paths', paths });
});

ipcMain.handle('sync-source-folders', async (_event, paths, items, sourceFiles) => {
  return runFileTask({ type: 'sync-source-folders', paths, items, sourceFiles });
});

ipcMain.handle('watch-source-folders', async (_event, paths) => watchSourceFolders(paths));

ipcMain.handle('get-file-stats', async (_event, paths) => {
  return runFileTask({ type: 'get-file-stats', paths });
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

ipcMain.handle('inspect-image', async (_event, item, candidates) => {
  if (!item || typeof item.path !== 'string') throw new Error('A valid image is required.');
  return runImageInspector(item, Array.isArray(candidates) ? candidates : []);
});

ipcMain.handle('scan-characters', async (_event, items) => {
  if (!Array.isArray(items)) return { status: 'ready', groups: [], sections: [], scannedImageCount: 0, detectedFaceCount: 0 };
  return scanCharacters(items);
});

ipcMain.handle('get-character-index', async () => getCachedCharacterData());

// macOS 'open-file' event (fired when user right-clicks and opens with app, or drags onto dock icon)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else if (app.isReady()) {
    createWindow();
  }

  app.whenReady().then(() => ingestPaths(filePath)).catch(error => {
    console.error('Unable to open image file:', error);
  });
});

app.whenReady().then(() => {
  setupMenu();

  // Check command line arguments for Windows/Linux (or terminal runs)
  const args = process.argv.slice(1);
  const fileArgs = args.filter(a => !a.startsWith('--') && (path.isAbsolute(a) || path.extname(a) !== ''));
  
  createWindow();

  if (fileArgs.length > 0) {
    ingestPaths(fileArgs).catch(error => {
      console.error('Unable to open command-line images:', error);
    });
  }

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
