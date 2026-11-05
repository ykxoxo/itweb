const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let server = null;
const DEFAULT_PORT = 48291;

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

// Start a lightweight internal local HTTP server to serve the exported Next.js static files
function startInternalServer(port = DEFAULT_PORT) {
  return new Promise((resolve, reject) => {
    // Resolve path to the exported 'out' folder
    let basePath = path.join(process.resourcesPath, 'out');
    if (!fs.existsSync(basePath)) {
      basePath = path.join(__dirname, '..', 'out');
    }

    server = http.createServer((req, res) => {
      try {
        let reqPath = decodeURI(req.url.split('?')[0]);
        if (reqPath === '/' || reqPath === '') {
          reqPath = '/index.html';
        }

        let filePath = path.join(basePath, reqPath);

        // Security check: ensure path is within basePath
        if (!filePath.startsWith(basePath)) {
          res.writeHead(403);
          return res.end('Access denied');
        }

        // Check if file exists, or fallback to index.html for SPA routing
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          const htmlCandidate = filePath + '.html';
          if (fs.existsSync(htmlCandidate)) {
            filePath = htmlCandidate;
          } else {
            filePath = path.join(basePath, 'index.html');
          }
        }

        if (fs.existsSync(filePath)) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          const content = fs.readFileSync(filePath);
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
          });
          return res.end(content);
        }

        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      } catch (err) {
        console.error('Server error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      }
    });

    server.listen(port, '127.0.0.1', () => {
      resolve(port);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Try another port if DEFAULT_PORT is in use
        const fallbackPort = 0; // OS assigns random available port
        server.listen(fallbackPort, '127.0.0.1', () => {
          resolve(server.address().port);
        });
      } else {
        reject(err);
      }
    });
  });
}

async function createWindow() {
  const port = await startInternalServer();

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

  // Remove default menu for a clean app feel
  Menu.setApplicationMenu(null);

  // Load the application
  await mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.includes('127.0.0.1')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

