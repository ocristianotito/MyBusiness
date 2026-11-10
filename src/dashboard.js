'use strict';
/* ===== Dashboard: panorama da produção =====
   Números da produção, gráfico de entregas do ano, próximas entregas, clientes em produção, agenda e equipe.
   Valores em dinheiro ficam no Financeiro (protegido por senha). Usa as globais de app.js. */
const WD_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
let dashAno = new Date().getFullYear();

function smoothPath(pts) {   // curva monotônica (Fritsch–Carlson): suave e sem passar dos valores reais
  const n = pts.length; if (!n) return '';
  if (n < 3) return 'M' + pts.map((p) => p[0] + ',' + p[1]).join(' L');
  const dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  m[0] = dy[0]; m[n - 1] = dy[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = dy[i - 1] * dy[i] <= 0 ? 0 : (dy[i - 1] + dy[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (dy[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / dy[i], b = m[i + 1] / dy[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * dy[i]; m[i + 1] = t * b * dy[i]; }
  }
  let d = `M${pts[0][0]},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + m[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - m[i + 1] * h).toFixed(1)} ${pts[i + 1][0]},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}
function chartEntregas(ano) {
  const prazos = Array(12).fill(0), entregues = Array(12).fill(0);
  cards.forEach((c) => {
    const p = parseD(c.prazo); if (p && p.getFullYear() === ano) prazos[p.getMonth()]++;
    if (c.entregueEm) { const d = new Date(c.entregueEm); if (d.getFullYear() === ano) entregues[d.getMonth()]++; }
  });
  const W = 1000, H = 250, L = 46, R = 14, T = 14, Bt = 34;
  const max = Math.max(4, ...prazos, ...entregues), step = Math.ceil(max / 4), top = step * 4;
  const x = (i) => L + i * (W - L - R) / 11, y = (v) => T + (H - T - Bt) * (1 - v / top);
  const grid = [0, 1, 2, 3, 4].map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g * step)}" y2="${y(g * step)}" class="gl"/><text x="${L - 10}" y="${y(g * step) + 4}" class="ax" text-anchor="end">${g * step}</text>`).join('');
  const lbl = MES.map((m, i) => `<text x="${x(i)}" y="${H - 10}" class="ax" text-anchor="middle">${m.replace(/^./, (c) => c.toUpperCase())}</text>`).join('');
  const serie = (vals, cls) => { const pts = vals.map((v, i) => [x(i), y(v)]); const line = smoothPath(pts); return `<path d="${line} L${x(11)},${y(0)} L${x(0)},${y(0)} Z" class="ar ${cls}"/><path d="${line}" class="ln ${cls}"/>`; };
  const mesAtual = new Date().getFullYear() === ano ? new Date().getMonth() : -1;
  const pts = entregues.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${i === mesAtual ? 5 : 0}" class="pt"><title>${MESL[i]}: ${v} entregue(s), ${prazos[i]} com prazo</title></circle>`).join('');
  const hits = MES.map((m, i) => `<rect x="${x(i) - 38}" y="${T}" width="76" height="${H - T - Bt}" fill="transparent"><title>${MESL[i]}: ${entregues[i]} entregue(s) · ${prazos[i]} com prazo no mês</title></rect>`).join('');
  return { svg: `<svg viewBox="0 0 ${W} ${H}" class="dchart" role="img" aria-label="Entregas por mês em ${ano}">${grid}${serie(prazos, 'pz')}${serie(entregues, 'en')}${pts}${lbl}${hits}</svg>`, tot: entregues.reduce((a, b) => a + b, 0), totP: prazos.reduce((a, b) => a + b, 0) };
}

function renderDashboard() {
  const box = $('mod-dashboard'), t0 = today(), agora = new Date();
  const all = [...cards.entries()], ativos = all.filter(([, c]) => !isDone(c));
  const mesIni = new Date(t0.getFullYear(), t0.getMonth(), 1).getTime(), semIni = (() => { const d = new Date(t0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); })();
  const entMes = all.filter(([, c]) => isDone(c) && c.entregueEm >= mesIni).length, entSem = all.filter(([, c]) => isDone(c) && c.entregueEm >= semIni).length;
  const atras = ativos.filter(([, c]) => { const d = dueInfo(c); return d && d.cls === 'late'; }).length;
  const comPrazo = all.filter(([, c]) => isDone(c) && c.entregueEm && parseD(c.prazo));
  const noPrazo = comPrazo.filter(([, c]) => c.entregueEm <= parseD(c.prazo).getTime() + 864e5 - 1).length;
  const taxa = comPrazo.length ? Math.round(noPrazo / comPrazo.length * 100) + '%' : '—';
  const vence7 = ativos.filter(([, c]) => { const d = dueInfo(c); return d && d.days >= 0 && d.days <= 7; }).length;
  const semPrazo = ativos.filter(([, c]) => !parseD(c.prazo)).length;
  const ch = chartEntregas(dashAno);

  /* próximas entregas (prazos dos pedidos + compromissos do tipo entrega) */
  const lim = new Date(t0); lim.setDate(lim.getDate() + 14);
  const prox = ativos.filter(([, c]) => { const d = parseD(c.prazo); return d && d <= lim; }).map(([id, c]) => ({ k: 'card', id, c, date: c.prazo }));
  if (window.AgendaCore) events.forEach((ev, id) => { if (ev.tipo === 'entrega') AgendaCore.occurrences(ev, t0, lim).forEach((date) => prox.push({ k: 'ev', id, ev, date })); });
  prox.sort((a, b) => a.date.localeCompare(b.date));
  const quando = (iso) => { const d = parseD(iso), n = Math.round((d - t0) / 864e5); return n < 0 ? `${-n}d atrasado` : n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : n < 7 ? WD_LONG[d.getDay()] : d.getDate() + ' ' + MES[d.getMonth()]; };

  /* clientes em produção */
  const porCli = new Map();
  all.forEach(([, c]) => { if (!c.clientId || !clients.has(c.clientId)) return; const x = porCli.get(c.clientId) || { t: 0, d: 0, a: 0 }; x.t++; if (isDone(c)) x.d++; else x.a++; porCli.set(c.clientId, x); });
  const cliProd = [...porCli.entries()].filter(([, x]) => x.a).sort((a, b) => b[1].a - a[1].a);
  /* hoje na agenda */
  const hoje = [];
  if (window.AgendaCore) events.forEach((ev, id) => { if (AgendaCore.occurrences(ev, t0, t0).length) hoje.push({ id, ev }); });
  hoje.sort((a, b) => (a.ev.allDay ? -1 : AgendaCore.toMin(a.ev.start)) - (b.ev.allDay ? -1 : AgendaCore.toMin(b.ev.start)));
  /* carga por responsável */
  const resp = new Map(); ativos.forEach(([, c]) => { const r = (c.resp || '').trim() || 'Sem responsável'; const x = resp.get(r) || { n: 0, s: 0 }; x.n++; const d = dueInfo(c); if (d && d.days >= 0 && d.days <= 7) x.s++; resp.set(r, x); });
  const respL = [...resp.entries()].sort((a, b) => b[1].n - a[1].n), respMax = Math.max(1, ...respL.map(([, x]) => x.n));

  const kpi = (ic, l, v, chip, cls) => `<div class="dk"><div class="dkl"><span class="dki">${ShellIcon(ic, 16)}</span>${l}</div><div class="dkv"><b>${v}</b>${chip ? `<span class="dchip ${cls}">${chip}</span>` : ''}</div></div>`;
  box.innerHTML = `<header class="pagehead"><span class="phicon">${ShellIcon('dashboard', 19)}</span><div><h1>Panorama da produção</h1><small>Resumo geral da operação</small></div>
   <span class="phsp"></span><span class="pill">${WD_LONG[agora.getDay()]}, ${agora.getDate()} de ${MESL[agora.getMonth()]} de ${agora.getFullYear()}</span></header>
  <div class="mbody"><div class="mwrap dash">
   <div class="hello"><h2>Olá, Cristiano</h2><p>Acompanhe as entregas e a produção dos convites.</p></div>
   <div class="dks">${kpi('demandas', 'Entregues no mês', entMes, entSem + ' na semana', 'g')}${kpi('dashboard', 'Em produção', ativos.length, atras ? atras + ' atrasado' + (atras > 1 ? 's' : '') : (semPrazo ? semPrazo + ' sem prazo' : ''), atras ? 'r' : 'mu')}${kpi('clientes', 'Entrega no prazo', taxa, vence7 ? vence7 + ' vence' + (vence7 > 1 ? 'm' : '') + ' em 7 dias' : '', 'o')}</div>
   <div class="dpanel"><div class="dph"><div><b>Entregas do ano</b><small>Pedidos entregues e prazos de entrega, mês a mês</small></div><span class="phsp"></span>
     <span class="lg"><i class="en"></i>Entregues</span><span class="lg"><i class="pz"></i>Com prazo no mês</span>
     <select id="dano" class="hsel" aria-label="Ano">${[dashAno - 1, dashAno, dashAno + 1].map((a) => `<option${a === dashAno ? ' selected' : ''}>${a}</option>`).join('')}</select></div>
     ${ch.svg}<div class="dpf"><span>Total em ${dashAno}</span><b>${ch.tot} entregue(s) · ${ch.totP} com prazo</b></div></div>
   <div class="dgrid"><div class="dcol">
    <div class="dpanel"><div class="dph"><b>Próximas entregas</b><small>${prox.length ? 'próximos 14 dias e atrasadas' : 'nada marcado para os próximos 14 dias'}</small><span class="phsp"></span><button class="linkbtn" data-dash="demandas">Ver demandas</button></div>
     ${prox.length ? `<div class="dlist">${prox.slice(0, 10).map((it) => it.k === 'card'
      ? `<button class="drow" data-id="${esc(it.id)}"><span class="sdot" style="background:${PAL[colById(colOf(it.c)).c] || PAL.cinza}"></span><span class="dt">${esc(it.c.title)}</span><span class="mu up">${esc(cliName(it.c.clientId) || it.c.sub || '')}</span><span class="${(dueInfo(it.c) || {}).cls === 'late' ? 'r' : 'mu'}">${quando(it.date)}</span>${it.c.resp ? `<span class="av" title="${esc(it.c.resp)}">${esc(initials(it.c.resp))}</span>` : '<span class="av empty"></span>'}</button>`
      : `<button class="drow" data-dev="${esc(it.id)}" data-date="${it.date}"><span class="sdot" style="background:#34D399"></span><span class="dt">${esc(it.ev.title)}</span><span class="mu up">Entrega · agenda</span><span class="mu">${quando(it.date)}</span><span class="av empty"></span></button>`).join('')}</div>` : `<p class="note">Defina o prazo de entrega dos pedidos para eles aparecerem aqui.${semPrazo ? ` Hoje, ${semPrazo} pedido(s) em produção estão sem prazo.` : ''}</p>`}</div>
    <div class="dpanel"><div class="dph"><b>Clientes em produção</b><span class="phsp"></span><small>${cliProd.length}</small></div>
     ${cliProd.length ? cliProd.map(([id, x]) => `<button class="crow" data-dcli="${esc(id)}"><i style="background:${avColor(clients.get(id).nome)}"></i><span>${esc(clients.get(id).nome)}</span><div class="bar"><i style="width:${x.d / x.t * 100}%;background:var(--teal)"></i></div><em>${x.d}/${x.t}</em></button>`).join('') : `<p class="note">Ligue os pedidos aos clientes (módulo Clientes ou janela do pedido) para ver o andamento de cada um aqui. <button class="linkbtn" data-dash="clientes">Abrir Clientes</button></p>`}</div>
   </div><div class="dcol">
    <div class="dpanel"><div class="dph"><b>Hoje na agenda</b><span class="phsp"></span><button class="linkbtn" data-dash="agenda">Abrir calendário</button></div>
     ${hoje.length ? hoje.map(({ id, ev }) => `<button class="arow" data-dev="${esc(id)}" data-date="${isoD(t0)}"><i style="background:${(AgendaCore.TIPOS[ev.tipo] || AgendaCore.TIPOS.outro).c}"></i><span><b>${esc(ev.title)}</b><small>${ev.allDay ? 'Dia inteiro' : esc(ev.start + (ev.end ? '–' + ev.end : ''))}${ev.local ? ' · ' + esc(ev.local) : ''}</small></span></button>`).join('') : '<p class="note">Nenhum compromisso hoje.</p>'}</div>
    <div class="dpanel"><div class="dph"><b>Equipe</b><small>pedidos em produção por responsável</small></div>
     ${respL.length ? respL.map(([r, x]) => `<div class="rrow"><span class="av${r === 'Sem responsável' ? ' empty' : ''}">${r === 'Sem responsável' ? '' : esc(initials(r))}</span><div><div class="rtop"><b>${esc(r)}</b><em>${x.n}</em></div><div class="bar"><i style="width:${x.n / respMax * 100}%;background:var(--teal)"></i></div><small>${x.s} vence${x.s === 1 ? '' : 'm'} esta semana</small></div></div>`).join('') : '<p class="note">Nenhum pedido em produção.</p>'}</div>
   </div></div>
  </div></div>`;
}
$('mod-dashboard').addEventListener('click', (e) => {
  if (modal) return;
  const a = e.target.closest('[data-dash]');
  if (a) {
    const d = a.dataset.dash;
    if (d === 'fin') return openFin();
    if (d === 'agenda') { goModule('demandas'); return setView('calendario'); }
    return goModule(d);
  }
  const ev = e.target.closest('[data-dev]'); if (ev) return openEv(ev.dataset.dev, ev.dataset.date);
  const c = e.target.closest('[data-dcli]'); if (c) return openCli(c.dataset.dcli);
});
$('mod-dashboard').addEventListener('change', (e) => { if (e.target.id === 'dano') { dashAno = +e.target.value; renderDashboard(); } });
