'use strict';
/* ===== Agenda (aba Calendário da Produção) =====
   Compromissos (reuniões, entregas, cobranças…) com lembrete e repetição, mais os prazos dos pedidos.
   Visões Mês e Semana. Mês: clique num dia para criar; arraste para mudar a data.
   Semana: clique ou arraste num horário para criar; arraste para mover; puxe a borda de baixo para mudar a duração.
   Usa as variáveis e funções globais de app.js (cards, events, modal, persist, render…). */
const AG = window.AgendaCore;
const HOUR_PX = 48, SNAP = 15;
let agView = pref('agView', 'mes');
let agDate = today();
let agShowEv = pref('agEv', true), agShowPz = pref('agPz', true);
let agScroll = null, agDrag = null;
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const tipoOf = (ev) => AG.TIPOS[ev.tipo] || AG.TIPOS.outro;
const fmtT = (ev) => ev.allDay ? 'Dia inteiro' : (ev.start || '') + (ev.end ? '–' + ev.end : '');
const startOfWeek = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const dayLabel = (iso) => {
  const d = AG.parse(iso), t = today(), diff = Math.round((d - t) / 864e5);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return WD[d.getDay()] + ', ' + d.getDate() + ' ' + MES[d.getMonth()];
};

/* ocorrências de compromissos e prazos de pedidos num intervalo, agrupadas por dia */
function collect(from, to) {
  const byDay = new Map();
  const put = (k, item) => { if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(item); };
  if (agShowEv) events.forEach((ev, id) => AG.occurrences(ev, from, to).forEach((date) => put(date, { k: 'ev', id, ev, date })));
  if (agShowPz) cards.forEach((c, id) => {
    const d = parseD(c.prazo);
    if (!d || d < from || d > to || !visible(c)) return;
    put(c.prazo, { k: 'card', id, c, date: c.prazo });
  });
  byDay.forEach((l) => l.sort((a, b) => {
    const ka = a.k === 'card' ? -1 : (a.ev.allDay ? 0 : 1 + (AG.toMin(a.ev.start) || 0));
    const kb = b.k === 'card' ? -1 : (b.ev.allDay ? 0 : 1 + (AG.toMin(b.ev.start) || 0));
    return ka - kb;
  }));
  return byDay;
}

function chipHTML(it, drag) {
  if (it.k === 'card') {
    const di = dueInfo(it.c), late = di && di.cls === 'late', done = isDone(it.c);
    return `<div class="ev pz${late ? ' late' : ''}${done ? ' done' : ''}"${drag ? ' draggable="true"' : ''} data-card="${esc(it.id)}" data-date="${it.date}" title="Prazo do pedido · ${esc(colById(colOf(it.c)).name)}"><span class="pzi">Prazo</span>${esc(it.c.title || 'Pedido')}</div>`;
  }
  const ev = it.ev;
  return `<div class="ev evt" style="--c:${tipoOf(ev).c}"${drag ? ' draggable="true"' : ''} data-ev="${esc(it.id)}" data-date="${it.date}" title="${esc(ev.title)} · ${esc(fmtT(ev))}${ev.local ? ' · ' + esc(ev.local) : ''}">${ev.allDay ? '' : `<b>${esc(ev.start)}</b> `}${esc(ev.title || tipoOf(ev).n)}${ev.rep && ev.rep !== 'nao' ? ' <i class="rep" title="Repete">↻</i>' : ''}</div>`;
}

function headHTML(title) {
  return `<div class="aghead">
   <button class="btn ghost sm" data-ag="prev" title="Anterior">◂</button><button class="btn ghost sm" data-ag="next" title="Próximo">▸</button><button class="btn ghost sm" data-ag="hoje">Hoje</button>
   <h3>${title}</h3>
   <div class="seg"><button data-ag="mes" class="${agView === 'mes' ? 'on' : ''}">Mês</button><button data-ag="semana" class="${agView === 'semana' ? 'on' : ''}">Semana</button></div>
   <label class="tog"><input type="checkbox" data-agf="ev"${agShowEv ? ' checked' : ''}> Compromissos</label>
   <label class="tog"><input type="checkbox" data-agf="pz"${agShowPz ? ' checked' : ''}> Prazos dos pedidos</label>
   <span class="hsp"></span>
   <button class="btn sm" data-ag="novo">+ Novo compromisso</button></div>`;
}

