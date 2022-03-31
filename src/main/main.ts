/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import chokidar from 'chokidar';
import { promises as fs } from 'fs';
import { readdir } from 'fs/promises';
import ElectronGoogleOAuth2 from '@getstation/electron-google-oauth2';
import { Description } from '@mui/icons-material';
import { resolveHtmlPath } from './util';
import MenuBuilder from './menu';

const Photos = require('./googlephotos');

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('portris-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      // devTools: false,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater()
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    ipcMain.handle('google-login', googleLogin);
    ipcMain.handle('select-dir', selectDir);
    ipcMain.handle('refresh-dir', refreshDir);
    ipcMain.handle('upload-image', uploadImage);
    ipcMain.handle('upload-album', uploadAlbum);
    // ipcMain.handle('load-state', loadState)
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

// ***** Google auth code *****

let googleTokens = {};

const googleApiConfig = new ElectronGoogleOAuth2(
  '406102890446-skov7kj2p2ikrs3n9jc3q0kj04p1h51a.apps.googleusercontent.com',
  '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',
  [
    'https://www.googleapis.com/auth/photoslibrary',
    'https://www.googleapis.com/auth/photoslibrary.sharing',
  ],
  { successRedirectURL: 'https://photos.google.com/' }
);

async function googleLogin() {
  googleApiConfig
    .openAuthWindowAndGetTokens()
    .then((tokens) => {
      googleTokens = tokens;
      console.log(googleTokens);
      mainWindow.webContents.send('connected-to-google', true);
      // const photos = new Photos(tokens.access_token)
      // (async () => {
      //   await photos.albums.list()
      //   .then((albums: any) => {
      //     mainWindow && mainWindow.webContents.send('load-albums', albums)
      //   })
      //   .catch(console.error)
      // })();
    })
    .catch(console.error);
}

// **** Manage albums *****

const uploadImage = async () => {
  const photosApi = new Photos(googleTokens.access_token);
  photosApi.albums
    .create('Portris Test')
    .then(async (response) => {
      console.log(response);
      response = await photosApi.mediaItems.upload(
        'AKOgf2jo3QIS2QtMzXddnocGKpyYCOqetKszICChOIoOwy_5b4e3Up0Y9DEsLtlUe0wfU5WRUL2t',
        'swim_gang.jpg',
        '/home/brian/watch_me/my_album/swim_gang.jpg',
        'uploaded with portris'
      );
      return response;
    })
    .then((response) => {
      console.log(response);
    })
    .catch((err) => {
      console.log(err);
    });
};

const dotAlbumFile = '.portris_albums';

const getAlbumName = (albumDir: any) => {
  const name = path
    .basename(albumDir)
    .toLowerCase()
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
    .join(' ');
  const now = new Date();
  return `Portris Upload - ${now.toLocaleDateString('en-US')} - ${name}`;
};

const uploadAlbum = (dir: string = '/home/brian/watch_me/my_album', albumId?: string) => {
  console.log(`Uploading ${dir}`);
  const photosApi = new Photos(googleTokens.access_token);
  fs.readdir(dir)
    .then(async (files) => {
      const fileObjs = [];
      files.forEach((file, index) => {
        fileObjs.push({
          name: file,
          description: 'Uploaded by Portris',
        });
      });
      if (!albumId) {
        albumId = await photosApi.albums.create(getAlbumName(dir));
        fs.writeFile(
          `${dir}/${dotAlbumFile}`,
          JSON.stringify({
            albumdId: albumId,
          })
        );
      }
      return [ albumId, fileObjs, dir, 1000 ]
    })
    .then((uploadArgs) => {
      console.log(`${fileObjs.length} photos uploading now`);
      photosApi.mediaItems.uploadMultiple(...uploadArgs);
    })
    .catch((err) => {
      console.log(err);
    });
};

// const syncAlbums = (dirs: any) => {
//   dirs.map((dir: any) => {
//     const fullPath = `${watchedDir}/${dir.name}`;
//     fs.access(fullPath + dotAlbumFile, fs.F_OK, (err) => {
//       if (err) {
//         // Creating album for the first time
//         uploadPhotos(fullPath);
//         return;
//       }
//       // Album exists, update with new photos?
//       // Sync file system calls were messing up app?

//       const savedAlbums = fs.readFile(
//         fullPath + dotAlbumFile,
//         'utf8',
//         (saveErr, data) => {
//           console.log(data);
//         }
//       );
//     });
//   });
// };

// ***** File management code *****

let watchedDir = '';

const checkIfDirectory = async (dirPath: any, file: any) => {
  return fs
    .stat(`${dirPath}/${file}`)
    .then((fileInfo) => {
      if (fileInfo.isDirectory()) {
        return {
          name: file,
          ...fileInfo,
        };
      }
      return false;
    })
    .catch((err) => {
      console.log(err);
    });
};

const getDirectories = async (dirPath: any) => {
  fs.readdir(dirPath)
    .then(async (files) => {
      return Promise.all(
        files.map(async (f) => {
          return checkIfDirectory(dirPath, f).then((fileStat) => {
            return fileStat;
          })
        })
      );
    })
    .then((finalDirs) => {
      mainWindow.webContents.send('load-directories', finalDirs);
    })
    .catch((err) => {
      console.log(err);
    });
};

async function refreshDir() {
  getDirectories(watchedDir);
}

const watchDirectory = (selectedDirectory: string) => {
  if (!selectedDirectory) return;
  chokidar
    .watch(selectedDirectory, {
      persistent: true,
      alwaysStat: true,
    })
    .on('all', (event, cDir) => {
      console.log(cDir);
      getDirectories(selectedDirectory);
    });
  // store.set('watched-directory', selectedDirectory)
};

async function selectDir() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (canceled) {
    return false;
  }
  [watchedDir] = filePaths;
  // watchDirectory(watchedDir);
  refreshDir();
  return watchedDir;
}

// async function loadState () {
//   if (store.get('google-auth-object')) {
//     const googleAuthObject = store.get('google-auth-object')
//     googleApiConfig.setTokens({ refresh_token: googleAuthObject.refresh_token })
//     googlePhotosApi = new Photos(googleAuthObject.access_token)
//   }
//   if (store.get('watched-directory')) {
//     watchDirectory(store.get('watched-directory'))
//   }
// }
