const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { fork } = require('child_process');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

let backendProcess = null;

function performBackup() {
  try {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'billing.db');

    if (fs.existsSync(dbPath)) {
      const docsPath = app.getPath('documents');
      const backupDir = path.join(docsPath, 'BillingBackups');

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const date = new Date();
      const timestamp = date.getFullYear() + '-' +
        ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
        ('0' + date.getDate()).slice(-2) + '_' +
        ('0' + date.getHours()).slice(-2) + '-' +
        ('0' + date.getMinutes()).slice(-2);

      const backupPath = path.join(backupDir, `billing-backup-${timestamp}.db`);
      fs.copyFileSync(dbPath, backupPath);
      log.info(`Database backup created successfully at: ${backupPath}`);
    } else {
      log.warn('No database file found to backup.');
    }
  } catch (error) {
    log.error('Backup failed:', error);
  }
}

app.on('will-quit', () => {
  log.info('App quitting, performing backup...');
  performBackup();
});

function startBackend() {
  const isDev = !app.isPackaged;
  if (isDev) {
    console.log('In dev mode, assuming backend is running separately on port 3000');
    return;
  }

  const backendEntry = path.join(process.resourcesPath, 'backend', 'dist', 'main.js');

  // Persistence for Database
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'billing.db');

  log.info('Starting backend from:', backendEntry);
  log.info('Database path:', dbPath);

  backendProcess = fork(backendEntry, [], {
    env: { ...process.env, DATABASE_PATH: dbPath, PORT: 3000 },
    stdio: 'pipe'
  });

  backendProcess.on('message', (msg) => {
    log.info('Backend message:', msg);
  });

  backendProcess.on('error', (err) => {
    log.error('Backend failed:', err);
  });

  backendProcess.stdout.on('data', (data) => {
    log.info(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    log.error(`Backend Error: ${data}`);
  });
}

function stopBackend() {
  if (backendProcess) {
    log.info('Stopping backend process...');
    backendProcess.kill();
    backendProcess = null;
  }
}

function waitForDevServer(url, timeout = 30000) {
  const http = require('http');
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeout) {
        reject(new Error('Timeout waiting for dev server'));
        return;
      }

      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(check, 1000);
        }
      }).on('error', () => {
        setTimeout(check, 1000);
      });
    };

    check();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      plugins: true
      // preload: path.join(__dirname, 'preload.js')
    },
    show: false, // Don't show until ready
    alwaysOnTop: false // Ensure window can lose focus properly
  });

  // Fix for immediate focus - show and focus window when ready
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  // Ensure proper focus when window is clicked
  win.on('focus', () => {
    win.webContents.focus();
  });

  // Re-focus content when window receives focus after minimize/switch
  win.on('restore', () => {
    setTimeout(() => {
      win.webContents.focus();
    }, 100);
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // Development: Load Angular Dev Server
    const devUrl = 'http://localhost:4200';
    console.log(`Waiting for dev server at ${devUrl}...`);
    waitForDevServer(devUrl)
      .then(() => {
        console.log('Dev server ready, loading URL...');
        win.loadURL(devUrl);
        // win.webContents.openDevTools();
      })
      .catch((err) => {
        console.error('Failed to connect to dev server:', err);
      });
  } else {
    // Production: Load built files
    win.loadFile(path.join(__dirname, 'frontend/index.html'));
    // win.webContents.openDevTools();
  }
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // App Menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Backup Database',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            performBackup();
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send('backup-completed');
            }
          }
        },
        {
          label: 'Open Backup Folder',
          click: () => {
            const docsPath = app.getPath('documents');
            const backupDir = path.join(docsPath, 'BillingBackups');
            if (fs.existsSync(backupDir)) {
              shell.openPath(backupDir);
            } else {
              shell.openPath(docsPath);
            }
          }
        },
        {
          label: 'Open Data Folder',
          click: () => {
            const userDataPath = app.getPath('userData');
            shell.openPath(userDataPath);
          }
        },
        { type: 'separator' },
        {
          label: 'Export Data',
          enabled: false // Placeholder for future feature
        },
        {
          label: 'Import Data',
          enabled: false // Placeholder for future feature
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },

    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/billing-system#readme');
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/billing-system/issues');
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            autoUpdater.checkForUpdatesAndNotify();
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send('show-about-dialog');
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Force Enable PDF Viewer and Touch Events
app.commandLine.appendSwitch('enable-features', 'PdfViewer');
app.commandLine.appendSwitch('touch-events', 'enabled');