function sideHTML() {
  const from = today(), to = AG.addDays(from, 13), byDay = collect(from, to);
  const now = Date.now();
  const days = [...byDay.keys()].sort();
  const body = days.map((k) => {
    const items = byDay.get(k).filter((it) => it.k === 'card' ? !isDone(it.c) : !(k === AG.iso(from) && !it.ev.allDay && AG.startAt(it.ev, k) + 30 * 60000 < now));
    if (!items.length) return '';
    return `<div class="sdday">${dayLabel(k)}</div>` + items.map((it) => it.k === 'card'
      ? `<button class="sditem" data-card="${esc(it.id)}"><i style="background:${PAL.laranja}"></i><span><b>${esc(it.c.title || 'Pedido')}</b><small>Prazo de entrega</small></span></button>`
      : `<button class="sditem" data-ev="${esc(it.id)}" data-date="${k}"><i style="background:${tipoOf(it.ev).c}"></i><span><b>${esc(it.ev.title || tipoOf(it.ev).n)}</b><small>${esc(fmtT(it.ev))}${it.ev.local ? ' · ' + esc(it.ev.local) : ''}${it.ev.lembrete >= 0 ? ' · 🔔' : ''}</small></span></button>`).join('');
  }).join('');
  return `<aside class="agside"><h4>Próximos 14 dias</h4>${body || '<p class="note">Nada marcado. Clique num dia do calendário para criar um compromisso.</p>'}</aside>`;
}

/* ----- visão Mês ----- */
function monthHTML() {
  const y = agDate.getFullYear(), m = agDate.getMonth();
  const start = startOfWeek(new Date(y, m, 1)), end = AG.addDays(start, 41), byDay = collect(start, end), td = AG.iso(today());
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = AG.addDays(start, i), k = AG.iso(d), items = byDay.get(k) || [];
    cells += `<div class="day${d.getMonth() !== m ? ' out' : ''}${k === td ? ' today' : ''}" data-date="${k}" data-newday="${k}">
     <button class="dn" data-ag="dia" data-date="${k}" title="Ver a semana">${d.getDate()}</button>
     ${items.slice(0, 3).map((it) => chipHTML(it, true)).join('')}${items.length > 3 ? `<button class="more" data-ag="dia" data-date="${k}">+${items.length - 3} mais</button>` : ''}</div>`;
  }
  return headHTML(MESL[m] + ' ' + y) + `<div class="agbody"><div class="agmain">
   <div class="calwd">${['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((x) => `<span>${x}</span>`).join('')}</div>
   <div class="calgrid">${cells}</div></div>${sideHTML()}</div>`;
}

