export interface Photo {
  id: string;
  name: string;
  path: string;
  thumbnail: string;
  date: Date;
  size: number;
  width?: number;
  height?: number;
  format?: string;
  metadata?: PhotoMetadata;
}

export interface PhotoMetadata {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  gps?: {
    latitude: number;
    longitude: number;
  };
  dateTaken?: Date;
}

export interface StorageLocation {
  id: string;
  name: string;
  type: 'usb' | 'nas' | 'cloud';
  path: string;
  connected: boolean;
  capacity?: number;
  usedSpace?: number;
  lastSync?: Date;
}

export interface SyncProgress {
  total: number;
  completed: number;
  currentFile: string;
  status: 'uploading' | 'downloading' | 'verifying' | 'complete';
}

export interface StorageAdapter {
  type: 'usb' | 'nas' | 'cloud';
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  listFiles(path: string): Promise<string[]>;
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: Buffer): Promise<void>;
  deleteFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getStats(path: string): Promise<any>;
  watch?(path: string, callback: (event: string, path: string) => void): Promise<void>;
}