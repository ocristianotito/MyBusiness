const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // produção
  load: () => ipcRenderer.invoke('data:load'),
  save: (data) => ipcRenderer.invoke('data:save', data),
  // financeiro
  finLoadSync: () => ipcRenderer.sendSync('fin:loadSync'),
  finSave: (str) => ipcRenderer.invoke('fin:save', str),
  finSaveSync: (str) => ipcRenderer.sendSync('fin:saveSync', str),
  saveFile: (filename, data) => ipcRenderer.invoke('file:save', filename, data),
  perguntar: (msg, def) => ipcRenderer.sendSync('dlg:prompt', msg, def),
  // backup completo
  exportar: () => ipcRenderer.invoke('data:export'),
  importar: () => ipcRenderer.invoke('data:import'),
  aplicarImport: () => ipcRenderer.invoke('data:applyImport'),
  abrirBackups: () => ipcRenderer.invoke('app:openBackups'),
  // atualização
  versao: () => ipcRenderer.invoke('app:version'),
  estadoAtualizacao: () => ipcRenderer.invoke('update:get'),
  verificarAtualizacao: () => ipcRenderer.invoke('update:check'),
  instalarAtualizacao: () => ipcRenderer.invoke('update:install'),
  adiarAtualizacao: (min) => ipcRenderer.invoke('update:postpone', min),
  onAtualizacao: (cb) => ipcRenderer.on('update:status', (_e, s) => cb(s)),
  // senha do financeiro
  senhaStatus: () => ipcRenderer.invoke('sec:status'),
  senhaEntrar: (pw) => ipcRenderer.invoke('sec:unlock', pw),
  senhaDefinir: (nova, atual) => ipcRenderer.invoke('sec:set', nova, atual),
  trancar: () => ipcRenderer.invoke('sec:lock'),
  // agenda: clique na notificação de lembrete
  onAbrirCompromisso: (cb) => ipcRenderer.on('agenda:open', (_e, r) => cb(r)),
  // contratos
  gerarPdf: (html, filename) => ipcRenderer.invoke('pdf:save', html, filename),
  // navegação
  ir: (page) => ipcRenderer.invoke('app:goto', page),
  abrirLink: (url) => ipcRenderer.invoke('app:openExternal', url)
});
