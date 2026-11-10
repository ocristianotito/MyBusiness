/* Regras da agenda usadas pela tela (calendário) e pelo processo principal (lembretes). */
(function (root) {
  'use strict';
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = (s) => {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const toMin = (t) => {
    if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const fromMin = (m) => pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dayDiff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);

  const TIPOS = {
    reuniao: { n: 'Reunião', c: '#60A5FA' },
    compromisso: { n: 'Compromisso', c: '#A78BFA' },
    entrega: { n: 'Entrega', c: '#34D399' },
    financeiro: { n: 'Cobrança / pagamento', c: '#F0A53F' },
    pessoal: { n: 'Pessoal', c: '#E774BB' },
    outro: { n: 'Outro', c: '#8B9BAE' }
  };
  const LEMBRETES = [
    [-1, 'Sem lembrete'], [0, 'Na hora'], [5, '5 minutos antes'], [10, '10 minutos antes'],
    [15, '15 minutos antes'], [30, '30 minutos antes'], [60, '1 hora antes'], [120, '2 horas antes'],
    [1440, '1 dia antes'], [2880, '2 dias antes']
  ];
  const REPETIR = [['nao', 'Não se repete'], ['dia', 'Todo dia'], ['semana', 'Toda semana'], ['mes', 'Todo mês'], ['ano', 'Todo ano']];

  /* Datas (AAAA-MM-DD) em que o compromisso acontece entre from e to (Date, inclusive). */
  function occurrences(ev, from, to) {
    const start = parse(ev.date);
    if (!start) return [];
    const until = ev.rep && ev.rep !== 'nao' && ev.repAte ? parse(ev.repAte) : null;
    const end = until && until < to ? until : to;
    const out = [];
    if (!ev.rep || ev.rep === 'nao') {
      if (start >= from && start <= to) out.push(ev.date);
      return out;
    }
    if (ev.rep === 'dia' || ev.rep === 'semana') {
      const step = ev.rep === 'dia' ? 1 : 7;
      let i = Math.max(0, Math.ceil((from - start) / 864e5 / step) - 1);
      for (let n = 0; n < 1000; n++, i++) {
        const d = addDays(start, i * step);
        if (d > end) break;
        if (d >= from) out.push(iso(d));
      }
      return out;
    }
    for (let i = 0; i < 1200; i++) {
      const d = ev.rep === 'mes'
        ? new Date(start.getFullYear(), start.getMonth() + i, start.getDate())
        : new Date(start.getFullYear() + i, start.getMonth(), start.getDate());
      if (d > end) break;
      if (d.getDate() !== start.getDate()) continue; // ex.: dia 31 em mês de 30 dias
      if (d >= from) out.push(iso(d));
    }
    return out;
  }

  /* Momento (ms) em que o compromisso começa numa data; dia inteiro conta a partir das 9h. */
  function startAt(ev, date) {
    const d = parse(date);
    const m = ev.allDay ? 9 * 60 : (toMin(ev.start) ?? 9 * 60);
    return d.getTime() + m * 60000;
  }

  /* Lembretes cujo horário cai em (fromMs, toMs]. */
  function dueReminders(events, fromMs, toMs) {
    const out = [];
    const from = new Date(fromMs); from.setHours(0, 0, 0, 0);
    const to = addDays(new Date(toMs), 3); to.setHours(0, 0, 0, 0);
    Object.keys(events || {}).forEach((id) => {
      const ev = events[id];
      if (!ev || ev.lembrete == null || ev.lembrete < 0) return;
      occurrences(ev, from, to).forEach((date) => {
        const at = startAt(ev, date) - ev.lembrete * 60000;
        if (at > fromMs && at <= toMs) out.push({ id, ev, date, at });
      });
    });
    return out;
  }

  const api = { pad, iso, parse, toMin, fromMin, addDays, dayDiff, TIPOS, LEMBRETES, REPETIR, occurrences, startAt, dueReminders };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AgendaCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
