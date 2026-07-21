const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const ExifReader = require('exifreader');
const sharp = require('sharp');
const StorageManager = require('./StorageManager');
const SyncEngine = require('./SyncEngine');

let mainWindow = null;
const storageManager = new StorageManager();
const syncEngine = new SyncEngine(storageManager);

function createWindow() {
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
  
  // Set window title
  mainWindow.setTitle('My Photos');

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

  // Initialize cloud storage location
  storageManager.addStorageLocation({
    id: '3',
    name: 'MinIO Cloud Storage',
    type: 'cloud',
    endpoint: 'localhost:9000',
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
    useSSL: false,
    bucketName: 'photos',
    connected: false
  });

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
ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    // Check if this is a cloud storage path
    if (dirPath.includes('MinIO')) {
      const adapter = storageManager.getAdapter('3');
      if (adapter && adapter.connected) {
        const prefix = ''; // You can make this configurable based on dirPath
        const files = await adapter.listFiles(prefix);
        return files.map(file => {
          return {
            name: path.basename(file),
            path: file,
            isDirectory: false, // MinIO doesn't have directories in the traditional sense
            size: 0, // Will be updated when needed
            mtime: new Date(),
            isFile: true
          };
        });
      }
    }
    
    const files = fs.readdirSync(dirPath);
    return files.map(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        path: filePath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtime: stats.mtime,
        isFile: stats.isFile()
      };
    });
  } catch (error) {
    throw new Error(`Failed to read directory: ${error.message}`);
  }
});

ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } catch (error) {
    throw new Error(`Failed to get file stats: ${error.message}`);
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    // Check if this is a cloud storage path
    if (filePath.includes('MinIO')) {
      const adapter = storageManager.getAdapter('3');
      if (adapter && adapter.connected) {
        return await adapter.readFile(filePath);
      }
    }
    
    return fs.readFileSync(filePath);
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    // Check if this is a cloud storage path
    if (filePath.includes('MinIO')) {
      const adapter = storageManager.getAdapter('3');
      if (adapter && adapter.connected) {
        await adapter.writeFile(filePath, data);
        return true;
      }
    }
    
    fs.writeFileSync(filePath, data);
    return true;
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
});

ipcMain.handle('select-directory', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (result.canceled || !result.filePaths.length) {
    return null;
  }
  
  return result.filePaths[0];
});

ipcMain.handle('select-files', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
      { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (result.canceled || !result.filePaths.length) {
    return [];
  }
  
  return result.filePaths;
});

ipcMain.handle('copy-file', async (event, sourcePath, destPath) => {
  try {
    // Check if destination is cloud storage
    if (destPath.includes('MinIO')) {
      const adapter = storageManager.getAdapter('3');
      if (adapter && adapter.connected) {
        const data = fs.readFileSync(sourcePath);
        await adapter.writeFile(destPath, data);
        return true;
      }
    }
    
    fs.copyFileSync(sourcePath, destPath);
    return true;
  } catch (error) {
    throw new Error(`Failed to copy file: ${error.message}`);
  }
});

ipcMain.handle('watch-directory', async (event, dirPath) => {
  const chokidar = require('chokidar');
  try {
    const watcher = chokidar.watch(dirPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });

    watcher.on('all', (eventType, filePath) => {
      mainWindow?.webContents.send('file-change', { event: eventType, path: filePath });
    });

    return true;
  } catch (error) {
    throw new Error(`Failed to watch directory: ${error.message}`);
  }
});

// Storage management IPC handlers
ipcMain.handle('add-storage-location', async (event, location) => {
  try {
    storageManager.addStorageLocation(location);
    await storageManager.connectLocation(location.id);
    return { success: true, location };
  } catch (error) {
    throw new Error(`Failed to add storage location: ${error.message}`);
  }
});

ipcMain.handle('get-storage-locations', async () => {
  return storageManager.getLocations();
});

ipcMain.handle('connect-storage', async (event, locationId) => {
  try {
    const connected = await storageManager.connectLocation(locationId);
    return connected;
  } catch (error) {
    throw new Error(`Failed to connect storage: ${error.message}`);
  }
});

