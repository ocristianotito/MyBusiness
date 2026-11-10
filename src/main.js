// Processo principal: janela, arquivo de dados (produção + financeiro) e backups.
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

app.setName('Produção Cristiano Convites');
app.setPath('userData', path.join(app.getPath('appData'), 'Producao Cristiano Convites'));
app.commandLine.appendSwitch('lang', 'pt-BR');

const DATA_DIR = app.getPath('userData');
const DATA_FILE = path.join(DATA_DIR, 'dados.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const SEED_FILE = path.join(__dirname, 'seed.json');
const KEEP_BACKUPS = 30;
const PAGES = { producao: 'index.html', financeiro: 'financeiro.html' };

let win = null;
let current = null;      // dados em memória: { v, cfg, cards, fin }
let pendingImport = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
function writeAtomic(file, obj) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj), 'utf8');
  fs.renameSync(tmp, file);
}
const validFull = (d) => d && typeof d === 'object' && d.cards && typeof d.cards === 'object' && !Array.isArray(d.cards);
const validFin = (o) => o && o.v === 2 && Array.isArray(o.turmas) && Array.isArray(o.parc) && o.orc;

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR).filter(f => /^dados-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();
}

function loadData() {
  if (current) return current;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const seed = fs.existsSync(SEED_FILE) ? readJson(SEED_FILE) : { v: 1, cfg: null, cards: {}, fin: null };
  let d = null;
  if (fs.existsSync(DATA_FILE)) {
    try { d = readJson(DATA_FILE); if (!validFull(d)) d = null; } catch (e) { d = null; }
    if (!d) {
      const last = listBackups()[0];
      if (last) { try { const b = readJson(path.join(BACKUP_DIR, last)); if (validFull(b)) d = b; } catch (e) {} }
    }
  }
  if (!d) d = { v: 1, cfg: seed.cfg || null, cards: seed.cards || {} };
  // Instalações da versão 1.0 não têm o financeiro: traz os dados iniciais.
  if (!validFin(d.fin) && validFin(seed.fin)) d.fin = seed.fin;
  current = d;
  writeAtomic(DATA_FILE, current);
  return current;
}

function persist() {
  writeAtomic(DATA_FILE, current);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const d = new Date();
  const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  writeAtomic(path.join(BACKUP_DIR, 'dados-' + stamp + '.json'), current);
  listBackups().slice(KEEP_BACKUPS).forEach(f => { try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch (e) {} });
}

/* ----- produção ----- */
ipcMain.handle('data:load', () => { const d = loadData(); return { v: d.v, cfg: d.cfg, cards: d.cards }; });
ipcMain.handle('data:save', (_e, obj) => {
  if (!validFull(obj)) return { ok: false, error: 'Dados inválidos' };
  try { loadData(); current.cfg = obj.cfg; current.cards = obj.cards; persist(); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e.message || e) }; }
});

/* ----- financeiro (texto JSON do estado do dashboard) ----- */
ipcMain.on('fin:loadSync', (e) => { const d = loadData(); e.returnValue = d.fin ? JSON.stringify(d.fin) : null; });
function saveFin(str) {
  try { const o = JSON.parse(str); if (!validFin(o)) return false; loadData(); current.fin = o; persist(); return true; }
  catch (e) { return false; }
}
ipcMain.handle('fin:save', (_e, str) => ({ ok: saveFin(str) }));
ipcMain.on('fin:saveSync', (e, str) => { e.returnValue = saveFin(str); });

/* ----- backup completo ----- */
ipcMain.handle('data:export', async () => {
  loadData();
  const name = 'backup-cristiano-convites-' + new Date().toISOString().slice(0, 10) + '.json';
  const r = await dialog.showSaveDialog(win, {
    title: 'Exportar backup (produção + financeiro)',
    defaultPath: path.join(app.getPath('documents'), name),
    filters: [{ name: 'Backup (JSON)', extensions: ['json'] }]
  });
  if (r.canceled || !r.filePath) return { ok: false, canceled: true };
  writeAtomic(r.filePath, current);
  return { ok: true, path: r.filePath };
});

