const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  getStorageInfo: () => ipcRenderer.invoke('it-hub:get-storage-info'),
  loadLocalDatabase: () => ipcRenderer.invoke('it-hub:load-database'),
  saveLocalDatabase: (payload) => ipcRenderer.invoke('it-hub:save-database', payload),
  saveExcelReport: (fileName, base64Data) =>
    ipcRenderer.invoke('it-hub:save-excel-report', { fileName, base64Data }),
  savePdfReport: (defaultFileName) =>
    ipcRenderer.invoke('it-hub:save-pdf-report', { defaultFileName }),
  printCurrentPage: () => ipcRenderer.invoke('it-hub:print-current-page'),
  saveBackupFile: (fileName, jsonContent) =>
    ipcRenderer.invoke('it-hub:save-backup-file', { fileName, jsonContent }),
  openLocalFolder: (target = 'root') =>
    ipcRenderer.invoke('it-hub:open-local-folder', { target }),
  openLocalFile: (filePath) =>
    ipcRenderer.invoke('it-hub:open-local-file', { filePath }),
});
