import { StorageAdapter, StorageLocation } from './types';
import { USBStorageAdapter } from './adapters/USBStorageAdapter';
import { NASStorageAdapter } from './adapters/NASStorageAdapter';
import { CloudStorageAdapter } from './adapters/CloudStorageAdapter';

export class StorageManager {
  private adapters: Map<string, StorageAdapter> = new Map();
  private locations: StorageLocation[] = [];

  addStorageLocation(location: StorageLocation): void {
    this.locations.push(location);
    
    let adapter: StorageAdapter;
    switch (location.type) {
      case 'usb':
        adapter = new USBStorageAdapter(location.path);
        break;
      case 'nas':
        adapter = new NASStorageAdapter(location.path);
        break;
      case 'cloud':
        adapter = new CloudStorageAdapter(location.path, 'your-api-key');
        break;
      default:
        throw new Error(`Unsupported storage type: ${location.type}`);
    }
    
    this.adapters.set(location.id, adapter);
  }

  async connectLocation(locationId: string): Promise<boolean> {
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

  async disconnectLocation(locationId: string): Promise<void> {
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

  getAdapter(locationId: string): StorageAdapter | undefined {
    return this.adapters.get(locationId);
  }

  getLocations(): StorageLocation[] {
    return this.locations;
  }

  getLocation(locationId: string): StorageLocation | undefined {
    return this.locations.find(l => l.id === locationId);
  }

  removeLocation(locationId: string): void {
    this.locations = this.locations.filter(l => l.id !== locationId);
    this.adapters.delete(locationId);
  }
}