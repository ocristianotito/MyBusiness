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
  const parseV = (s) => { s = String(s == null ? '' : s).replace(/R\$|\s/g, ''); if (!s) return null; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const v = parseFloat(s); return isNaN(v) ? null : Math.round(v * 100) / 100; };
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
    const t = (typeof tot === 'function') ? tot() : null;
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
    ${t ? `<div class="vmc vmturmas"><div class="vmcl">Turmas e parceiros <small>o que já foi fechado com as comissões</small><span class="sp"></span><button class="linkb" data-vm="turmas">Ver turmas e formandos</button></div>
      <div class="vmtk"><div><small>Fechado</small><b>${BRL(t.T + t.PT)}</b></div><div><small>Recebido</small><b class="g">${BRL(t.R + t.PR)}</b></div><div><small>A receber</small><b class="o">${BRL(t.A + t.PA)}</b></div><div><small>Custo informado</small><b class="r">${BRL(t.C + t.PC)}</b></div></div></div>` : ''}
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
    if (a === 'tog') {
      if (b.dataset.src === 'mov') { const x = c.mov.find((m) => m.id === b.dataset.id); if (x) x.pago = !x.pago; }
      else { const k = b.dataset.id + '|' + mes; c.recSt[k] = Object.assign({}, c.recSt[k] || {}); c.recSt[k].pago = !c.recSt[k].pago; }
      return salvar();
    }
  });

  const css = document.createElement('style');
  css.textContent = `.vm{max-width:1240px;margin:0 auto}
.vmtop{display:flex;align-items:center;gap:8px;margin:0 0 16px}.vmtop h2{margin:0 8px 0 6px;font-size:20px}.vmtop .btn{margin:0}
.vmcards{display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:16px;margin-bottom:16px}
.vmc{background:var(--pn);border:1px solid var(--bd);border-radius:14px;padding:18px 20px;min-width:0}
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
.vmturmas{margin-bottom:16px}.vmtk{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px}.vmtk small{display:block;color:var(--mu);font-size:12px}.vmtk b{font-size:18px}
.vmwarn{background:#2a2410;border:1px solid #5c4b14;color:#f4d27a;border-radius:12px;padding:12px 16px;margin-bottom:16px;font-size:13px}
.vmcols{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.vmpanel{background:var(--pn);border:1px solid var(--bd);border-radius:14px;overflow:hidden}
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
@media(max-width:1100px){.vmcards,.vmrow2,.vmcols{grid-template-columns:1fr}}`;
  document.head.appendChild(css);
})();
