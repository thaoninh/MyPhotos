const fs = require('fs');
const path = require('path');

class USBStorageAdapter {
  constructor(basePath) {
    this.type = 'usb';
    this.basePath = basePath;
    this.connected = false;
  }

  async connect() {
    try {
      if (fs.existsSync(this.basePath)) {
        this.connected = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to connect to USB storage:', error);
      return false;
    }
  }

  async disconnect() {
    this.connected = false;
  }

  async listFiles(dirPath) {
    if (!this.connected) {
      throw new Error('USB storage not connected');
    }

    const fullPath = path.join(this.basePath, dirPath);
    try {
      const files = fs.readdirSync(fullPath);
      return files;
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  async readFile(filePath) {
    if (!this.connected) {
      throw new Error('USB storage not connected');
    }

    const fullPath = path.join(this.basePath, filePath);
    try {
      return fs.readFileSync(fullPath);
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async writeFile(filePath, data) {
    if (!this.connected) {
      throw new Error('USB storage not connected');
    }

    const fullPath = path.join(this.basePath, filePath);
    const dir = path.dirname(fullPath);
    
    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, data);
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async deleteFile(filePath) {
    if (!this.connected) {
      throw new Error('USB storage not connected');
    }

    const fullPath = path.join(this.basePath, filePath);
    try {
      fs.unlinkSync(fullPath);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async exists(filePath) {
    if (!this.connected) {
      return false;
    }

    const fullPath = path.join(this.basePath, filePath);
    return fs.existsSync(fullPath);
  }

  async getStats(filePath) {
    if (!this.connected) {
      throw new Error('USB storage not connected');
    }

    const fullPath = path.join(this.basePath, filePath);
    try {
      const stats = fs.statSync(fullPath);
      return {
        size: stats.size,
        mtime: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error.message}`);
    }
  }
}

module.exports = USBStorageAdapter;