import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  FolderOpen as FolderIcon,
  CloudUpload as UploadIcon,
  Sync as SyncIcon,
  Add as AddIcon
} from '@mui/icons-material';

function App() {
  const [photos, setPhotos] = useState([]);
  const [storageLocations, setStorageLocations] = useState([]);
  const [selectedStorage, setSelectedStorage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
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

      const photoData = imageFiles.map(file => ({
        id: file.name,
        name: file.name,
        path: file.path,
        thumbnail: file.path,
        date: new Date(file.mtime),
        size: file.size
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
      await loadPhotosFromStorage(storage.path);
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
            const destPath = storage.path + '/' + fileName;
            
            await ipcRenderer.invoke('copy-file', sourcePath, destPath);
            setImportProgress(((i + 1) / filePaths.length) * 100);
          }
          
          setImporting(false);
          setImportProgress(0);
          await loadPhotosFromStorage(storage.path);
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

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      alert('Sync completed!');
    }, 3000);
  };

  const createObjectURL = (filePath) => {
    return 'file://' + filePath;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My Photos
          </Typography>
          <Button
            color="inherit"
            startIcon={<AddIcon />}
            onClick={handleAddStorageLocation}
            sx={{ mr: 1 }}
          >
            Add Storage
          </Button>
          <Button
            color="inherit"
            startIcon={<UploadIcon />}
            onClick={handleImportPhotos}
            disabled={importing || !selectedStorage}
            sx={{ mr: 1 }}
          >
            {importing ? `Importing (${Math.round(importProgress)}%)` : 'Import Photos'}
          </Button>
          <Button
            color="inherit"
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {importing && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress variant="determinate" value={importProgress} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Importing photos... {Math.round(importProgress)}%
            </Typography>
          </Box>
        )}

        <Typography variant="h5" gutterBottom>
          Storage Locations
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {storageLocations.map((storage) => (
            <Grid item xs={12} sm={6} md={4} key={storage.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: selectedStorage === storage.id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
                onClick={() => handleStorageSelect(storage.id)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FolderIcon sx={{ mr: 1, color: storage.connected ? 'success.main' : 'error.main' }} />
                    <Typography variant="subtitle1">{storage.name}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Type: {storage.type.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    Path: {storage.path}
                  </Typography>
                  <Chip
                    label={storage.connected ? 'Connected' : 'Disconnected'}
                    color={storage.connected ? 'success' : 'error'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Typography variant="h5" gutterBottom>
          {selectedStorage ? `Photos (${photos.length})` : 'Select a storage location to view photos'}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography>Loading photos...</Typography>
          </Box>
        ) : photos.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <Typography>
              No photos found in this location. Click "Import Photos" to add some.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {photos.map((photo) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                <Card>
                  <CardMedia
                    component="img"
                    height="200"
                    image={createObjectURL(photo.path)}
                    alt={photo.name}
                    sx={{ backgroundColor: '#f0f0f0' }}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x200?text=No+Preview';
                    }}
                  />
                  <CardContent>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 'bold' }}>
                      {photo.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {photo.date.toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatFileSize(photo.size)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}

export default App;