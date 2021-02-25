const {app, BrowserWindow, ipcMain} = require('electron');
const url = require('url');
const path = require('path');
const Store = require('electron-store');

// // Enable live reload for Electron too
// require('electron-reload')(__dirname, {
//   // Note that the path to electron may vary according to the main file
//   electron: require(`${__dirname}/node_modules/electron`)
// });

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `/dist/index.html`),
      protocol: 'file:',
      slashes: true
    })
  );
  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.removeMenu();
}

function saveData(data) {
  const store = new Store();

  store.set('tasks', data);
}

function loadData() {
  const store = new Store();
  const tasks = store.get('tasks');

  return tasks?tasks:[];
}

ipcMain.on('save', (event, arg) =>
  saveData(arg)
);

ipcMain.on('load', (event, arg) =>
  event.sender.send('loadResult', loadData())
);

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { app.quit(); }
});

app.on('activate', () => {
  if (mainWindow === null) { createWindow(); }
});
