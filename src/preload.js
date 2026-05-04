/**
 * tomodachi — Electron Preload Script
 * 
 * Exposes a safe, typed bridge from the renderer to the main process.
 * Uses contextBridge so renderer code can call window.tomodachi.*
 * without having direct access to Node.js APIs.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('anibuddy', {
  // ── Config ──────────────────────────────────────────────────────────────
  /** Get the full config object */
  getConfig: () => ipcRenderer.invoke('config:get'),

  /** Merge partial config and persist */
  saveConfig: (partial) => ipcRenderer.invoke('config:save', partial),

  // ── VRM Model ────────────────────────────────────────────────────────────
  /** Show native file picker, returns chosen path or null */
  pickVRM: () => ipcRenderer.invoke('vrm:pick'),

  /** Read a VRM file as ArrayBuffer for Three.js GLTFLoader */
  readVRM: (filePath) => ipcRenderer.invoke('vrm:read', filePath),

  // ── VRMA Animation Clips ──────────────────────────────────────────────────
  /** Load a .vrma clip for the given state id; returns ArrayBuffer or null */
  loadVRMA: (stateId) => ipcRenderer.invoke('vrma:load', stateId),

  // ── Window ───────────────────────────────────────────────────────────────
  /** Resize the pet window */
  resizeWindow: (width, height) => ipcRenderer.invoke('window:resize', { width, height }),

  /** Open the settings popup window */
  openSettings: () => ipcRenderer.invoke('window:openSettings'),

  // ── Navigation messages from tray ────────────────────────────────────────
  /** Subscribe to navigation commands sent from the tray menu */
  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (_, screen) => callback(screen));
    return () => ipcRenderer.removeAllListeners('navigate');
  },

  // ── Hotkey events from main process ──────────────────────────────────────
  /** Subscribe to hotkey triggers from globalShortcut */
  onHotkey: (callback) => {
    ipcRenderer.on('hotkey', (_, action) => callback(action));
    return () => ipcRenderer.removeAllListeners('hotkey');
  },

  // ── Agent state from transcript watcher ──────────────────────────────────
  /** Subscribe to pet-state events driven by live Claude transcript */
  onAgentState: (callback) => {
    ipcRenderer.on('agent-state', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('agent-state');
  },

  onThemeChange: (callback) => {
    ipcRenderer.on('theme-change', (_, theme) => callback(theme));
    return () => ipcRenderer.removeAllListeners('theme-change');
  },

  // ── Session dots — one per Claude Code transcript file ───────────────────
  onSessionUpdate: (callback) => {
    ipcRenderer.on('session-update', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('session-update');
  },

  onSessionEnd: (callback) => {
    ipcRenderer.on('session-end', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('session-end');
  },

  // ── Platform info ─────────────────────────────────────────────────────────
  platform: process.platform,
  isElectron: true,
});