app.whenReady().then(() => {
  console.log('--- DEBUG: HAND GESTURE FLAGS ENABLED ---');
  createApplicationMenu();
  startBackend();
  createWindow();

  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Enforce Visual Zoom on ALL windows (including pop-ups)
  app.on('web-contents-created', (event, contents) => {
    contents.setVisualZoomLevelLimits(1, 5);

    // Ensure new windows (window.open) have plugins enabled
    contents.setWindowOpenHandler(({ url }) => {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: {
            plugins: true, // CRITICAL: Allow PDF viewer in new window
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      };
    });
  });

  // Helper: Wait for the renderer to say "I'm initialized" (print-window-ready)
  const waitForWindowReady = (targetWebContentsId) => {
    return new Promise((resolve) => {
      const listener = (event) => {
        if (event.sender.id === targetWebContentsId) {
          ipcMain.off('print-window-ready', listener);
          resolve();
        }
      };
      ipcMain.on('print-window-ready', listener);

      // Fallback Safety: Proceed if we don't hear back quickly to prevent infinite hang
      setTimeout(() => {
        console.warn('Timeout waiting for print-window-ready, proceeding anyway (Renderer might be ready)');
        ipcMain.off('print-window-ready', listener);
        resolve();
      }, 5000);
    });
  };

  // Helper: Wait for renderer to say "I'm rendered" (ready-to-print)
  const waitForPrintReady = (targetWebContentsId) => {
    return new Promise((resolve) => {
      const listener = (event) => {
        if (event.sender.id === targetWebContentsId) {
          console.log('Received ready-to-print signal');
          ipcMain.off('ready-to-print', listener);
          clearTimeout(timeout);
          resolve();
        }
      };
      ipcMain.on('ready-to-print', listener);

      // Safety timeout after 10 seconds
      const timeout = setTimeout(() => {
        console.warn('Timeout waiting for ready-to-print, proceeding anyway');
        ipcMain.off('ready-to-print', listener);
        resolve();
      }, 10000);
    });
  };

  // IPC Handler for Printing (Direct to Printer)
  ipcMain.handle('print-invoice', async (event, invoice) => {
    const printWin = new BrowserWindow({ show: false, width: 800, height: 1200, webPreferences: { nodeIntegration: true, contextIsolation: false } });
    const isDev = !app.isPackaged;
    const printUrl = isDev ? `http://localhost:4200/?printInvoiceId=${invoice.id}` : `file://${path.join(__dirname, 'frontend/index.html')}?printInvoiceId=${invoice.id}`;

    try {
      const windowReadyPromise = waitForWindowReady(printWin.webContents.id);
      const printReadyPromise = waitForPrintReady(printWin.webContents.id);

      await printWin.loadURL(printUrl);
      await windowReadyPromise;
      printWin.webContents.send('init-invoice-data', invoice);
      await printReadyPromise;

      return new Promise((resolve, reject) => {
        printWin.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
          if (!success) reject(errorType);
          else resolve({ success: true });
          if (!printWin.isDestroyed()) printWin.close();
        });
      });
    } catch (error) {
      console.error('Print failed:', error);
      if (!printWin.isDestroyed()) printWin.close();
      throw error;
    }
  });

  // IPC Handler for Previewing PDF (Returns Base64)
  ipcMain.handle('preview-invoice', async (event, invoice) => {
    const printWin = new BrowserWindow({
      show: false,
      width: 800,
      height: 1200,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const isDev = !app.isPackaged;
    const printUrl = isDev
      ? `http://localhost:4200/?printInvoiceId=${invoice.id}`
      : `file://${path.join(__dirname, 'frontend/index.html')}?printInvoiceId=${invoice.id}`;

    try {
      const windowReadyPromise = waitForWindowReady(printWin.webContents.id);
      const printReadyPromise = waitForPrintReady(printWin.webContents.id);

      await printWin.loadURL(printUrl);
      await windowReadyPromise;
      printWin.webContents.send('init-invoice-data', invoice);
      await printReadyPromise;

      // Small buffer for last second repaints
      await new Promise(resolve => setTimeout(resolve, 800));

      const pdfPromise = printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('printToPDF timed out')), 8000)
      );

      const data = await Promise.race([pdfPromise, timeoutPromise]);

      if (!data || data.length === 0) {
        throw new Error('PDF generation resulted in empty data');
      }

      return data.toString('base64');
    } catch (e) {
      console.error('Preview generation failed:', e.message);
      throw e;
    } finally {
      if (!printWin.isDestroyed()) {
        printWin.close();
      }
    }
  });

  // IPC Handler for Saving PDF (for WhatsApp/Manual Share)
  ipcMain.handle('save-invoice-pdf', async (event, invoice) => {
    const printWin = new BrowserWindow({
      show: false,
      width: 800,
      height: 1200,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const isDev = !app.isPackaged;
    const printUrl = isDev
      ? `http://localhost:4200/?printInvoiceId=${invoice.id}`
      : `file://${path.join(__dirname, 'frontend/index.html')}?printInvoiceId=${invoice.id}`;

    try {
      const windowReadyPromise = waitForWindowReady(printWin.webContents.id);
      const printReadyPromise = waitForPrintReady(printWin.webContents.id);

      await printWin.loadURL(printUrl);
      await windowReadyPromise;
      printWin.webContents.send('init-invoice-data', invoice);
      await printReadyPromise;

      await new Promise(resolve => setTimeout(resolve, 800));

      const pdfPromise = printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('printToPDF timed out')), 8000)
      );

      const data = await Promise.race([pdfPromise, timeoutPromise]);

      if (!data || data.length === 0) {
        throw new Error('PDF generation resulted in empty data');
      }

      // Save to Downloads
      const d = new Date(invoice.date);
      const dateStr = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
      const filename = `INV-${dateStr}-${invoice.id}.pdf`;
      const downloadsPath = app.getPath('downloads');
      const filePath = path.join(downloadsPath, filename);

      fs.writeFileSync(filePath, data);

      // Open folder and highlight file
      shell.showItemInFolder(filePath);

      return true;
    } catch (e) {
      console.error('PDF Save failed:', e.message);
      throw e;
    } finally {
      if (!printWin.isDestroyed()) {
        printWin.close();
      }
    }
  });

  // IPC Handler for Printing Estimates (Direct to Printer)
  ipcMain.handle('print-estimate', async (event, estimate) => {
    const printWin = new BrowserWindow({ show: false, width: 800, height: 1200, webPreferences: { nodeIntegration: true, contextIsolation: false } });
    const isDev = !app.isPackaged;
    const printUrl = isDev ? `http://localhost:4200/?printEstimateId=${estimate.id}` : `file://${path.join(__dirname, 'frontend/index.html')}?printEstimateId=${estimate.id}`;

    try {
      const windowReadyPromise = waitForWindowReady(printWin.webContents.id);
      const printReadyPromise = waitForPrintReady(printWin.webContents.id);

      await printWin.loadURL(printUrl);
      await windowReadyPromise;
      printWin.webContents.send('init-estimate-data', estimate);
      await printReadyPromise;

      return new Promise((resolve, reject) => {
        printWin.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
          if (!success) reject(errorType);
          else resolve({ success: true });
          if (!printWin.isDestroyed()) printWin.close();
        });
      });
    } catch (error) {
      console.error('Estimate Print failed:', error);
      if (!printWin.isDestroyed()) printWin.close();
      throw error;
    }
  });

  // IPC Handler for Previewing Estimate PDF (Returns Base64)
  ipcMain.handle('preview-estimate', async (event, estimate) => {
    const printWin = new BrowserWindow({
      show: false,
      width: 800,
      height: 1200,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const isDev = !app.isPackaged;
    const printUrl = isDev
      ? `http://localhost:4200/?printEstimateId=${estimate.id}`
      : `file://${path.join(__dirname, 'frontend/index.html')}?printEstimateId=${estimate.id}`;

    try {
      const windowReadyPromise = waitForWindowReady(printWin.webContents.id);
      const printReadyPromise = waitForPrintReady(printWin.webContents.id);

      await printWin.loadURL(printUrl);
      await windowReadyPromise;
      printWin.webContents.send('init-estimate-data', estimate);
      await printReadyPromise;

      await new Promise(resolve => setTimeout(resolve, 800));

      const pdfPromise = printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('printToPDF timed out')), 8000)
      );

      const data = await Promise.race([pdfPromise, timeoutPromise]);

      if (!data || data.length === 0) {
        throw new Error('PDF generation resulted in empty data');
      }

      return data.toString('base64');
    } catch (e) {
      console.error('Estimate Preview generation failed:', e.message);
      throw e;
    } finally {
      if (!printWin.isDestroyed()) {
        printWin.close();
      }
    }
  });

  // IPC Handler for Saving Estimate PDF
  ipcMain.handle('save-estimate-pdf', async (event, estimate) => {
    const printWin = new BrowserWindow({
      show: false,
      width: 800,
      height: 1200,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const isDev = !app.isPackaged;
    const printUrl = isDev
      ? `http://localhost:4200/?printEstimateId=${estimate.id}`
      : `file://${path.join(__dirname, 'frontend/index.html')}?printEstimateId=${estimate.id}`;

    try {
      const windowReadyPromise = waitForWindowReady(printWin.webContents.id);
      const printReadyPromise = waitForPrintReady(printWin.webContents.id);

      await printWin.loadURL(printUrl);
      await windowReadyPromise;
      printWin.webContents.send('init-estimate-data', estimate);
      await printReadyPromise;

      await new Promise(resolve => setTimeout(resolve, 800));

      const pdfPromise = printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('printToPDF timed out')), 8000)
      );

      const data = await Promise.race([pdfPromise, timeoutPromise]);

      if (!data || data.length === 0) {
        throw new Error('PDF generation resulted in empty data');
      }

      // Save to Downloads
      const d = new Date(estimate.date);
      const dateStr = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
      const filename = `EST-${dateStr}-${estimate.id}.pdf`;
      const downloadsPath = app.getPath('downloads');
      const filePath = path.join(downloadsPath, filename);

      fs.writeFileSync(filePath, data);

      // Open folder
      shell.showItemInFolder(filePath);

      return true;
    } catch (e) {
      console.error('Estimate PDF Save failed:', e.message);
      throw e;
    } finally {
      if (!printWin.isDestroyed()) {
        printWin.close();
      }
    }
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/* Auto-updater events */
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
});
autoUpdater.on('update-available', (info) => {
  log.info('Update available.', info);
});
autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available.', info);
});
autoUpdater.on('error', (err) => {
  log.error('Error in auto-updater. ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  log.info(log_message);
});
autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded');
});
