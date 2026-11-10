// Processo principal: janela, arquivo de dados (produção + financeiro) e backups.
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, Notification, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');

app.setName('Produção Cristiano Convites');
app.setPath('userData', path.join(app.getPath('appData'), 'Producao Cristiano Convites'));
app.commandLine.appendSwitch('lang', 'pt-BR');

const DATA_DIR = app.getPath('userData');
const DATA_FILE = path.join(DATA_DIR, 'dados.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const SEED_FILE = path.join(__dirname, 'seed.json');
const KEEP_BACKUPS = 30;
const SEC_FILE = path.join(DATA_DIR, 'seguranca.json');
const PAGES = { producao: 'index.html', financeiro: 'financeiro.html' };

let win = null;
let current = null;      // dados em memória: { v, cfg, cards, events, fin }
let pendingImport = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showWindow();
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

/* ----- senha do financeiro -----
   A senha bloqueia o acesso pelo programa (não criptografa o arquivo de dados).
   Esqueceu a senha: feche o programa e apague o arquivo seguranca.json da pasta de dados. */
let unlocked = false, fails = 0, waitUntil = 0;
function secGet() { try { const s = readJson(SEC_FILE); return s && s.salt && s.hash ? s : null; } catch (e) { return null; } }
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString('hex');
function checkPw(pw) {
  const s = secGet(); if (!s) return false;
  const a = Buffer.from(hashPw(pw, s.salt), 'hex'), b = Buffer.from(s.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const finAllowed = () => !!secGet() && unlocked;
ipcMain.handle('sec:status', () => ({ hasPassword: !!secGet(), unlocked }));
ipcMain.handle('sec:unlock', (_e, pw) => {
  const now = Date.now();
  if (now < waitUntil) return { ok: false, wait: Math.ceil((waitUntil - now) / 1000) };
  if (checkPw(pw)) { unlocked = true; fails = 0; return { ok: true }; }
  fails++; if (fails >= 5) { waitUntil = now + 30000; fails = 0; return { ok: false, wait: 30 }; }
  return { ok: false };
});
ipcMain.handle('sec:set', (_e, newPw, oldPw) => {
  newPw = String(newPw || '');
  if (newPw.length < 4) return { ok: false, error: 'A senha precisa ter pelo menos 4 caracteres.' };
  if (secGet() && !checkPw(oldPw)) return { ok: false, error: 'A senha atual está incorreta.' };
  const salt = crypto.randomBytes(16).toString('hex');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  writeAtomic(SEC_FILE, { salt, hash: hashPw(newPw, salt), criadaEm: new Date().toISOString() });
  unlocked = true;
  return { ok: true };
});
ipcMain.handle('sec:lock', () => { unlocked = false; });

/* ----- produção ----- */
ipcMain.handle('data:load', () => { const d = loadData(); return { v: d.v, cfg: d.cfg, cards: d.cards, events: d.events || {} }; });
ipcMain.handle('data:save', (_e, obj) => {
  if (!validFull(obj)) return { ok: false, error: 'Dados inválidos' };
  try { loadData(); current.cfg = obj.cfg; current.cards = obj.cards; if (obj.events && typeof obj.events === 'object') current.events = obj.events; persist(); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e.message || e) }; }
});

/* ----- financeiro (texto JSON do estado do dashboard) ----- */
ipcMain.on('fin:loadSync', (e) => {
  if (!finAllowed()) { e.returnValue = 'LOCKED'; return; }
  const d = loadData(); e.returnValue = d.fin ? JSON.stringify(d.fin) : null;
});
function saveFin(str) {
  if (!finAllowed()) return false;
  try { const o = JSON.parse(str); if (!validFin(o)) return false; loadData(); current.fin = o; persist(); return true; }
  catch (e) { return false; }
}
ipcMain.handle('fin:save', (_e, str) => ({ ok: saveFin(str) }));
ipcMain.on('fin:saveSync', (e, str) => { e.returnValue = saveFin(str); });

/* ----- backup completo ----- */
ipcMain.handle('data:export', async () => {
  if (secGet() && !unlocked) return { ok: false, error: 'Digite a senha do financeiro para exportar o backup.' };
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
  if (secGet() && !unlocked) return { ok: false, error: 'Digite a senha do financeiro para importar um backup.' };
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
  if (secGet() && !unlocked) return { ok: false };
  loadData();
  const { kind, data } = pendingImport; pendingImport = null;
  if (kind === 'full') { current.cfg = data.cfg || null; current.cards = data.cards; current.events = data.events || {}; if (validFin(data.fin)) current.fin = data.fin; }
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

/* ----- atualização automática (GitHub Releases) -----
   Procura ao abrir, a cada 30 minutos e quando a janela volta ao foco.
   Baixou: a tela mostra uma contagem e o programa salva, fecha, instala em silêncio e reabre.
   Com a janela escondida na bandeja, instala direto. Tudo fica registrado em atualizacao.log. */
const UPD_LOG = path.join(DATA_DIR, 'atualizacao.log');
function ulog(msg) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(UPD_LOG) && fs.statSync(UPD_LOG).size > 200000) fs.writeFileSync(UPD_LOG, '');
    fs.appendFileSync(UPD_LOG, new Date().toISOString() + ' v' + app.getVersion() + ' ' + msg + '\n');
  } catch (e) {}
}
let upd = { state: 'idle', version: null };
let lastCheck = 0, postponeTimer = null;
function sendUpd() { if (win && !win.isDestroyed()) win.webContents.send('update:status', upd); }
function checkUpdates(why) {
  if (!app.isPackaged || upd.state === 'ready' || upd.state === 'downloading') return Promise.resolve();
  lastCheck = Date.now();
  ulog('procurando (' + why + ')');
  return autoUpdater.checkForUpdates().catch((e) => ulog('erro ao procurar: ' + ((e && e.message) || e)));
}
function readyToInstall() {
  if (!win || win.isDestroyed() || !win.isVisible()) { ulog('instalando com a janela oculta'); quitApp(true); }
  else sendUpd();   // a tela faz a contagem regressiva e chama update:install
}
function setupUpdater() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = { info: (m) => ulog('info ' + m), warn: (m) => ulog('aviso ' + m), error: (m) => ulog('erro ' + m), debug: () => {} };
  autoUpdater.on('update-not-available', (i) => { if (upd.state !== 'ready') upd = { state: 'none', version: i && i.version }; });
  autoUpdater.on('update-available', (i) => { upd = { state: 'downloading', version: i.version, percent: 0 }; ulog('baixando ' + i.version); sendUpd(); });
  autoUpdater.on('download-progress', (p) => { upd = { state: 'downloading', version: upd.version, percent: Math.round(p.percent || 0) }; });
  autoUpdater.on('update-downloaded', (i) => { upd = { state: 'ready', version: i.version }; ulog('baixada ' + i.version); readyToInstall(); });
  autoUpdater.on('error', (e) => {
    const msg = String((e && e.message) || e).slice(0, 300);
    ulog('erro: ' + msg);
    if (upd.state !== 'ready') upd = { state: 'error', msg };
  });
  setTimeout(() => checkUpdates('ao abrir'), 5000);
  setInterval(() => checkUpdates('a cada 30 min'), 30 * 60 * 1000);
}
ipcMain.handle('update:get', () => upd);
ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) return { state: 'dev' };
  if (upd.state === 'ready' || upd.state === 'downloading') return upd;
  await checkUpdates('pedido na tela');
  return upd;
});
ipcMain.handle('update:install', () => { if (upd.state === 'ready') { ulog('instalando (pedido na tela)'); quitApp(true); } });
ipcMain.handle('update:postpone', (_e, minutes) => {
  clearTimeout(postponeTimer);
  const m = Math.min(Math.max(+minutes || 10, 1), 120);
  ulog('adiada por ' + m + ' min');
  postponeTimer = setTimeout(readyToInstall, m * 60000);
});
ipcMain.handle('app:version', () => app.getVersion());

