const { app, ipcMain, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');
const appState = require('./state');
const { DEFAULT_CONFIG, saveConfig } = require('./config');
const { createSettingsWindow } = require('./windows');

let _dragWinOrigin = null;
let _dragMouseOrigin = null;

function registerHotkeys() {
  globalShortcut.unregisterAll();
  const hk = appState.config.hotkeys || DEFAULT_CONFIG.hotkeys;

  const safe = (combo, fn) => {
    try { globalShortcut.register(combo, fn); }
    catch(e) { console.warn(`Could not register hotkey: ${combo}`, e); }
  };

  safe(hk.togglePet, () => {
    if (!appState.petWindow) return;
    appState.petWindow.isVisible() ? appState.petWindow.hide() : appState.petWindow.show();
  });

  safe(hk.triggerWave, () => {
    appState.petWindow?.webContents.send('hotkey', 'triggerWave');
  });

  safe(hk.triggerSleep, () => {
    appState.petWindow?.webContents.send('hotkey', 'triggerSleep');
  });

  safe(appState.config.hotkeys.toggleClickThrough ?? 'CommandOrControl+Shift+T', () => {
    appState.isClickThrough = !appState.isClickThrough;
    appState.config.clickThrough = appState.isClickThrough;
    saveConfig(appState.config);
    appState.petWindow?.setIgnoreMouseEvents(appState.isClickThrough, { forward: true });
    require('./tray').rebuildTray?.();
  });
}

function registerIpc() {
  ipcMain.handle('config:save', (_, partial) => {
    appState.config = { ...appState.config, ...partial };
    saveConfig(appState.config);
    if ('alwaysOnTop' in partial) appState.petWindow?.setAlwaysOnTop(partial.alwaysOnTop);
    if ('clickThrough' in partial) {
      appState.isClickThrough = partial.clickThrough;
      appState.petWindow?.setIgnoreMouseEvents(appState.isClickThrough, { forward: true });
      require('./tray').rebuildTray?.();
    }
    if ('theme' in partial) appState.petWindow?.webContents.send('theme-change', partial.theme);
    if ('hotkeys' in partial) registerHotkeys();
    return appState.config;
  });

  ipcMain.handle('config:get', () => appState.config);

  ipcMain.handle('vrm:pick', async () => {
    const result = await dialog.showOpenDialog(appState.petWindow, {
      title: 'Choose VRoid Model',
      filters: [{ name: 'VRoid Model', extensions: ['vrm'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const vrmPath = result.filePaths[0];
    appState.config.vrmPath = vrmPath;
    saveConfig(appState.config);
    return vrmPath;
  });

  ipcMain.handle('vrm:read', async (_, filePath) => {
    const buf = fs.readFileSync(filePath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  });

  ipcMain.handle('vrma:load', async (_, stateId) => {
    const clipPath = appState.config.vrmaMap?.[stateId];
    if (!clipPath) return null;
    const resolved = path.isAbsolute(clipPath)
      ? clipPath
      : path.join(app.getAppPath(), clipPath);
    try {
      const buf = fs.readFileSync(resolved);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    } catch(e) {
      console.warn(`Could not load vrma for ${stateId}:`, e.message);
      return null;
    }
  });

  ipcMain.handle('window:resize', (_, { width, height }) => {
    appState.petWindow?.setSize(width, height);
  });

  ipcMain.handle('window:openSettings', () => {
    createSettingsWindow();
  });

  ipcMain.on('window:dragStart', (_, { x, y }) => {
    if (!appState.petWindow) return;
    _dragWinOrigin = appState.petWindow.getPosition();
    _dragMouseOrigin = { x, y };
  });

  ipcMain.on('window:dragMove', (_, { x, y }) => {
    if (!_dragWinOrigin || !appState.petWindow) return;
    appState.petWindow.setPosition(
      _dragWinOrigin[0] + (x - _dragMouseOrigin.x),
      _dragWinOrigin[1] + (y - _dragMouseOrigin.y)
    );
  });

  ipcMain.on('window:dragEnd', (_, { wasDrag }) => {
    if (wasDrag && appState.petWindow) {
      const [px, py] = appState.petWindow.getPosition();
      appState.config.x = px;
      appState.config.y = py;
      saveConfig(appState.config);
    }
    appState._lastDragWas = wasDrag;
    _dragWinOrigin = null;
    _dragMouseOrigin = null;
  });

  ipcMain.handle('setup:complete', (_, { vrmPath }) => {
    appState.config.vrmPath = vrmPath;
    saveConfig(appState.config);
    appState.setupWindow?.close();
    if (appState.petWindow) {
      appState.petWindow.show();
      appState.petWindow.focus();
      appState.petWindow.webContents.send('vrm:loadPath', vrmPath);
    }
  });

  ipcMain.handle('video:pick', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose Background Video or GIF',
      filters: [{ name: 'Video / GIF', extensions: ['mp4', 'webm', 'gif'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0];
    appState.config.videoBgPath = filePath;
    saveConfig(appState.config);
    appState.petWindow?.webContents.send('video:bg', filePath);
    return filePath;
  });

  ipcMain.handle('video:clearbg', () => {
    appState.config.videoBgPath = null;
    saveConfig(appState.config);
    appState.petWindow?.webContents.send('video:bg', null);
  });
}

module.exports = { registerHotkeys, registerIpc };
