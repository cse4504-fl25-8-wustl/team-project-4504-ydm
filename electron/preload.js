// Preload script for Electron
// This file runs in a context that has access to both Node.js and the DOM

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// specific Node.js features safely
contextBridge.exposeInMainWorld('electron', {
  // Add any electron-specific APIs here if needed
  platform: process.platform,
  version: process.versions.electron,
});