/* ----- lembretes da agenda (notificações do Windows) ----- */
const Agenda = require('./agenda-core');
let remindLast = Date.now() - 2 * 60000;
const reminded = new Set();
function fmtLead(min) {
  if (min <= 0) return 'Agora';
  if (min < 60) return 'Em ' + min + ' minutos';
  if (min < 1440) return 'Em ' + Math.round(min / 60) + (min >= 120 ? ' horas' : ' hora');
  return min >= 2880 ? 'Em 2 dias' : 'Amanhã';
}
function checkReminders() {
  const now = Date.now();
  const evs = (current && current.events) || {};
  Agenda.dueReminders(evs, remindLast, now).forEach((r) => {
    const key = r.id + '|' + r.date + '|' + r.at;
    if (reminded.has(key)) return;
    reminded.add(key);
    const ev = r.ev, d = Agenda.parse(r.date);
    const when = (ev.allDay ? 'Dia inteiro' : ev.start + (ev.end ? '–' + ev.end : '')) + ' · ' + d.getDate() + '/' + Agenda.pad(d.getMonth() + 1);
    const tipo = (Agenda.TIPOS[ev.tipo] || Agenda.TIPOS.outro).n;
    if (!Notification.isSupported()) return;
    const n = new Notification({
      title: fmtLead(ev.lembrete) + ': ' + (ev.title || tipo),
      body: when + (ev.local ? '\n' + ev.local : '') + '\n' + tipo,
      icon: path.join(__dirname, 'icon.png')
    });
    n.on('click', () => { showWindow(); if (win && currentPage === 'producao') win.webContents.send('agenda:open', { id: r.id, date: r.date }); });
    n.show();
  });
  remindLast = now;
}
setInterval(() => { try { loadData(); checkReminders(); } catch (e) {} }, 20000);

