# My Photos - Agent Development Guide

## Project Overview
A Google Photos clone with local storage support (USB, NAS, self-hosted cloud) built with Electron + React.

## Build & Development Commands

### Build
```bash
npm run build
```
Builds both main and renderer processes using Webpack.

### Development
```bash
npm start
```
Builds and starts the Electron application.
**Note**: Application runs successfully with minor SSL warnings (non-critical).

### Direct Electron Test
```bash
npm run electron
```
Runs Electron without rebuilding (faster for testing).

## Tech Stack Details

### Core Technologies
- **Electron 26.6.10**: Desktop framework (downgraded for Node 20 compatibility)
- **React 19.2.8**: UI framework
- **Webpack**: Module bundler for both processes
- **Vanilla JavaScript**: Simplified from TypeScript to avoid build complexity

### Key Dependencies
- **sql.js 1.10.3**: SQLite database (pure JS, no native compilation needed)
- **exifreader 4.41.3**: EXIF metadata extraction
- **sharp 0.35.3**: Image processing (may require native compilation)
- **chokidar 3.5.3**: File watching (older version for Node 20 compatibility)
- **axios 1.18.1**: HTTP client for NAS/cloud APIs

## Architecture Notes

### Process Structure
- **Main Process** (`src/main/main.js`): Electron main process, handles file system operations via IPC
- **Renderer Process** (`src/renderer/`): React UI, runs in browser context
- **Shared Code** (`src/shared/`): Types and utilities used by both processes (TypeScript for reference)

### Storage Adapter Pattern
All storage backends implement the `StorageAdapter` interface in `src/shared/types.ts`:
- USBStorageAdapter: Direct file system access
- NASStorageAdapter: REST API communication (reference only)
- CloudStorageAdapter: S3-compatible API calls (MinIO implementation)

### IPC Communication
Main process exposes these handlers:
- `read-directory`: List files in directory
- `get-file-stats`: Get file metadata
- `read-file`: Read file contents
- `write-file`: Write file to storage
- `watch-directory`: Monitor for changes
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

## Known Issues & Solutions

### Node Version Compatibility
**Issue**: Latest Electron requires Node 22+, but system has Node 20.11.0
**Solution**: Use Electron 28.0.0 and compatible dependency versions

### Native Module Compilation
**Issue**: better-sqlite3 failed to compile due to Python version incompatibility
**Solution**: Switched to sql.js (pure JavaScript SQLite implementation)

### TypeScript Build Complexity
**Issue**: TypeScript compilation with webpack/ts-loader had compatibility issues
**Solution**: Switched to vanilla JavaScript for main and renderer processes, kept TypeScript files in `src/shared/` for reference

### Electron Runtime Crashes
**Issue**: Electron crashes with SIGSEGV on startup
**Solution**: Downgraded from Electron 28.0.0 to Electron 26.6.10 for better Node 20.11.0 compatibility. The application now runs successfully with some SSL handshake warnings (non-critical).

### Dependency Version Conflicts
**Issue**: Many packages require Node 22.12.0+
**Solution**: Use older compatible versions where possible, accept warnings for non-critical packages

## File Structure Reference

```
my-photos/src/
├── main/
│   ├── main.js              # Electron main process entry point (JavaScript)
│   ├── StorageManager.js    # Storage location management (JavaScript)
│   ├── SyncEngine.js        # Multi-storage sync engine (JavaScript)
│   └── adapters/
│       ├── USBStorageAdapter.js  # USB storage implementation (JavaScript)
│       └── MinIOCloudStorageAdapter.js  # MinIO cloud storage implementation (JavaScript)
├── renderer/
│   ├── App.js               # Main React application component (JavaScript)
│   ├── index.js             # React entry point (JavaScript)
│   └── index.html           # HTML template
└── shared/                  # Reference TypeScript implementations
    ├── types.ts             # TypeScript interfaces and types
    ├── StorageManager.ts    # Storage location management
    ├── MetadataExtractor.ts # EXIF data extraction
    └── adapters/
        ├── USBStorageAdapter.ts
        ├── NASStorageAdapter.ts
        └── CloudStorageAdapter.ts
```

## Development Guidelines

### Adding New Storage Backends
1. Create new adapter class in `src/main/adapters/` (JavaScript implementation)
2. Implement the same interface as USBStorageAdapter
3. Add adapter instantiation in `StorageManager.js`
4. Update UI to show new storage type option
5. Keep TypeScript reference files in `src/shared/adapters/` for documentation

### MinIO Cloud Storage Setup
For local development with MinIO cloud storage:
1. Install Colima: `brew install colima`
2. Install Docker CLI: `brew install docker`
3. Start Colima: `colima start`
4. Run MinIO container:
   ```bash
   docker run -d -p 9000:9000 -p 9001:9001 --name minio \
     -e "MINIO_ROOT_USER=minioadmin" \
     -e "MINIO_ROOT_PASSWORD=minioadmin" \
     quay.io/minio/minio server /data --console-address ":9001"
   ```
