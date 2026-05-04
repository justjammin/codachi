const { app, Tray, Menu, nativeImage } = require('electron');
const appState = require('./state');
const { saveConfig } = require('./config');
const { createSettingsWindow } = require('./windows');

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGASURBVDiNpZMxSBtRGMd/l7t3ubiLgYODg4ODg4NSHBwEBwdBEBwEB0EQwkFwEARBEAwhBEEQhBAEQRCCEAIhBCEEQhBCIAQhBEIIQhCEEIQQCCEEQhBCIAQhhEAIQQiBEIQQCEEIQhCEIAhBCEIQhCCEIAhBCEIIghCEIAhBCEIQghCEIAhBCEIQghCEIAghCEIQhCCEIAhBCEIQhCCEIAhCCEIQhCCEIIQgCCEIQhCEIAhBCEIIhCCEIAhBCIIQhCAIQQiCEIQgCEEIQhCCIAQhCEIQhCCEIIQgCEEIQhCCEIQQhCCEIAhBCEIQhCCEIAhBCEIQhCCEIAhBCEIQhCCEIAhBCEIQhBCEIAhBCEIQhCCEIAhBCEIQhCCEIAhBCEIQhCCEIAhBCEIQhBCEIAhBCEIQhCCEIAhBCEIQhCCEIAhBCEIQhCCEIAhBCEIQhBCEIAhBCEIQhCCEIAhBCEIQhCCEIAhBCEIQhCCEIAhBCEIQhBCEIAhBCEIQhBD/AH8BZfkGpMsAAAAASUVORK5CYII='
  );

  appState.tray = new Tray(icon);
  appState.tray.setToolTip('tomodachi');

  const buildMenu = () => Menu.buildFromTemplate([
    { label: 'tomodachi', enabled: false },
    { type: 'separator' },
    { label: 'Show / Hide', click: () => {
      if (appState.petWindow?.isVisible()) appState.petWindow.hide();
      else appState.petWindow?.show();
    }},
    { label: 'Click-Through', type: 'checkbox', checked: appState.isClickThrough, click: (item) => {
      appState.isClickThrough = item.checked;
      appState.config.clickThrough = appState.isClickThrough;
      saveConfig(appState.config);
      appState.petWindow?.setIgnoreMouseEvents(appState.isClickThrough, { forward: true });
    }},
    { label: 'Always on Top', type: 'checkbox', checked: appState.config.alwaysOnTop, click: (item) => {
      appState.config.alwaysOnTop = item.checked;
      saveConfig(appState.config);
      appState.petWindow?.setAlwaysOnTop(item.checked);
    }},
    { type: 'separator' },
    { label: 'Settings…', click: createSettingsWindow },
    { label: 'Change Model…', click: () => appState.petWindow?.webContents.send('navigate', 'onboard') },
    { type: 'separator' },
    { label: 'Quit tomodachi', click: () => app.quit() },
  ]);

  appState.tray.setContextMenu(buildMenu());

  appState.tray.on('click', () => {
    appState.tray.setContextMenu(buildMenu());
    appState.petWindow?.isVisible() ? appState.petWindow.focus() : appState.petWindow?.show();
  });
}

module.exports = { createTray };