/* ----- visão Semana ----- */
function lanes(items) {   // distribui compromissos que se sobrepõem lado a lado
  const evs = items.map((it) => { const s = AG.toMin(it.ev.start) ?? 540; let e = AG.toMin(it.ev.end); if (e == null || e <= s) e = s + 60; return { it, s, e }; }).sort((a, b) => a.s - b.s || b.e - a.e);
  const groups = []; let g = null, gEnd = -1;
  evs.forEach((x) => { if (!g || x.s >= gEnd) { g = []; groups.push(g); gEnd = x.e; } else gEnd = Math.max(gEnd, x.e); g.push(x); });
  groups.forEach((gr) => {
    const cols = [];
    gr.forEach((x) => { let c = cols.findIndex((end) => end <= x.s); if (c < 0) { c = cols.length; cols.push(0); } cols[c] = x.e; x.lane = c; });
    gr.forEach((x) => { x.n = cols.length; });
  });
  return evs;
}
function weekHTML() {
  const ws = startOfWeek(agDate), we = AG.addDays(ws, 6), byDay = collect(ws, we), td = AG.iso(today());
  const days = [...Array(7)].map((_, i) => AG.addDays(ws, i));
  const title = ws.getMonth() === we.getMonth() ? `${ws.getDate()} – ${we.getDate()} de ${MESL[we.getMonth()]} ${we.getFullYear()}` : `${ws.getDate()} ${MES[ws.getMonth()]} – ${we.getDate()} ${MES[we.getMonth()]} ${we.getFullYear()}`;
  const nowD = new Date(), nowMin = nowD.getHours() * 60 + nowD.getMinutes();
  const head = days.map((d) => `<div class="wkd${AG.iso(d) === td ? ' today' : ''}"><span>${WD[d.getDay()]}</span><b>${d.getDate()}</b></div>`).join('');
  const all = days.map((d) => { const k = AG.iso(d); return `<div class="wkallc" data-date="${k}">${(byDay.get(k) || []).filter((it) => it.k === 'card' || it.ev.allDay).map((it) => chipHTML(it, true)).join('')}</div>`; }).join('');
  const hours = [...Array(24)].map((_, h) => `<div class="hl" style="top:${h * HOUR_PX}px"><span>${h ? AG.pad(h) + ':00' : ''}</span></div>`).join('');
  const cols = days.map((d) => {
    const k = AG.iso(d), timed = (byDay.get(k) || []).filter((it) => it.k === 'ev' && !it.ev.allDay);
    const blocks = lanes(timed).map((x) => {
      const ev = x.it.ev, h = Math.max((x.e - x.s) / 60 * HOUR_PX, 20);
      return `<div class="wev" data-ev="${esc(x.it.id)}" data-date="${k}" style="--c:${tipoOf(ev).c};top:${x.s / 60 * HOUR_PX}px;height:${h}px;left:calc(${x.lane / x.n * 100}% + 2px);width:calc(${100 / x.n}% - 4px)"><b>${esc(ev.title || tipoOf(ev).n)}</b><span>${esc(fmtT(ev))}${ev.local ? ' · ' + esc(ev.local) : ''}</span><i class="rs" title="Arraste para mudar a duração"></i></div>`;
    }).join('');
    return `<div class="wkcol${k === td ? ' today' : ''}" data-date="${k}">${blocks}${k === td ? `<div class="now" style="top:${nowMin / 60 * HOUR_PX}px"></div>` : ''}</div>`;
  }).join('');
  return headHTML(title) + `<div class="agbody"><div class="agmain"><div class="wk">
   <div class="wkrow wkhead"><div class="gut"></div>${head}</div>
   <div class="wkrow wkall"><div class="gut">dia todo</div>${all}</div>
   <div class="wkscroll" id="wkscroll"><div class="wkgrid" style="height:${24 * HOUR_PX}px"><div class="gutcol">${hours}</div><div class="wkcols">${cols}</div></div></div>
   </div></div>${sideHTML()}</div>`;
}

function renderCal() {
  const box = $('vCal'), sc = $('wkscroll');
  if (sc) agScroll = sc.scrollTop;
  box.innerHTML = agView === 'semana' ? weekHTML() : monthHTML();
  const ns = $('wkscroll');
  if (ns) ns.scrollTop = agScroll != null ? agScroll : 7 * HOUR_PX;
}
setInterval(() => { if (view === 'calendario' && agView === 'semana' && !modal && !agDrag) renderCal(); }, 60000);

