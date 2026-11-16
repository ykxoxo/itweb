const { app, BrowserWindow, protocol, net, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Register custom scheme before app is ready
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
let cachedPaths = null;
let pendingWriteChain = Promise.resolve();
let isQuitting = false;

function resolveBasePath() {
  const packagedPath = path.join(process.resourcesPath, 'out');
  if (fs.existsSync(packagedPath)) {
    return path.resolve(packagedPath);
  }
  return path.resolve(path.join(__dirname, '..', 'out'));
}

function isProtectedOrTempPath(dirPath) {
  const lower = path.resolve(dirPath).toLowerCase();
  const blockedMarkers = [
    '\\program files',
    '\\windows\\',
    '\\appdata\\local\\temp',
    '\\appdata\\local\\programs',
  ];
  return blockedMarkers.some((marker) => lower.includes(marker));
}

function isDirectoryWritable(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const probeFile = path.join(dirPath, `.it_hub_probe_${process.pid}_${Date.now()}.tmp`);
    fs.writeFileSync(probeFile, 'ok', 'utf8');
    fs.unlinkSync(probeFile);
    return true;
  } catch {
    return false;
  }
}

function resolveLocalPaths() {
  if (cachedPaths) return cachedPaths;

  let rootDir = null;
  let mode = 'userData';

  // 1. Portable EXE wrapper sets PORTABLE_EXECUTABLE_DIR to the folder containing the .exe
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir && !isProtectedOrTempPath(portableDir)) {
    const candidate = path.join(portableDir, 'IT-Hub-LocalData');
    if (isDirectoryWritable(candidate)) {
      rootDir = candidate;
      mode = 'portable';
    }
  }

  // 2. Unpacked portable directory next to the executable (outside Program Files / Temp / Programs)
  if (!rootDir && app.isPackaged) {
    const exeDir = path.dirname(process.execPath);
    if (!isProtectedOrTempPath(exeDir)) {
      const candidate = path.join(exeDir, 'IT-Hub-LocalData');
      if (isDirectoryWritable(candidate)) {
        rootDir = candidate;
        mode = 'portable';
      }
    }
  }

  // 3. Installed desktop app or dev mode: Documents folder for easy user visibility
  if (!rootDir) {
    try {
      const docsDir = app.getPath('documents');
      const candidate = path.join(docsDir, 'IT-Maintenance-Hub-LocalData');
      if (isDirectoryWritable(candidate)) {
        rootDir = candidate;
        mode = 'documents';
      }
    } catch {
      // Fallback below
    }
  }

  // 4. Guaranteed userData fallback
  if (!rootDir) {
    rootDir = path.join(app.getPath('userData'), 'IT-Hub-LocalData');
    mode = 'userData';
  }

  const dataDir = path.join(rootDir, 'data');
  const reportsDir = path.join(rootDir, 'reports');
  const backupsDir = path.join(rootDir, 'backups');

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(backupsDir, { recursive: true });

  cachedPaths = {
    rootDir: path.resolve(rootDir),
    dataDir: path.resolve(dataDir),
    reportsDir: path.resolve(reportsDir),
    backupsDir: path.resolve(backupsDir),
    dbPath: path.resolve(path.join(dataDir, 'it-hub-database.json')),
    backupDbPath: path.resolve(path.join(dataDir, 'it-hub-database.backup.json')),
    mode,
  };

  return cachedPaths;
}

function sanitizeFileName(rawName, defaultExt) {
  const baseOnly = path.basename(String(rawName || 'report'));
  const cleaned = baseOnly
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .trim();
  const safeBase = cleaned || `IT_Hub_Export_${Date.now()}`;
  if (defaultExt && !safeBase.toLowerCase().endsWith(defaultExt.toLowerCase())) {
    return `${safeBase}${defaultExt}`;
  }
  return safeBase;
}

function resolveUniqueFilePath(dirPath, rawFileName, defaultExt) {
  const safeName = sanitizeFileName(rawFileName, defaultExt);
  const ext = path.extname(safeName);
  const stem = path.basename(safeName, ext);
  let candidate = path.join(dirPath, safeName);
  let counter = 2;

  while (fs.existsSync(candidate)) {
    candidate = path.join(dirPath, `${stem}_${counter}${ext}`);
    counter += 1;
  }

  return path.resolve(candidate);
}

function enqueueDiskWrite(taskFn) {
  pendingWriteChain = pendingWriteChain.then(taskFn, taskFn);
  return pendingWriteChain;
}

