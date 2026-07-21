const React = require('react');

function App() {
  const [photos, setPhotos] = React.useState([]);
  const [storageLocations, setStorageLocations] = React.useState([]);
  const [selectedStorage, setSelectedStorage] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    // Initialize with some demo storage locations
    setStorageLocations([
      {
        id: '1',
        name: 'Pictures Folder',
        type: 'usb',
        path: process.env.HOME + '/Pictures',
        connected: true
      },
      {
        id: '2',
        name: 'Desktop',
        type: 'usb',
        path: process.env.HOME + '/Desktop',
        connected: true
      },
      {
        id: '3',
        name: 'MinIO Cloud Storage',
        type: 'cloud',
        endpoint: 'localhost:9000',
        connected: false
      }
    ]);

    // Load photos from default storage
    loadPhotosFromStorage(process.env.HOME + '/Pictures');
  }, []);

  const loadPhotosFromStorage = async (dirPath) => {
    if (!dirPath) return;
    
    setLoading(true);
    setError(null);
    try {
      const { ipcRenderer } = require('electron');
      const files = await ipcRenderer.invoke('read-directory', dirPath);
      
      const imageFiles = files.filter(file => 
        file.isFile && isImageFile(file.name)
      );

      // Process images with metadata and thumbnails
      const photoData = await Promise.all(imageFiles.map(async (file) => {
        try {
          const [metadata, dimensions, thumbnail] = await Promise.all([
            ipcRenderer.invoke('extract-metadata', file.path),
            ipcRenderer.invoke('get-image-dimensions', file.path),
            ipcRenderer.invoke('generate-thumbnail', file.path, 300)
          ]);

          return {
            id: file.name,
            name: file.name,
            path: file.path,
            thumbnail: `data:image/jpeg;base64,${thumbnail}`,
            date: metadata.dateTaken || new Date(file.mtime),
            size: file.size,
            width: dimensions.width,
            height: dimensions.height,
            format: dimensions.format,
            metadata: metadata
          };
        } catch (error) {
          console.error('Failed to process photo:', file.name, error);
          // Fallback to basic info if processing fails
          return {
            id: file.name,
            name: file.name,
            path: file.path,
            thumbnail: 'https://via.placeholder.com/300x220?text=No+Preview',
            date: new Date(file.mtime),
            size: file.size,
            metadata: {}
          };
        }
      }));

      setPhotos(photoData);
    } catch (error) {
      console.error('Failed to load photos:', error);
      setError('Failed to load photos from storage: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isImageFile = (filename) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(ext);
  };

  const handleStorageSelect = async (storageId) => {
    const storage = storageLocations.find(s => s.id === storageId);
    if (storage) {
      setSelectedStorage(storageId);
      
      // For cloud storage, connect first
      if (storage.type === 'cloud' && !storage.connected) {
        try {
          const { ipcRenderer } = require('electron');
          const connected = await ipcRenderer.invoke('connect-storage', storage.id);
          if (connected) {
            // Update the storage location to connected
            setStorageLocations(prev => prev.map(s => 
              s.id === storageId ? { ...s, connected: true } : s
            ));
          } else {
            setError('Failed to connect to cloud storage');
            return;
          }
        } catch (error) {
          console.error('Failed to connect to cloud storage:', error);
          setError('Failed to connect to cloud storage: ' + error.message);
          return;
        }
      }
      
      // For cloud storage, use a special path identifier
      const storagePath = storage.type === 'cloud' ? 'MinIO' : storage.path;
      await loadPhotosFromStorage(storagePath);
    }
  };

  const handleAddStorageLocation = async () => {
    try {
      const { ipcRenderer } = require('electron');
      const dirPath = await ipcRenderer.invoke('select-directory');
      
      if (dirPath) {
        const newStorage = {
          id: Date.now().toString(),
          name: dirPath.split('/').pop() || dirPath.split('\\').pop() || 'Custom Location',
          type: 'usb',
          path: dirPath,
          connected: true
        };
        
        setStorageLocations([...storageLocations, newStorage]);
        setSelectedStorage(newStorage.id);
        await loadPhotosFromStorage(dirPath);
      }
    } catch (error) {
      console.error('Failed to add storage location:', error);
      setError('Failed to add storage location: ' + error.message);
    }
  };

  const handleImportPhotos = async () => {
    try {
      const { ipcRenderer } = require('electron');
      const filePaths = await ipcRenderer.invoke('select-files');
      
      if (filePaths.length > 0 && selectedStorage) {
        const storage = storageLocations.find(s => s.id === selectedStorage);
        if (storage) {
          setImporting(true);
          setImportProgress(0);
          
          for (let i = 0; i < filePaths.length; i++) {
            const sourcePath = filePaths[i];
            const fileName = sourcePath.split('/').pop() || sourcePath.split('\\').pop();
            const destPath = storage.type === 'cloud' ? 'MinIO/' + fileName : storage.path + '/' + fileName;
            
            await ipcRenderer.invoke('copy-file', sourcePath, destPath);
            setImportProgress(((i + 1) / filePaths.length) * 100);
          }
          
          setImporting(false);
          setImportProgress(0);
          const storagePath = storage.type === 'cloud' ? 'MinIO' : storage.path;
          await loadPhotosFromStorage(storagePath);
          alert(`Successfully imported ${filePaths.length} photos!`);
        }
      }
    } catch (error) {
      console.error('Failed to import photos:', error);
      setImporting(false);
      setImportProgress(0);
      setError('Failed to import photos: ' + error.message);
    }
  };

  const handleSync = async () => {
    if (!selectedStorage) {
      setError('Please select a storage location first');
      return;
    }

    setSyncing(true);
    try {
      const { ipcRenderer } = require('electron');
      
      // For now, we'll do a simple sync simulation
      // In a real implementation, you'd select target storage and direction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSyncing(false);
      alert('Sync completed! (Demo mode - in production this would sync between storage locations)');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncing(false);
      setError('Sync failed: ' + error.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return React.createElement('div', { style: { fontFamily: 'Arial, sans-serif', padding: '20px' } },
    // Header
    React.createElement('header', { style: { 
      backgroundColor: '#1976d2', 
      color: 'white', 
      padding: '20px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }},
      React.createElement('h1', { style: { margin: 0 } }, 'My Photos'),
      React.createElement('div', null,
        React.createElement('button', { 
          onClick: handleAddStorageLocation,
          style: { 
            backgroundColor: 'white', 
            color: '#1976d2',
            border: 'none',
            padding: '8px 16px',
            marginRight: '10px',
            cursor: 'pointer',
            borderRadius: '4px',
            fontWeight: 'bold'
          }
        }, '+ Add Storage'),
        React.createElement('button', { 
          onClick: handleImportPhotos,
          disabled: importing || !selectedStorage,
          style: { 
            backgroundColor: 'white', 
            color: '#1976d2',
            border: 'none',
            padding: '8px 16px',
            marginRight: '10px',
            cursor: importing || !selectedStorage ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            fontWeight: 'bold',
            opacity: importing || !selectedStorage ? 0.5 : 1
          }
        }, importing ? `Importing (${Math.round(importProgress)}%)` : 'Import Photos'),
        React.createElement('button', { 
          onClick: handleSync,
          disabled: syncing,
          style: { 
            backgroundColor: 'white', 
            color: '#1976d2',
            border: 'none',
            padding: '8px 16px',
            cursor: syncing ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            fontWeight: 'bold'
          }
        }, syncing ? 'Syncing...' : 'Sync')
      )
    ),

    // Error Alert
    error && React.createElement('div', { style: { 
      marginBottom: '20px', 
      padding: '15px', 
      backgroundColor: '#ffebee', 
      borderRadius: '4px',
      border: '1px solid #ef9a9a',
      color: '#c62828',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }},
      React.createElement('span', null, error),
      React.createElement('button', {
        onClick: () => setError(null),
        style: {
          background: 'none',
          border: 'none',
          color: '#c62828',
          cursor: 'pointer',
          fontSize: '18px',
          fontWeight: 'bold'
        }
      }, '×')
    ),

    // Import Progress Bar
    importing && React.createElement('div', { style: { 
      marginBottom: '20px', 
      padding: '15px', 
      backgroundColor: '#f5f5f5', 
      borderRadius: '4px' 
    }},
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }},
        React.createElement('span', { style: { fontWeight: 'bold' } }, 'Importing photos...'),
        React.createElement('span', { style: { color: '#666' } }, `${Math.round(importProgress)}%`)
      ),
      React.createElement('div', { style: { 
        height: '8px', 
        backgroundColor: '#e0e0e0', 
        borderRadius: '4px', 
        overflow: 'hidden' 
      }},
        React.createElement('div', { style: { 
          height: '100%', 
          width: `${importProgress}%`, 
          backgroundColor: '#1976d2', 
          transition: 'width 0.3s ease' 
      }})
      )
    ),

    // Storage Locations Section
    React.createElement('section', null,
      React.createElement('h2', { style: { marginBottom: '15px' } }, 'Storage Locations'),
      React.createElement('div', { style: { display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' } },
        storageLocations.map((storage) =>
          React.createElement('div', {
            key: storage.id,
            onClick: () => handleStorageSelect(storage.id),
            style: {
              border: selectedStorage === storage.id ? '2px solid #1976d2' : '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              cursor: 'pointer',
              minWidth: '200px',
              backgroundColor: storage.connected ? '#f0f8ff' : '#fff0f0',
              flex: '1 0 200px',
              transition: 'box-shadow 0.2s'
            },
            onMouseEnter: (e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.boxShadow = 'none';
            }
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '10px' } },
              React.createElement('span', { style: { fontSize: '20px', marginRight: '8px' } }, '📁'),
              React.createElement('h3', { style: { margin: 0, fontSize: '16px' } }, storage.name)
            ),
            React.createElement('p', { style: { margin: '5px 0', color: '#666', fontSize: '13px' } }, `Type: ${storage.type.toUpperCase()}`),
            React.createElement('p', { style: { margin: '5px 0', color: '#666', fontSize: '11px', wordBreak: 'break-all' } }, storage.path),
            React.createElement('span', { 
              style: { 
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold',
                backgroundColor: storage.connected ? '#e8f5e9' : '#ffebee',
                color: storage.connected ? '#2e7d32' : '#c62828'
              } 
            }, storage.connected ? '✓ Connected' : '✗ Disconnected')
          )
        )
      )
    ),

    // Photos Section
    React.createElement('section', null,
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
        React.createElement('h2', null, selectedStorage ? `Photos (${photos.length})` : 'Select a storage location to view photos'),
        selectedStorage && React.createElement('button', {
          onClick: handleImportPhotos,
          disabled: importing,
          style: {
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            cursor: importing ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            opacity: importing ? 0.5 : 1,
            fontWeight: 'bold'
          }
        }, importing ? 'Importing...' : 'Import Photos')
      ),

      loading ? 
        React.createElement('div', { style: { textAlign: 'center', padding: '40px', color: '#666' } }, 'Loading photos...') :
        photos.length === 0 ?
          React.createElement('div', { style: { textAlign: 'center', padding: '40px', color: '#999', backgroundColor: '#f9f9f9', borderRadius: '8px' } }, 
            React.createElement('div', null,
              React.createElement('p', { style: { fontSize: '18px', marginBottom: '10px' } }, '📷 No photos found'),
              React.createElement('p', null, 'Click "Import Photos" to add some photos to this location.')
            )
          ) :
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' } },
            photos.map((photo) =>
              React.createElement('div', {
                key: photo.id,
                style: {
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              },
                React.createElement('img', {
                  src: photo.thumbnail,
                  alt: photo.name,
                  style: { 
                    width: '100%', 
                    height: '220px', 
                    objectFit: 'cover',
                    backgroundColor: '#f0f0f0'
                  },
                  onError: (e) => {
                    e.target.src = 'https://via.placeholder.com/300x220?text=No+Preview';
                  }
                }),
                React.createElement('div', { style: { padding: '12px' } },
                  React.createElement('p', { style: { margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, photo.name),
                  React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '4px' } },
                    React.createElement('span', null, photo.date.toLocaleDateString()),
                    React.createElement('span', null, formatFileSize(photo.size))
                  ),
                  photo.metadata.camera && React.createElement('div', { style: { fontSize: '11px', color: '#999', marginTop: '4px' } },
                    `📷 ${photo.metadata.camera}`
                  ),
                  photo.metadata.gps && React.createElement('div', { style: { fontSize: '11px', color: '#999', marginTop: '2px' } },
                    `📍 ${photo.metadata.gps.latitude.toFixed(4)}, ${photo.metadata.gps.longitude.toFixed(4)}`
                  )
                )
              )
            )
          )
    )
  );
}

module.exports = App;