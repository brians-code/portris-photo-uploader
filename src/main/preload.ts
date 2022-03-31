const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    myPing() {
      ipcRenderer.send('ipc-example', 'ping');
    },
    on(channel, func) {
      const validChannels = ['ipc-example', 'dialog:openFile'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      const validChannels = ['ipc-example'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
  },
  selectDirR: () => ipcRenderer.invoke('select-dir'),
  loadDirectoriesR: (callback) => ipcRenderer.once('load-directories', callback),
  isConnectedR: (callback) => ipcRenderer.once('connected-to-google', callback),
  googleLoginR: () => ipcRenderer.invoke('google-login'),
  refreshDirR: () => ipcRenderer.invoke('refresh-dir'),
  uploadImageR: () => ipcRenderer.invoke('upload-image'),
  uploadAlbumR: () => ipcRenderer.invoke('upload-album'),
  //  loadState: () => ipcRenderer.invoke('load-state'),
});
