import * as fs from 'fs';
import * as path from 'path';
import { StorageAdapter } from '../types';

export class USBStorageAdapter implements StorageAdapter {
  type = 'usb' as const;
  private basePath: string;
  private connected: boolean = false;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async connect(): Promise<boolean> {
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

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listFiles(dirPath: string): Promise<string[]> {
    if (!this.connected) {
      throw new Error('USB storage not connected');
    }

    const fullPath = path.join(this.basePath, dirPath);
    try {
      const files = fs.readdirSync(fullPath);
      return files;
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  async readFile(filePath: string): Promise<Buffer> {
    if (!this.connected) {
      throw new Error('USB storage not connected');
    }

    const fullPath = path.join(this.basePath, filePath);
    try {
      return fs.readFileSync(fullPath);
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  async writeFile(filePath: string, data: Buffer): Promise<void> {
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
      throw new Error(`Failed to write file: ${error}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!this.connected) {
      throw new Error('USB storage not connected');
    }

    const fullPath = path.join(this.basePath, filePath);
    try {
      fs.unlinkSync(fullPath);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    const fullPath = path.join(this.basePath, filePath);
    return fs.existsSync(fullPath);
  }

  async getStats(filePath: string): Promise<any> {
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
      throw new Error(`Failed to get file stats: ${error}`);
    }
  }
}