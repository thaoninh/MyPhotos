import { StorageAdapter } from '../types';
import axios from 'axios';

export class NASStorageAdapter implements StorageAdapter {
  type = 'nas' as const;
  private baseUrl: string;
  private connected: boolean = false;
  private credentials?: { username: string; password: string };

  constructor(baseUrl: string, credentials?: { username: string; password: string }) {
    this.baseUrl = baseUrl;
    this.credentials = credentials;
  }

  async connect(): Promise<boolean> {
    try {
      // Test connection by making a simple request
      await axios.get(`${this.baseUrl}/api/test`, {
        auth: this.credentials,
        timeout: 5000
      });
      this.connected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to NAS:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listFiles(dirPath: string): Promise<string[]> {
    if (!this.connected) {
      throw new Error('NAS not connected');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/files`, {
        params: { path: dirPath },
        auth: this.credentials
      });
      return response.data.files;
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  async readFile(filePath: string): Promise<Buffer> {
    if (!this.connected) {
      throw new Error('NAS not connected');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/files/download`, {
        params: { path: filePath },
        auth: this.credentials,
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  async writeFile(filePath: string, data: Buffer): Promise<void> {
    if (!this.connected) {
      throw new Error('NAS not connected');
    }

    try {
      const formData = new FormData();
      formData.append('file', new Blob([data]));
      formData.append('path', filePath);

      await axios.post(`${this.baseUrl}/api/files/upload`, formData, {
        auth: this.credentials,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (error) {
      throw new Error(`Failed to write file: ${error}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!this.connected) {
      throw new Error('NAS not connected');
    }

    try {
      await axios.delete(`${this.baseUrl}/api/files`, {
        params: { path: filePath },
        auth: this.credentials
      });
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      await axios.head(`${this.baseUrl}/api/files`, {
        params: { path: filePath },
        auth: this.credentials
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStats(filePath: string): Promise<any> {
    if (!this.connected) {
      throw new Error('NAS not connected');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/files/stats`, {
        params: { path: filePath },
        auth: this.credentials
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error}`);
    }
  }
}