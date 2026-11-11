/* Tela de acesso: pedida ao abrir o programa e ao reabrir a janela pela bandeja.
   A senha é a mesma em todos os aparelhos (viaja pela Nuvem). O Financeiro continua com a senha própria. */
(function () {
  'use strict';
  var api = window.api, box = document.getElementById('acard');
  var st = { temSenha: false }, modo = '', recTipo = 'nuvem';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var logo = '<div class="alogo"><span>CC</span><div><b>Cristiano Convites</b><small>Gestão da produção</small></div></div>';
  function foco() { var i = box.querySelector('input'); if (i) setTimeout(function () { i.focus(); }, 30); }
  function erro(t) { var e = document.getElementById('aerr'); if (e) { e.className = 'aerr'; e.textContent = t || ''; } }

  function tela(m) {
    modo = m;
    if (m === 'entrar') {
      box.innerHTML = logo + '<h1>Digite a senha de acesso</h1><p class="sub">A mesma senha em todos os seus aparelhos.</p>' +
        '<label>Senha<input id="a1" type="password" autocomplete="current-password"></label><p class="aerr" id="aerr"></p>' +
        '<button class="btn" data-a="entrar">Entrar</button><div class="alinks"><span></span><button data-a="esqueci">Esqueci a senha</button></div>';
    } else if (m === 'criar' || m === 'redefinir') {
      box.innerHTML = logo + '<h1>' + (m === 'criar' ? 'Crie a senha de acesso' : 'Crie uma senha nova') + '</h1>' +
        '<p class="sub">' + (m === 'criar' ? 'Ela será pedida sempre que o programa abrir, neste e nos outros aparelhos ligados à mesma Nuvem. A senha do Financeiro continua separada.' : 'A senha nova passa a valer em todos os aparelhos ligados à Nuvem.') + '</p>' +
        '<label>Senha nova<input id="a1" type="password" autocomplete="new-password"></label><label>Repita a senha<input id="a2" type="password" autocomplete="new-password"></label>' +
        '<p class="aerr" id="aerr"></p><button class="btn" data-a="criar">' + (m === 'criar' ? 'Criar senha e entrar' : 'Salvar e entrar') + '</button>' +
        (m === 'criar' && st.nuvem ? '<p class="anote">Já criou a senha em outro computador? Aguarde alguns segundos: ela chega pela Nuvem e esta tela muda sozinha.</p>' : '<p class="anote">Pelo menos 4 caracteres. Anote num lugar seguro.</p>');
    } else if (m === 'trocar') {
      box.innerHTML = logo + '<h1>Trocar a senha de acesso</h1><p class="sub">A senha nova passa a valer em todos os aparelhos ligados à Nuvem.</p>' +
        '<label>Senha atual<input id="a0" type="password" autocomplete="current-password"></label><label>Senha nova<input id="a1" type="password" autocomplete="new-password"></label><label>Repita a senha nova<input id="a2" type="password" autocomplete="new-password"></label>' +
        '<p class="aerr" id="aerr"></p><button class="btn" data-a="criar">Salvar senha nova</button><div class="alinks"><button data-a="cancelar">Cancelar</button><span></span></div>';
    } else if (m === 'esqueci') {
      if (!st.nuvem && st.fin) recTipo = 'fin'; if (st.nuvem && !st.fin) recTipo = 'nuvem';
      var nada = !st.nuvem && !st.fin;
      box.innerHTML = logo + '<h1>Esqueci a senha de acesso</h1><p class="sub">Para criar uma senha nova, confirme com outra senha que só você sabe.</p>' +
        (nada ? '<p class="anote">Este computador não está ligado à Nuvem e não tem senha do Financeiro. Ligue a Nuvem em outro aparelho já liberado ou peça ajuda para liberar este computador.</p><div class="alinks"><button data-a="voltar">Voltar</button><span></span></div>'
          : '<div class="aseg"><button data-r="nuvem" class="' + (recTipo === 'nuvem' ? 'on' : '') + '"' + (st.nuvem ? '' : ' disabled title="A Nuvem não está ligada neste computador"') + '>Senha da Nuvem</button><button data-r="fin" class="' + (recTipo === 'fin' ? 'on' : '') + '"' + (st.fin ? '' : ' disabled title="Este computador não tem senha do Financeiro"') + '>Senha do Financeiro</button></div>' +
          '<label>' + (recTipo === 'nuvem' ? 'Senha da conta da Nuvem (Firebase)' : 'Senha do Financeiro deste computador') + '<input id="a1" type="password" autocomplete="off"></label>' +
          '<p class="aerr" id="aerr"></p><button class="btn" data-a="recuperar">Confirmar</button><div class="alinks"><button data-a="voltar">Voltar</button><span></span></div>');
    }
    foco();
  }

  function agir(a) {
    var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
    if (a === 'esqueci') return tela('esqueci');
    if (a === 'voltar') return tela(st.temSenha ? 'entrar' : 'criar');
    if (a === 'cancelar') return api.acessoCancelar();
    if (a === 'entrar') {
      if (!v('a1')) return erro('Digite a senha.');
      return api.acessoEntrar(v('a1')).then(function (r) {
        if (r && r.ok) return api.ir('producao');
        erro(r && r.wait ? 'Muitas tentativas. Aguarde ' + r.wait + ' segundos.' : 'Senha incorreta.');
        var i = document.getElementById('a1'); if (i) { i.value = ''; i.focus(); }
      });
    }
    if (a === 'criar') {
      if (v('a1').length < 4) return erro('A senha precisa ter pelo menos 4 caracteres.');
      if (v('a1') !== v('a2')) return erro('As duas senhas não são iguais.');
      return api.acessoCriar(v('a1'), v('a0')).then(function (r) { if (r && r.ok) return api.ir('producao'); erro((r && r.error) || 'Não foi possível salvar.'); });
    }
    if (a === 'recuperar') {
      if (!v('a1')) return erro('Digite a senha.');
      var b = box.querySelector('[data-a="recuperar"]'); b.disabled = true; b.textContent = 'Conferindo…';
      return api.acessoRecuperar(recTipo, v('a1')).then(function (r) {
        if (r && r.ok) return tela('redefinir');
        b.disabled = false; b.textContent = 'Confirmar'; erro(recTipo === 'nuvem' ? 'Senha da Nuvem incorreta (ou sem internet).' : 'Senha do Financeiro incorreta.');
      });
    }
  }
  box.addEventListener('click', function (e) {
    var r = e.target.closest('[data-r]'); if (r && !r.disabled) { recTipo = r.dataset.r; return tela('esqueci'); }
    var b = e.target.closest('[data-a]'); if (b && !b.disabled) agir(b.dataset.a);
  });
  box.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    var ins = [].slice.call(box.querySelectorAll('input')), i = ins.indexOf(e.target);
    if (i < ins.length - 1) return ins[i + 1].focus();
    var b = box.querySelector('.btn[data-a]'); if (b) b.click();
  });
  window.__busy = function () { return !!box.querySelector('input:focus'); };

  function iniciar(s) {
    st = s || st;
    tela(st.trocando ? 'trocar' : st.podeRedefinir ? 'redefinir' : st.temSenha ? 'entrar' : 'criar');
  }
  // a senha chegou pela Nuvem enquanto a tela pedia para criar: passa a pedir a senha
  api.onAcesso(function (s) { var antes = st.temSenha; st = s; if (!antes && s.temSenha && modo === 'criar') tela('entrar'); });
  api.acessoStatus().then(iniciar);
})();
