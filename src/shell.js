/* Menu lateral fixo (módulos), usado na tela principal (index.html) e no Financeiro (financeiro.html).
   Cada página define window.__shellNav(modulo) para trocar de módulo. */
(function () {
  'use strict';
  var I = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    demandas: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11"/><circle cx="5" cy="18" r="1.2"/>',
    financeiro: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18M16 15h2"/><path d="M6 6V5a2 2 0 0 1 2-2h8"/>',
    contratos: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="m9 16 5.5-5.5 2 2L11 18H9z"/>',
    clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };
  var MODS = [['dashboard', 'Dashboard'], ['demandas', 'Demandas'], ['financeiro', 'Financeiro'], ['contratos', 'Contratos'], ['clientes', 'Clientes']];
  var svg = function (k, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[k] + '</svg>'; };
  window.ShellIcon = svg;

  function build(active) {
    var side = document.getElementById('side'); if (!side) return;
    side.innerHTML =
      '<div class="sbrand"><span class="slogo" aria-hidden="true">CC</span><b>Cristiano<br>Convites</b></div>' +
      '<div class="slabel">Módulos</div><nav class="snav" aria-label="Módulos">' +
      MODS.map(function (m) {
        return '<button data-shell="' + m[0] + '" class="' + (m[0] === active ? 'on' : '') + '"' + (m[0] === active ? ' aria-current="page"' : '') + '>' +
          svg(m[0]) + '<span>' + m[1] + '</span>' + (m[0] === 'financeiro' ? '<i class="slock" title="Protegido por senha">' + svg('lock', 13) + '</i>' : '') + '</button>';
      }).join('') + '</nav>' +
      '<div class="sfoot"><div class="suser"><span class="sav">CC</span><span><b>Cristiano Convites</b><small>Este computador · v<span data-ver></span></small></span></div>' +
      '<div class="sbtns" id="sfootBtns"></div></div>';
    side.addEventListener('click', function (e) {
      var b = e.target.closest('[data-shell]'); if (!b) return;
      if (window.__shellNav) window.__shellNav(b.dataset.shell);
    });
  }
  window.Shell = {
    build: build,
    setActive: function (m) {
      document.querySelectorAll('#side [data-shell]').forEach(function (b) {
        var on = b.dataset.shell === m; b.classList.toggle('on', on);
        if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      });
    }
  };
})();
