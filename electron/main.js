const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextServer;

const isDev = process.env.NODE_ENV === 'development';
const port = process.env.PORT || 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'ARCH Freight Calculator',
  });

  const startUrl = isDev
    ? `http://localhost:${port}/gui`
    : `file://${path.join(__dirname, '../.next/server/app/gui/page.html')}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  if (isDev) {
    // In development, Next.js dev server should already be running
    return;
  }

  // In production, start Next.js server
  const nextServerPath = path.join(__dirname, '../node_modules/.bin/next');
  nextServer = spawn('node', [nextServerPath, 'start', '-p', port], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production' },
  });

  nextServer.stdout.on('data', (data) => {
    console.log(`Next.js: ${data}`);
  });

  nextServer.stderr.on('data', (data) => {
    console.error(`Next.js Error: ${data}`);
  });
}

app.whenReady().then(() => {
  if (!isDev) {
    startNextServer();
    // Wait a bit for the server to start
    setTimeout(createWindow, 3000);
  } else {
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});
