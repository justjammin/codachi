const { app } = require('electron');
const appState = require('./state');
const { loadConfig } = require('./config');
const { createPetWindow, createSetupWindow } = require('./windows');
const { createTray } = require('./tray');
const { registerHotkeys, registerIpc } = require('./ipc');
const transcriptWatcher = require('./transcript-watcher');

appState.config = loadConfig();
appState.isClickThrough = appState.config.clickThrough;

registerIpc();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { appState.petWindow?.focus(); });

  app.whenReady().then(() => {
    createPetWindow();
    createTray();
    registerHotkeys();

    if (!appState.config.vrmPath) {
      appState.petWindow.hide();
      createSetupWindow();
    }

    transcriptWatcher.on('session-update', (data) => {
      appState.petWindow?.webContents.send('session-update', data);
    });
    transcriptWatcher.on('session-end', (data) => {
      appState.petWindow?.webContents.send('session-end', data);
    });
    transcriptWatcher.start();

    app.on('activate', () => { if (!appState.petWindow) createPetWindow(); });
  });

  app.on('will-quit', () => {
    transcriptWatcher.stop();
  });

  app.on('window-all-closed', () => {
    // Keep running in tray
  });
}
