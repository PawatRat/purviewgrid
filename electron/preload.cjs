const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onOpenedFiles: (callback) => {
    // Return the listener function so it can be cleaned up if needed
    const listener = (event, files) => callback(files);
    ipcRenderer.on('opened-files', listener);
    return () => ipcRenderer.removeListener('opened-files', listener);
  }
});
