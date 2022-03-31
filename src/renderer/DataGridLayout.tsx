import { useEffect, useState } from 'react';
import { DataGrid, GridRowsProp, GridColDef } from '@mui/x-data-grid';
import {
  Button,
  Container,
  Box,
  Typography,
  AppBar,
  Grid,
  Chip,
} from '@mui/material';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import { Replay, FolderOutlined } from '@mui/icons-material';
import FileManager from './FileManager';

declare global {
  interface Window {
    electron: any;
  }
}

const uploadImage = async (params) => {
  console.log('uploading');
  const filePath = await window.electron.uploadImageR('/home/brian/watch_me/brooklyn_bridge/test_image.jpeg');
};

const UploadButton = (params) => {
  console.log(params);
  return (
    <Button
      variant="outlined"
      onClick={() => window.electron.uploadAlbumR()}
    >
      Upload
    </Button>
  );
};

const columns: GridColDef[] = [
  { field: 'name', headerName: 'Name', minWidth: 100, flex: 0.5 },
  {
    field: 'actions',
    headerName: 'Actions',
    minWidth: 100,
    flex: 0.5,
    renderCell: (params) => UploadButton(params),
  },
  // { field: 'created_at', headerName: 'Created At', minWidth: 150, flex: 1 },
  // { field: 'modified_at', headerName: 'Modified At', minWidth: 150, flex: 1 },
];

export default function DataGridLayout() {
  const [rows, setRows] = useState([]);
  const [watchDir, setWatchDir] = useState();
  const [connected, setConnected] = useState(false);

  const directoryToAlbumName = (dir: string) => {
    return dir
      .toLowerCase()
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
      .join(' ');
  };

  const selectDir = async () => {
    const filePath = await window.electron.selectDirR();
    setWatchDir(filePath);
  };

  const refreshDir = async () => {
    await window.electron.refreshDirR(watchDir);
  };

  const loginToGoogle = async () => {
    await window.electron.googleLoginR();
  };

  window.electron.loadDirectoriesR((event: any, directories: any) => {
    const albumRows: any = [];
    directories.map((dir: any) => {
      const created_at = new Date(dir.birthtimeMs);
      const modified_at = new Date(dir.mtimeMs);
      albumRows.push({
        id: dir.name,
        name: directoryToAlbumName(dir.name),
        actions: {},
        created_at: created_at.toLocaleString('en-US'),
        modified_at: modified_at.toLocaleString('en-US'),
      });
      console.log(albumRows);
      return albumRows;
    });
    setRows(albumRows);
  });

  window.electron.isConnectedR((event: any, is_connected: boolean) => {
    setConnected(is_connected);
  });

  const TopBar = (props) => {
    return (
      <Box sx={{ margin: 0, padding: '10px', height: 60 }}>
        <Button
          variant="outlined"
          sx={{
            background: 'white',
            margin: '0 10px 0 0',
            textTransform: 'none',
          }}
          startIcon={<FolderOutlined />}
          id="selectDirectory"
          onClick={selectDir}
        >
          {watchDir || 'Select Directory'}
        </Button>

        {watchDir && (
          <Button
            variant="outlined"
            sx={{ background: 'white', margin: '0 10px' }}
            startIcon={<Replay />}
            id="refreshDirectory"
            onClick={refreshDir}
          >
            Refresh
          </Button>
        )}
      </Box>
    );
  };

  const BottomBar = (props) => {
    if (connected) {
      return (
        <Box
          sx={{
            margin: 0,
            position: 'fixed',
            bottom: 0,
            right: 0,
            left: 0,
            height: 55,
            padding: '10px',
          }}
        >
          <Button
            variant="outlined"
            color="success"
            startIcon={<PersonOutlineOutlinedIcon />}
            onClick={(e) => {
              setConnected(false);
            }}
          >
            Connected
          </Button>
        </Box>
      );
    }
    return (
      <Box
        sx={{
          margin: 0,
          position: 'fixed',
          bottom: 0,
          right: 0,
          left: 0,
          height: 55,
          padding: '10px',
        }}
      >
        <Button
          variant="outlined"
          startIcon={<PersonOutlineOutlinedIcon />}
          onClick={loginToGoogle}
        >
          Login To Google
        </Button>
      </Box>
    );
  };

  return (
    <Box>
      <TopBar />
      <DataGrid
        autoHeight
        // throttleRowsMs={2000}
        rows={rows}
        columns={columns}
      />
      {UploadButton('test')}
      <BottomBar />
    </Box>
  );
}
