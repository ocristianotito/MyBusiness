/* Indicador e janela da Nuvem (sincronização entre aparelhos), usados na página principal e no Financeiro. */
(function () {
  'use strict';
  var api = window.api; if (!api || !api.nuvemStatus) return;
  var ESTADOS = {
    desligado: ['Nuvem desligada', '#8B9BAE'], entrando: ['Conectando…', '#F0A53F'], sincronizado: ['Sincronizado', '#34D399'],
    enviando: ['Enviando…', '#F0A53F'], offline: ['Sem conexão', '#F0A53F'], erro: ['Nuvem com problema', '#F87171']
  };
  var st = { estado: 'desligado' }, ov = null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var icone = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.5 4.25 4.25 0 0 0 7 18z"/></svg>';

  function chip() {
    var foot = document.querySelector('#side .sfoot'); if (!foot) return null;
    var b = document.getElementById('nuvemChip');
    if (!b) { b = document.createElement('button'); b.id = 'nuvemChip'; b.className = 'nuvemchip'; b.type = 'button'; foot.insertBefore(b, foot.firstChild); b.addEventListener('click', abrir); }
    return b;
  }
  function pintar() {
    var b = chip(); if (!b) return;
    var e = ESTADOS[st.estado] || ESTADOS.desligado;
    b.innerHTML = icone + '<span>' + e[0] + '</span><i style="background:' + e[1] + '"></i>';
    b.title = st.estado === 'desligado' ? 'Ligar a sincronização entre aparelhos' : (st.email || '') + (st.msg ? ' · ' + st.msg : '');
  }
  function quando(t) { if (!t) return 'ainda não'; var d = new Date(t); return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }

  function fechar() { if (ov) { ov.remove(); ov = null; } }
  function abrir() {
    fechar();
    ov = document.createElement('div'); ov.className = 'ov nuvemov';
    if (st.email && st.estado !== 'desligado') {
      var e = ESTADOS[st.estado] || ESTADOS.desligado;
      ov.innerHTML = '<div class="dlg" style="max-width:480px" role="dialog" aria-modal="true" aria-labelledby="nvt"><h2 id="nvt">Nuvem</h2>' +
        '<div class="sub">Seus dados ficam iguais em todos os aparelhos conectados com esta conta.</div>' +
        '<div class="nvinfo"><div><small>Situação</small><b><i style="background:' + e[1] + '"></i>' + e[0] + '</b></div><div><small>Conta</small><b>' + esc(st.email) + '</b></div>' +
        '<div><small>Este aparelho</small><b>' + esc(st.dispositivo || '') + '</b></div><div><small>Última sincronização</small><b>' + quando(st.ultima) + '</b></div></div>' +
        (st.msg ? '<p class="nvmsg">' + esc(st.msg) + '</p>' : '') +
        '<div class="acts"><button class="btn danger" data-nv="sair" style="margin-right:auto">Desconectar este computador</button><button class="btn ghost" data-nv="x">Fechar</button><button class="btn" data-nv="agora">Sincronizar agora</button></div></div>';
    } else {
      ov.innerHTML = '<div class="dlg" style="max-width:460px" role="dialog" aria-modal="true" aria-labelledby="nvt"><h2 id="nvt">Ligar a nuvem</h2>' +
        '<div class="sub">Entre com a conta do Firebase para manter os dados iguais neste computador, no outro Windows, no Mac e no iPhone.</div>' +
        '<label>E-mail<input id="nvE" type="email" autocomplete="username" value="' + esc(st.email || '') + '"></label>' +
        '<label style="margin-top:12px">Senha<input id="nvS" type="password" autocomplete="current-password"></label>' +
        '<p class="nvmsg" id="nvErr" role="alert">' + esc(st.estado === 'erro' ? st.msg : '') + '</p>' +
        '<p class="note">A senha fica guardada criptografada neste computador para conectar sozinho nas próximas vezes. Sem internet, o programa continua funcionando e sincroniza quando a conexão voltar.</p>' +
        '<div class="acts"><button class="btn ghost" data-nv="x">Cancelar</button><button class="btn" data-nv="entrar">Entrar e sincronizar</button></div></div>';
    }
    document.body.appendChild(ov);
    var f = ov.querySelector('#nvE'); if (f) setTimeout(function () { (f.value ? ov.querySelector('#nvS') : f).focus(); }, 30);
    ov.addEventListener('click', function (ev) {
      if (ev.target === ov) return fechar();
      var a = ev.target.closest('[data-nv]'); if (!a) return;
      var k = a.dataset.nv;
      if (k === 'x') return fechar();
      if (k === 'agora') { api.nuvemAgora(); a.textContent = 'Sincronizando…'; setTimeout(fechar, 900); return; }
      if (k === 'sair') {
        if (a.dataset.ok) { api.nuvemSair().then(fechar); return; }
        a.dataset.ok = '1'; a.textContent = 'Confirmar: desconectar'; return;
      }
      if (k === 'entrar') {
        var em = ov.querySelector('#nvE').value.trim(), se = ov.querySelector('#nvS').value, err = ov.querySelector('#nvErr');
        if (!em || !se) { err.textContent = 'Preencha o e-mail e a senha.'; return; }
        a.disabled = true; a.textContent = 'Conectando…'; err.textContent = '';
        api.nuvemEntrar(em, se).then(function (r) {
          if (r && r.ok) { fechar(); if (window.__toastNuvem) window.__toastNuvem('Nuvem ligada: seus dados estão sincronizados.'); return; }
          a.disabled = false; a.textContent = 'Entrar e sincronizar'; err.textContent = (r && r.error) || 'Não foi possível entrar.';
        });
      }
    });
    ov.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') fechar();
      if (ev.key === 'Enter' && ev.target.tagName === 'INPUT') { var b = ov.querySelector('[data-nv="entrar"]'); if (b) b.click(); }
    });
  }

  var css = document.createElement('style');
  css.textContent = '.nuvemchip{display:flex;align-items:center;gap:7px;width:100%;background:none;border:1px solid var(--c-bd,#1E2833);color:#c3cfdb;border-radius:8px;padding:6px 9px;font:inherit;font-size:12px;cursor:pointer;text-align:left}' +
    '.nuvemchip:hover{border-color:#2a3746;color:#E6EDF3}.nuvemchip span{flex:1}.nuvemchip i{width:8px;height:8px;border-radius:50%}' +
    '.nvinfo{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:6px 0 4px}.nvinfo div{background:var(--c-card2,#16202b);border-radius:8px;padding:10px 12px}' +
    '.nvinfo small{display:block;color:var(--c-mu,#8B9BAE);font-size:11px;margin-bottom:3px}.nvinfo b{display:flex;align-items:center;gap:7px;font-size:13px;overflow-wrap:anywhere}.nvinfo b i{width:8px;height:8px;border-radius:50%;flex-shrink:0}' +
    '.nvmsg{color:#F0A53F;font-size:13px;margin:10px 0 0}.nvmsg:empty{display:none}.nuvemov label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--c-mu,#8B9BAE)}' +
    '.nuvemov input{background:#0a0f14;border:1px solid #1E2833;color:#E6EDF3;border-radius:8px;padding:9px 10px;font:inherit;font-size:14px;width:100%;margin:0}';
  document.head.appendChild(css);
  api.onNuvem(function (s) { st = s || st; pintar(); });
  function boot() { pintar(); api.nuvemStatus().then(function (s) { st = s || st; pintar(); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  setTimeout(boot, 800);   // o menu lateral do Financeiro é montado logo depois
})();
