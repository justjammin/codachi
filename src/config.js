const path = require('path');
const fs   = require('fs');
const { app } = require('electron');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

const DEFAULT_CONFIG = {
  x: null, y: null,
  petSize: 200,
  alwaysOnTop: true,
  clickThrough: false,
  autoLaunch: false,
  theme: 'cute',
  vrmPath: null,
  personality: '',
  memoryEnabled: true,
  idleTimerEnabled: true,
  idleMinutes: 1,
  vrmaMap: {
    idle: null, typing: null, reading: null, running: null,
    waiting: null, error: null, done: null, alert: null,
  },
  hotkeys: {
    togglePet:    'CommandOrControl+Shift+P',
    triggerWave:  'CommandOrControl+Shift+W',
    triggerSleep: 'CommandOrControl+Shift+S',
  },
};

function loadConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch { return { ...DEFAULT_CONFIG }; }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

module.exports = { CONFIG_PATH, DEFAULT_CONFIG, loadConfig, saveConfig };
