const { BrowserWindow, Menu, screen } = require('electron');
const path = require('path');
const appState = require('./state');
const { saveConfig } = require('./config');

function getRebuildTray() {
  return require('./tray').rebuildTray;
}

const WIN_W = 220, WIN_H = 280;

function createPetWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const x = workArea.x;
  const y = workArea.y + workArea.height - WIN_H - 24;

  appState.petWindow = new BrowserWindow({
    x, y,
    width: WIN_W, height: WIN_H,
    transparent: true,
    frame: false,
    alwaysOnTop: appState.config.alwaysOnTop,
    skipTaskbar: false,
    hasShadow: false,
    resizable: false,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  appState.petWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  if (appState.isClickThrough) {
    appState.petWindow.setIgnoreMouseEvents(true, { forward: true });
  }

  appState.petWindow.on('moved', () => {
    const [px, py] = appState.petWindow.getPosition();
    appState.config.x = px; appState.config.y = py;
    saveConfig(appState.config);
  });

  appState.petWindow.on('closed', () => { appState.petWindow = null; });

  appState.petWindow.webContents.on('context-menu', () => {
    if (appState._lastDragWas) {
      appState._lastDragWas = false;
      return;
    }
    Menu.buildFromTemplate([
      { label: 'Settings…', click: createSettingsWindow },
      { label: 'Always on Top', type: 'checkbox', checked: appState.config.alwaysOnTop, click: (item) => {
        appState.config.alwaysOnTop = item.checked;
        saveConfig(appState.config);
        appState.petWindow?.setAlwaysOnTop(item.checked);
        getRebuildTray()();
      }},
      { label: 'Click-Through', type: 'checkbox', checked: appState.isClickThrough, click: (item) => {
        appState.isClickThrough = item.checked;
        appState.config.clickThrough = appState.isClickThrough;
        saveConfig(appState.config);
        appState.petWindow?.setIgnoreMouseEvents(appState.isClickThrough, { forward: true });
        getRebuildTray()();
      }},
      { type: 'separator' },
      { label: 'Quit tomodachi', click: () => require('electron').app.quit() },
    ]).popup({ window: appState.petWindow });
  });
}

function createSettingsWindow() {
  if (appState.settingsWindow) { appState.settingsWindow.focus(); return; }

  appState.settingsWindow = new BrowserWindow({
    width: 340,
    height: 620,
    title: 'tomodachi Settings',
    frame: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  appState.settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), {
    hash: 'settings',
  });

  appState.settingsWindow.on('closed', () => { appState.settingsWindow = null; });
}

function createSetupWindow() {
  if (appState.setupWindow) { appState.setupWindow.focus(); return; }

  const { workArea } = screen.getPrimaryDisplay();
  appState.setupWindow = new BrowserWindow({
    width: 560,
    height: 420,
    x: Math.round(workArea.x + (workArea.width - 560) / 2),
    y: Math.round(workArea.y + (workArea.height - 420) / 2),
    title: 'tomodachi — Load Your VRM Model',
    frame: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  appState.setupWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), {
    hash: 'setup',
  });

  appState.setupWindow.on('closed', () => { appState.setupWindow = null; });
}

module.exports = { createPetWindow, createSettingsWindow, createSetupWindow, WIN_W, WIN_H };