/* ----- navegação e utilidades ----- */
let currentPage = 'producao';
ipcMain.handle('app:goto', (_e, page) => {
  if (!PAGES[page] || !win) return { ok: false };
  if (page === 'financeiro' && !finAllowed()) return { ok: false, locked: true };
  if (page !== 'financeiro') unlocked = false;   // sair do financeiro tranca de novo
  currentPage = page;
  win.loadFile(path.join(__dirname, PAGES[page]));
  return { ok: true };
});
ipcMain.handle('app:openBackups', () => { fs.mkdirSync(BACKUP_DIR, { recursive: true }); return shell.openPath(BACKUP_DIR); });
ipcMain.handle('app:openExternal', (_e, url) => { if (/^https:\/\//i.test(String(url))) shell.openExternal(url); });

/* ----- janela, bandeja e saída -----
   Fechar a janela deixa o programa na bandeja (perto do relógio) para os lembretes continuarem.
   Sair de verdade: botão direito no ícone da bandeja → Sair. */
let quitting = false, tray = null, trayHintShown = false;
async function flushRenderer() {
  if (!win || win.isDestroyed()) return;
  try {
    await Promise.race([
      win.webContents.executeJavaScript('(window.__beforeUpdate ? Promise.resolve(window.__beforeUpdate()).then(() => true) : true)'),
      new Promise((r) => setTimeout(r, 3000))
    ]);
  } catch (e) {}
}
async function quitApp(install) {
  if (quitting) return;
  await flushRenderer();
  quitting = true;
  if (install) autoUpdater.quitAndInstall(true, true);   // silencioso e reabre o programa
  else app.quit();
}
function showWindow() {
  if (!win || win.isDestroyed()) return;
  if (!win.isVisible()) win.show();
  if (win.isMinimized()) win.restore();
  win.focus();
}
async function hideToTray() {
  if (currentPage === 'financeiro') {   // não deixa o financeiro aberto escondido
    await flushRenderer();
    unlocked = false; currentPage = 'producao';
    win.loadFile(path.join(__dirname, PAGES.producao));
  }
  win.hide();
  if (!trayHintShown && Notification.isSupported()) {
    trayHintShown = true;
    new Notification({ title: 'Cristiano Convites continua aberto', body: 'Fica aqui perto do relógio para avisar dos lembretes. Para sair, clique com o botão direito no ícone e escolha Sair.', icon: path.join(__dirname, 'icon.png') }).show();
  }
}
function createTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip('Cristiano Convites');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir Cristiano Convites', click: showWindow },
    { label: 'Procurar atualizações', click: () => { upd.state === 'ready' ? readyToInstall() : checkUpdates('menu da bandeja'); } },
    { type: 'separator' },
    { label: 'Sair', click: () => quitApp(false) }
  ]));
  tray.on('click', showWindow);
  tray.on('double-click', showWindow);
}

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
  win.on('close', (e) => { if (!quitting) { e.preventDefault(); hideToTray(); } });
  win.on('session-end', () => { quitting = true; });   // Windows desligando
  win.on('focus', () => { if (Date.now() - lastCheck > 10 * 60000) checkUpdates('janela em foco'); });
  win.loadFile(path.join(__dirname, 'index.html'));
}

Menu.setApplicationMenu(null);
app.setAppUserModelId('br.com.cristianoconvites.producao');   // notificações do Windows com o nome do programa
app.on('before-quit', () => { quitting = true; });
app.whenReady().then(() => { loadData(); createWindow(); createTray(); setupUpdater(); });
app.on('window-all-closed', () => { if (quitting) app.quit(); });
