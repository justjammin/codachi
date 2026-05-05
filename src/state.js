// Shared mutable state — all electron modules read/write this object directly
module.exports = {
  config: null,
  petWindow: null,
  settingsWindow: null,
  setupWindow: null,
  tray: null,
  isClickThrough: false,
  _lastDragWas: false,
};
