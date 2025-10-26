const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerStorageIPC } = require('./storage');   // <- IPC + SQLite

function createWindow () {
  const win = new BrowserWindow({
    width: 1280, height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(() => {
  registerStorageIPC();   // zainicjuj bazę i handler IPC
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