// Lê um arquivo e diz o que ele contém; só aplica depois da confirmação (data:applyImport).
ipcMain.handle('data:import', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Importar backup', properties: ['openFile'],
    filters: [{ name: 'Backup (JSON)', extensions: ['json'] }]
  });
  if (r.canceled || !r.filePaths.length) return { ok: false, canceled: true };
  let d;
  try { d = readJson(r.filePaths[0]); } catch (e) { return { ok: false, error: 'Não foi possível ler o arquivo: ' + (e.message || e) }; }
  if (validFull(d)) {
    pendingImport = { kind: 'full', data: d };
    return { ok: true, kind: 'full', cards: Object.keys(d.cards).length, hasFin: validFin(d.fin) };
  }
  if (validFin(d)) {
    pendingImport = { kind: 'fin', data: d };
    return { ok: true, kind: 'fin', turmas: d.turmas.length };
  }
  return { ok: false, error: 'Este arquivo não é um backup do programa nem do Dashboard de Convites.' };
});
ipcMain.handle('data:applyImport', () => {
  if (!pendingImport) return { ok: false };
  loadData();
  const { kind, data } = pendingImport; pendingImport = null;
  if (kind === 'full') { current.cfg = data.cfg || null; current.cards = data.cards; if (validFin(data.fin)) current.fin = data.fin; }
  else current.fin = data;
  persist();
  return { ok: true, kind };
});

/* ----- arquivos gerados pelo financeiro (PDF, relatório, backup) ----- */
ipcMain.handle('file:save', async (_e, filename, data) => {
  const safe = String(filename || 'arquivo').replace(/[\\/:*?"<>|]+/g, '-');
  const ext = path.extname(safe).slice(1) || 'txt';
  const r = await dialog.showSaveDialog(win, {
    title: 'Salvar arquivo',
    defaultPath: path.join(app.getPath('documents'), safe),
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
  });
  if (r.canceled || !r.filePath) return { ok: false, canceled: true };
  fs.writeFileSync(r.filePath, typeof data === 'string' ? data : Buffer.from(data));
  shell.showItemInFolder(r.filePath);
  return { ok: true, path: r.filePath };
});

/* ----- atualização automática (GitHub Releases) ----- */
let upd = { state: 'idle', version: null };
function sendUpd() { if (win && !win.isDestroyed()) win.webContents.send('update:status', upd); }
function setupUpdater() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => { if (upd.state !== 'ready') upd = { state: 'checking' }; });
  autoUpdater.on('update-not-available', () => { if (upd.state !== 'ready') upd = { state: 'none' }; });
  autoUpdater.on('update-available', (i) => { upd = { state: 'downloading', version: i.version, percent: 0 }; sendUpd(); });
  autoUpdater.on('download-progress', (p) => { upd = { state: 'downloading', version: upd.version, percent: Math.round(p.percent || 0) }; });
  autoUpdater.on('update-downloaded', (i) => { upd = { state: 'ready', version: i.version }; sendUpd(); });
  autoUpdater.on('error', (e) => { if (upd.state !== 'ready') upd = { state: 'error', msg: String((e && e.message) || e).slice(0, 300) }; });
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 8000);
  setInterval(check, 4 * 60 * 60 * 1000);
}
ipcMain.handle('update:get', () => upd);
ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) return { state: 'dev' };
  if (upd.state === 'ready' || upd.state === 'downloading') return upd;
  try { await autoUpdater.checkForUpdates(); } catch (e) { return { state: 'error', msg: String((e && e.message) || e).slice(0, 300) }; }
  return upd;
});
ipcMain.handle('update:install', () => { if (upd.state === 'ready') setImmediate(() => autoUpdater.quitAndInstall(false, true)); });
ipcMain.handle('app:version', () => app.getVersion());

/* ----- navegação e utilidades ----- */
ipcMain.handle('app:goto', (_e, page) => { if (PAGES[page] && win) win.loadFile(path.join(__dirname, PAGES[page])); });
ipcMain.handle('app:openBackups', () => { fs.mkdirSync(BACKUP_DIR, { recursive: true }); return shell.openPath(BACKUP_DIR); });
ipcMain.handle('app:openExternal', (_e, url) => { if (/^https:\/\//i.test(String(url))) shell.openExternal(url); });

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 980, minHeight: 620,
    backgroundColor: '#0B0F14',
    title: 'Cristiano Convites',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true
    }
  });
  win.webContents.session.setSpellCheckerLanguages(['pt-BR']);
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('page-title-updated', (e) => e.preventDefault());
  win.loadFile(path.join(__dirname, 'index.html'));
}

Menu.setApplicationMenu(null);
app.whenReady().then(() => { createWindow(); setupUpdater(); });
app.on('window-all-closed', () => app.quit());
