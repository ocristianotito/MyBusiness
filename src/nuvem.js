// Sincronização na nuvem (Firebase), usada pelo processo principal.
// Os dados ficam em usuarios/{uid}/partes no Firestore, separados em partes (cfg, cards, events, clients,
// contracts, fin). Cada parte guarda o momento da última mudança (ts); vale sempre a mais recente.
// O arquivo dados.json continua sendo a cópia local: sem internet o programa funciona normalmente e envia
// o que ficou pendente quando a conexão volta. Só a conta dona dos dados lê e grava (regras do Firestore).
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, signOut, connectAuthEmulator } = require('firebase/auth');
const { initializeFirestore, connectFirestoreEmulator, collection, doc, getDocs, onSnapshot, writeBatch, terminate } = require('firebase/firestore');

const PARTES = ['cfg', 'cards', 'events', 'clients', 'contracts', 'fin'];
const PEDACO = 700000;   // caracteres por documento (o Firestore aceita até 1 MB por documento)

module.exports = function criarNuvem(o) {
  // o = { config, dataDir, emulador, safeStorage, getCurrent(), salvarLocal(), aplicarRemoto(parte), avisar(status), perguntar(msg) → 'nuvem'|'local'|null, log(msg) }
  const CRED = path.join(o.dataDir, 'nuvem.json');
  const dev = (() => { try { return os.hostname() + '-' + crypto.createHash('sha1').update(o.dataDir).digest('hex').slice(0, 6); } catch (e) { return 'pc'; } })();
  let app = null, auth = null, db = null, uid = null, email = '', parar = null;
  let estado = 'desligado', msg = '', ultima = 0;
  const fila = new Set(); let timer = null, enviando = false;

  const st = () => ({ estado, email, msg, ultima, dispositivo: os.hostname() });
  const muda = (e, m) => { estado = e; msg = m || ''; o.avisar(st()); };
  const sync = () => { const c = o.getCurrent(); if (!c._sync || typeof c._sync !== 'object') c._sync = {}; if (!c._sync.ts) c._sync.ts = {}; return c._sync; };
  const temValor = (v) => v != null && !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
  // Uma parte "vazia" (ex.: o Financeiro de um computador novo, sem turmas) nunca apaga uma parte com dados:
  // nem ao enviar, nem ao receber. Assim um aparelho recém-instalado não zera os outros.
  const qtd = (x) => Array.isArray(x) ? x.length : (x && typeof x === 'object' ? Object.keys(x).length : 0);
  const vazio = (p, v) => {
    if (!temValor(v)) return true;
    if (p === 'fin') return !qtd(v.turmas) && !qtd(v.parc) && !(v.cx && (qtd(v.cx.mov) || qtd(v.cx.rec)));
    if (p === 'cfg') return false;
    return qtd(v) === 0;
  };
  let ultimoRemoto = {};

  /* ----- credenciais guardadas (criptografadas pelo Windows/macOS) ----- */
  function guardar(e, s) {
    const enc = o.safeStorage && o.safeStorage.isEncryptionAvailable();
    const senha = enc ? o.safeStorage.encryptString(s).toString('base64') : Buffer.from(s, 'utf8').toString('base64');
    fs.writeFileSync(CRED, JSON.stringify({ email: e, senha, enc: !!enc }));
  }
  function ler() {
    try {
      const c = JSON.parse(fs.readFileSync(CRED, 'utf8'));
      const s = c.enc ? o.safeStorage.decryptString(Buffer.from(c.senha, 'base64')) : Buffer.from(c.senha, 'base64').toString('utf8');
      return { email: c.email, senha: s };
    } catch (e) { return null; }
  }

  function iniciarFirebase() {
    if (app) return;
    app = initializeApp(o.config, 'cristiano-convites');
    auth = getAuth(app);
    db = initializeFirestore(app, {});
    if (o.emulador) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
  }
  const colecao = () => collection(db, 'usuarios', uid, 'partes');

  /* ----- envio ----- */
  function marcar(partes) {
    const s = sync(), agora = Date.now();
    partes.forEach((p) => { if (PARTES.includes(p)) { s.ts[p] = agora; fila.add(p); } });
    if (uid) agendar();
  }
  function agendar(ms) { clearTimeout(timer); timer = setTimeout(enviar, ms == null ? 1500 : ms); }
  async function enviar() {
    if (!uid || !fila.size) return;
    if (enviando) return agendar(500);
    enviando = true;
    let partes = [...fila]; fila.clear();
    const salvar = partes.filter((p) => vazio(p, o.getCurrent()[p]) && ultimoRemoto[p] && !vazio(p, ultimoRemoto[p].valor));
    if (salvar.length) {   // vazio aqui, com dados na nuvem: fica com a nuvem
      const c = o.getCurrent(), s = sync();
      salvar.forEach((p) => { const r = ultimoRemoto[p]; c[p] = r.valor; s.ts[p] = r.ts; if (!s.n) s.n = {}; s.n[p] = r.n; });
      o.log('vazio aqui, mantida a nuvem: ' + salvar.join(', '));
      o.salvarLocal(); o.aplicarRemoto(salvar);
      partes = partes.filter((p) => !salvar.includes(p));
      if (!partes.length) { enviando = false; muda('sincronizado'); return; }
    }
    muda('enviando');
    try {
      const c = o.getCurrent(), s = sync(), b = writeBatch(db);
      for (const p of partes) {
        const json = JSON.stringify(c[p] === undefined ? null : c[p]);
        const n = Math.max(1, Math.ceil(json.length / PEDACO)), antes = (s.n && s.n[p]) || 0;
        for (let i = 0; i < n; i++) b.set(doc(colecao(), p + '__' + i), { s: json.slice(i * PEDACO, (i + 1) * PEDACO) });
        for (let i = n; i < antes; i++) b.delete(doc(colecao(), p + '__' + i));
        b.set(doc(colecao(), p), { ts: s.ts[p] || Date.now(), n, dev, tam: json.length });
        if (!s.n) s.n = {}; s.n[p] = n;
      }
      await b.commit();
      ultima = Date.now(); o.log('enviado: ' + partes.join(', '));
      o.salvarLocal();
      muda(fila.size ? 'enviando' : 'sincronizado');
    } catch (e) {
      partes.forEach((p) => fila.add(p));
      o.log('erro ao enviar: ' + (e && e.message));
      muda('offline', 'Sem conexão com a nuvem. As mudanças ficam salvas no computador e sobem quando a conexão voltar.');
      agendar(15000);
    } finally { enviando = false; }
  }

  /* ----- recebimento ----- */
  function montar(snap) {
    const meta = {}, ped = {};
    snap.forEach((d) => { const id = d.id, v = d.data(); if (id.includes('__')) ped[id] = v.s; else meta[id] = v; });
    const out = {};
    Object.keys(meta).forEach((p) => {
      const m = meta[p]; let json = '';
      for (let i = 0; i < (m.n || 1); i++) { const x = ped[p + '__' + i]; if (x == null) return; json += x; }
      if (m.tam != null && json.length !== m.tam) return;   // ainda chegando
      try { out[p] = { ts: m.ts || 0, n: m.n || 1, valor: JSON.parse(json) }; } catch (e) {}
    });
    return out;
  }
  function conciliar(remoto) {
    const c = o.getCurrent(), s = sync(); let aplicou = [];
    ultimoRemoto = remoto;
    for (const p of PARTES) {
      const r = remoto[p], rt = r ? r.ts : 0, lt = s.ts[p] || 0;
      const rv = r && vazio(p, r.valor), lv = vazio(p, c[p]);
      if (r && !rv && lv) {   // vazio aqui e com dados na nuvem: vale a nuvem, mesmo que mais antiga
        fila.delete(p); c[p] = r.valor; s.ts[p] = rt; if (!s.n) s.n = {}; s.n[p] = r.n; aplicou.push(p);
      } else if (r && rv && !lv && rt > lt) {   // a nuvem ficou vazia mas aqui há dados: não apaga, envia de volta
        o.log('nuvem vazia em ' + p + ': mantidos os dados deste computador');
        s.ts[p] = Date.now(); fila.add(p);
      } else if (r && rt > lt && !fila.has(p)) {
        c[p] = r.valor; s.ts[p] = rt; if (!s.n) s.n = {}; s.n[p] = r.n; aplicou.push(p);
      } else if (!fila.has(p) && (lt > rt || (!r && temValor(c[p])))) {
        if (!s.ts[p]) s.ts[p] = Date.now();
        fila.add(p);
      }
    }
    if (aplicou.length) { o.salvarLocal(); o.aplicarRemoto(aplicou); o.log('recebido: ' + aplicou.join(', ')); ultima = Date.now(); }
    if (fila.size) agendar(300); else muda('sincronizado');
  }

  /* ----- entrar / sair ----- */
  async function conectar(e, s, interativo) {
    iniciarFirebase();
    muda('entrando');
    let cred;
    try { cred = await signInWithEmailAndPassword(auth, e, s); }
    catch (err) {
      const code = (err && err.code) || '';
      const m = /invalid-credential|wrong-password|user-not-found|invalid-email/.test(code) ? 'E-mail ou senha incorretos.'
        : /too-many-requests/.test(code) ? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
          : /network/.test(code) ? 'Sem conexão com a internet.'
            : /configuration-not-found|operation-not-allowed/.test(code) ? 'O login por e-mail e senha não está ativado no Firebase (Authentication → E-mail/senha).'
              : 'Não foi possível entrar (' + code + ').';
      muda(/network/.test(code) && !interativo ? 'offline' : 'erro', m);
      if (/network/.test(code) && !interativo) setTimeout(() => iniciar(), 60000);
      return { ok: false, error: m };
    }
    uid = cred.user.uid; email = e;
    const c = o.getCurrent(), syn = sync();
    // primeira vez neste computador com dados na nuvem e aqui: perguntar qual vale
    let remoto = {};
    try { remoto = montar(await getDocs(colecao())); }
    catch (err) {
      const m = /permission/i.test(String(err && err.message)) ? 'A nuvem recusou o acesso. Confira as regras do Firestore (veja as instruções).' : 'Não foi possível ler a nuvem: ' + (err && err.message);
      muda('erro', m); uid = null; return { ok: false, error: m };
    }
    if (syn.uid !== uid) {
      const temRemoto = Object.keys(remoto).some((p) => !vazio(p, remoto[p].valor)), temLocal = !vazio('cards', c.cards) || !vazio('fin', c.fin);
      if (temRemoto && temLocal) {
        const escolha = await o.perguntar();
        if (!escolha) { uid = null; await signOut(auth).catch(() => {}); muda('desligado'); return { ok: false, error: 'Cancelado.' }; }
        if (escolha === 'nuvem') { fila.clear(); PARTES.forEach((p) => { syn.ts[p] = 0; }); }
        else PARTES.forEach((p) => { syn.ts[p] = Date.now(); });
      } else if (temRemoto) { fila.clear(); PARTES.forEach((p) => { syn.ts[p] = 0; }); }   // aparelho novo: o que estava na fila era só o padrão
      syn.uid = uid;
    }
    if (interativo) guardar(e, s);
    conciliar(remoto);
    if (parar) parar();
    parar = onSnapshot(colecao(), (snap) => { if (!snap.metadata.hasPendingWrites) conciliar(montar(snap)); },
      (err) => { o.log('erro na escuta: ' + (err && err.message)); muda('offline', 'Conexão com a nuvem interrompida. Tentando de novo…'); setTimeout(() => { if (email) iniciar(); }, 30000); });
    return { ok: true };
  }
  async function iniciar() {
    const c = ler(); if (!c) { muda('desligado'); return; }
    return conectar(c.email, c.senha, false);
  }
  async function sair() {
    if (parar) { parar(); parar = null; }
    try { if (auth) await signOut(auth); } catch (e) {}
    uid = null; email = ''; fila.clear(); clearTimeout(timer);
    try { fs.unlinkSync(CRED); } catch (e) {}
    const s = sync(); delete s.uid;
    muda('desligado');
  }
  async function encerrar() { if (fila.size && uid) { clearTimeout(timer); await Promise.race([enviar(), new Promise((r) => setTimeout(r, 4000))]); } if (parar) parar(); if (db) await terminate(db).catch(() => {}); }

  return { PARTES, status: st, marcar, entrar: (e, s) => conectar(e, s, true), iniciar, sair, encerrar, sincronizarAgora: () => { if (uid) { agendar(0); return true; } return false; } };
};
