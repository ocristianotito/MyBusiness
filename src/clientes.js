'use strict';
/* ===== Clientes =====
   Comissões de formatura, parceiros e clientes avulsos. Cada pedido (cartão) pode ser ligado a um cliente,
   e o contrato também. Usa as globais de app.js (clients, cards, contracts, modal, persist, render…). */
const CLI_SIT = { ativo: { n: 'Ativo', c: '#34D399' }, pausado: { n: 'Pausado', c: '#F0A53F' }, prospect: { n: 'Prospect', c: '#60A5FA' }, encerrado: { n: 'Encerrado', c: '#8B9BAE' } };
const CLI_TIPO = { turma: 'Comissão de formatura', parceiro: 'Parceiro', avulso: 'Avulso' };
const CLI_SERV = ['Convite Luxo', 'Convite Simplificado', 'Foto mensagem', 'Foto família', 'Vegetal', 'Brasão', 'Convite digital', 'Caixa'];
const CT_SIT = { rascunho: { n: 'Rascunho', c: '#F0A53F' }, enviado: { n: 'Enviado', c: '#60A5FA' }, assinado: { n: 'Assinado', c: '#34D399' } };
let cliFiltro = 'todos', cliBusca = '';

const AVC = ['#2DB5AE', '#60A5FA', '#A78BFA', '#F0A53F', '#E774BB', '#34D399', '#F87171'];
const avColor = (s) => { let h = 0; String(s || '').split('').forEach((ch) => { h = (h * 31 + ch.charCodeAt(0)) >>> 0; }); return AVC[h % AVC.length]; };
const ymLabel = (ym) => { if (!ym || !/^\d{4}-\d{2}/.test(ym)) return '—'; const [y, m] = ym.split('-').map(Number); return MES[m - 1].replace(/^./, (c) => c.toUpperCase()) + ' ' + y; };
const dLabel = (iso) => { const d = parseD(iso); return d ? d.getDate() + ' ' + MES[d.getMonth()] + ' ' + d.getFullYear() : '—'; };
function cliCards(id) { return [...cards.entries()].filter(([, c]) => c.clientId === id); }
function cliContract(id) {
  const l = [...contracts.entries()].filter(([, k]) => k.clientId === id);
  const rank = { assinado: 3, enviado: 2, rascunho: 1 };
  return l.sort((a, b) => (rank[b[1].status] || 0) - (rank[a[1].status] || 0))[0] || null;
}