/* ----- janela do compromisso ----- */
function openEv(id, date, preset) {
  const base = id ? events.get(id) : null;
  if (id && !base) return;
  const ev = base ? JSON.parse(JSON.stringify(base)) : Object.assign({ title: '', tipo: 'reuniao', date: date || AG.iso(today()), allDay: false, start: '09:00', end: '10:00', rep: 'nao', repAte: '', lembrete: 30, local: '', cardId: '', notas: '' }, preset || {});
  modal = { t: 'ev', id, ev, occ: date || ev.date, confirm: false };
  renderModal();
}
function renderEv() {
  const ev = modal.ev, rec = ev.rep && ev.rep !== 'nao';
  const cardOpts = [...cards.entries()].filter(([, c]) => !isDone(c) || c === cards.get(ev.cardId)).sort((a, b) => String(a[1].title).localeCompare(String(b[1].title), 'pt-BR'));
  $('modal').innerHTML = `<div class="ov"><div class="dlg narrow evdlg" role="dialog" aria-modal="true" aria-labelledby="et">
  <h2 id="et">${modal.id ? 'Editar compromisso' : 'Novo compromisso'}</h2>
  <div class="sub">${rec && modal.id ? 'Este compromisso se repete. As alterações valem para todas as repetições.' : 'Reuniões, entregas, cobranças e outros compromissos. Salve com Ctrl+Enter.'}</div>
  <label>Título<input id="e-title" value="${esc(ev.title)}" placeholder="Ex.: Reunião com a comissão de Direito"></label>
  <div class="tipos" role="radiogroup" aria-label="Tipo">${Object.entries(AG.TIPOS).map(([k, t]) => `<button type="button" role="radio" aria-checked="${ev.tipo === k}" class="tp${ev.tipo === k ? ' on' : ''}" data-tipo="${k}" style="--c:${t.c}">${t.n}</button>`).join('')}</div>
  <div class="fg" style="margin-top:12px">
   <label>${rec ? 'Primeira data' : 'Data'}<input id="e-date" type="date" value="${esc(ev.date)}"></label>
   <label class="tog evall"><input type="checkbox" id="e-allday"${ev.allDay ? ' checked' : ''}> Dia inteiro</label>
   <label class="evtime"${ev.allDay ? ' hidden' : ''}>Início<input id="e-start" type="time" value="${esc(ev.start || '09:00')}" step="300"></label>
   <label class="evtime"${ev.allDay ? ' hidden' : ''}>Fim<input id="e-end" type="time" value="${esc(ev.end || '')}" step="300"></label>
   <label>Repetir<select id="e-rep">${AG.REPETIR.map(([k, n]) => `<option value="${k}"${(ev.rep || 'nao') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
   <label class="evrep"${rec ? '' : ' hidden'}>Até (opcional)<input id="e-repate" type="date" value="${esc(ev.repAte || '')}"></label>
   <label class="full">Lembrete<select id="e-lemb">${AG.LEMBRETES.map(([v, n]) => `<option value="${v}"${(ev.lembrete ?? -1) === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
   <label class="full">Local<input id="e-local" value="${esc(ev.local)}" placeholder="Endereço, sala ou link da chamada"></label>
   <label class="full">Pedido relacionado<select id="e-card"><option value="">Nenhum</option>${cardOpts.map(([id, c]) => `<option value="${esc(id)}"${ev.cardId === id ? ' selected' : ''}>${esc(c.title || 'Pedido')}</option>`).join('')}</select></label>
   <label class="full">Observações<textarea id="e-notas" placeholder="Pauta, contatos, o que levar…">${esc(ev.notas)}</textarea></label>
  </div>
  <p class="note">O lembrete aparece como notificação do Windows enquanto o programa estiver aberto ou na bandeja (perto do relógio).</p>
  <p class="pwerr" id="e-err" role="alert"></p>
  <div class="acts">${modal.id ? (modal.confirm ? '<button class="btn danger" data-act="evdelok">Confirmar exclusão</button><button class="btn ghost" data-act="evdelno">Manter</button>' : '<button class="btn danger" data-act="evdel">Excluir</button>') : ''}
   ${ev.cardId && cards.get(ev.cardId) ? '<button class="btn ghost" data-act="evcard">Abrir pedido</button>' : ''}
   <span class="meta"></span><button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-act="evsave">Salvar</button></div>
  </div></div>`;
  if (!modal.id) setTimeout(() => { const e = $('e-title'); if (e) e.focus(); }, 30);
}
function readEv() {
  const ev = modal.ev, v = (id) => { const e = $(id); return e ? e.value : ''; };
  ev.title = v('e-title').trim(); ev.date = v('e-date'); ev.allDay = $('e-allday').checked;
  ev.start = v('e-start'); ev.end = v('e-end'); ev.rep = v('e-rep'); ev.repAte = ev.rep === 'nao' ? '' : v('e-repate');
  ev.lembrete = parseInt(v('e-lemb'), 10); ev.local = v('e-local').trim(); ev.cardId = v('e-card'); ev.notas = v('e-notas');
  const on = document.querySelector('.tp.on'); if (on) ev.tipo = on.dataset.tipo;
}
function saveEv() {
  readEv();
  const ev = modal.ev, err = $('e-err');
  if (!ev.title) { err.textContent = 'Dê um nome ao compromisso.'; return $('e-title').focus(); }
  if (!AG.parse(ev.date)) { err.textContent = 'Escolha a data.'; return $('e-date').focus(); }
  if (!ev.allDay) {
    const s = AG.toMin(ev.start);
    if (s == null) { err.textContent = 'Informe o horário de início.'; return $('e-start').focus(); }
    let e = AG.toMin(ev.end);
    if (e == null) e = Math.min(s + 60, 23 * 60 + 59);
    if (e <= s) { err.textContent = 'O fim precisa ser depois do início.'; return $('e-end').focus(); }
    ev.end = AG.fromMin(e);
  }
  if (ev.repAte && ev.repAte < ev.date) { err.textContent = 'A data final da repetição é antes da primeira data.'; return $('e-repate').focus(); }
  const id = modal.id || newId(), old = modal.id;
  if (!ev.criado) ev.criado = Date.now();
  ev.atualizado = Date.now();
  events.set(id, ev); modal = null; renderModal(); persist(); render();
  toast(old ? 'Compromisso salvo' : 'Compromisso criado' + (ev.lembrete >= 0 ? ' com lembrete' : ''));
}
function agendaModalClick(t, act) {
  const tp = t.closest('.tp');
  if (tp) { document.querySelectorAll('.tp').forEach((b) => { b.classList.toggle('on', b === tp); b.setAttribute('aria-checked', String(b === tp)); }); return; }
  if (act === 'evsave') return saveEv();
  if (act === 'evdel') { readEv(); modal.confirm = true; return renderEv(); }
  if (act === 'evdelno') { readEv(); modal.confirm = false; return renderEv(); }
  if (act === 'evdelok') { const id = modal.id; modal = null; renderModal(); events.delete(id); persist(); render(); return toast('Compromisso excluído'); }
  if (act === 'evcard') { const cid = modal.ev.cardId; modal = null; renderModal(); return openCard(cid); }
}
document.addEventListener('change', (e) => {
  if (!modal || modal.t !== 'ev') return;
  if (e.target.id === 'e-allday') document.querySelectorAll('.evtime').forEach((x) => { x.hidden = e.target.checked; });
  if (e.target.id === 'e-rep') document.querySelector('.evrep').hidden = e.target.value === 'nao';
});

/* ----- mudar data/horário ----- */
function moveEv(id, occDate, newDate, start, end) {
  const ev = events.get(id); if (!ev) return;
  const shift = AG.dayDiff(occDate, newDate);
  const nx = Object.assign({}, ev);
  if (shift) {
    nx.date = AG.iso(AG.addDays(AG.parse(ev.date), shift));
    if (nx.repAte) nx.repAte = AG.iso(AG.addDays(AG.parse(nx.repAte), shift));
  }
  if (start != null) { nx.allDay = false; nx.start = AG.fromMin(start); nx.end = AG.fromMin(end); }
  if (!shift && start == null) return;
  nx.atualizado = Date.now();
  events.set(id, nx); persist(); render();
  toast((ev.rep && ev.rep !== 'nao' ? 'Série inteira movida: ' : 'Movido para ') + dayLabel(newDate).toLowerCase() + (start != null ? ' às ' + AG.fromMin(start) : ''));
}
function movePrazo(id, newDate) {
  const c = cards.get(id); if (!c || c.prazo === newDate) return;
  saveCard(id, Object.assign({}, c, { prazo: newDate, atualizado: Date.now() }));
  toast('Prazo de "' + (c.title || 'pedido') + '" agora é ' + dayLabel(newDate).toLowerCase());
}

/* ----- cliques ----- */
$('vCal').addEventListener('click', (e) => {
  if (agDrag && agDrag.moved) return;
  const t = e.target, b = t.closest('[data-ag]');
  if (b) {
    const a = b.dataset.ag;
    if (a === 'prev' || a === 'next') {
      const s = a === 'prev' ? -1 : 1;
      agDate = agView === 'semana' ? AG.addDays(agDate, 7 * s) : new Date(agDate.getFullYear(), agDate.getMonth() + s, 1);
    } else if (a === 'hoje') agDate = today();
    else if (a === 'mes' || a === 'semana') { agView = a; setPref('agView', a); }
    else if (a === 'dia') { agDate = AG.parse(b.dataset.date); agView = 'semana'; setPref('agView', 'semana'); }
    else if (a === 'novo') return openEv(null, AG.iso(agView === 'semana' && startOfWeek(agDate) <= today() && today() <= AG.addDays(startOfWeek(agDate), 6) ? today() : (agView === 'semana' ? startOfWeek(agDate) : (agDate.getMonth() === today().getMonth() ? today() : new Date(agDate.getFullYear(), agDate.getMonth(), 1)))));
    return renderCal();
  }
  const ev = t.closest('[data-ev]'); if (ev && !ev.classList.contains('wev')) return openEv(ev.dataset.ev, ev.dataset.date);
  const cd = t.closest('[data-card]'); if (cd) return openCard(cd.dataset.card);
  const nd = t.closest('[data-newday]'); if (nd) return openEv(null, nd.dataset.newday);
  const ad = t.closest('.wkallc'); if (ad) return openEv(null, ad.dataset.date, { allDay: true });
});
$('vCal').addEventListener('change', (e) => {
  const f = e.target.dataset.agf; if (!f) return;
  if (f === 'ev') { agShowEv = e.target.checked; setPref('agEv', agShowEv); }
  if (f === 'pz') { agShowPz = e.target.checked; setPref('agPz', agShowPz); }
  renderCal();
});

/* ----- arrastar no Mês e na faixa "dia todo" (HTML5) ----- */
let dnd = null;
$('vCal').addEventListener('dragstart', (e) => {
  const el = e.target.closest('[data-ev],[data-card]'); if (!el || el.classList.contains('wev')) return;
  dnd = el.dataset.ev ? { k: 'ev', id: el.dataset.ev, date: el.dataset.date } : { k: 'card', id: el.dataset.card };
  el.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'agenda');
});
$('vCal').addEventListener('dragend', () => { dnd = null; document.querySelectorAll('#vCal .drag,#vCal .over').forEach((x) => x.classList.remove('drag', 'over')); });
$('vCal').addEventListener('dragover', (e) => {
  const cell = e.target.closest('.day,.wkallc'); if (!cell || !dnd) return;
  e.preventDefault(); document.querySelectorAll('#vCal .over').forEach((x) => x !== cell && x.classList.remove('over')); cell.classList.add('over');
});
$('vCal').addEventListener('drop', (e) => {
  const cell = e.target.closest('.day,.wkallc'); if (!cell || !dnd) return;
  e.preventDefault(); const d = dnd; dnd = null; cell.classList.remove('over');
  if (d.k === 'card') movePrazo(d.id, cell.dataset.date);
  else {
    const ev = events.get(d.id);
    if (ev && cell.classList.contains('wkallc') && !ev.allDay) { const nx = Object.assign({}, ev, { allDay: true }); events.set(d.id, nx); }
    moveEv(d.id, d.date, cell.dataset.date);
    if (AG.dayDiff(d.date, cell.dataset.date) === 0) { persist(); render(); }
  }
});

/* ----- criar, mover e redimensionar na Semana (ponteiro) ----- */
function colAt(x) {
  const cols = [...document.querySelectorAll('#vCal .wkcol')];
  return cols.find((c) => { const r = c.getBoundingClientRect(); return x >= r.left && x < r.right; }) || null;
}
const minAt = (col, y) => { const r = col.getBoundingClientRect(); return Math.max(0, Math.min(24 * 60, Math.round((y - r.top) / HOUR_PX * 60 / SNAP) * SNAP)); };
$('vCal').addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || agView !== 'semana') return;
  const col = e.target.closest('.wkcol'); if (!col) return;
  const blk = e.target.closest('.wev');
  e.preventDefault();
  if (blk) {
    const ev = events.get(blk.dataset.ev); if (!ev) return;
    const s = AG.toMin(ev.start) ?? 540; let en = AG.toMin(ev.end); if (en == null || en <= s) en = s + 60;
    agDrag = { mode: e.target.classList.contains('rs') ? 'resize' : 'move', id: blk.dataset.ev, occ: blk.dataset.date, el: blk, s, e: en, y0: e.clientY, x0: e.clientX, off: minAt(col, e.clientY) - s, moved: false, col };
  } else {
    const m0 = Math.floor(minAt(col, e.clientY) / 30) * 30;
    const g = document.createElement('div'); g.className = 'wev ghost'; g.style.cssText = `--c:${AG.TIPOS.reuniao.c};top:${m0 / 60 * HOUR_PX}px;height:${HOUR_PX}px;left:2px;width:calc(100% - 4px)`;
    g.innerHTML = '<b>Novo compromisso</b><span></span>'; col.appendChild(g);
    agDrag = { mode: 'create', col, m0, m1: m0 + 60, el: g, y0: e.clientY, moved: false };
    g.lastChild.textContent = AG.fromMin(m0) + '–' + AG.fromMin(m0 + 60);
  }
  $('vCal').setPointerCapture(e.pointerId);
});
$('vCal').addEventListener('pointermove', (e) => {
  const d = agDrag; if (!d) return;
  if (Math.abs(e.clientY - d.y0) > 4 || (d.x0 != null && Math.abs(e.clientX - d.x0) > 4)) d.moved = true;
  if (!d.moved) return;
  if (d.mode === 'create') {
    const m = minAt(d.col, e.clientY), a = Math.min(d.m0, m), b = Math.max(d.m0 + SNAP, m);
    d.m1 = b; d.ms = a;
    d.el.style.top = a / 60 * HOUR_PX + 'px'; d.el.style.height = (b - a) / 60 * HOUR_PX + 'px';
    d.el.lastChild.textContent = AG.fromMin(a) + '–' + AG.fromMin(b);
  } else if (d.mode === 'resize') {
    const m = Math.max(d.s + SNAP, minAt(d.col, e.clientY)); d.ne = m;
    d.el.style.height = (m - d.s) / 60 * HOUR_PX + 'px';
    d.el.lastChild.textContent = AG.fromMin(d.s) + '–' + AG.fromMin(m);
  } else {
    const col = colAt(e.clientX) || d.col, dur = d.e - d.s;
    let s = minAt(col, e.clientY) - d.off; s = Math.max(0, Math.min(24 * 60 - dur, Math.round(s / SNAP) * SNAP));
    if (d.el.parentElement !== col) col.appendChild(d.el);
    d.tcol = col; d.ns = s;
    d.el.style.left = '2px'; d.el.style.width = 'calc(100% - 4px)'; d.el.style.top = s / 60 * HOUR_PX + 'px';
    d.el.classList.add('dragging');
    d.el.querySelector('span').textContent = AG.fromMin(s) + '–' + AG.fromMin(s + dur);
  }
});
$('vCal').addEventListener('pointerup', () => {
  const d = agDrag; if (!d) return;
  setTimeout(() => { agDrag = null; }, 0);
  if (d.mode === 'create') {
    const a = d.moved ? d.ms ?? d.m0 : d.m0, b = d.moved ? d.m1 : d.m0 + 60;
    d.el.remove();
    return openEv(null, d.col.dataset.date, { start: AG.fromMin(a), end: AG.fromMin(Math.min(b, 23 * 60 + 59)) });
  }
  if (!d.moved) return openEv(d.id, d.occ);
  if (d.mode === 'resize') return moveEv(d.id, d.occ, d.occ, d.s, d.ne);
  const nd = (d.tcol || d.col).dataset.date;
  moveEv(d.id, d.occ, nd, d.ns, d.ns + (d.e - d.s));
});
$('vCal').addEventListener('pointercancel', () => { if (agDrag && agDrag.mode === 'create') agDrag.el.remove(); agDrag = null; renderCal(); });

/* ----- notificação clicada: abre o compromisso ----- */
function agendaOpen(id, date) {
  if (!events.get(id)) return;
  if (modal) { modal = null; renderModal(); }
  agDate = AG.parse(date) || today();
  setView('calendario');
  openEv(id, date);
}
if (window.api && window.api.onAbrirCompromisso) window.api.onAbrirCompromisso((r) => agendaOpen(r.id, r.date));
