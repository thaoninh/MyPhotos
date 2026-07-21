const Client = require('minio').Client;

class MinIOCloudStorageAdapter {
  constructor(config) {
    this.type = 'cloud';
    this.endpoint = config.endpoint || 'localhost:9000';
    this.accessKey = config.accessKey || 'minioadmin';
    this.secretKey = config.secretKey || 'minioadmin';
    this.useSSL = config.useSSL || false;
    this.bucketName = config.bucketName || 'photos';
    this.connected = false;
    this.client = null;
  }

  async connect() {
    try {
      // Force IPv4 by replacing localhost with 127.0.0.1
      const endpoint = this.endpoint.replace('localhost', '127.0.0.1');
      console.log(`Connecting to MinIO at ${endpoint}...`);
      
      this.client = new Client({
        endPoint: endpoint.split(':')[0],
        port: parseInt(endpoint.split(':')[1] || '9000'),
        useSSL: this.useSSL,
        accessKey: this.accessKey,
        secretKey: this.secretKey
      });

      console.log('MinIO client created successfully');

      // Test connection by checking if bucket exists, create if not
      console.log(`Checking if bucket '${this.bucketName}' exists...`);
      const bucketExists = await this.client.bucketExists(this.bucketName);
      console.log(`Bucket exists: ${bucketExists}`);
      
      if (!bucketExists) {
        console.log(`Creating bucket '${this.bucketName}'...`);
        await this.client.makeBucket(this.bucketName);
        console.log(`Created bucket: ${this.bucketName}`);
      }

      this.connected = true;
      console.log(`MinIO connected successfully at ${endpoint}`);
      return true;
    } catch (error) {
      console.error('Failed to connect to MinIO:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return false;
    }
  }

  async disconnect() {
    this.connected = false;
    this.client = null;
    console.log('MinIO disconnected');
  }

  async listFiles(prefix = '') {
    if (!this.connected) {
      throw new Error('MinIO not connected');
    }

    try {
      const objects = [];
      const stream = this.client.listObjects(this.bucketName, prefix, true);
      
      for await (const obj of stream) {
        objects.push(obj.name);
      }
      
      return objects;
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  async readFile(objectName) {
    if (!this.connected) {
      throw new Error('MinIO not connected');
    }

    try {
      const dataStream = await this.client.getObject(this.bucketName, objectName);
      return new Promise((resolve, reject) => {
        const chunks = [];
        dataStream.on('data', chunk => chunks.push(chunk));
        dataStream.on('end', () => resolve(Buffer.concat(chunks)));
        dataStream.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async writeFile(objectName, data) {
    if (!this.connected) {
      throw new Error('MinIO not connected');
    }

    try {
      await this.client.putObject(this.bucketName, objectName, data);
      console.log(`File written to MinIO: ${objectName}`);
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async deleteFile(objectName) {
    if (!this.connected) {
      throw new Error('MinIO not connected');
    }

    try {
      await this.client.removeObject(this.bucketName, objectName);
      console.log(`File deleted from MinIO: ${objectName}`);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async exists(objectName) {
    if (!this.connected) {
      return false;
    }

    try {
      await this.client.statObject(this.bucketName, objectName);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStats(objectName) {
    if (!this.connected) {
      throw new Error('MinIO not connected');
    }

    try {
      const stats = await this.client.statObject(this.bucketName, objectName);
      return {
        size: stats.size,
        lastModified: stats.lastModified,
        etag: stats.etag,
        contentType: stats.contentType
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error.message}`);
    }
  }

  async copyFile(sourceObject, destObject) {
    if (!this.connected) {
      throw new Error('MinIO not connected');
    }

    try {
      await this.client.copyObject(this.bucketName, destObject, `/${this.bucketName}/${sourceObject}`);
      console.log(`File copied in MinIO: ${sourceObject} -> ${destObject}`);
    } catch (error) {
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }
}

module.exports = MinIOCloudStorageAdapter;