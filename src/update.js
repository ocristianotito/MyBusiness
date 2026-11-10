/* Atualização automática: quando a versão nova termina de baixar, mostra uma contagem,
   salva tudo e reinicia o programa já atualizado. Usado na Produção e no Financeiro. */
(function () {
  var api = window.api; if (!api || !api.estadoAtualizacao) return;
  var COUNT = 30;
  var bar = document.createElement('div');
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;display:none;align-items:center;gap:12px;' +
    'background:#111820;border:1px solid #2DB5AE;color:#E6EDF3;padding:10px 12px 10px 16px;border-radius:12px;box-shadow:0 14px 34px rgba(0,0,0,.55);' +
    'font:13px "Segoe UI",system-ui,sans-serif;max-width:calc(100vw - 32px)';
  var btn = 'border:0;border-radius:8px;padding:7px 12px;font:600 12px "Segoe UI",system-ui,sans-serif;cursor:pointer;white-space:nowrap;';
  var hideT = null, tick = null, left = 0, shownDl = false;
  function mount() { if (!bar.isConnected) document.body.appendChild(bar); }
  function stop() { clearInterval(tick); tick = null; }
  function msg(text, ms) {
    mount(); clearTimeout(hideT); stop();
    bar.innerHTML = '<span></span><button data-u="x" style="' + btn + 'background:#16202b;color:#E6EDF3">Fechar</button>';
    bar.firstChild.textContent = text; bar.style.display = 'flex';
    if (ms) hideT = setTimeout(function () { bar.style.display = 'none'; }, ms);
  }
  function install() {
    stop();
    bar.firstChild.textContent = 'Salvando e reiniciando para atualizar…';
    bar.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    api.instalarAtualizacao();
  }
  function countdown(s) {
    if (tick) return;
    mount(); clearTimeout(hideT); left = COUNT;
    bar.innerHTML = '<span>Versão <b></b> baixada. Reiniciando para atualizar em <b data-s></b> s. Seus dados são salvos antes.</span>' +
      '<button data-u="go" style="' + btn + 'background:#2DB5AE;color:#06201f">Atualizar agora</button>' +
      '<button data-u="later" style="' + btn + 'background:#16202b;color:#E6EDF3">Adiar 10 min</button>';
    bar.querySelector('b').textContent = s.version || '';
    var sec = bar.querySelector('[data-s]'); sec.textContent = left;
    bar.style.display = 'flex';
    tick = setInterval(function () {
      left--; sec.textContent = left;
      if (left > 0) return;
      // uma janela de edição aberta? espera 2 minutos para não perder o que está sendo digitado
      if (window.__busy && window.__busy()) { stop(); api.adiarAtualizacao(2); msg('Termine a edição aberta: a atualização tenta de novo em 2 minutos.', 8000); return; }
      install();
    }, 1000);
  }
  function show(s) {
    if (!s) return;
    if (s.state === 'ready') countdown(s);
    else if (s.state === 'downloading' && !shownDl) { shownDl = true; msg('Baixando a versão ' + (s.version || 'nova') + ' em segundo plano…', 5000); }
  }
  bar.addEventListener('click', function (e) {
    var u = e.target.getAttribute('data-u'); if (!u) return;
    if (u === 'x') { bar.style.display = 'none'; return; }
    if (u === 'go') { install(); return; }
    if (u === 'later') { stop(); api.adiarAtualizacao(10); msg('Combinado: atualizo daqui a 10 minutos.', 5000); }
  });
  api.onAtualizacao(show);
  api.estadoAtualizacao().then(show);
  api.versao().then(function (v) { document.querySelectorAll('[data-ver]').forEach(function (el) { el.textContent = v; }); });
  window.__checkUpdates = function () {
    msg('Procurando atualizações…');
    api.verificarAtualizacao().then(function (s) {
      if (s.state === 'ready') countdown(s);
      else if (s.state === 'downloading') msg('Baixando a versão ' + s.version + (s.percent ? ' (' + s.percent + '%)' : '') + '. Quando terminar, o programa reinicia sozinho.', 7000);
      else if (s.state === 'dev') msg('Atualização automática só funciona no programa instalado.', 5000);
      else if (s.state === 'error') msg('Não foi possível verificar: ' + (s.msg || 'sem conexão') + '. Tente de novo mais tarde.', 10000);
      else api.versao().then(function (v) { msg('Você já está na versão mais recente (' + v + ').', 5000); });
    });
  };
})();
