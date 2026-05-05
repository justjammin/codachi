import { init as sceneInit } from './scene.js';
import { init as uiInit, showSpeech, spawnAgent, openSettings } from './ui.js';
import { init as bridgeInit } from './bridge.js';

// Hash-based mode detection — must run before any init
const _hash = window.location.hash;
if (_hash === '#settings') document.body.classList.add('settings-mode');
else if (_hash === '#setup') document.body.classList.add('setup-mode');

// Acquire VS Code API (throws outside VS Code — caught silently)
let vscode = null;
try { vscode = acquireVsCodeApi(); } catch (_) {}
window._vscode = vscode;

// Wire scene callbacks before any VRM loads
sceneInit({ showSpeech });

// Attach all DOM event listeners
uiInit();

// Wire IDE bridge + announce ready
bridgeInit(vscode);

// Boot: spawn first agent (sim off by default)
spawnAgent();

// Settings-mode: open drawer immediately
if (_hash === '#settings') {
  requestAnimationFrame(openSettings);
}

// Setup mode: wire file picker + drag-drop for first-run VRM selection
if (_hash === '#setup') {
  initSetupMode();
}

// Pet mode: listen for vrm:loadPath from main process (after setup completes)
if (_hash !== '#settings' && _hash !== '#setup') {
  window.anibuddy?.onVrmLoadPath?.((filePath) => {
    import('./scene.js').then(({ loadVRM }) => {
      loadVRM('file://' + filePath);
    });
  });

  // Restore persisted video background
  window.anibuddy?.getConfig?.().then(cfg => {
    if (cfg?.videoBgPath) {
      import('./ui/background.js').then(({ loadVideoFromPath }) => loadVideoFromPath(cfg.videoBgPath));
    }
  });

  // Listen for live video bg changes from settings window
  window.anibuddy?.onVideoBg?.((filePath) => {
    import('./ui/background.js').then(({ loadVideoFromPath }) => loadVideoFromPath(filePath));
  });
}

function initSetupMode() {
  const setupFileInput = document.getElementById('file-input');
  const setupLoadBtn   = document.getElementById('load-btn');

  setupLoadBtn?.addEventListener('click', () => setupFileInput?.click());

  setupFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith('.vrm')) return;
    const filePath = file.path; // Electron exposes real FS path on File objects
    if (window.anibuddy?.setupComplete) {
      await window.anibuddy.setupComplete(filePath);
    }
  });

  // Support drag-drop onto the setup viewport
  document.getElementById('viewport')?.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file?.name.endsWith('.vrm')) return;
    if (window.anibuddy?.setupComplete) {
      await window.anibuddy.setupComplete(file.path);
    }
  });
}