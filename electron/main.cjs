const { app, BrowserWindow, protocol, net, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// 1. Register custom scheme before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

let mainWindow = null;

function resolveBasePath() {
  const packagedPath = path.join(process.resourcesPath, 'out');
  if (fs.existsSync(packagedPath)) {
    return packagedPath;
  }
  return path.join(__dirname, '..', 'out');
}

function createWindow() {
  const basePath = resolveBasePath();

  // Register modern app:// protocol handler
  try {
    protocol.handle('app', (request) => {
      try {
        const parsedUrl = new URL(request.url);
        let pathname = decodeURI(parsedUrl.pathname);
        if (pathname === '/' || pathname === '') {
          pathname = '/index.html';
        }

        let filePath = path.join(basePath, pathname);

        // Security check
        if (!filePath.startsWith(basePath)) {
          return new Response('Access denied', { status: 403 });
        }

        // Fallback for Next.js routing / sub-pages
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          const htmlCandidate = filePath + '.html';
          if (fs.existsSync(htmlCandidate)) {
            filePath = htmlCandidate;
          } else {
            filePath = path.join(basePath, 'index.html');
          }
        }

        return net.fetch(pathToFileURL(filePath).toString());
      } catch (err) {
        console.error('Protocol handler error:', err);
        return new Response('Not Found', { status: 404 });
      }
    });
  } catch (e) {
    // Protocol already handled if re-created
  }

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    title: 'نظام إدارة أصول التقنية وصيانة القاعات | IT Hub',
    backgroundColor: '#0f172a',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Remove standard menu bar for a clean desktop app look
  Menu.setApplicationMenu(null);

  // Load the application via native app:// scheme
  mainWindow.loadURL('app://local/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Open external links in user's default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // CRITICAL: Guarantee 100% clean process exit when window is closed
  mainWindow.on('close', () => {
    app.exit(0);
    process.exit(0);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.exit(0);
    process.exit(0);
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.exit(0);
  process.exit(0);
});

app.on('before-quit', () => {
  app.exit(0);
  process.exit(0);
});
