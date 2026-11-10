/* Aviso de atualização, usado na Produção e no Financeiro. */
(function () {
  var api = window.api; if (!api || !api.estadoAtualizacao) return;
  var bar = document.createElement('div');
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;display:none;align-items:center;gap:12px;' +
    'background:#111820;border:1px solid #2DB5AE;color:#E6EDF3;padding:10px 12px 10px 16px;border-radius:12px;box-shadow:0 14px 34px rgba(0,0,0,.55);' +
    'font:13px "Segoe UI",system-ui,sans-serif;max-width:calc(100vw - 32px)';
  var btn = 'border:0;border-radius:8px;padding:7px 12px;font:600 12px "Segoe UI",system-ui,sans-serif;cursor:pointer;';
  var hideT = null, dismissed = false;
  function mount() { if (!bar.isConnected) document.body.appendChild(bar); }
  function msg(text, ms) {
    mount(); clearTimeout(hideT);
    bar.innerHTML = '<span></span><button data-u="x" style="' + btn + 'background:#16202b;color:#E6EDF3">Fechar</button>';
    bar.firstChild.textContent = text; bar.style.display = 'flex';
    if (ms) hideT = setTimeout(function () { bar.style.display = 'none'; }, ms);
  }
  function ready(s) {
    if (dismissed) return; mount(); clearTimeout(hideT);
    bar.innerHTML = '<span>Nova versão <b></b> pronta para instalar.</span>' +
      '<button data-u="go" style="' + btn + 'background:#2DB5AE;color:#06201f">Reiniciar e atualizar</button>' +
      '<button data-u="later" style="' + btn + 'background:#16202b;color:#E6EDF3">Depois</button>';
    bar.querySelector('b').textContent = s.version || '';
    bar.style.display = 'flex';
  }
  function show(s) { if (s && s.state === 'ready') ready(s); }
  bar.addEventListener('click', function (e) {
    var u = e.target.getAttribute('data-u'); if (!u) return;
    if (u === 'x') { bar.style.display = 'none'; return; }
    if (u === 'later') { dismissed = true; bar.style.display = 'none'; msg('A atualização será instalada quando você fechar o programa.', 5000); return; }
    if (u === 'go') {
      e.target.disabled = true; e.target.textContent = 'Salvando…';
      Promise.resolve(window.__beforeUpdate && window.__beforeUpdate()).then(function () { return api.instalarAtualizacao(); });
    }
  });
  api.onAtualizacao(show);
  api.estadoAtualizacao().then(show);
  api.versao().then(function (v) { document.querySelectorAll('[data-ver]').forEach(function (el) { el.textContent = v; }); });
  window.__checkUpdates = function () {
    msg('Procurando atualizações…');
    api.verificarAtualizacao().then(function (s) {
      if (s.state === 'ready') { dismissed = false; ready(s); }
      else if (s.state === 'downloading') msg('Baixando a versão ' + s.version + (s.percent ? ' (' + s.percent + '%)' : '') + '. Você será avisado quando estiver pronta.', 7000);
      else if (s.state === 'dev') msg('Atualização automática só funciona no programa instalado.', 5000);
      else if (s.state === 'error') msg('Não foi possível verificar agora. Confira a internet e tente de novo.', 7000);
      else api.versao().then(function (v) { msg('Você já está na versão mais recente (' + v + ').', 5000); });
    });
  };
})();