ipcMain.handle('disconnect-storage', async (event, locationId) => {
  try {
    await storageManager.disconnectLocation(locationId);
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to disconnect storage: ${error.message}`);
  }
});

// Metadata extraction handlers
ipcMain.handle('extract-metadata', async (event, filePath) => {
  try {
    // Check if this is a cloud storage path
    let buffer;
    
    if (filePath.includes('MinIO')) {
      const adapter = storageManager.getAdapter('3');
      if (adapter && adapter.connected) {
        buffer = await adapter.readFile(filePath);
      } else {
        return {};
      }
    } else {
      buffer = fs.readFileSync(filePath);
    }
    
    const tags = ExifReader.load(buffer);
    
    const metadata = {};
    
    // Camera information
    if (tags['Make']?.description) {
      metadata.camera = tags['Make'].description;
      if (tags['Model']?.description) {
        metadata.camera += ` ${tags['Model'].description}`;
      }
    }

    // Lens information
    if (tags['LensModel']?.description) {
      metadata.lens = tags['LensModel'].description;
    }

    // ISO
    if (tags['ISOSpeedRatings']?.value) {
      metadata.iso = parseInt(tags['ISOSpeedRatings'].value.toString());
    }

    // Aperture
    if (tags['FNumber']?.value) {
      metadata.aperture = `f/${tags['FNumber'].value}`;
    }

    // Shutter speed
    if (tags['ExposureTime']?.value) {
      const exposureTime = tags['ExposureTime'].value;
      if (exposureTime < 1) {
        metadata.shutterSpeed = `1/${Math.round(1 / exposureTime)}s`;
      } else {
        metadata.shutterSpeed = `${exposureTime}s`;
      }
    }

    // Focal length
    if (tags['FocalLength']?.value) {
      metadata.focalLength = `${tags['FocalLength'].value}mm`;
    }

    // GPS coordinates
    if (tags['GPSLatitude']?.value && tags['GPSLongitude']?.value) {
      const lat = convertDMSToDD(tags['GPSLatitude'].value, tags['GPSLatitudeRef']?.value);
      const lon = convertDMSToDD(tags['GPSLongitude'].value, tags['GPSLongitudeRef']?.value);
      
      if (!isNaN(lat) && !isNaN(lon)) {
        metadata.gps = {
          latitude: lat,
          longitude: lon
        };
      }
    }

    // Date taken
    if (tags['DateTimeOriginal']?.description) {
      metadata.dateTaken = new Date(tags['DateTimeOriginal'].description);
    } else if (tags['CreateDate']?.description) {
      metadata.dateTaken = new Date(tags['CreateDate'].description);
    }

    return metadata;
  } catch (error) {
    console.error('Failed to extract metadata:', error);
    // Return empty metadata if extraction fails
    return {};
  }
});

ipcMain.handle('generate-thumbnail', async (event, filePath, size = 300) => {
  try {
    // Check if this is a cloud storage path
    let buffer;
    
    if (filePath.includes('MinIO')) {
      const adapter = storageManager.getAdapter('3');
      if (adapter && adapter.connected) {
        buffer = await adapter.readFile(filePath);
      } else {
        throw new Error('Cloud storage not connected');
      }
    } else {
      buffer = fs.readFileSync(filePath);
    }
    
    const thumbnailBuffer = await sharp(buffer)
      .resize(size, size, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    return thumbnailBuffer.toString('base64');
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    throw new Error(`Failed to generate thumbnail: ${error.message}`);
  }
});

ipcMain.handle('get-image-dimensions', async (event, filePath) => {
  try {
    // Check if this is a cloud storage path
    let buffer;
    
    if (filePath.includes('MinIO')) {
      const adapter = storageManager.getAdapter('3');
      if (adapter && adapter.connected) {
        buffer = await adapter.readFile(filePath);
      } else {
        throw new Error('Cloud storage not connected');
      }
    } else {
      buffer = fs.readFileSync(filePath);
    }
    
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    };
  } catch (error) {
    console.error('Failed to get image dimensions:', error);
    throw new Error(`Failed to get image dimensions: ${error.message}`);
  }
});

function convertDMSToDD(dms, ref) {
  if (!dms || dms.length < 3) return NaN;

  const degrees = dms[0];
  const minutes = dms[1];
  const seconds = dms[2];

  let dd = degrees + minutes / 60 + seconds / 3600;

  if (ref === 'S' || ref === 'W') {
    dd = dd * -1;
  }

  return dd;
}

// Sync engine IPC handlers
ipcMain.handle('sync-storages', async (event, sourceId, targetId, options) => {
  try {
    const result = await syncEngine.sync(sourceId, targetId, options);
    return result;
  } catch (error) {
    throw new Error(`Sync failed: ${error.message}`);
  }
});

ipcMain.handle('get-sync-conflicts', async () => {
  return syncEngine.getConflicts();
});

ipcMain.handle('resolve-conflict', async (event, conflictId, resolution) => {
  try {
    await syncEngine.resolveConflict(conflictId, resolution);
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to resolve conflict: ${error.message}`);
  }
});