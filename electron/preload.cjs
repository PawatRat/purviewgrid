const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onOpenedFiles: (callback) => {
    // Return the listener function so it can be cleaned up if needed
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('opened-files', listener);
    return () => ipcRenderer.removeListener('opened-files', listener);
  },
  getPathForFile: (file) => webUtils.getPathForFile(file),
  scanPaths: (paths) => ipcRenderer.invoke('scan-paths', paths),
  importPaths: (paths) => ipcRenderer.invoke('import-paths', paths),
  syncSourceFolders: (paths, items, sourceFiles) => ipcRenderer.invoke('sync-source-folders', paths, items, sourceFiles),
  watchSourceFolders: (paths) => ipcRenderer.invoke('watch-source-folders', paths),
  onSourceFolderChanged: (callback) => {
    const listener = (_event, sourcePath) => callback(sourcePath);
    ipcRenderer.on('source-folder-changed', listener);
    return () => ipcRenderer.removeListener('source-folder-changed', listener);
  },
  getFileStats: (paths) => ipcRenderer.invoke('get-file-stats', paths),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  showInFolder: (path) => ipcRenderer.invoke('show-in-folder', path),
  inspectImage: (item, candidates) => ipcRenderer.invoke('inspect-image', item, candidates),
  getCharacterIndex: () => ipcRenderer.invoke('get-character-index'),
  scanCharacters: (items) => ipcRenderer.invoke('scan-characters', items),
  onCharactersProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('characters-progress', listener);
    return () => ipcRenderer.removeListener('characters-progress', listener);
  }
});
