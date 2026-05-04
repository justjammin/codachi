const { app, ipcMain, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');
const appState = require('./state');
const { DEFAULT_CONFIG, saveConfig } = require('./config');
const { createSettingsWindow } = require('./windows');

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
}

function registerIpc() {
  ipcMain.handle('config:save', (_, partial) => {
    appState.config = { ...appState.config, ...partial };
    saveConfig(appState.config);
    if ('alwaysOnTop' in partial) appState.petWindow?.setAlwaysOnTop(partial.alwaysOnTop);
    if ('clickThrough' in partial) {
      appState.isClickThrough = partial.clickThrough;
      appState.petWindow?.setIgnoreMouseEvents(appState.isClickThrough, { forward: true });
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
}

module.exports = { registerHotkeys, registerIpc };
