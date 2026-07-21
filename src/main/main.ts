import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // Load the HTML file
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
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

// IPC handlers for file system operations
ipcMain.handle('read-directory', async (event, dirPath: string) => {
  const fs = require('fs');
  try {
    const files = fs.readdirSync(dirPath);
    return files.map(file => ({
      name: file,
      path: path.join(dirPath, file),
      isDirectory: fs.statSync(path.join(dirPath, file)).isDirectory()
    }));
  } catch (error) {
    throw new Error(`Failed to read directory: ${error}`);
  }
});

ipcMain.handle('get-file-stats', async (event, filePath: string) => {
  const fs = require('fs');
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } catch (error) {
    throw new Error(`Failed to get file stats: ${error}`);
  }
});

ipcMain.handle('read-file', async (event, filePath: string) => {
  const fs = require('fs');
  try {
    return fs.readFileSync(filePath);
  } catch (error) {
    throw new Error(`Failed to read file: ${error}`);
  }
});

ipcMain.handle('write-file', async (event, filePath: string, data: Buffer) => {
  const fs = require('fs');
  try {
    fs.writeFileSync(filePath, data);
    return true;
  } catch (error) {
    throw new Error(`Failed to write file: ${error}`);
  }
});

ipcMain.handle('watch-directory', async (event, dirPath: string) => {
  const chokidar = require('chokidar');
  try {
    const watcher = chokidar.watch(dirPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });

    watcher.on('all', (event, path) => {
      mainWindow?.webContents.send('file-change', { event, path });
    });

    return true;
  } catch (error) {
    throw new Error(`Failed to watch directory: ${error}`);
  }
});