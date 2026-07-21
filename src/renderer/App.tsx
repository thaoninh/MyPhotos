import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';
import SyncIcon from '@mui/icons-material/Sync';
import SettingsIcon from '@mui/icons-material/Settings';
import CircularProgress from '@mui/material/CircularProgress';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

interface Photo {
  id: string;
  name: string;
  path: string;
  thumbnail: string;
  date: Date;
  size: number;
}

interface StorageLocation {
  id: string;
  name: string;
  type: 'usb' | 'nas' | 'cloud';
  path: string;
  connected: boolean;
}

function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Initialize with some demo storage locations
    setStorageLocations([
      {
        id: '1',
        name: 'Photos Backup Drive',
        type: 'usb',
        path: '/Volumes/Photos',
        connected: false
      },
      {
        id: '2',
        name: 'NAS Storage',
        type: 'nas',
        path: '//nas/photos',
        connected: true
      },
      {
        id: '3',
        name: 'Personal Cloud',
        type: 'cloud',
        path: 'https://cloud.example.com/photos',
        connected: true
      }
    ]);

    // Load demo photos
    loadDemoPhotos();
  }, []);

  const loadDemoPhotos = () => {
    setLoading(true);
    // Simulate loading photos from storage
    setTimeout(() => {
      setPhotos([
        {
          id: '1',
          name: 'IMG_001.jpg',
          path: '/photos/IMG_001.jpg',
          thumbnail: 'https://via.placeholder.com/300x200?text=Photo+1',
          date: new Date('2024-01-15'),
          size: 2048000
        },
        {
          id: '2',
          name: 'IMG_002.jpg',
          path: '/photos/IMG_002.jpg',
          thumbnail: 'https://via.placeholder.com/300x200?text=Photo+2',
          date: new Date('2024-01-16'),
          size: 3072000
        },
        {
          id: '3',
          name: 'IMG_003.jpg',
          path: '/photos/IMG_003.jpg',
          thumbnail: 'https://via.placeholder.com/300x200?text=Photo+3',
          date: new Date('2024-01-17'),
          size: 1536000
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const handleStorageSelect = (storageId: string) => {
    setSelectedStorage(storageId);
    // In a real app, this would load photos from the selected storage
    loadDemoPhotos();
  };

  const handleSync = () => {
    setSyncing(true);
    // Simulate sync process
    setTimeout(() => {
      setSyncing(false);
      alert('Sync completed!');
    }, 3000);
  };

  const handleImportPhotos = () => {
    // In a real app, this would open a file dialog
    alert('Photo import feature - would open file dialog');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <StorageIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Local Photos
            </Typography>
            <IconButton color="inherit" onClick={handleImportPhotos}>
              <FolderIcon />
            </IconButton>
            <IconButton color="inherit" onClick={handleSync} disabled={syncing}>
              {syncing ? <CircularProgress size={24} color="inherit" /> : <SyncIcon />}
            </IconButton>
            <IconButton color="inherit">
              <SettingsIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 4 }}>
          {/* Storage Selection */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Storage Locations
            </Typography>
            <Grid container spacing={2}>
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
                        <StorageIcon sx={{ mr: 1, color: storage.connected ? 'success.main' : 'error.main' }} />
                        <Typography variant="subtitle1">{storage.name}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Type: {storage.type.toUpperCase()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Path: {storage.path}
                      </Typography>
                      <Typography variant="body2" color={storage.connected ? 'success.main' : 'error.main'}>
                        {storage.connected ? 'Connected' : 'Disconnected'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Photo Gallery */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {selectedStorage ? 'Photos' : 'Select a storage location to view photos'}
              </Typography>
              {selectedStorage && (
                <Button variant="contained" onClick={handleImportPhotos}>
                  Import Photos
                </Button>
              )}
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {photos.map((photo) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="200"
                        image={photo.thumbnail}
                        alt={photo.name}
                      />
                      <CardContent>
                        <Typography variant="body2" noWrap>
                          {photo.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {photo.date.toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;