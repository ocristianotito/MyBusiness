/* Produtividade: quadro das fases de trabalho de cada turma (fotos, textos, criação, aprovação…),
   separado do quadro por mês das Demandas. A fase fica no próprio pedido: c.fase (id) e c.faseEm (quando entrou).
   As fases ficam em cfg.fases [{id, name, c, resp}] e vão pela Nuvem junto com a configuração. */
(function () {
  'use strict';
  const DEF_FASES = [
    { id: 'f_fazer', name: 'A FAZER', c: '#8C9BAB', resp: '' },
    { id: 'f_fotos', name: 'EDIÇÃO DE FOTOS', c: '#579DFF', resp: '' },
    { id: 'f_textos', name: 'TEXTOS', c: '#6CC3E0', resp: '' },
    { id: 'f_criacao', name: 'CRIAÇÃO', c: '#9F8FEF', resp: '' },
    { id: 'f_correcao', name: 'CORREÇÃO', c: '#F87168', resp: '' },
    { id: 'f_aprov', name: 'APROVAÇÃO', c: '#FEA362', resp: '' },
    { id: 'f_pronto', name: 'PRONTO PARA IMPRESSÃO', c: '#4BCE97', resp: '' }
  ];
  const box = document.getElementById('mod-produtividade'); if (!box) return;
  const fases = () => (Array.isArray(C().fases) && C().fases.length ? C().fases : DEF_FASES);
  // pedido do dono (1.2.22): fase CORREÇÃO entre CRIAÇÃO e APROVAÇÃO nas fases já salvas (uma vez; se já existir, não repete)
  function addCorrecao() {
    if (!Array.isArray(C().fases) || !C().fases.length || C().correcao1222) return;
    const fs = C().fases.slice(), sem = (n) => String(n || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!fs.some((f) => sem(f.name) === 'CORRECAO')) {
      let i = fs.findIndex((f) => sem(f.name) === 'APROVACAO'); if (i < 0) i = Math.max(0, fs.length - 1);
      fs.splice(i, 0, { id: 'f_correcao', name: 'CORREÇÃO', c: '#F87168', resp: '' });
    }
    cfg = Object.assign({}, C(), { fases: fs, correcao1222: 1 }); persist();
  }
  const faseDe = (c) => { const fs = fases(); return fs.find((f) => f.id === c.fase) || fs[0]; };
  const respDe = (c) => (faseDe(c).resp || c.resp || '').trim();
  const dias = (t) => t ? Math.floor((Date.now() - t) / 86400000) : null;
  const tempo = (n) => n == null ? '' : n === 0 ? 'desde hoje' : n === 1 ? 'há 1 dia' : 'há ' + n + ' dias';
  let filtro = '', busca = '', dragId = null;
  try { filtro = localStorage.getItem('cc.prodResp') || ''; } catch (e) {}

  function ativos() {   // pedidos ainda não entregues
    return [...cards.entries()].filter(([, c]) => !isDone(c));
  }
  function cartao(id, c, ultima, prox) {
    const d = dueInfo(c), col = colacaoDe(c), r = respDe(c), n = dias(c.faseEm);
    return `<div class="cardk pcard${n != null && n > 7 ? ' parado' : ''}" draggable="true" tabindex="0" data-id="${esc(id)}">
      <h5>${esc(c.title || 'Sem título')}</h5>${c.sub ? `<div class="s">${esc(c.sub)}</div>` : ''}
      <div class="pmeta">${col ? `<span class="chip colac" title="Data da colação">Colação ${fmtColacao(col).slice(0, 5)}</span>` : ''}${d ? `<span class="chip ${d.cls}" title="Prazo de entrega">${esc(d.txt)}</span>` : ''}${n != null ? `<span class="chip ptempo" title="Tempo nesta fase">${tempo(n)}</span>` : ''}</div>
      <div class="pfoot">${r ? `<span class="av" title="Responsável: ${esc(r)}">${esc(initials(r))}</span><span class="prn">${esc(r)}</span>` : '<span class="prn mu">Sem responsável</span>'}<span class="sp"></span>${ultima ? '' : `<button class="pnext" data-pnext="${esc(id)}" title="Mover para ${esc(prox.name)}">Próxima fase →</button>`}</div></div>`;
  }

  // turmas sempre pela data da colação, a mais próxima primeiro; sem data no fim (pedido do dono)
  const porColacao = (a, b) => { const x = colacaoDe(a[1]) || '9999', y = colacaoDe(b[1]) || '9999'; return x < y ? -1 : x > y ? 1 : String(a[1].title || '').localeCompare(String(b[1].title || ''), 'pt-BR'); };
  window.renderProdutividade = function renderProdutividade() {
    addCorrecao();
    const fs = fases(), lista = ativos();
    const nomes = [...new Set(fs.map((f) => f.resp).concat(lista.map(([, c]) => c.resp)).map((x) => String(x || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const q = busca.trim().toLowerCase();
    const vis = lista.filter(([, c]) => (!filtro || respDe(c) === filtro) && (!q || String(c.title || '').toLowerCase().includes(q)));
    const sl = (document.getElementById('pboard') || {}).scrollLeft || 0;
    box.innerHTML = `<header class="pagehead"><span class="phicon">${ShellIcon('produtividade', 19)}</span><div><h1>Produtividade</h1><small>${lista.length} turma(s) em produção · ordem: colação mais próxima primeiro</small></div>
      <span class="phsp"></span><input type="search" id="pq" class="hsearch" placeholder="Buscar turma" value="${esc(busca)}">
      <select id="presp" class="hsel" aria-label="Responsável"><option value="">Todos os responsáveis</option>${nomes.map((n) => `<option${n === filtro ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <button class="btn ghost sm" data-pcfg>Configurar fases</button></header>
      <div class="pwrap"><div class="board pboard" id="pboard">${fs.map((f, i) => {
        const l = vis.filter(([, c]) => faseDe(c).id === f.id).sort(porColacao);
        return `<section class="col" data-fase="${esc(f.id)}"><h4><span class="dot" style="background:${esc(f.c)}"></span><span class="nm">${esc(f.name)}</span><em>${l.length}</em></h4>
          ${f.resp ? `<div class="sumq">Responsável: ${esc(f.resp)}</div>` : ''}
          <div class="cbody">${l.map(([id, c]) => cartao(id, c, i === fs.length - 1, fs[i + 1])).join('') || '<div class="pvazio">Arraste uma turma para cá</div>'}</div></section>`;
      }).join('')}</div></div>`;
    const b = document.getElementById('pboard'); if (b) b.scrollLeft = sl;
  };

  function mover(id, faseId, antes) {
    const c = cards.get(id); if (!c) return;
    const mesma = faseDe(c).id === faseId;
    const l = ativos().filter(([k, x]) => k !== id && faseDe(x).id === faseId).sort((a, b) => (a[1].fOrd || 0) - (b[1].fOrd || 0));
    let ord;
    if (!antes) ord = (l.length ? (l[l.length - 1][1].fOrd || 0) : 0) + 1024;
    else { const i = l.findIndex(([k]) => k === antes), nx = l[i] ? (l[i][1].fOrd || 0) : 0, pv = i > 0 ? (l[i - 1][1].fOrd || 0) : nx - 2048; ord = (pv + nx) / 2; }
    const next = Object.assign({}, c, { fase: faseId, fOrd: ord });
    if (!mesma) { next.faseEm = Date.now(); next.atualizado = Date.now(); }
    saveCard(id, next);
    if (!mesma) toast((c.title || 'Turma') + ' → ' + (fases().find((f) => f.id === faseId) || {}).name);
  }

  box.addEventListener('click', (e) => {
    const nx = e.target.closest('[data-pnext]');
    if (nx) { e.stopPropagation(); const c = cards.get(nx.dataset.pnext), fs = fases(), i = fs.indexOf(faseDe(c)); if (fs[i + 1]) mover(nx.dataset.pnext, fs[i + 1].id); return; }
    if (e.target.closest('[data-pcfg]')) { e.stopPropagation(); return configurar(); }
  });
  box.addEventListener('input', (e) => { if (e.target.id === 'pq') { busca = e.target.value; const p = e.target.selectionStart; renderProdutividade(); const i = document.getElementById('pq'); if (i) { i.focus(); i.setSelectionRange(p, p); } } });
  box.addEventListener('change', (e) => { if (e.target.id === 'presp') { filtro = e.target.value; try { localStorage.setItem('cc.prodResp', filtro); } catch (er) {} renderProdutividade(); } });
  // arrastar entre as fases
  box.addEventListener('dragstart', (e) => { const c = e.target.closest('.pcard'); if (!c) return; dragId = c.dataset.id; c.classList.add('drag'); e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; });
  box.addEventListener('dragend', () => { dragId = null; box.querySelectorAll('.drag,.before,.over').forEach((x) => x.classList.remove('drag', 'before', 'over')); });
  const alvo = (col, y) => [...col.querySelectorAll('.pcard')].filter((x) => x.dataset.id !== dragId).find((x) => { const r = x.getBoundingClientRect(); return y < r.top + r.height / 2; }) || null;
  box.addEventListener('dragover', (e) => { const col = e.target.closest('.col[data-fase]'); if (!col || !dragId) return; e.preventDefault(); box.querySelectorAll('.before,.over').forEach((x) => x.classList.remove('before', 'over')); col.classList.add('over'); const a = alvo(col, e.clientY); if (a) a.classList.add('before'); });
  box.addEventListener('drop', (e) => { const col = e.target.closest('.col[data-fase]'); if (!col || !dragId) return; e.preventDefault(); const a = alvo(col, e.clientY); mover(dragId, col.dataset.fase, a && a.dataset.id); });

  /* ----- configurar fases: nome, cor, responsável padrão, ordem ----- */
  function configurar() {
    let fs = JSON.parse(JSON.stringify(fases()));
    const usada = (id) => ativos().some(([, c]) => faseDe(c).id === id);
    const ov = document.createElement('div'); ov.className = 'ov';
    const ler = () => { ov.querySelectorAll('[data-fn]').forEach((i) => { fs[+i.dataset.fn].name = i.value.trim() || fs[+i.dataset.fn].name; }); ov.querySelectorAll('[data-fr]').forEach((i) => { fs[+i.dataset.fr].resp = i.value.trim(); }); };
    const pintar = () => {
      ov.innerHTML = `<div class="dlg fasdlg" role="dialog" aria-modal="true"><h2>Configurar fases</h2><div class="sub">As colunas da Produtividade, na ordem do trabalho. O responsável aparece nos cartões da fase.</div>
        ${fs.map((f, i) => `<div class="colrow fasrow"><span class="dot" style="background:${esc(f.c)}"></span><input data-fn="${i}" value="${esc(f.name)}" aria-label="Nome da fase"><input data-fr="${i}" value="${esc(f.resp || '')}" placeholder="Responsável" aria-label="Responsável" list="presps">
          <div class="csw">${LCOL.map((h) => `<button type="button" class="sw${String(f.c).toUpperCase() === h ? ' on' : ''}" data-fc="${i}" data-h="${h}" style="--c:${h}" aria-label="Cor ${h}"></button>`).join('')}</div>
          <button class="mv" data-fu="${i}"${i === 0 ? ' disabled' : ''} title="Subir">↑</button><button class="mv" data-fd="${i}"${i === fs.length - 1 ? ' disabled' : ''} title="Descer">↓</button><button class="x" data-fx="${i}"${usada(f.id) || fs.length < 2 ? ' disabled' : ''} title="${usada(f.id) ? 'Tire as turmas desta fase antes de excluir' : 'Excluir fase'}">✕</button></div>`).join('')}
        <datalist id="presps">${[...new Set([...cards.values()].map((c) => String(c.resp || '').trim()).filter(Boolean))].map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
        <div class="addrow"><input id="pfnova" placeholder="Nova fase (ex.: CORREÇÃO)"><button class="btn ghost sm" data-fadd>Adicionar fase</button></div>
        <p class="note">Turmas sem fase ficam na primeira coluna. Só dá para excluir uma fase vazia.</p>
        <div class="acts"><button class="btn ghost" data-fcancel>Cancelar</button><button class="btn" data-fsave>Salvar</button></div></div>`;
    };
    pintar(); document.body.appendChild(ov);
    const fechar = () => ov.remove();
    ov.addEventListener('click', (e) => {
      const t = e.target; if (t === ov || t.closest('[data-fcancel]')) return fechar();
      const g = (k) => t.closest('[data-' + k + ']'), a = (el, k) => +el.dataset[k];
      let el;
      if ((el = g('fc'))) { ler(); fs[a(el, 'fc')].c = el.dataset.h; return pintar(); }
      if ((el = g('fu'))) { ler(); const i = a(el, 'fu'); [fs[i - 1], fs[i]] = [fs[i], fs[i - 1]]; return pintar(); }
      if ((el = g('fd'))) { ler(); const i = a(el, 'fd'); [fs[i + 1], fs[i]] = [fs[i], fs[i + 1]]; return pintar(); }
      if ((el = g('fx'))) { ler(); fs.splice(a(el, 'fx'), 1); return pintar(); }
      if (g('fadd')) { ler(); const n = ov.querySelector('#pfnova').value.trim(); if (!n) return ov.querySelector('#pfnova').focus(); fs.push({ id: 'f' + Date.now().toString(36), name: n.toUpperCase(), c: LCOL[fs.length % LCOL.length], resp: '' }); pintar(); return ov.querySelector('#pfnova').focus(); }
      if (g('fsave')) { ler(); cfg = Object.assign({}, C(), { fases: fs }); persist(); fechar(); renderProdutividade(); toast('Fases salvas'); }
    });
    ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
  }
})();
