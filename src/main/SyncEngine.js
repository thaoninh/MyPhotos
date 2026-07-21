const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SyncEngine {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.syncState = new Map(); // Track sync state for each storage
    this.conflicts = [];
  }

  async sync(sourceStorageId, targetStorageId, options = {}) {
    const { 
      onProgress = () => {}, 
      direction = 'bidirectional', 
      conflictResolution = 'last-write-wins' 
    } = options;

    try {
      const sourceStorage = this.storageManager.getLocation(sourceStorageId);
      const targetStorage = this.storageManager.getLocation(targetStorageId);
      
      if (!sourceStorage || !targetStorage) {
        throw new Error('Invalid storage locations');
      }

      const sourceAdapter = this.storageManager.getAdapter(sourceStorageId);
      const targetAdapter = this.storageManager.getAdapter(targetStorageId);

      if (!sourceAdapter || !targetAdapter) {
        throw new Error('Storage adapters not available');
      }

      await sourceAdapter.connect();
      await targetAdapter.connect();

      // Get files from both storages
      const sourceFiles = await this.getFileList(sourceAdapter, '');
      const targetFiles = await this.getFileList(targetAdapter, '');

      const syncStats = {
        total: 0,
        uploaded: 0,
        downloaded: 0,
        skipped: 0,
        conflicts: 0,
        errors: 0
      };

      // Calculate files to sync
      const filesToSync = this.calculateSyncActions(sourceFiles, targetFiles, direction);
      syncStats.total = filesToSync.length;

      // Perform sync operations
      for (const action of filesToSync) {
        try {
          await this.performSyncAction(action, sourceAdapter, targetAdapter, conflictResolution);
          
          if (action.type === 'upload') {
            syncStats.uploaded++;
          } else if (action.type === 'download') {
            syncStats.downloaded++;
          } else if (action.type === 'skip') {
            syncStats.skipped++;
          } else if (action.type === 'conflict') {
            syncStats.conflicts++;
          }

          onProgress({
            ...syncStats,
            currentFile: action.file,
            progress: ((syncStats.uploaded + syncStats.downloaded + syncStats.skipped + syncStats.conflicts) / syncStats.total) * 100
          });
        } catch (error) {
          console.error('Sync error for file:', action.file, error);
          syncStats.errors++;
        }
      }

      return { success: true, stats: syncStats };
    } catch (error) {
      console.error('Sync failed:', error);
      throw new Error(`Sync failed: ${error.message}`);
    }
  }

  async getFileList(adapter, dirPath) {
    const files = [];
    const items = await adapter.listFiles(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await adapter.getStats(itemPath);
      
      if (stats.isFile()) {
        const hash = await this.calculateFileHash(adapter, itemPath);
        files.push({
          name: item,
          path: itemPath,
          size: stats.size,
          mtime: stats.mtime,
          hash: hash
        });
      } else if (stats.isDirectory()) {
        // Recursively get files from subdirectories
        const subFiles = await this.getFileList(adapter, itemPath);
        files.push(...subFiles);
      }
    }
    
    return files;
  }

  async calculateFileHash(adapter, filePath) {
    try {
      const buffer = await adapter.readFile(filePath);
      return crypto.createHash('md5').update(buffer).digest('hex');
    } catch (error) {
      console.error('Failed to calculate hash:', error);
      return '';
    }
  }

  calculateSyncActions(sourceFiles, targetFiles, direction) {
    const actions = [];
    const targetFileMap = new Map(targetFiles.map(f => [f.name, f]));

    sourceFiles.forEach(sourceFile => {
      const targetFile = targetFileMap.get(sourceFile.name);
      
      if (!targetFile) {
        // File exists in source but not in target
        if (direction === 'source-to-target' || direction === 'bidirectional') {
          actions.push({
            type: 'upload',
            file: sourceFile.name,
            sourcePath: sourceFile.path,
            targetPath: path.join('', sourceFile.name)
          });
        }
      } else if (sourceFile.hash !== targetFile.hash) {
        // File exists in both but with different content (conflict)
        if (sourceFile.mtime > targetFile.mtime) {
          actions.push({
            type: 'upload',
            file: sourceFile.name,
            sourcePath: sourceFile.path,
            targetPath: path.join('', sourceFile.name),
            conflict: true
          });
        } else {
          actions.push({
            type: 'download',
            file: sourceFile.name,
            sourcePath: sourceFile.path,
            targetPath: path.join('', sourceFile.name),
            conflict: true
          });
        }
      } else {
        // Files are identical
        actions.push({
          type: 'skip',
          file: sourceFile.name
        });
      }
    });

    // Check for files that exist in target but not in source
    const sourceFileMap = new Map(sourceFiles.map(f => [f.name, f]));
    targetFiles.forEach(targetFile => {
      if (!sourceFileMap.has(targetFile.name)) {
        if (direction === 'target-to-source' || direction === 'bidirectional') {
          actions.push({
            type: 'download',
            file: targetFile.name,
            sourcePath: targetFile.path,
            targetPath: path.join('', targetFile.name)
          });
        }
      }
    });

    return actions;
  }

  async performSyncAction(action, sourceAdapter, targetAdapter, conflictResolution) {
    if (action.type === 'skip') {
      return;
    }

    if (action.conflict && conflictResolution === 'manual') {
      // Store conflict for manual resolution
      this.conflicts.push(action);
      return;
    }

    if (action.type === 'upload') {
      const fileData = await sourceAdapter.readFile(action.sourcePath);
      await targetAdapter.writeFile(action.targetPath, fileData);
    } else if (action.type === 'download') {
      const fileData = await targetAdapter.readFile(action.targetPath);
      await sourceAdapter.writeFile(action.sourcePath, fileData);
    }
  }

  getConflicts() {
    return this.conflicts;
  }

  clearConflicts() {
    this.conflicts = [];
  }

  async resolveConflict(conflictId, resolution) {
    const conflict = this.conflicts[conflictId];
    if (!conflict) {
      throw new Error('Conflict not found');
    }

    // Implementation would handle manual conflict resolution
    // For now, just remove it from the list
    this.conflicts.splice(conflictId, 1);
  }
}

module.exports = SyncEngine;