function registerIpcHandlers() {
  ipcMain.handle('it-hub:get-storage-info', async () => {
    const paths = resolveLocalPaths();
    return {
      rootDir: paths.rootDir,
      dataDir: paths.dataDir,
      reportsDir: paths.reportsDir,
      backupsDir: paths.backupsDir,
      dbPath: paths.dbPath,
      mode: paths.mode,
    };
  });

  ipcMain.handle('it-hub:load-database', async () => {
    const paths = resolveLocalPaths();
    const readJsonFile = (targetPath) => {
      if (!fs.existsSync(targetPath)) return null;
      const raw = fs.readFileSync(targetPath, 'utf8');
      if (!raw || !raw.trim()) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
      return null;
    };

    try {
      const primary = readJsonFile(paths.dbPath);
      if (primary) {
        return { exists: true, data: primary, source: 'primary' };
      }
    } catch (err) {
      console.error('Failed to read primary local database, trying backup:', err);
    }

    try {
      const backup = readJsonFile(paths.backupDbPath);
      if (backup) {
        fs.copyFileSync(paths.backupDbPath, paths.dbPath);
        return { exists: true, data: backup, source: 'backup' };
      }
    } catch (err) {
      console.error('Failed to read backup local database:', err);
      return { exists: false, data: null, error: String(err) };
    }

    return { exists: false, data: null };
  });

  ipcMain.handle('it-hub:save-database', async (_event, payload) => {
    return enqueueDiskWrite(async () => {
      try {
        const paths = resolveLocalPaths();
        if (!payload || typeof payload !== 'object') {
          return { ok: false, error: 'Invalid database payload' };
        }

        const serialized = JSON.stringify(payload, null, 2);
        const tempPath = `${paths.dbPath}.tmp`;

        // Preserve previous clean database as rolling backup before replacing
        if (fs.existsSync(paths.dbPath)) {
          try {
            fs.copyFileSync(paths.dbPath, paths.backupDbPath);
          } catch (backupErr) {
            console.warn('Backup snapshot skipped:', backupErr);
          }
        }

        fs.writeFileSync(tempPath, serialized, 'utf8');
        fs.renameSync(tempPath, paths.dbPath);

        return {
          ok: true,
          dbPath: paths.dbPath,
          updatedAt: payload.updatedAt || new Date().toISOString(),
        };
      } catch (err) {
        console.error('Failed to save local database:', err);
        return { ok: false, error: String(err) };
      }
    });
  });

  ipcMain.handle('it-hub:save-excel-report', async (_event, { fileName, base64Data }) => {
    return enqueueDiskWrite(async () => {
      try {
        const paths = resolveLocalPaths();
        const targetPath = resolveUniqueFilePath(paths.reportsDir, fileName, '.xlsx');
        const buffer = Buffer.from(String(base64Data || ''), 'base64');
        fs.writeFileSync(targetPath, buffer);
        return {
          ok: true,
          filePath: targetPath,
          fileName: path.basename(targetPath),
          dirPath: paths.reportsDir,
        };
      } catch (err) {
        console.error('Failed to save Excel report locally:', err);
        return { ok: false, error: String(err) };
      }
    });
  });

  ipcMain.handle('it-hub:save-pdf-report', async (_event, { defaultFileName }) => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return { ok: false, error: 'Main window is not available' };
      }
      const paths = resolveLocalPaths();
      const targetPath = resolveUniqueFilePath(paths.reportsDir, defaultFileName, '.pdf');
      const pdfBuffer = await mainWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        preferCSSPageSize: true,
      });
      await enqueueDiskWrite(async () => {
        fs.writeFileSync(targetPath, pdfBuffer);
      });
      return {
        ok: true,
        filePath: targetPath,
        fileName: path.basename(targetPath),
        dirPath: paths.reportsDir,
      };
    } catch (err) {
      console.error('Failed to export PDF report locally:', err);
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('it-hub:print-current-page', async () => {
    return new Promise((resolve) => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        resolve({ ok: false, error: 'Main window is not available' });
        return;
      }
      mainWindow.webContents.print(
        { silent: false, printBackground: true },
        (success, failureReason) => {
          resolve({ ok: success, error: failureReason || undefined });
        }
      );
    });
  });

  ipcMain.handle('it-hub:save-backup-file', async (_event, { fileName, jsonContent }) => {
    return enqueueDiskWrite(async () => {
      try {
        const paths = resolveLocalPaths();
        const targetPath = resolveUniqueFilePath(paths.backupsDir, fileName, '.json');
        fs.writeFileSync(targetPath, String(jsonContent || '{}'), 'utf8');
        return {
          ok: true,
          filePath: targetPath,
          fileName: path.basename(targetPath),
          dirPath: paths.backupsDir,
        };
      } catch (err) {
        console.error('Failed to save backup file locally:', err);
        return { ok: false, error: String(err) };
      }
    });
  });

  ipcMain.handle('it-hub:open-local-folder', async (_event, { target } = {}) => {
    try {
      const paths = resolveLocalPaths();
      const map = {
        root: paths.rootDir,
        data: paths.dataDir,
        reports: paths.reportsDir,
        backups: paths.backupsDir,
      };
      const folderPath = map[target] || paths.rootDir;
      const openErr = await shell.openPath(folderPath);
      if (openErr) {
        return { ok: false, error: openErr };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('it-hub:open-local-file', async (_event, { filePath }) => {
    try {
      const paths = resolveLocalPaths();
      const resolved = path.resolve(String(filePath || ''));
      if (resolved !== paths.rootDir && !resolved.startsWith(paths.rootDir + path.sep)) {
        return { ok: false, error: 'Access denied outside local data directory' };
      }
      const openErr = await shell.openPath(resolved);
      if (openErr) {
        return { ok: false, error: openErr };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });
}

function createWindow() {
  const basePath = resolveBasePath();
  resolveLocalPaths();

  try {
    protocol.handle('app', (request) => {
      try {
        const parsedUrl = new URL(request.url);
        let pathname = decodeURI(parsedUrl.pathname);
        if (pathname === '/' || pathname === '') {
          pathname = '/index.html';
        }

        const relativePath = pathname.replace(/^\/+/, '');
        let filePath = path.resolve(basePath, relativePath);

        // Security check: ensure resolved path stays inside static export root
        if (filePath !== basePath && !filePath.startsWith(basePath + path.sep)) {
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
  } catch {
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
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.loadURL('app://local/index.html');

  const showWindowSafely = () => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.maximize();
      mainWindow.show();
    }
  };

  mainWindow.once('ready-to-show', showWindowSafely);
  // Offline safety fallback in case an external font stylesheet delays first paint
  setTimeout(showWindowSafely, 1500);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (!isQuitting) {
      isQuitting = true;
      Promise.race([
        pendingWriteChain,
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]).finally(() => {
        app.exit(0);
      });
    }
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (!isQuitting) {
    isQuitting = true;
    Promise.race([
      pendingWriteChain,
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]).finally(() => {
      app.exit(0);
    });
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});
