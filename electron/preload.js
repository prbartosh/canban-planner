const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nativeStorage', {
  call: (fn, ...args) => ipcRenderer.invoke('storage:call', { fn, args })
});