function renderClientes() {
  const box = $('mod-clientes');
  const all = [...clients.entries()];
  const cnt = (s) => all.filter(([, c]) => (c.situacao || 'ativo') === s).length;
  const aberto = all.filter(([id]) => cliCards(id).some(([, c]) => !isDone(c))).length;
  const comCt = all.filter(([id]) => cliContract(id)).length;
  const assin = all.filter(([id]) => { const k = cliContract(id); return k && k[1].status === 'assinado'; }).length;
  const ativos = cnt('ativo');
  const q = cliBusca.trim().toLowerCase();
  const rows = all.filter(([, c]) => (cliFiltro === 'todos' || (c.situacao || 'ativo') === cliFiltro) && (!q || [c.nome, c.curso, c.instituicao, c.comissao, c.telefone].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => String(a[1].nome).localeCompare(String(b[1].nome), 'pt-BR'));
  const semVinculo = [...cards.values()].filter((c) => !c.clientId).length;
  const kpi = (ic, v, l, extra, col) => `<div class="ck"><span class="cki" style="--c:${col}">${ShellIcon(ic, 18)}</span><div><b>${v}${extra ? `<small>${extra}</small>` : ''}</b><span>${l}</span></div></div>`;
  box.innerHTML = `<header class="pagehead"><span class="phicon">${ShellIcon('clientes', 19)}</span><div><h1>Clientes</h1><small>${all.length} cadastrado(s) · ${aberto} com trabalho em aberto</small></div>
   <div class="cfilt seg">${['todos', 'ativo', 'pausado', 'prospect', 'encerrado'].map((s) => `<button data-clf="${s}" class="${cliFiltro === s ? 'on' : ''}">${s === 'todos' ? 'Todos' : `<i style="background:${CLI_SIT[s].c}"></i>${CLI_SIT[s].n}`} <em>${s === 'todos' ? all.length : cnt(s)}</em></button>`).join('')}</div>
   <span class="phsp"></span><input type="search" id="cliq" class="hsearch" placeholder="Buscar cliente" value="${esc(cliBusca)}">
   <button class="btn sm" data-cla="novo">+ Novo cliente</button></header>
  <div class="mbody"><div class="mwrap">
   <div class="ckpis">${kpi('clientes', all.length, 'Clientes cadastrados', '', '#A78BFA')}${kpi('clientes', ativos, 'Ativos na carteira', all.length ? Math.round(ativos / all.length * 100) + '%' : '', '#34D399')}${kpi('demandas', aberto, 'Com trabalho em aberto', '', '#F0A53F')}${kpi('contratos', assin, 'Contratos assinados', '', '#60A5FA')}${kpi('contratos', all.length - comCt, 'Sem contrato', '', '#F87171')}</div>
   ${all.length ? `<div class="ctable"><table class="tblc"><thead><tr><th>Cliente</th><th>Entrou</th><th>Colação</th><th>Serviços</th><th>Entregas</th><th>Situação</th><th>Contrato</th></tr></thead><tbody>
   ${rows.map(([id, c]) => {
     const cc = cliCards(id), done = cc.filter(([, x]) => isDone(x)).length, sit = CLI_SIT[c.situacao || 'ativo'], k = cliContract(id);
     const sv = (c.servicos || []);
     return `<tr data-cli="${esc(id)}"><td><div class="cname"><span class="cav" style="--c:${avColor(c.nome)}">${esc(initials(c.nome))}</span><span><b>${esc(c.nome)}</b><small>${esc([CLI_TIPO[c.tipo || 'turma'], c.instituicao].filter(Boolean).join(' · '))}</small></span></div></td>
     <td class="mu">${ymLabel(c.entrou)}</td><td class="mu">${dLabel(c.colacao)}</td>
     <td><div class="tags">${sv.slice(0, 2).map((x) => `<span class="tag2">${esc(x)}</span>`).join('')}${sv.length > 2 ? `<span class="tag2 more">+${sv.length - 2}</span>` : ''}${!sv.length ? '<span class="mu">—</span>' : ''}</div></td>
     <td>${cc.length ? `<div class="mini"><div class="bar"><i style="width:${done / cc.length * 100}%;background:var(--teal)"></i></div><span class="note">${done}/${cc.length}</span></div>` : '<span class="mu">—</span>'}</td>
     <td><span class="sit" style="--c:${sit.c}">${sit.n}</span></td>
     <td>${k ? `<button class="ctbtn" data-cla="ct" data-k="${esc(k[0])}" title="Abrir contrato"><span class="sit" style="--c:${CT_SIT[k[1].status || 'rascunho'].c}">${CT_SIT[k[1].status || 'rascunho'].n}</span></button>` : `<button class="ctbtn add" data-cla="novoct" data-id="${esc(id)}" title="Criar contrato">+ Contrato</button>`}</td></tr>`;
   }).join('') || `<tr><td colspan="7" class="note" style="text-align:center;padding:24px">Nenhum cliente com estes filtros.</td></tr>`}</tbody></table></div>` :
   `<div class="emptybox">${ShellIcon('clientes', 30)}<b>Nenhum cliente cadastrado</b><p>Cadastre as comissões de formatura e parceiros. Depois, ligue cada pedido e cada contrato ao seu cliente.</p>
    <div class="acts" style="justify-content:center"><button class="btn" data-cla="novo">+ Novo cliente</button>${semVinculo ? `<button class="btn ghost" data-cla="dospedidos">Criar a partir dos ${semVinculo} pedidos</button>` : ''}</div></div>`}
   ${all.length && semVinculo ? `<p class="note">${semVinculo} pedido(s) ainda sem cliente. <button class="linkbtn" data-cla="dospedidos">Criar clientes a partir deles</button> ou escolha o cliente na janela de cada pedido.</p>` : ''}
  </div></div>`;
}

/* cria um cliente por nome de pedido (sem a data no fim) e liga os pedidos a ele */
function clientesDosPedidos() {
  const limpa = (t) => String(t || '').replace(/[\s\-–·|]*\d{1,2}\/\d{1,2}(\/\d{2,4})?\s*$/, '').replace(/\s+-\s*$/, '').trim();
  const porNome = new Map([...clients.entries()].map(([id, c]) => [String(c.nome).toLowerCase(), id]));
  let novos = 0, ligados = 0;
  cards.forEach((c, cid) => {
    if (c.clientId) return;
    const nome = limpa(c.title); if (!nome) return;
    let id = porNome.get(nome.toLowerCase());
    if (!id) {
      id = newId(); novos++;
      clients.set(id, { nome, tipo: 'turma', situacao: isDone(c) ? 'encerrado' : 'ativo', instituicao: c.sub || '', servicos: lbls(c).map((l) => l.n).filter((n) => /CONVITE|FOTO|BRAS/i.test(n)).map((n) => n.replace(/^CONVITE /i, 'Convite ').replace(/\b(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase())), entrou: c.criado ? new Date(c.criado).toISOString().slice(0, 7) : '', criado: Date.now() });
      porNome.set(nome.toLowerCase(), id);
    }
    cards.set(cid, Object.assign({}, c, { clientId: id })); ligados++;
  });
  persist(); render();
  toast(novos + ' cliente(s) criado(s) e ' + ligados + ' pedido(s) ligado(s). Revise os nomes clicando em cada cliente.');
}

/* ----- janela do cliente ----- */
function openCli(id) {
  const base = id ? clients.get(id) : null;
  const c = base ? JSON.parse(JSON.stringify(base)) : { nome: '', tipo: 'turma', curso: '', instituicao: '', periodo: '', colacao: '', comissao: '', telefone: '', email: '', situacao: 'ativo', entrou: new Date().toISOString().slice(0, 7), servicos: [], qtd: '', notas: '' };
  if (!Array.isArray(c.servicos)) c.servicos = [];
  modal = { t: 'cli', id, c, confirm: false }; renderModal();
}
function renderCli() {
  const c = modal.c, cc = modal.id ? cliCards(modal.id) : [], kk = modal.id ? [...contracts.entries()].filter(([, k]) => k.clientId === modal.id) : [];
  $('modal').innerHTML = `<div class="ov"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="clt">
  <h2 id="clt">${modal.id ? esc(c.nome || 'Cliente') : 'Novo cliente'}</h2><div class="sub">Dados da comissão ou do cliente. Salve com Ctrl+Enter.</div>
  <div class="dlgcols"><div>
  <div class="fg">
   <label class="full">Nome<input id="k-nome" value="${esc(c.nome)}" placeholder="Ex.: Direito UNEX 2027.1"></label>
   <label>Tipo<select id="k-tipo">${Object.entries(CLI_TIPO).map(([k, n]) => `<option value="${k}"${c.tipo === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
   <label>Situação<select id="k-sit">${Object.entries(CLI_SIT).map(([k, s]) => `<option value="${k}"${(c.situacao || 'ativo') === k ? ' selected' : ''}>${s.n}</option>`).join('')}</select></label>
   <label>Curso<input id="k-curso" value="${esc(c.curso)}" placeholder="Ex.: Direito"></label>
   <label>Instituição<input id="k-inst" value="${esc(c.instituicao)}" placeholder="Ex.: UNEX"></label>
   <label>Turma / período<input id="k-per" value="${esc(c.periodo)}" placeholder="Ex.: 2027.1"></label>
   <label>Data da colação<input id="k-col" type="date" value="${esc(c.colacao)}"></label>
   <label>Cliente desde<input id="k-entrou" type="month" value="${esc(c.entrou)}"></label>
   <label>Quantidade de convites<input id="k-qtd" inputmode="numeric" value="${esc(c.qtd || '')}"></label>
   <label class="full">Comissão / contatos<input id="k-com" value="${esc(c.comissao)}" placeholder="Nomes de quem representa a turma"></label>
   <label>Telefone<input id="k-tel" value="${esc(c.telefone)}"></label>
   <label>E-mail<input id="k-email" value="${esc(c.email)}"></label>
  </div>
  <div class="sect">Serviços</div>
  <div class="tipos">${CLI_SERV.map((s) => `<button type="button" class="tp sv${c.servicos.includes(s) ? ' on' : ''}" data-sv="${esc(s)}" style="--c:#2DB5AE">${esc(s)}</button>`).join('')}</div>
  </div><div>
  <div class="sect">Observações</div>
  <textarea id="k-notas" style="min-height:150px" placeholder="Preferências da turma, fotógrafo, cerimonial…">${esc(c.notas)}</textarea>
  ${modal.id ? `<div class="sect">Pedidos (${cc.length})</div>${cc.length ? cc.map(([id, x]) => `<button class="linkrow" data-cla="pedido" data-id="${esc(id)}"><span class="sdot" style="background:${corEtapa(colById(colOf(x)).c)}"></span>${esc(x.title)}<em>${esc(colById(colOf(x)).name)}</em></button>`).join('') : '<p class="note">Nenhum pedido ligado. Escolha este cliente na janela do pedido.</p>'}
  <div class="sect">Contratos (${kk.length})</div>${kk.map(([id, k]) => `<button class="linkrow" data-cla="ct" data-k="${esc(id)}"><span class="sdot" style="background:${CT_SIT[k.status || 'rascunho'].c}"></span>${esc(k.produto || 'Contrato')} · ${Extenso.brl((+k.qtd || 0) * (+k.unit || 0))}<em>${CT_SIT[k.status || 'rascunho'].n}</em></button>`).join('')}
  <button class="btn ghost sm" data-cla="novoct" data-id="${esc(modal.id)}" style="margin-top:6px">+ Novo contrato para este cliente</button>` : ''}
  </div></div>
  <p class="pwerr" id="k-err" role="alert"></p>
  <div class="acts">${modal.id ? (modal.confirm ? '<button class="btn danger" data-cla="delok">Confirmar exclusão</button><button class="btn ghost" data-cla="delno">Manter</button>' : '<button class="btn danger" data-cla="del">Excluir</button>') : ''}
   <span class="meta"></span><button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-cla="salvar">Salvar</button></div></div></div>`;
  if (!modal.id) setTimeout(() => { const e = $('k-nome'); if (e) e.focus(); }, 30);
}
function readCli() {
  const c = modal.c, v = (id) => { const e = $(id); return e ? e.value : ''; };
  c.nome = v('k-nome').trim(); c.tipo = v('k-tipo'); c.situacao = v('k-sit'); c.curso = v('k-curso').trim(); c.instituicao = v('k-inst').trim(); c.periodo = v('k-per').trim();
  c.colacao = v('k-col'); c.entrou = v('k-entrou'); c.qtd = n0(v('k-qtd')) || ''; c.comissao = v('k-com').trim(); c.telefone = v('k-tel').trim(); c.email = v('k-email').trim(); c.notas = v('k-notas');
  c.servicos = [...document.querySelectorAll('.tp.sv.on')].map((b) => b.dataset.sv);
}
function saveCli() {
  readCli(); const c = modal.c;
  if (!c.nome) { $('k-err').textContent = 'Dê um nome ao cliente.'; return $('k-nome').focus(); }
  const id = modal.id || newId(); if (!c.criado) c.criado = Date.now(); c.atualizado = Date.now();
  clients.set(id, c); const novo = !modal.id; modal = null; renderModal(); persist(); render();
  toast(novo ? 'Cliente cadastrado' : 'Cliente salvo');
  return id;
}
function clientesModalClick(t, act) {
  const sv = t.closest('.tp.sv'); if (sv) { sv.classList.toggle('on'); return; }
  const b = t.closest('[data-cla]'); const a = b && b.dataset.cla;
  if (a === 'salvar') return saveCli();
  if (a === 'del') { readCli(); modal.confirm = true; return renderCli(); }
  if (a === 'delno') { readCli(); modal.confirm = false; return renderCli(); }
  if (a === 'delok') {
    const id = modal.id; modal = null; renderModal(); clients.delete(id);
    cards.forEach((c, cid) => { if (c.clientId === id) cards.set(cid, Object.assign({}, c, { clientId: '' })); });
    persist(); render(); return toast('Cliente excluído. Os pedidos ficaram sem cliente.');
  }
  if (a === 'pedido') { const id = b.dataset.id; modal = null; renderModal(); return openCard(id); }
  if (a === 'ct') { const k = b.dataset.k; modal = null; renderModal(); goModule('contratos'); return openCt(k); }
  if (a === 'novoct') { readCli(); const id = modal.id; modal = null; renderModal(); goModule('contratos'); return openCt(null, id); }
}
$('mod-clientes').addEventListener('click', (e) => {
  if (modal) return;
  const f = e.target.closest('[data-clf]'); if (f) { cliFiltro = f.dataset.clf; return renderClientes(); }
  const b = e.target.closest('[data-cla]');
  if (b) {
    const a = b.dataset.cla;
    if (a === 'novo') return openCli(null);
    if (a === 'dospedidos') return clientesDosPedidos();
    if (a === 'ct') { goModule('contratos'); return openCt(b.dataset.k); }
    if (a === 'novoct') { goModule('contratos'); return openCt(null, b.dataset.id); }
    return;
  }
  const r = e.target.closest('[data-cli]'); if (r) openCli(r.dataset.cli);
});
$('mod-clientes').addEventListener('input', (e) => {
  if (e.target.id !== 'cliq') return;
  cliBusca = e.target.value; const pos = e.target.selectionStart; renderClientes();
  const n = $('cliq'); n.focus(); n.setSelectionRange(pos, pos);
});
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && modal && modal.t === 'cli') { e.preventDefault(); saveCli(); } });
