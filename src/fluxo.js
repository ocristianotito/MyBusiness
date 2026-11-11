'use strict';
/* ===== Financeiro → Visão do mês (fluxo de caixa) =====
   Carregado no financeiro.html ANTES do script do Dashboard de Convites; usa as globais dele em tempo de
   execução (S, BRL, esc, save, render, tot). Os dados ficam em S.cx (dentro dos dados protegidos do Financeiro):
   cx = { saldoBase, saldoMes, mov:[lançamento do mês], rec:[lançamento que repete todo mês], recSt:{"recId|AAAA-MM":{pago,valor}} } */
(function () {
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const GRUPOS = {
    e: [['turmas', 'Recebimentos de turmas', 'parcelas e entradas das comissões'], ['parceiros', 'Convites com parceiros', 'fechamentos em parceria'], ['outras', 'Outras entradas', 'vendas avulsas e extras']],
    s: [['fixas', 'Saídas fixas', 'todo mês, valor previsível'], ['graficas', 'Gráfica e fornecedores', 'impressão, papel, acabamento'], ['variaveis', 'Saídas variáveis', 'muda de mês para mês']]
  };
  const CAT = { turmas: 'Turma', parceiros: 'Parceiro', outras: 'Avulso', fixas: 'Fixa', graficas: 'Fornecedor', variaveis: 'Variável' };
  const ymNow = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const ymAdd = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const ymNome = (ym) => { const [y, m] = ym.split('-').map(Number); return MESES[m - 1].replace(/^./, (c) => c.toUpperCase()) + ' de ' + y; };
  const ymCurto = (ym) => MESES[+ym.split('-')[1] - 1].slice(0, 3);
  const parseV = (s) => { if (typeof num === 'function') { const v = num(s); return isNaN(v) ? null : Math.round(v * 100) / 100; } s = String(s == null ? '' : s).replace(/R\$|\s/g, ''); if (!s) return null; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const v = parseFloat(s); return isNaN(v) ? null : Math.round(v * 100) / 100; };
  const fmtV = (v) => v == null ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let mes = ymNow(), aberto = { fixas: true, turmas: true }, ov = null;

  function cx() {
    if (!S.cx || typeof S.cx !== 'object') S.cx = {};
    const c = S.cx;
    if (!Array.isArray(c.mov)) c.mov = []; if (!Array.isArray(c.rec)) c.rec = [];
    if (!c.recSt || typeof c.recSt !== 'object') c.recSt = {};
    if (typeof c.saldoBase !== 'number') c.saldoBase = 0; if (!c.saldoMes) c.saldoMes = ymNow();
    return c;
  }
  function itens(m) {
    const c = cx(), out = [];
    c.mov.filter((x) => x.mes === m).forEach((x) => out.push({ src: 'mov', id: x.id, tipo: x.tipo, grupo: x.grupo, desc: x.desc, valor: x.valor, dia: x.dia, pago: !!x.pago, turmaId: x.turmaId }));
    c.rec.filter((r) => (r.desde || '0000-00') <= m && (!r.ate || m <= r.ate)).forEach((r) => {
      const st = c.recSt[r.id + '|' + m] || {};
      out.push({ src: 'rec', id: r.id, tipo: r.tipo, grupo: r.grupo, desc: r.desc, valor: st.valor != null ? st.valor : r.valor, dia: r.dia, pago: !!st.pago, rec: true, turmaId: r.turmaId });
    });
    return out.sort((a, b) => (a.dia || 99) - (b.dia || 99) || String(a.desc).localeCompare(String(b.desc), 'pt-BR'));
  }
  const soma = (l) => l.reduce((s, x) => s + (x.valor || 0), 0);
  function resumo(m) {
    const l = itens(m), e = l.filter((x) => x.tipo === 'e'), s = l.filter((x) => x.tipo === 's');
    return { l, ePago: soma(e.filter((x) => x.pago)), sPago: soma(s.filter((x) => x.pago)), ePrev: soma(e), sPrev: soma(s), semValor: l.filter((x) => x.valor == null).length };
  }
  function saldo(ate) {
    const c = cx(); let v = c.saldoBase, m = c.saldoMes, guard = 0;
    while (m <= ate && guard++ < 240) { const r = resumo(m); v += r.ePago - r.sPago; m = ymAdd(m, 1); }
    return v;
  }

  /* ----- gráfico de fluxo (6 meses) ----- */
  function curva(pts) {
    const n = pts.length; if (n < 3) return 'M' + pts.map((p) => p.join(',')).join(' L');
    const dx = [], dy = [], mm = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
    mm[0] = dy[0]; mm[n - 1] = dy[n - 2];
    for (let i = 1; i < n - 1; i++) mm[i] = dy[i - 1] * dy[i] <= 0 ? 0 : (dy[i - 1] + dy[i]) / 2;
    let d = `M${pts[0][0]},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += ` C${pts[i][0] + h},${(pts[i][1] + mm[i] * h).toFixed(1)} ${pts[i + 1][0] - h},${(pts[i + 1][1] - mm[i + 1] * h).toFixed(1)} ${pts[i + 1][0]},${pts[i + 1][1].toFixed(1)}`; }
    return d;
  }
  function grafico() {
    const ms = [5, 4, 3, 2, 1, 0].map((k) => ymAdd(mes, -k)), rs = ms.map(resumo);
    const E = rs.map((r) => r.ePago), Sd = rs.map((r) => r.sPago);
    const W = 640, H = 220, L = 54, R = 10, T = 12, Bt = 28, max = Math.max(100, ...E, ...Sd);
    const pot = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / pot) * pot, step = top / 4;
    const x = (i) => L + i * (W - L - R) / 5, y = (v) => T + (H - T - Bt) * (1 - v / top);
    const k = (v) => v >= 1000 ? 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k' : 'R$ ' + Math.round(v);
    const grid = [0, 1, 2, 3, 4].map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g * step)}" y2="${y(g * step)}" class="gl"/><text x="${L - 8}" y="${y(g * step) + 4}" text-anchor="end" class="ax">${k(g * step)}</text>`).join('');
    const ser = (v, cls) => { const p = v.map((val, i) => [x(i), y(val)]); const d = curva(p); return `<path d="${d} L${x(5)},${y(0)} L${x(0)},${y(0)} Z" class="ar ${cls}"/><path d="${d}" class="ln ${cls}"/>`; };
    const lbl = ms.map((m, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="ax">${ymCurto(m)}</text>`).join('');
    const hit = ms.map((m, i) => `<rect x="${x(i) - 50}" y="${T}" width="100" height="${H - T - Bt}" fill="transparent"><title>${ymNome(m)}\nEntradas: ${BRL(E[i])}\nSaídas: ${BRL(Sd[i])}</title></rect>`).join('');
    return { svg: `<svg viewBox="0 0 ${W} ${H}" class="vmchart" role="img" aria-label="Fluxo de caixa dos últimos 6 meses">${grid}${ser(E, 'en')}${ser(Sd, 'sa')}${lbl}${hit}</svg>`, saldo: E.reduce((a, b) => a + b, 0) - Sd.reduce((a, b) => a + b, 0) };
  }
  function gauge(p) {
    const r = 78, cxp = 100, cyp = 96, a = Math.PI * Math.min(1, Math.max(0, p));
    const ex = cxp - r * Math.cos(a), ey = cyp - r * Math.sin(a);
    return `<svg viewBox="0 0 200 110" class="vmgauge" aria-hidden="true"><path d="M${cxp - r},${cyp} A${r},${r} 0 0 1 ${cxp + r},${cyp}" class="gbg"/>${p > 0 ? `<path d="M${cxp - r},${cyp} A${r},${r} 0 0 1 ${ex.toFixed(1)},${ey.toFixed(1)}" class="gfg"/>` : ''}</svg>`;
  }

  /* ----- a tela ----- */
  window.v6 = function v6() {
    const c = cx(), r = resumo(mes), lucro = r.ePago - r.sPago, meta = +S.meta || 0, pm = meta ? r.ePago / meta : 0, sal = saldo(mes), g = grafico();
    const linha = (x) => `<div class="vmrow${x.pago ? ' pago' : ''}"><button class="vmck${x.pago ? ' on' : ''}" data-vm="tog" data-src="${x.src}" data-id="${x.id}" title="${x.pago ? 'Marcar como não pago' : 'Marcar como pago'}" aria-pressed="${x.pago}"></button>
      <span class="vmd">${esc(x.desc)}${x.rec ? ' <i class="vmrep" title="Repete todo mês">↻</i>' : ''}</span><span class="vmcat ${x.grupo}">${CAT[x.grupo] || ''}</span><span class="vmdia">${x.dia ? String(x.dia).padStart(2, '0') : '—'}</span>
      <span class="vmv ${x.tipo}">${x.valor == null ? `<button class="vmdef" data-vm="edit" data-src="${x.src}" data-id="${x.id}">definir</button>` : BRL(x.valor)}</span>
      <span class="vmact"><button data-vm="edit" data-src="${x.src}" data-id="${x.id}" title="Editar">Editar</button><button data-vm="del" data-src="${x.src}" data-id="${x.id}" title="Excluir">Excluir</button></span></div>`;
    const painel = (tipo) => {
      const l = r.l.filter((x) => x.tipo === tipo), total = soma(l);
      return `<div class="vmpanel"><div class="vmph"><span class="vmpi ${tipo}">${tipo === 'e' ? '↘' : '↗'}</span><b>${tipo === 'e' ? 'Entradas' : 'Saídas'}</b><em>${l.length}</em><span class="sp"></span><b class="${tipo === 'e' ? 'g' : 'r'}">${BRL(total)}</b><button class="btn sm" data-vm="add" data-tipo="${tipo}" style="margin:0 0 0 10px">+ Adicionar</button></div>
      ${GRUPOS[tipo].map(([gk, gn, gd]) => { const gl = l.filter((x) => x.grupo === gk), op = aberto[gk] !== undefined ? aberto[gk] : gl.length > 0; return `<div class="vmg"><button class="vmgh" data-vm="grp" data-g="${gk}"><span>${op ? '▾' : '▸'}</span><b>${gn}</b><em>${gl.length}</em><small>· ${gd}</small><span class="sp"></span><b class="${tipo === 'e' ? 'g' : 'r'}">${BRL(soma(gl))}</b></button>
        ${op ? (gl.length ? gl.map(linha).join('') : `<div class="vmempty">Nada aqui em ${ymNome(mes).split(' de ')[0].toLowerCase()}. <button class="linkb" data-vm="add" data-tipo="${tipo}" data-g="${gk}">Adicionar</button></div>`) : ''}</div>`; }).join('')}</div>`;
    };
    return `<div class="vm">
    <div class="vmtop"><button class="btn ghost sm" data-vm="mes" data-d="-1" title="Mês anterior">◂</button><button class="btn ghost sm" data-vm="mes" data-d="1" title="Próximo mês">▸</button><h2>${ymNome(mes)}</h2><span class="note">Fechamento do mês</span>${mes !== ymNow() ? '<button class="btn ghost sm" data-vm="hoje">Mês atual</button>' : ''}</div>
    <div class="vmcards">
     <div class="vmc lucro"><div class="vmcl"><span class="vmci">↗</span>Lucro do mês</div><b class="${lucro >= 0 ? 'g' : 'r'}">${BRL(lucro)}</b>
      ${meta ? `<div class="vmmeta"><span>${r.ePago >= meta ? 'meta do mês batida' : 'faltam <b>' + BRL(meta - r.ePago) + '</b> pra meta'}</span><span>${Math.round(pm * 100)}%</span></div><div class="vmbar"><i style="width:${Math.min(100, pm * 100)}%"></i></div>` : '<div class="vmmeta"><button class="linkb" data-vm="meta">Definir a meta do mês</button></div>'}</div>
     <div class="vmc"><div class="vmcl"><span class="vmci">⇄</span>Movimento do mês</div>
      <div class="vmmv"><span class="vmpi e">↘</span>Recebido<b>${BRL(r.ePago)}</b></div><div class="vmmv"><span class="vmpi s">↗</span>Despesas<b>${BRL(r.sPago)}</b></div></div>
     <div class="vmc"><div class="vmcl"><span class="vmci">◎</span>Saldo em caixa</div><b>${BRL(sal)}</b><div class="note">base ${BRL(c.saldoBase)} em ${ymNome(c.saldoMes).toLowerCase()} · ajustado pelo que entra e sai <button class="linkb" data-vm="saldo">editar</button></div></div>
    </div>
    <div class="vmrow2">
     <div class="vmc"><div class="vmcl">Fluxo de caixa <small>últimos 6 meses</small><span class="sp"></span><span class="lg"><i class="en"></i>Entradas</span><span class="lg"><i class="sa"></i>Saídas</span></div>${g.svg}
      <div class="vmfoot"><span>Saldo do período (entradas − saídas)</span><b class="${g.saldo >= 0 ? 'g' : 'r'}">${BRL(g.saldo)}</b></div></div>
     <div class="vmc vmgc"><div class="vmcl">Meta do mês<span class="sp"></span><button class="linkb" data-vm="meta">editar</button></div>
      ${gauge(pm)}<div class="vmgp"><b>${meta ? Math.round(pm * 100) + '%' : '—'}</b><small>da meta</small></div>
      <div class="vmgf"><small>Faltam para a meta</small><b>${meta ? BRL(Math.max(0, meta - r.ePago)) : 'defina a meta'}</b></div>
      <div class="vmfoot"><span>Recebido</span><b>${BRL(r.ePago)} <small>${meta ? 'de ' + BRL(meta) : '· meta não definida'}</small></b></div></div>
    </div>
    ${r.semValor ? `<div class="vmwarn">⚠ ${r.semValor} lançamento(s) ainda sem valor: clique em "definir" para preencher.</div>` : ''}
    <div class="vmcols">${painel('e')}${painel('s')}</div>
    <p class="note">Marque o círculo quando o dinheiro entrar ou sair. O lucro, o movimento, o saldo e o gráfico contam só o que está marcado como pago. Lançamentos com ↻ se repetem todo mês.</p>
    </div>`;
  };

  /* ----- janelas (próprias, para não mexer no modal do Dashboard) ----- */
  function dialog(html, onClick) {
    if (ov) ov.remove();
    ov = document.createElement('div'); ov.className = 'ov'; ov.innerHTML = '<div class="dlg vmdlg">' + html + '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('[data-x]')) { ov.remove(); ov = null; return; } onClick(e); });
    ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') { ov.remove(); ov = null; } if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const ok = ov.querySelector('[data-ok]'); if (ok) ok.click(); } });
    const f = ov.querySelector('input'); if (f) setTimeout(() => f.focus(), 30);
    return ov;
  }
  const fechar = () => { if (ov) { ov.remove(); ov = null; } };
  const salvar = () => { save(); render(); };
  function editar(tipo, src, id, grupo) {
    const c = cx();
    let it = null;
    if (src === 'mov') it = c.mov.find((x) => x.id === id);
    if (src === 'rec') { const r = c.rec.find((x) => x.id === id); const st = c.recSt[id + '|' + mes] || {}; it = r && Object.assign({}, r, { valor: st.valor != null ? st.valor : r.valor, pago: !!st.pago }); }
    const novo = !it;
    it = it || { tipo, grupo: grupo || GRUPOS[tipo][0][0], desc: '', valor: null, dia: '', pago: false };
    tipo = it.tipo;
    const turmas = (S.turmas || []).map((t) => [t.id, t.curso + ' ' + t.per + (t.lista ? ' · ' + t.lista : '')]);
    dialog(`<h2>${novo ? (tipo === 'e' ? 'Nova entrada' : 'Nova saída') : 'Editar lançamento'}</h2><div class="sub">${ymNome(mes)}${src === 'rec' ? ' · repete todo mês: o valor e o pago valem para este mês' : ''}</div>
      <div class="fg"><label class="full">Descrição<input id="vm-desc" value="${esc(it.desc)}" placeholder="${tipo === 'e' ? 'Ex.: Parcela comissão Direito UNEX' : 'Ex.: Gráfica, aluguel, internet'}"></label>
      <label>Grupo<select id="vm-grp">${GRUPOS[tipo].map(([k, n]) => `<option value="${k}"${it.grupo === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Valor (R$)<input id="vm-val" inputmode="decimal" value="${fmtV(it.valor)}" placeholder="deixe vazio para definir depois"></label>
      <label>Dia do mês<input id="vm-dia" inputmode="numeric" value="${it.dia || ''}" placeholder="1 a 31"></label>
      ${tipo === 'e' && turmas.length ? `<label>Turma (opcional)<select id="vm-tur"><option value="">—</option>${turmas.map(([i, n]) => `<option value="${i}"${it.turmaId == i ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>` : ''}
      <label class="full" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="vm-pago" style="width:auto"${it.pago ? ' checked' : ''}> Já foi ${tipo === 'e' ? 'recebido' : 'pago'} neste mês</label>
      ${novo || src === 'rec' ? `<label class="full" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="vm-rec" style="width:auto"${src === 'rec' ? ' checked disabled' : ''}> Repetir todo mês a partir de ${ymNome(mes).toLowerCase()}</label>` : ''}</div>
      <p id="vm-err" style="color:var(--r);min-height:16px;margin:8px 0 0"></p>
      <div class="acts">${src === 'rec' ? '<button class="btn danger sp" data-act2="parar">Parar de repetir a partir deste mês</button>' : ''}<button class="btn ghost" data-x>Cancelar</button><button class="btn" data-ok>Salvar</button></div>`, (e) => {
      if (e.target.closest('[data-act2="parar"]')) { const r = c.rec.find((x) => x.id === id); if (r) { r.ate = ymAdd(mes, -1); if (r.ate < (r.desde || '')) c.rec = c.rec.filter((x) => x.id !== id); } fechar(); return salvar(); }
      if (!e.target.closest('[data-ok]')) return;
      const g = (i) => { const el = document.getElementById(i); return el ? el.value : ''; };
      const desc = g('vm-desc').trim(); if (!desc) { document.getElementById('vm-err').textContent = 'Escreva uma descrição.'; return; }
      const valor = parseV(g('vm-val')), dia = Math.min(31, Math.max(0, parseInt(g('vm-dia'), 10) || 0)) || '', pago = document.getElementById('vm-pago').checked;
      const grp = g('vm-grp'), tur = g('vm-tur'), repetir = document.getElementById('vm-rec') && document.getElementById('vm-rec').checked;
      if (src === 'rec') {
        const r = c.rec.find((x) => x.id === id); Object.assign(r, { desc, grupo: grp, dia, turmaId: tur || '' });
        const k = id + '|' + mes; c.recSt[k] = Object.assign({}, c.recSt[k] || {}, { pago, valor: valor });
        if (r.valor == null && valor != null) r.valor = valor;
      } else if (novo && repetir) {
        const nid = uid(); c.rec.push({ id: nid, tipo, grupo: grp, desc, valor, dia, desde: mes, turmaId: tur || '' });
        if (pago) c.recSt[nid + '|' + mes] = { pago: true, valor };
      } else if (novo) {
        c.mov.push({ id: uid(), tipo, grupo: grp, desc, valor, dia, pago, mes, turmaId: tur || '' });
      } else Object.assign(it, { desc, grupo: grp, valor, dia, pago, turmaId: tur || '' });
      aberto[grp] = true; fechar(); salvar();
    });
  }
  function excluir(src, id) {
    const c = cx(), x = src === 'mov' ? c.mov.find((m) => m.id === id) : c.rec.find((m) => m.id === id); if (!x) return;
    dialog(`<h2>Excluir lançamento</h2><p>${src === 'rec' ? `"${esc(x.desc)}" se repete todo mês. Excluir remove <b>todas</b> as repetições, inclusive dos meses anteriores. Para manter o histórico, use "Parar de repetir" na janela de edição.` : `Excluir "${esc(x.desc)}" de ${ymNome(mes).toLowerCase()}?`}</p>
      <div class="acts"><button class="btn ghost" data-x>Cancelar</button><button class="btn danger" data-ok>Excluir</button></div>`, (e) => {
      if (!e.target.closest('[data-ok]')) return;
      if (src === 'mov') c.mov = c.mov.filter((m) => m.id !== id);
      else { c.rec = c.rec.filter((m) => m.id !== id); Object.keys(c.recSt).forEach((k) => { if (k.indexOf(id + '|') === 0) delete c.recSt[k]; }); }
      fechar(); salvar();
    });
  }
  function editarMeta() {
    dialog(`<h2>Meta do mês</h2><div class="sub">Quanto você quer receber por mês. O progresso conta as entradas marcadas como pagas.</div>
      <label>Meta (R$)<input id="vm-meta" inputmode="decimal" value="${fmtV(+S.meta || null)}"></label>
      <div class="acts"><button class="btn ghost" data-x>Cancelar</button><button class="btn" data-ok>Salvar</button></div>`, (e) => {
      if (!e.target.closest('[data-ok]')) return; S.meta = parseV(document.getElementById('vm-meta').value) || 0; fechar(); salvar();
    });
  }
  function editarSaldo() {
    const c = cx();
    dialog(`<h2>Saldo em caixa</h2><div class="sub">Informe quanto havia em caixa no início de um mês. A partir dele, o programa soma o que entra e subtrai o que sai (só o que está marcado como pago).</div>
      <div class="fg"><label>Saldo inicial (R$)<input id="vm-sb" inputmode="decimal" value="${fmtV(c.saldoBase)}"></label><label>No início de<input id="vm-sm" type="month" value="${c.saldoMes}"></label></div>
      <div class="acts"><button class="btn ghost" data-x>Cancelar</button><button class="btn" data-ok>Salvar</button></div>`, (e) => {
      if (!e.target.closest('[data-ok]')) return; c.saldoBase = parseV(document.getElementById('vm-sb').value) || 0; c.saldoMes = document.getElementById('vm-sm').value || ymNow(); fechar(); salvar();
    });
  }
  window.__vmAdd = (tipo) => { S.tab = 6; render(); editar(tipo || 's'); };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-vm]'); if (!b || !b.closest('.vm')) return;
    const a = b.dataset.vm, c = cx();
    if (a === 'mes') { mes = ymAdd(mes, +b.dataset.d); return render(); }
    if (a === 'hoje') { mes = ymNow(); return render(); }
    if (a === 'grp') { const g = b.dataset.g; aberto[g] = !(aberto[g] !== undefined ? aberto[g] : itens(mes).some((x) => x.grupo === g)); return render(); }
    if (a === 'add') return editar(b.dataset.tipo, null, null, b.dataset.g);
    if (a === 'edit') return editar(null, b.dataset.src, b.dataset.id);
    if (a === 'del') return excluir(b.dataset.src, b.dataset.id);
    if (a === 'meta') return editarMeta();
    if (a === 'saldo') return editarSaldo();
    if (a === 'turmas') { S.tab = 0; render(); return window.scrollTo(0, 0); }
    if (a === 'fxog') { const og = b.dataset.og; fxFech[og] = !fxFech[og]; try { localStorage.setItem('cc.fxFech', JSON.stringify(fxFech)); } catch (er) {} return render(); }
    if (a === 'vermes') { S.tab = 6; render(); return window.scrollTo(0, 0); }
    if (a === 'tog') {
      if (b.dataset.src === 'mov') { const x = c.mov.find((m) => m.id === b.dataset.id); if (x) x.pago = !x.pago; }
      else { const k = b.dataset.id + '|' + mes; c.recSt[k] = Object.assign({}, c.recSt[k] || {}); c.recSt[k].pago = !c.recSt[k].pago; }
      return salvar();
    }
  });

  /* ===== aba Financeiro (resultado das turmas e parceiros), no mesmo estilo da Visão do mês ===== */
  /* parceiro padrão: na Cristiano Convites, as turmas de parceiro vêm do cerimonial OLIMPO */
  function parceiroPadrao() {
    if (S.__parcPadrao || !(S.parc || []).length) return;   // sem parceiros ainda (ex.: computador novo): não grava nada
    (S.parc || []).forEach((p) => { if (!String(p.parceiro || '').trim()) p.parceiro = 'OLIMPO'; });
    S.__parcPadrao = 1; save();
  }
  /* ===== aba Financeiro: resultado separado entre turmas diretas e turmas de parceiro ===== */
  let fxFech = {}; try { fxFech = JSON.parse(localStorage.getItem('cc.fxFech') || '{}') || {}; } catch (er) {}
  window.v3x = function v3x() {
    parceiroPadrao();
    const t = tot();
    const linhas = []
      .concat((S.turmas || []).filter((x) => x.total > 0).map((x) => ({ k: 't', og: 'direta', id: x.id, nome: x.curso + ' ' + x.per, sub: x.lista, ano: yT(x), total: x.total, rec: x.rec, custo: +x.custo || 0 })))
      .concat((S.parc || []).filter((x) => x.total > 0).map((x) => ({ k: 'p', og: 'p:' + String(x.parceiro || 'Parceiro').trim().toUpperCase(), id: x.id, nome: x.nome, sub: 'Fechamento ' + (x.data || '—'), ano: yP(x), total: x.total, rec: x.rec, custo: +x.custo || 0 })));
    const origens = ['direta'].concat([...new Set(linhas.filter((l) => l.k === 'p').map((l) => l.og))].sort());
    const nomeOg = (og) => og === 'direta' ? 'Turmas diretas' : 'Parceiro ' + og.slice(2);
    const subOg = (og) => og === 'direta' ? 'fechadas pela Cristiano Convites' : 'turmas vindas do cerimonial';
    const corOg = (og) => og === 'direta' ? 'var(--teal)' : 'var(--p)';
    const resumoOg = (ls) => { const f = ls.reduce((s, l) => s + l.total, 0), r = ls.reduce((s, l) => s + l.rec, 0), c = ls.reduce((s, l) => s + l.custo, 0); return { n: ls.length, f, r, a: f - r, c, l: f - c, m: f ? (f - c) / f : 0, pr: f ? r / f : 0 }; };
    const G = linhas.length ? resumoOg(linhas) : resumoOg([]);
    const porOg = origens.map((og) => [og, resumoOg(linhas.filter((l) => l.og === og))]);

    const ogCard = ([og, x]) => `<div class="vmc fxog" style="--oc:${corOg(og)}"><div class="vmcl"><span class="fxdot"></span>${esc(nomeOg(og))}<small>${x.n} turma(s) · ${subOg(og)}</small></div>
      <div class="fxogk"><div><small>Fechado</small><b>${BRL(x.f)}</b></div><div><small>Recebido</small><b class="g">${BRL(x.r)}</b></div><div><small>A receber</small><b class="o">${BRL(x.a)}</b></div>
       <div><small>Custo</small><b class="r">${BRL(x.c)}</b></div><div><small>Lucro previsto</small><b class="${x.l >= 0 ? 'g' : 'r'}">${BRL(x.l)}</b></div><div><small>Margem</small><b>${x.c ? PCT(x.m) : '—'}</b></div></div>
      <div class="vmmeta" style="margin-top:12px"><span>${PCT(x.pr)} recebido</span><span>${G.f ? PCT(x.f / G.f) + ' do total fechado' : ''}</span></div><div class="vmbar"><i style="width:${Math.min(100, x.pr * 100)}%;background:${corOg(og)}"></i></div></div>`;

    const maxT = Math.max(1, ...linhas.map((l) => l.total));
    const barra = (l) => `<button class="fxbar" data-act="${l.k === 't' ? 'lista' : 'parc'}" data-id="${l.id}" title="${esc(l.nome)}: recebido ${BRL(l.rec)} de ${BRL(l.total)}">
        <span class="fxn"><b>${esc(l.nome)}</b><small>${l.ano}${l.sub ? ' · ' + esc(l.sub) : ''}</small></span>
        <span class="fxtrack"><span class="fxfill" style="width:${l.total / maxT * 100}%"><i style="width:${l.total ? l.rec / l.total * 100 : 0}%"></i></span></span>
        <span class="fxv"><b class="o">${BRL(l.total - l.rec)}</b><small>de ${BRL(l.total)}</small></span></button>`;
    const barras = porOg.map(([og, x]) => { const ls = linhas.filter((l) => l.og === og).sort((a, b) => (b.total - b.rec) - (a.total - a.rec)); const fe = !!fxFech['b:' + og];
      return ls.length ? `<button type="button" class="fxsec${fe ? ' fech' : ''}" style="--oc:${corOg(og)}" data-vm="fxog" data-og="b:${esc(og)}" title="${fe ? 'Expandir' : 'Retrair'}"><span class="fxar">${fe ? '▸' : '▾'}</span><span class="fxdot"></span>${esc(nomeOg(og))}<small>${fe ? ls.length + ' turma(s) · ' : ''}a receber ${BRL(x.a)}</small></button>` + (fe ? '' : ls.map(barra).join('')) : ''; }).join('');

    const linhaT = (l) => { const p = l.total ? l.rec / l.total : 0, lu = l.total - l.custo;
      return `<tr><td><b>${esc(l.nome)}</b><small>${esc(l.sub || '')}</small></td><td class="mu">${l.ano}</td>
          <td class="n">${BRL(l.total)}</td><td class="n g">${BRL(l.rec)}</td><td class="n o">${BRL(l.total - l.rec)}</td>
          <td><div class="fxp"><div class="vmbar"><i style="width:${Math.min(100, p * 100)}%;${p >= 0.9999 ? 'background:var(--g)' : ''}"></i></div><span>${PCT(p)}</span></div></td>
          <td class="n">${l.custo ? `<b class="${lu >= 0 ? 'g' : 'r'}">${PCT(dv(lu, l.total))}</b>` : '<span class="mu">sem custo</span>'}</td>
          <td class="n fxacts"><button class="btn ghost sm" data-act="${l.k === 't' ? 'lista' : 'parc'}" data-id="${l.id}" style="margin:0">${l.k === 't' ? 'Abrir lista' : 'Editar'}</button><button class="ib del" data-act="${l.k === 't' ? 'delt' : 'delpc'}" data-id="${l.id}" title="Excluir">Excluir</button></td></tr>`; };
    const tabela = porOg.map(([og, x]) => { const ls = linhas.filter((l) => l.og === og).sort((a, b) => a.ano - b.ano || String(a.nome).localeCompare(String(b.nome), 'pt-BR')); if (!ls.length) return '';
      const fe = !!fxFech[og];
      return `<tr class="fxy${fe ? ' fech' : ''}" style="--oc:${corOg(og)}" data-vm="fxog" data-og="${esc(og)}" title="${fe ? 'Expandir' : 'Retrair'}"><td colspan="8"><span class="fxar">${fe ? '▸' : '▾'}</span><span class="fxdot"></span>${esc(nomeOg(og))}<small>${x.n} turma(s) · fechado ${BRL(x.f)} · recebido ${BRL(x.r)} · a receber ${BRL(x.a)}${x.c ? ' · margem ' + PCT(x.m) : ''}</small></td></tr>` + (fe ? '' : ls.map(linhaT).join('')); }).join('');

    const lanc = S.lanc || [], pend = lanc.filter((l) => !l.pago), pago = lanc.filter((l) => l.pago);
    const desp = (l) => `<div class="vmrow${l.pago ? ' pago' : ''}" style="grid-template-columns:22px minmax(0,1fr) 120px auto"><button class="vmck${l.pago ? ' on' : ''}" data-act="tog" data-id="${l.id}" title="${l.pago ? 'Voltar para a pagar' : 'Marcar como paga'}"></button><span class="vmd">${esc(l.desc)}</span><span class="vmv s">${BRL(l.valor)}</span><span class="vmact"><button data-act="del" data-id="${l.id}">Excluir</button></span></div>`;
    const dir = (porOg[0] || [])[1] || resumoOg([]), par = porOg.slice(1).reduce((a, [, x]) => ({ f: a.f + x.f, l: a.l + x.l }), { f: 0, l: 0 });
    return `<div class="vm">
    <div class="vmtop"><h2>Turmas e parceiros</h2><span class="note">diretas e de parceiro, tudo o que já foi fechado</span><span class="sp" style="flex:1"></span><button class="btn ghost sm" data-act="parc">+ turma de parceiro</button><button class="btn sm" data-act="addt">+ nova turma</button></div>
    <div class="vmcards">
     <div class="vmc lucro"><div class="vmcl"><span class="vmci">↗</span>Lucro previsto · total</div><b class="${G.l >= 0 ? 'g' : 'r'}">${BRL(G.l)}</b>
      <div class="vmmeta"><span>diretas <b>${BRL(dir.l)}</b> · parceiro <b>${BRL(par.l)}</b></span><span>margem ${G.c ? PCT(G.m) : '—'}</span></div><div class="vmbar fxsplit"><i style="width:${G.f ? dir.f / G.f * 100 : 0}%;background:var(--teal)"></i><i style="width:${G.f ? par.f / G.f * 100 : 0}%;background:var(--p)"></i></div></div>
     <div class="vmc"><div class="vmcl"><span class="vmci">⇄</span>Movimento · total</div>
      <div class="vmmv"><span class="vmpi e">↘</span>Recebido<b class="g">${BRL(G.r)}</b></div><div class="vmmv"><span class="vmpi" style="background:#3a2c14;color:var(--o)">◷</span>A receber<b class="o">${BRL(G.a)}</b></div></div>
     <div class="vmc"><div class="vmcl"><span class="vmci">◎</span>Custo informado · total</div>
      <div class="vmmv"><span class="vmpi" style="background:#13262a;color:var(--teal)">●</span>Diretas<b class="r">${BRL(dir.c)}</b></div><div class="vmmv"><span class="vmpi" style="background:#1d1a33;color:var(--p)">●</span>Parceiro<b class="r">${BRL(G.c - dir.c)}</b></div></div>
    </div>
    <div class="fxogs">${porOg.map(ogCard).join('')}</div>
    <div class="vmrow2">
     <div class="vmc"><div class="vmcl">Recebido × a receber por turma <small>maior saldo primeiro · clique para abrir</small><span class="sp"></span><span class="lg"><i class="en"></i>Recebido</span><span class="lg"><i style="background:var(--o)"></i>A receber</span></div>
      <div class="fxbars">${barras || '<p class="note">Nenhuma turma com valor preenchido.</p>'}</div></div>
     <div class="vmc vmgc"><div class="vmcl">Margem geral<span class="sp"></span></div>
      ${gauge(Math.max(0, G.m))}<div class="vmgp"><b>${G.c ? PCT(G.m) : '—'}</b><small>de margem</small></div>
      <div class="fxmg">${porOg.map(([og, x]) => `<div style="--oc:${corOg(og)}"><span class="fxdot"></span>${esc(nomeOg(og))}<b>${x.c ? PCT(x.m) : '—'}</b></div>`).join('')}</div>
      <div class="vmfoot"><span>Fechado no total</span><b>${BRL(G.f)}</b></div></div>
    </div>
    <div class="vmpanel" style="margin-bottom:16px"><div class="vmph"><span class="vmpi e">↘</span><b>Turmas por origem</b><em>${linhas.length}</em><span class="sp"></span></div>
     <div class="fxtw"><table class="fxt"><thead><tr><th>Turma</th><th>Ano</th><th class="n">Fechado</th><th class="n">Recebido</th><th class="n">A receber</th><th>Progresso</th><th class="n">Margem</th><th></th></tr></thead><tbody>${tabela || '<tr><td colspan="8" class="mu" style="padding:16px">Nada fechado ainda.</td></tr>'}</tbody></table></div></div>
    ${lanc.length ? `<div class="vmcols">
     <div class="vmpanel"><div class="vmph"><span class="vmpi s">↗</span><b>Despesas a pagar</b><em>${pend.length}</em><span class="sp"></span><b class="r">${BRL(t.pend)}</b></div>
      ${pend.map(desp).join('') || '<div class="vmempty">Nenhuma despesa pendente.</div>'}</div>
     <div class="vmpanel"><div class="vmph"><span class="vmpi e">✓</span><b>Despesas pagas</b><em>${pago.length}</em><span class="sp"></span><b>${BRL(t.desp)}</b></div>
      ${pago.map(desp).join('') || '<div class="vmempty">Nenhuma despesa paga.</div>'}</div>
    </div><p class="note">Despesas lançadas na versão antiga. As novas ficam nas saídas da <button class="linkb" data-vm="vermes">Visão do mês</button>.</p>` : ''}
    </div></div>`;
  };
  /* ===== relatório da turma (PDF para a comissão: sem custos, margem nem documentos dos formandos) ===== */
  async function relatorioTurma(btn) {
    const T = typeof turmaLista === 'function' ? turmaLista() : null; if (!T) return;
    const SITN = { ok: 'Quitado', w: 'Pendente', x: 'Pago a mais', '': '—' };
    const linhas = (T.alunos || []).filter((a) => String(a.nome || '').trim()).map((a) => ({ a, c: lcalc(T, a) }));
    let tv = 0, tp = 0, tf = 0, nOk = 0, nW = 0, nX = 0;
    linhas.forEach(({ c }) => { tv += c.vf; tp += c.pago; if (c.rest > 0.005) tf += c.rest; if (c.sit === 'ok') nOk++; else if (c.sit === 'w') nW++; else if (c.sit === 'x') nX++; });
    const q = (n) => (+n || 0) ? String(+n) : '';
    // colunas de convites (luxo, simples, foto) só entram no relatório se algum formando tiver quantidade
    const cols = [['luxo', 'Luxo'], ['simp', 'Simples'], ['foto', 'Foto']].filter(([k]) => linhas.some(({ a }) => +a[k] > 0));
    const nc = 6 + cols.length;
    const nome = (String(T.curso || '') + ' ' + String(T.per || '')).trim() || 'Turma';
    const hoje = new Date().toLocaleDateString('pt-BR');
    const tr = linhas.map(({ a, c }, i) => `<tr class="${c.sit}"><td class="i">${i + 1}</td><td class="nm">${esc(a.nome)}</td>${cols.map(([k]) => `<td class="c">${q(a[k])}</td>`).join('')}
      <td class="n">${BRL(c.vf)}</td><td class="n">${BRL(c.pago)}</td><td class="n">${c.rest > 0.005 ? BRL(c.rest) : c.rest < -0.005 ? '+ ' + BRL(-c.rest) : '—'}</td><td><span class="st ${c.sit}">${SITN[c.sit] || '—'}</span></td></tr>`).join('');
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(nome)}</title><style>
      @page{size:A4;margin:14mm 12mm}
      *{box-sizing:border-box}body{font:11px/1.35 "Segoe UI",Helvetica,Arial,sans-serif;color:#1c2b33;margin:0}
      .top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #2DB5AE;padding-bottom:10px;margin-bottom:14px}
      .marca{font-size:18px;font-weight:800;color:#147a74;letter-spacing:.3px}.marca small{display:block;font-size:10px;font-weight:600;color:#6b7f88;letter-spacing:1.4px;text-transform:uppercase}
      .tt{text-align:right}.tt b{display:block;font-size:16px}.tt span{color:#6b7f88}
      .res{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}.res div{border:1px solid #dbe5e7;border-radius:8px;padding:8px 10px}
      .res small{display:block;color:#6b7f88;font-size:9.5px;text-transform:uppercase;letter-spacing:.8px}.res b{font-size:14px}
      .g{color:#0f8a5f}.o{color:#b45309}.bl{color:#1d4ed8}
      table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{page-break-inside:avoid}
      th{background:#eef4f5;color:#40565f;font-size:9.5px;text-transform:uppercase;letter-spacing:.6px;text-align:left;padding:6px;border-bottom:2px solid #c9d8db}
      td{padding:5px 6px;border-bottom:1px solid #e3eaec}td.i{color:#8a9aa2;width:24px}td.c,th.c{text-align:center}td.n,th.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
      tr.ok td{background:#ecfdf5}tr.x td{background:#eff6ff}
      .st{display:inline-block;padding:1px 8px;border-radius:99px;font-size:9.5px;font-weight:700;border:1px solid}
      .st.ok{color:#047857;background:#d1fae5;border-color:#6ee7b7}.st.w{color:#b45309;background:#ffedd5;border-color:#fdba74}.st.x{color:#1d4ed8;background:#dbeafe;border-color:#93c5fd}
      tfoot td{font-weight:700;background:#eef4f5;border-top:2px solid #c9d8db}
      .rod{margin-top:14px;color:#8a9aa2;font-size:9.5px;display:flex;justify-content:space-between}
    </style></head><body>
      <div class="top"><div class="marca">Cristiano Convites<small>Relatório da turma</small></div><div class="tt"><b>${esc(nome)}</b><span>${T.lista ? esc(T.lista) + ' · ' : ''}emitido em ${hoje}</span></div></div>
      <div class="res"><div><small>Formandos</small><b>${linhas.length}</b></div><div><small>Valor total</small><b>${BRL(tv)}</b></div><div><small>Recebido</small><b class="g">${BRL(tp)}</b></div><div><small>Falta receber</small><b class="o">${BRL(tf)}</b></div></div>
      <div class="res" style="grid-template-columns:repeat(3,1fr)"><div><small>Quitados</small><b class="g">${nOk}</b></div><div><small>Pendentes</small><b class="o">${nW}</b></div><div><small>Pagaram a mais</small><b class="bl">${nX}</b></div></div>
      <table><thead><tr><th>#</th><th>Formando</th>${cols.map(([, t]) => `<th class="c">${t}</th>`).join('')}<th class="n">Valor</th><th class="n">Pago</th><th class="n">Falta</th><th>Situação</th></tr></thead>
      <tbody>${tr || `<tr><td colspan="${nc}">Nenhum formando na lista.</td></tr>`}</tbody>
      <tfoot><tr><td></td><td>Total</td>${cols.map(() => '<td></td>').join('')}<td class="n">${BRL(tv)}</td><td class="n">${BRL(tp)}</td><td class="n">${BRL(tf)}</td><td></td></tr></tfoot></table>
      <div class="rod"><span>Cristiano Convites</span><span>${esc(nome)} · ${hoje}</span></div>
    </body></html>`;
    const arq = 'Relatório ' + nome.replace(/[\\/:*?"<>|]+/g, '-') + ' ' + hoje.replace(/\//g, '-') + '.pdf';
    const txt = btn.textContent; btn.disabled = true; btn.textContent = 'Gerando…';
    try {
      const r = await window.api.gerarPdf(html, arq, 'Salvar relatório da turma em PDF');
      if (r && !r.ok && !r.canceled) alert(r.error || 'Não foi possível gerar o relatório.');
    } finally { btn.disabled = false; btn.textContent = txt; }
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-relpdf]'); if (b) relatorioTurma(b); });

  /* ===== lista de formandos: painel de valores unitários retrátil (lembra em cada computador) ===== */
  window.__lpFechado = () => { try { return localStorage.getItem('cc.lpFechado') !== '0'; } catch (e) { return true; } };
  window.__lpRes = (T) => {
    const v = (x) => (+x || 0) ? BRL(+x) : null, p = [];
    if (v(T.lu)) p.push('Luxo ' + v(T.lu)); if (v(T.su)) p.push('Simplificado ' + v(T.su)); if (v(T.fu)) p.push('Foto ' + v(T.fu));
    if (+T.pe) p.push('Entrada ' + String(+T.pe).replace('.', ',') + '%');
    if (+S.vu) p.push('Vegetal ' + BRL(+S.vu)); if (+S.ff) p.push('Foto família ' + BRL(+S.ff));
    return p.length ? p.join(' · ') : 'nenhum valor preenchido';
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lptog]'); if (!b) return;
    const pn = b.closest('.lpanel'); if (!pn) return;
    const f = pn.classList.toggle('lpf');
    try { localStorage.setItem('cc.lpFechado', f ? '1' : '0'); } catch (er) {}
    const T = typeof turmaLista === 'function' ? turmaLista() : null, r = pn.querySelector('.lpres'); if (T && r) r.textContent = window.__lpRes(T);
  });

  const css = document.createElement('style');
  css.textContent = `.vm{max-width:1240px;margin:0 auto}
.vmtop{display:flex;align-items:center;gap:8px;margin:0 0 16px}.vmtop h2{margin:0 8px 0 6px;font-size:20px}.vmtop .btn{margin:0}
.vmcards{display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:16px;margin-bottom:16px}
.vmc{background:var(--pn);border:1px solid var(--bd);border-radius:12px;padding:18px 20px;min-width:0}
.vmc>b{display:block;font-size:30px;font-weight:700;margin:8px 0 10px;font-variant-numeric:tabular-nums}
.vmc.lucro{background:linear-gradient(135deg,#123331 0%,var(--pn) 70%);border-color:#1f4a46}
.vmcl{display:flex;align-items:center;gap:10px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:var(--mu);font-weight:600}
.vmcl small{text-transform:none;letter-spacing:0;font-weight:400}.vmcl .sp,.vmph .sp,.vmgh .sp{flex:1}
.vmci{width:26px;height:26px;border-radius:8px;background:#162a2c;color:var(--teal);display:inline-flex;align-items:center;justify-content:center;font-size:13px}
.vmmeta{display:flex;justify-content:space-between;font-size:12px;color:var(--mu);margin-bottom:6px}.vmmeta b{color:var(--tx)}
.vmbar{height:6px;background:#0b1118;border-radius:99px;overflow:hidden}.vmbar i{display:block;height:100%;background:var(--teal);border-radius:99px}
.vmmv{display:flex;align-items:center;gap:10px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--mu);margin-top:14px}.vmmv b{margin-left:auto;font-size:18px;color:var(--tx);letter-spacing:0;text-transform:none}
.vmpi{width:26px;height:26px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
.vmpi.e{background:#12372b;color:var(--g)}.vmpi.s{background:#3a1d22;color:var(--r)}
.vmrow2{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px}
.lg{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--tx);text-transform:none;letter-spacing:0;font-weight:400}.lg i{width:8px;height:8px;border-radius:50%}.lg i.en{background:var(--teal)}.lg i.sa{background:var(--r)}
.vmchart{width:100%;height:auto;display:block;margin-top:8px}.vmchart .gl{stroke:var(--bd)}.vmchart .ax{fill:var(--mu);font-size:11px}
.vmchart .ln{fill:none;stroke-width:2.5}.vmchart .ln.en{stroke:var(--teal)}.vmchart .ln.sa{stroke:var(--r)}
.vmchart .ar.en{fill:rgba(43,181,166,.18)}.vmchart .ar.sa{fill:rgba(248,113,113,.06)}
.vmfoot{display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid var(--bd);padding-top:10px;margin-top:8px;font-size:12px;color:var(--mu)}.vmfoot b{color:var(--tx);font-size:13px}.vmfoot small{color:var(--mu);font-weight:400}
.vmgc{display:flex;flex-direction:column;align-items:stretch;text-align:center}
.vmgauge{width:78%;margin:14px auto 0;display:block}.vmgauge .gbg{fill:none;stroke:#1e2a37;stroke-width:14;stroke-linecap:round}.vmgauge .gfg{fill:none;stroke:var(--teal);stroke-width:14;stroke-linecap:round}
.vmgp{margin-top:-46px}.vmgp b{display:block;font-size:28px}.vmgp small{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--mu)}
.vmgf{margin:18px 0 6px}.vmgf small{display:block;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--mu)}.vmgf b{font-size:24px}
.vmwarn{background:#2a2410;border:1px solid #5c4b14;color:#f4d27a;border-radius:12px;padding:12px 16px;margin-bottom:16px;font-size:13px}
.vmcols{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.vmpanel{background:var(--pn);border:1px solid var(--bd);border-radius:12px;overflow:hidden}
.vmph{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--bd)}.vmph em{font-style:normal;color:var(--mu);font-size:12px}
.vmg{border-bottom:1px solid var(--bd)}.vmg:last-child{border-bottom:0}
.vmgh{display:flex;align-items:center;gap:8px;width:100%;background:#0f1620;border:0;color:var(--tx);padding:10px 16px;font:inherit;font-size:12px;cursor:pointer;text-align:left}
.vmgh b{letter-spacing:.8px;text-transform:uppercase;font-size:11px}.vmgh em{font-style:normal;color:var(--mu)}.vmgh small{color:var(--mu)}.vmgh>span:first-child{color:var(--mu);width:10px}
.vmrow{display:grid;grid-template-columns:22px minmax(0,1fr) auto 28px 110px auto;gap:10px;align-items:center;padding:9px 16px;border-top:1px solid #1a2532;font-size:13px}
.vmrow:hover{background:var(--pn2)}
.vmck{width:20px;height:20px;border-radius:50%;border:1.5px solid #3a4a5c;background:none;cursor:pointer;padding:0}
.vmck.on{background:var(--g);border-color:var(--g);position:relative}.vmck.on::after{content:"";position:absolute;left:6px;top:2.5px;width:5px;height:10px;border:solid #06201d;border-width:0 2px 2px 0;transform:rotate(45deg)}
.vmrow.pago .vmd{text-decoration:line-through;color:var(--mu)}
.vmd{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vmrep{font-style:normal;color:var(--mu)}
.vmcat{font-size:11px;padding:2px 8px;border-radius:6px;background:#12372b;color:var(--g);white-space:nowrap}
.vmcat.fixas{background:#1b2a44;color:#93c5fd}.vmcat.graficas{background:#2d2250;color:var(--p)}.vmcat.variaveis{background:#3a2c14;color:var(--o)}.vmcat.parceiros{background:#1e3a3a;color:#5eead4}.vmcat.outras{background:#2a2f38;color:var(--mu)}
.vmdia{color:var(--mu);text-align:center;font-variant-numeric:tabular-nums}
.vmv{text-align:right;font-weight:600;font-variant-numeric:tabular-nums}.vmv.s{color:#fda4a4}
.vmdef{background:none;border:0;color:var(--mu);font:inherit;cursor:pointer;text-decoration:underline dotted}
.vmact{display:flex;gap:2px;opacity:0}.vmrow:hover .vmact,.vmrow:focus-within .vmact{opacity:1}
.vmact button{background:none;border:0;color:var(--mu);font:inherit;font-size:11px;cursor:pointer;padding:3px 5px;border-radius:5px}.vmact button:hover{color:var(--tx);background:#1f2a37}
.vmempty{padding:12px 16px;color:var(--mu);font-size:12px;border-top:1px solid #1a2532}
.linkb{background:none;border:0;color:var(--teal);font:inherit;font-size:12px;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px;text-transform:none;letter-spacing:0}
.vmdlg{max-width:560px}.vmdlg h2{margin-bottom:4px}
.fxogs{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px;margin-bottom:16px}
.fxog{border-top:3px solid var(--oc)}
.fxdot{display:inline-block;width:9px;height:9px;border-radius:3px;background:var(--oc);flex-shrink:0}
.fxogk{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 16px;margin-top:14px}
.fxogk small{display:block;color:var(--mu);font-size:11px;margin-bottom:2px}.fxogk b{font-size:17px;font-variant-numeric:tabular-nums}
.fxsplit{display:flex}.fxsplit i{border-radius:0!important}
.fxsec{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--tx);font-weight:700;padding:10px 6px 4px}
.fxsec{width:100%;background:none;border:0;border-radius:8px;font-family:inherit;cursor:pointer;text-align:left;user-select:none}.fxsec:hover{background:#131d29}
.fxsec .fxar{display:inline-block;width:12px;color:var(--mu);font-size:11px}
.fxsec small{margin-left:auto;text-transform:none;letter-spacing:0;color:var(--mu);font-weight:400;font-size:12px}
.fxmg{display:flex;flex-direction:column;gap:8px;margin:16px 0 8px;text-align:left}
.fxmg div{display:flex;align-items:center;gap:8px;font-size:13px}.fxmg b{margin-left:auto}
.fxt tr.fxy td{border-left:3px solid var(--oc)}
.fxt tr.fxy .fxdot{margin-right:8px}
.fxt tr.fxy{cursor:pointer;user-select:none}.fxt tr.fxy:hover td{background:#131d29}
.fxt tr.fxy .fxar{display:inline-block;width:14px;color:var(--mu);font-size:11px}
.fxbars{display:flex;flex-direction:column;gap:4px;margin-top:12px;max-height:420px;overflow-y:auto}
.fxbar{display:grid;grid-template-columns:minmax(150px,230px) minmax(0,1fr) 150px;gap:14px;align-items:center;background:none;border:0;border-radius:8px;color:var(--tx);padding:7px 6px;font:inherit;text-align:left;cursor:pointer}
.fxbar:hover{background:var(--pn2)}
.fxn b{display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fxn small{color:var(--mu);font-size:11px}
.fxtrack{height:12px;background:#0b1118;border-radius:99px;overflow:hidden}
.fxfill{display:block;height:100%;background:rgba(246,173,59,.75);border-radius:99px;overflow:hidden}.fxfill i{display:block;height:100%;background:var(--teal)}
.fxv{text-align:right}.fxv b{display:block;font-size:13px;font-variant-numeric:tabular-nums}.fxv small{color:var(--mu);font-size:11px}
.fxtw{overflow-x:auto}.fxt{width:100%;border-collapse:collapse}
.fxt th{font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:var(--mu);text-align:left;padding:10px 14px;background:#0f1620;border-bottom:1px solid var(--bd);font-weight:600;white-space:nowrap}
.fxt td{padding:9px 14px;border-bottom:1px solid #1a2532;font-size:13px;vertical-align:middle;white-space:nowrap}
.fxt td small{display:block;color:var(--mu);font-size:11px}.fxt .n{text-align:right;font-variant-numeric:tabular-nums}.fxt .mu{color:var(--mu)}
.fxt tbody tr:hover td{background:var(--pn2)}
.fxt tr.fxy td{background:#0f1620;color:var(--teal);font-weight:700;font-size:13px;padding:8px 14px}.fxt tr.fxy td small{display:inline;margin-left:12px;font-weight:400;color:var(--mu)}
.fxacts{white-space:nowrap}.fxacts .ib{margin-left:4px}.ib{background:none;border:1px solid transparent;color:var(--mu);border-radius:7px;padding:5px 9px;font:inherit;font-size:12px;cursor:pointer}.ib.del:hover{color:var(--r);border-color:#5a2a30}
.fxp{display:flex;align-items:center;gap:8px;min-width:130px}.fxp .vmbar{flex:1}.fxp span{font-size:12px;color:var(--mu);width:44px;text-align:right}
@media(max-width:1100px){.vmcards,.vmrow2,.vmcols{grid-template-columns:1fr}}`;
  document.head.appendChild(css);
})();