5. MinIO Console: http://localhost:9001 (admin/minioadmin)
6. MinIO API: http://localhost:9000

### Modifying IPC Handlers
1. Add handler in `src/main/main.js` using `ipcMain.handle()`
2. Add corresponding call in renderer process using `window.electronAPI`
3. Test IPC communication between processes

### UI Development
- Current implementation uses vanilla React with createElement and inline styles
- Material-UI dependencies are installed but not currently used due to build complexity
- To add Material-UI: resolve Babel/Webpack compatibility issues first
- Maintain responsive design with CSS Grid/Flexbox
- Use React hooks for state management

## Testing Strategy

### Manual Testing
1. Test each storage adapter independently
2. Verify IPC communication between processes
3. Test file operations (read, write, delete)
4. Verify metadata extraction with various image formats

### Future Automated Testing
- Unit tests for storage adapters
- Integration tests for IPC handlers
- E2E tests with Spectron or Playwright

## Performance Considerations

### Large File Handling
- Implement streaming for large file operations
- Show progress indicators for long operations
- Consider chunked uploads for cloud storage

### Memory Management
- Use lazy loading for photo galleries
- Implement virtual scrolling for large lists
- Cache thumbnails efficiently

### Database Operations
- Use sql.js for in-memory database
- Consider periodic saves to disk
- Implement proper indexing for search operations

## Security Notes

### File System Access
- Validate all file paths to prevent directory traversal
- Sanitize user inputs before file operations
- Implement proper error handling for permission issues

### Cloud Credentials
- Store credentials securely (consider keychain integration)
- Never log sensitive information
- Implement proper authentication flows

## Platform-Specific Considerations

### USB Detection
- Windows: Use WMI (Windows Management Instrumentation)
- macOS: Use IOKit framework
- Linux: Use libusb or monitor /dev/disk/by-id/

### File Paths
- Windows: Use backslashes, handle drive letters
- macOS/Linux: Use forward slashes, handle mounting points
- Use `path.join()` for cross-platform compatibility

## Future Enhancement Areas

1. **Electron Stability**: Resolve runtime crash issues
2. **UI Framework**: Integrate Material-UI once build issues are resolved
3. **Hardware Detection**: Implement platform-specific USB drive detection
4. **Sync Engine**: Implement bi-directional sync with conflict resolution
5. **Advanced Search**: Add full-text search and filters
6. **Sharing**: Implement secure sharing mechanisms
7. **Mobile App**: Consider React Native or Flutter for mobile companion
8. **Backup**: Add backup/restore functionality
9. **AI Features**: Add object detection and facial recognition (optional)
10. **Public Cloud Integration**: Add support for AWS S3, Backblaze B2, and other public cloud services

## Troubleshooting

### Build Failures
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (should be 20.11.0+)
- Verify webpack configuration

### Runtime Errors
- Check Electron console for renderer process errors
- Check terminal for main process errors
- Verify all dependencies are installed correctly
- **Resolved**: Electron runtime crash issue has been fixed by downgrading to Electron 26.6.10

### Native Module Issues
- If sharp fails to compile, install build tools:
  - macOS: `xcode-select --install`
  - Linux: `sudo apt-get install build-essential`
  - Windows: Install Visual Studio Build Tools

## Current Implementation Status

### Completed
- ✅ Project structure and configuration
- ✅ Electron main process with IPC handlers
- ✅ React-based UI with basic layout
- ✅ Storage adapter interfaces (TypeScript reference) and JavaScript implementations
- ✅ Webpack build configuration
- ✅ Basic demo UI with storage location selection
- ✅ Photo gallery display
- ✅ Real file operations via IPC (read, write, copy, directory listing)
- ✅ Storage manager with USB adapter implementation
- ✅ Metadata extraction (EXIF data) for images
- ✅ Thumbnail generation using Sharp
- ✅ Multi-storage sync engine with conflict resolution
- ✅ File dialogs for directory and file selection
- ✅ Image dimension detection
- ✅ Enhanced UI with error handling and progress indicators
- ✅ MinIO cloud storage adapter with real S3-compatible implementation
- ✅ Docker/Colima setup for MinIO containerization

### Known Limitations
- ⚠️ TypeScript not actively used due to build complexity (reference files preserved)
- ⚠️ Material-UI installed but not integrated (using vanilla JavaScript with inline styles)
- ⚠️ Storage adapters are currently JavaScript implementations (TypeScript reference files preserved)
- ⚠️ Sync engine is implemented but UI integration is in demo mode
- ⚠️ EXIF metadata extraction may fail for non-JPEG images
- ⚠️ Cloud storage uses local MinIO instance (not a public cloud service)
- ⚠️ NAS adapter is not implemented (reference only)
- ℹ️ Minor SSL handshake warnings on startup (non-critical)

## Contact & Support
For issues specific to this project, refer to the main README.md or check the Electron documentation at https://www.electronjs.org/docs.