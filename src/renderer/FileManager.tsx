import { Button } from '@mui/material';

declare global {
  interface Window {
    electron: any;
  }
}

const openFileDialog = async () => {
  const filePath = await window.electron.openFile();
  document.getElementById('selectDirectory').innerText = filePath;
};

window.electron.handleCounter((event, files) => {
  const counter = document.getElementById('fileCount');
  let fileNames = 'Files:\n';
  files.map((f) => {
    fileNames += `${f}\n`;
  });
  counter.innerText = fileNames;
});

const FileManager = () => {
  return (
    <div>
      <Button id="selectDirectory" onClick={openFileDialog}>
        Open a Directory
      </Button>
      <div id="fileCount">No files found</div>
    </div>
  );
};

export default FileManager;
