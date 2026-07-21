import { StorageAdapter } from '../types';
import axios from 'axios';

export class CloudStorageAdapter implements StorageAdapter {
  type = 'cloud' as const;
  private baseUrl: string;
  private apiKey: string;
  private connected: boolean = false;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async connect(): Promise<boolean> {
    try {
      // Test connection by making a simple request
      await axios.get(`${this.baseUrl}/api/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 5000
      });
      this.connected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to cloud storage:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listFiles(dirPath: string): Promise<string[]> {
    if (!this.connected) {
      throw new Error('Cloud storage not connected');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/buckets/photos/objects`, {
        params: { prefix: dirPath },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.data.objects.map((obj: any) => obj.name);
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  async readFile(filePath: string): Promise<Buffer> {
    if (!this.connected) {
      throw new Error('Cloud storage not connected');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/buckets/photos/objects/${filePath}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  async writeFile(filePath: string, data: Buffer): Promise<void> {
    if (!this.connected) {
      throw new Error('Cloud storage not connected');
    }

    try {
      await axios.put(`${this.baseUrl}/api/buckets/photos/objects/${filePath}`, data, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/octet-stream'
        }
      });
    } catch (error) {
      throw new Error(`Failed to write file: ${error}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Cloud storage not connected');
    }

    try {
      await axios.delete(`${this.baseUrl}/api/buckets/photos/objects/${filePath}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
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
      await axios.head(`${this.baseUrl}/api/buckets/photos/objects/${filePath}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStats(filePath: string): Promise<any> {
    if (!this.connected) {
      throw new Error('Cloud storage not connected');
    }

    try {
      const response = await axios.head(`${this.baseUrl}/api/buckets/photos/objects/${filePath}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return {
        size: parseInt(response.headers['content-length'] || '0'),
        lastModified: response.headers['last-modified']
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error}`);
    }
  }
}