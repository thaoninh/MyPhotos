const path = require('path');
const USBStorageAdapter = require('./adapters/USBStorageAdapter');
const MinIOCloudStorageAdapter = require('./adapters/MinIOCloudStorageAdapter');

class StorageManager {
  constructor() {
    this.adapters = new Map();
    this.locations = [];
  }

  addStorageLocation(location) {
    this.locations.push(location);
    
    let adapter;
    switch (location.type) {
      case 'usb':
        adapter = new USBStorageAdapter(location.path);
        break;
      case 'nas':
        // NAS adapter would be implemented here
        throw new Error('NAS adapter not yet implemented');
      case 'cloud':
        adapter = new MinIOCloudStorageAdapter({
          endpoint: location.endpoint || 'localhost:9000',
          accessKey: location.accessKey || 'minioadmin',
          secretKey: location.secretKey || 'minioadmin',
          useSSL: location.useSSL || false,
          bucketName: location.bucketName || 'photos'
        });
        break;
      default:
        throw new Error(`Unsupported storage type: ${location.type}`);
    }
    
    this.adapters.set(location.id, adapter);
  }

  async connectLocation(locationId) {
    const adapter = this.adapters.get(locationId);
    if (!adapter) {
      throw new Error('Storage location not found');
    }

    const connected = await adapter.connect();
    const location = this.locations.find(l => l.id === locationId);
    if (location) {
      location.connected = connected;
    }
    
    return connected;
  }

  async disconnectLocation(locationId) {
    const adapter = this.adapters.get(locationId);
    if (!adapter) {
      throw new Error('Storage location not found');
    }

    await adapter.disconnect();
    const location = this.locations.find(l => l.id === locationId);
    if (location) {
      location.connected = false;
    }
  }

  getAdapter(locationId) {
    return this.adapters.get(locationId);
  }

  getLocations() {
    return this.locations;
  }

  getLocation(locationId) {
    return this.locations.find(l => l.id === locationId);
  }

  removeLocation(locationId) {
    this.locations = this.locations.filter(l => l.id !== locationId);
    this.adapters.delete(locationId);
  }
}

module.exports = StorageManager;