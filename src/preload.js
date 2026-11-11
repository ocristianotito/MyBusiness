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
  gerarPdf: (html, filename, titulo) => ipcRenderer.invoke('pdf:save', html, filename, titulo),
  // nuvem (sincronização entre aparelhos)
  nuvemStatus: () => ipcRenderer.invoke('nuvem:status'),
  nuvemEntrar: (email, senha) => ipcRenderer.invoke('nuvem:entrar', email, senha),
  nuvemSair: () => ipcRenderer.invoke('nuvem:sair'),
  nuvemAgora: () => ipcRenderer.invoke('nuvem:agora'),
  onNuvem: (cb) => ipcRenderer.on('nuvem:status', (_e, s) => cb(s)),
  onDadosRemotos: (cb) => ipcRenderer.on('dados:remoto', (_e, p) => cb(p)),
  // navegação
  ir: (page) => ipcRenderer.invoke('app:goto', page),
  acessoStatus: () => ipcRenderer.invoke('acesso:status'),
  acessoEntrar: (pw) => ipcRenderer.invoke('acesso:entrar', pw),
  acessoCriar: (nova, atual) => ipcRenderer.invoke('acesso:criar', nova, atual),
  acessoRecuperar: (tipo, senha) => ipcRenderer.invoke('acesso:recuperar', tipo, senha),
  acessoTrocar: () => ipcRenderer.invoke('acesso:trocar'),
  acessoCancelar: () => ipcRenderer.invoke('acesso:cancelar'),
  onAcesso: (cb) => ipcRenderer.on('acesso:mudou', (_e, s) => cb(s)),
  abrirLink: (url) => ipcRenderer.invoke('app:openExternal', url)
});
