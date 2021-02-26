/// <reference path="main.d.ts" />

// ONE DAY add test suite http://www.protractortest.org/#/

const {app, BrowserWindow, ipcMain, Menu, Tray} = require('electron');
const url = require('url');
const path = require('path');
const Store = require('electron-store');

// // Enable live reload for Electron too
// require('electron-reload')(__dirname, {
//   // Note that the path to electron may vary according to the main file
//   electron: require(`${__dirname}/node_modules/electron`)
// });

let mainWindow;
let tray = null;

// TODO fix tray context menu behavior

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, '/dist/icons/icon@2.png')
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

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting){
        event.preventDefault();
        mainWindow.hide();
    }

    return false;
  });

  tray = new Tray(path.join(__dirname, '/dist/icons/icon@2.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: () => {
      mainWindow.show();
    } },
    { label: 'Quit', click: () => {
      app.isQuiting = true;
      app.quit();
    } }
  ]);
  tray.setToolTip('Gerbil Time Tracker');
  tray.setTitle('Gerbil Time Tracker');
  tray.setIgnoreDoubleClickEvents(true);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    tray.popUpContextMenu();
  });
  tray.on('double-click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

function saveData(data) {
  const store = new Store();

  store.set('tasks', data);
}

function loadData() {
  const store = new Store();
  const tasks = store.get('tasks');

  return tasks ? tasks : [];
}

ipcMain.on('save', (event, arg) =>
  saveData(arg)
);

ipcMain.on('load', (event, arg) =>
  event.sender.send('loadResult', loadData())
);

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { app.quit(); }
});

app.on('activate', () => {
  if (mainWindow === null) { createWindow(); }
});

app.whenReady().then(() => {
});
