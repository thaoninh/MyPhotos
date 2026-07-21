# My Photos

A Google Photos clone with local storage support for USB drives, NAS, and self-hosted cloud storage.

## 🎯 Project Overview

This application provides a personal photo management solution that syncs photos to local storage instead of cloud services. It supports multiple storage backends including USB drives, network-attached storage (NAS), and self-hosted cloud solutions.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Material-UI
- **Desktop Framework**: Electron 26.6.10 (downgraded for Node 20 compatibility)
- **Build Tool**: Webpack
- **Database**: SQL.js (SQLite in browser)
- **Image Processing**: Sharp, ExifReader
- **File Watching**: Chokidar
- **HTTP Client**: Axios

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           Storage Management Layer                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│  │  │ USB      │  │ NAS      │  │ Cloud    │              │ │
│  │  │ Adapter  │  │ Adapter  │  │ Adapter  │              │ │
│  │  └──────────┘  └──────────┘  └──────────┘              │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           File System Operations                          │ │
│  │  - Directory reading/writing                              │ │
│  │  - File monitoring                                        │ │
│  │  - Hardware detection                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Electron Renderer Process                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           React UI Layer                                  │ │
│  │  - Photo Gallery                                         │ │
│  │  - Storage Management                                    │ │
│  │  - Sync Controls                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           Business Logic                                 │ │
│  │  - Photo Database (SQL.js)                               │ │
│  │  - Metadata Extraction                                   │ │
│  │  - Thumbnail Generation                                  │ │
│  │  - Sync Engine                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
my-photos/
├── src/
│   ├── main/                 # Electron main process
│   │   └── main.js          # Main entry point, IPC handlers
│   ├── renderer/            # Electron renderer process (UI)
│   │   ├── App.js           # Main React component
│   │   ├── index.js         # React entry point
│   │   └── index.html       # HTML template
│   └── shared/              # Shared code between processes (TypeScript reference)
│       ├── types.ts         # TypeScript interfaces
│       ├── StorageManager.ts    # Storage location management
│       ├── MetadataExtractor.ts # EXIF data extraction
│       └── adapters/        # Storage backend implementations
│           ├── USBStorageAdapter.ts
│           ├── NASStorageAdapter.ts
│           └── CloudStorageAdapter.ts
├── package.json
├── tsconfig.json
├── webpack.main.js          # Main process webpack config
└── webpack.renderer.js      # Renderer process webpack config
```

## 🚀 Getting Started

### Prerequisites
- **Node.js v20.11.0 or higher** (tested with v20.11.0)
- **npm or yarn**
- **Docker** (for MinIO cloud storage)
- **Colima** (macOS Docker alternative, for local development)

### Installation

#### 1. Clone the repository and navigate to the project directory
```bash
cd my-photos
```

#### 2. Install Node.js dependencies
```bash
npm install
```

#### 3. Set up MinIO Cloud Storage (Optional but Recommended)

MinIO provides S3-compatible cloud storage for testing and development. Here's how to set it up:

**For macOS using Colima:**
```bash
# Install Colima (Docker alternative for macOS)
brew install colima

# Install Docker CLI
brew install docker

# Start Colima
colima start

# Run MinIO container
docker run -d -p 9000:9000 -p 9001:9001 --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  quay.io/minio/minio server /data --console-address ":9001"
```

**For Linux/Windows with Docker:**
```bash
# Run MinIO container
docker run -d -p 9000:9000 -p 9001:9001 --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  quay.io/minio/minio server /data --console-address ":9001"
```

**MinIO Access:**
- **API Endpoint**: `http://localhost:9000`
- **Web Console**: `http://localhost:9001`
- **Username**: `minioadmin`
- **Password**: `minioadmin`

**Starting/Stopping MinIO:**
```bash
# Start MinIO
docker start minio

# Stop MinIO
docker stop minio

# Check MinIO status
docker ps | grep minio
```

#### 4. Build the project
```bash
npm run build
```

#### 5. Start the application
```bash
npm start
```

The application will launch the Electron window with the photo management interface.

### Quick Start Guide

1. **Launch the Application**: Run `npm start` to open the My Photos app
2. **Select Storage Location**: Choose from available storage locations:
   - **Pictures Folder**: Local photo directory
   - **Desktop**: Desktop directory
   - **MinIO Cloud Storage**: S3-compatible cloud storage (if MinIO is running)
3. **Import Photos**: Click "Import Photos" to add images from your file system
4. **View Gallery**: Browse photos with thumbnails and metadata
5. **Sync Storage**: Use the sync feature to backup between storage locations

### Development Commands

```bash
# Build the project
npm run build

# Start the application (builds and runs)
npm start

# Run Electron directly without rebuilding (faster for testing)
npm run electron

# Start Colima (for Docker/MinIO)
colima start

# Stop Colima
colima stop
```

## 🔧 Core Features

### 1. Multi-Storage Support
- **USB Drives**: Direct file system access to external drives
- **NAS**: Network-attached storage via REST API
- **Self-hosted Cloud**: Personal cloud storage (MinIO, etc.)

### 2. Photo Management
- Photo import from local directories
- Gallery view with filtering and sorting
- Album creation and organization
- Thumbnail generation and caching

### 3. Metadata Extraction
- EXIF data extraction (camera, lens, settings)
- GPS location data
- Date/time information
- Image dimensions and format

### 4. Sync Engine
- Bi-directional sync between storage locations
- Conflict resolution (last-write-wins with user prompts)
- Progress tracking
- Background synchronization

### 5. Search and Organization
- Search by date, location, file type
- Album creation
- Tag-based organization
- Smart collections

