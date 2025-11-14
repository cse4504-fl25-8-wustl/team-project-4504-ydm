import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let nextServer;
let serverReady = false;

const port = Number(process.env.PORT) || 3000;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const startUrl = `http://localhost:${port}/gui`;

const buildRoot = app.isPackaged
  ? path.join(process.resourcesPath, 'app')
  : path.join(__dirname, '..');
const standaloneRoot = path.join(buildRoot, '.next/standalone');

function findStandaloneServer(root) {
  if (!fs.existsSync(root)) {
    return null;
  }
  const directEntry = path.join(root, 'server.js');
  if (fs.existsSync(directEntry)) {
    return directEntry;
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const result = findStandaloneServer(path.join(root, entry.name));
      if (result) {
        return result;
      }
    }
  }

  return null;
}

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

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function ensureNextServer() {
  if (isDev || serverReady) {
    return Promise.resolve();
  }

  const serverEntry = findStandaloneServer(standaloneRoot);
  if (!serverEntry) {
    const error = new Error(
      `Standalone server not found under ${standaloneRoot}. 请先执行 \"pnpm electron:build:mac\" 重新打包。`,
    );
    return Promise.reject(error);
  }

  if (nextServer) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cwd = buildRoot;
    const env = {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      ELECTRON_RUN_AS_NODE: '1',
    };

    nextServer = spawn(process.execPath, [serverEntry], {
      cwd,
      env,
    });

    let timeout;

    const markReady = () => {
      if (!serverReady) {
        serverReady = true;
        clearTimeout(timeout); // Clear timeout when server is ready
        resolve();
      }
    };

    nextServer.stdout.on('data', (data) => {
      const message = data.toString();
      console.log(`Next.js: ${message}`);
      // Match both old and new Next.js output formats
      if (
        message.toLowerCase().includes('started server on') ||
        message.toLowerCase().includes('ready in')
      ) {
        markReady();
      }
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });

    nextServer.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      clearTimeout(timeout);
      reject(error);
    });

    // Increase timeout to 8 seconds for slower systems
    // and add HTTP health check as backup
    timeout = setTimeout(() => {
      console.log('Timeout reached, checking if server is responding...');
      // Try to verify server is actually ready by making a simple request
      fetch(`http://localhost:${port}/gui`)
        .then(() => {
          console.log('Server verified via HTTP check');
          markReady();
        })
        .catch((err) => {
          console.warn('Server may not be ready yet:', err.message);
          markReady(); // Mark ready anyway to avoid blocking
        });
    }, 8000);
  });
}

app.whenReady().then(async () => {
  if (!isDev) {
    try {
      await ensureNextServer();
    } catch (error) {
      console.error(error);
      dialog.showErrorBox(
        'Failed to start application',
        'The embedded Next.js server could not be started. Please rebuild the application and try again.',
      );
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, also kill the Next.js server when all windows are closed
  // to avoid leaving orphaned processes
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
    serverReady = false;
  }
  // On macOS, apps typically stay open without windows, but for this app
  // we quit completely to avoid confusion with the background server
  app.quit();
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
    serverReady = false;
  }
});