## ⚠️ Technical Challenges & Solutions

### 1. Cross-Platform File System Access
**Challenge**: Different operating systems handle file systems differently.  
**Solution**: Use Electron's Node.js integration with platform-specific APIs for USB detection and file operations.

### 2. Large File Handling
**Challenge**: Photo/video files can be very large (100MB+).  
**Solution**: 
- Streaming uploads with chunked processing
- Progress tracking for user feedback
- Memory-efficient processing

### 3. Sync Conflicts
**Challenge**: Same file modified on multiple storage locations.  
**Solution**:
- Last-write-wins strategy with user prompts
- Version tracking in database
- File hash comparison for change detection

### 4. Performance with Large Libraries
**Challenge**: Managing 10,000+ photos efficiently.  
**Solution**:
- Lazy loading and virtual scrolling
- Background indexing
- Thumbnail caching
- Database for metadata (not in-memory)

### 5. Storage Abstraction
**Challenge**: Different storage backends have different APIs.  
**Solution**:
- Common interface for all storage adapters
- Plugin architecture for easy extension
- Error handling and retry logic

### 6. Hardware Detection
**Challenge**: Detecting USB drive insertion/removal across platforms.  
**Solution**:
- Platform-specific APIs (WMI for Windows, libusb for Linux, IOKit for macOS)
- File system watching for changes
- User manual refresh as fallback

### 7. Node Version Compatibility
**Challenge**: Latest Electron versions require Node.js 22+, but many systems run older versions.  
**Solution**:
- Use Electron 26.6.10 (compatible with Node 20)
- Compatible versions of native modules
- Clear documentation of requirements

## 🔮 Implementation Phases

### Phase 1: Foundation ✅
- [x] Project setup with Electron + React
- [x] Basic UI layout with storage selection
- [x] File system operations via IPC
- [x] Storage adapter pattern implementation
- [x] Webpack build configuration

### Phase 2: Core Features ✅
- [x] Photo import from local directories
- [x] Thumbnail generation with Sharp
- [x] EXIF metadata extraction
- [x] Storage location management
- [x] Basic photo gallery display

### Phase 3: Advanced Features ✅
- [x] Multi-storage sync engine
- [x] Conflict resolution mechanism
- [x] Enhanced UI with error handling
- [x] Progress indicators for operations
- [x] Image dimension detection

### Phase 4: Storage Backends 🚧
- [x] USB storage adapter (fully implemented)
- [x] MinIO cloud storage adapter (fully implemented with S3-compatible API)
- [ ] NAS storage adapter (reference implementation exists)
- [ ] Auto-detection of storage devices

### Phase 5: UI/UX Enhancements 📋
- [ ] Material-UI integration (requires build system updates)
- [ ] Advanced photo editing
- [ ] Facial recognition
- [ ] Smart albums
- [ ] Mobile-responsive design

### Phase 6: Production Features 📋
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] Distribution packaging

## 📝 API Design

### Storage Adapter Interface
```typescript
interface StorageAdapter {
  type: 'usb' | 'nas' | 'cloud';
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  listFiles(path: string): Promise<string[]>;
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: Buffer): Promise<void>;
  deleteFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getStats(path: string): Promise<any>;
  watch?(path: string, callback: Function): Promise<void>;
}
```

### IPC Handlers
- `read-directory`: List files in a directory
- `get-file-stats`: Get file metadata
- `read-file`: Read file contents
- `write-file`: Write file to storage
- `watch-directory`: Monitor directory for changes
- `select-directory`: Open directory selection dialog
- `select-files`: Open file selection dialog
- `copy-file`: Copy file between locations
- `extract-metadata`: Extract EXIF metadata from images
- `generate-thumbnail`: Generate image thumbnails
- `get-image-dimensions`: Get image dimensions and format
- `add-storage-location`: Add a new storage location
- `get-storage-locations`: Get all storage locations
- `connect-storage`: Connect to a storage location
- `disconnect-storage`: Disconnect from a storage location
- `sync-storages`: Sync between storage locations
- `get-sync-conflicts`: Get sync conflicts
- `resolve-conflict`: Resolve a sync conflict

## 🔐 Security Considerations

- File path validation to prevent directory traversal
- Secure credential storage for NAS/cloud connections
- Input sanitization for user-provided data
- No automatic execution of files from untrusted sources

## 🚧 Known Limitations

1. **Node Version**: Requires Node.js 20.11.0+ for Electron 26.6.10 compatibility
2. **Sharp Installation**: May require native compilation on some systems
3. **USB Detection**: Platform-specific implementations needed for auto-detection
4. **Cloud APIs**: Currently uses local MinIO instance; public cloud integration requires endpoint configuration
5. **SSL Warnings**: Minor SSL handshake warnings on startup (non-critical)
6. **Storage Types**: Only USB and MinIO cloud storage adapters are fully implemented (NAS is reference only)
7. **TypeScript**: Build complexity required switching to JavaScript (TypeScript reference files preserved)
8. **MinIO Dependency**: Cloud storage features require MinIO to be running via Docker/Colima

## 🤝 Contributing

This is a demonstration project. For production use, consider:
- [x] Adding comprehensive error handling ✅
- [ ] Implementing automated testing
- [ ] Adding user authentication for shared storage
- [ ] Implementing backup and restore functionality
- [ ] Adding mobile app counterpart

## 📄 License

ISC

## 🙏 Acknowledgments

- Google Photos for UI inspiration
- Electron team for the desktop framework
- Material-UI for the component library
- ExifReader for metadata extraction