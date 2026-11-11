"""Gera src/financeiro.html a partir do Dashboard de Convites (tools/dashboard-de-convites.html).

- extrai o documento do dashboard (sem o envelope do artifact)
- troca a biblioteca de PDF da internet pela cópia local (src/vendor)
- troca o cabeçalho pela barra do programa (Produção | Financeiro + Backup)
- injeta a ponte que salva os dados no arquivo do programa
Uso: python3 tools/build-financeiro.py
"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'tools' / 'dashboard-de-convites.html').read_text(encoding='utf-8')

i = src.find('<!DOCTYPE html>')
j = src.rfind('</html>', 0, src.rfind('</html>'))  # o último </html> é do envelope
assert i >= 0 and j > i, 'documento do dashboard não encontrado'
doc = src[i:j + len('</html>')]

def rep(a, b, count=1):
    global doc
    n = doc.count(a)
    assert n == count, (n, a[:70])
    doc = doc.replace(a, b)

rep('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'vendor/jspdf.umd.min.js')
rep('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js', 'vendor/jspdf.plugin.autotable.min.js')
# aba nova "Visão do mês" (fluxo.js), mostrada primeiro e aberta ao entrar
rep("const TABS=['Clientes/Turmas','Orçamentos','Visão geral','Financeiro','Pagamentos','Convites com parceiros'];",
    "const TABS=['Clientes/Turmas','Orçamentos','Visão geral','Turmas e parceiros','Pagamentos','Convites com parceiros','Visão do mês'];")
rep("document.getElementById('nav').innerHTML=TABS.map((n,i)=>`<button class=\"${i===S.tab&&lista==null?'on':''}\" data-tab=\"${i}\">${n}</button>`).join('');",
    "document.getElementById('nav').innerHTML=[6,3,1].map(i=>`<button class=\"${i===S.tab&&lista==null?'on':''}\" data-tab=\"${i}\">${TABS[i]}</button>`).join('');")
rep("[v0,v1,v2,v3,v4,v5][S.tab]()", "[v0,v1,v2,(window.v3x||v3),v4,v5,v6][S.tab]()")
rep("let S=load(),lista=null,modal=null,pendFocus=null;", "let S=load(),lista=null,modal=null,pendFocus=null;S.tab=6;")
doc = doc.replace(" if(a==='add'){const d=prompt('Descrição da despesa:');", " if(a==='add'&&window.__vmAdd){return window.__vmAdd('s')}\n if(a==='add'){const d=prompt('Descrição da despesa:');", 1)
rep("<div id=\"modal\"></div>\n<script>\n/* ===== PARTE 2", "<div id=\"modal\"></div>\n<script src=\"fluxo.js\"></script>\n<script>\n/* ===== PARTE 2")
# menu lateral
doc = doc.replace('<body>', '<body class="withside fin">\n<aside id="side" aria-label="Menu"></aside>\n<script src="shell.js"></script>\n<script>Shell.build("financeiro")</script>', 1)
# números com conta: "124,69+354,38" soma e "500-20" subtrai (como no Excel); o resto continua igual
rep(r"""const num=s=>{s=String(s==null?'':s).replace(/R\$|%|\s/g,'');if(!s)return NaN;
 if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
 else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
 const v=parseFloat(s);return isNaN(v)?NaN:v};""",
r"""const num1=s=>{if(!s)return NaN;
 if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
 else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
 const v=parseFloat(s);return isNaN(v)?NaN:v};
/* aceita conta com + e - : "124,69+354,38" = 479,07 ; "500-20+10" = 490 */
const num=s=>{s=String(s==null?'':s).replace(/R\$|%|\s/g,'').replace(/[−–]/g,'-').replace(/^=/,'').replace(/[+-]+$/,'');if(!s)return NaN;
 const p=s.match(/[+-]?[^+-]+/g);if(!p||p.join('')!==s)return NaN;
 let t=0;for(const x of p){const v=num1(x.replace(/^[+-]/,''));if(isNaN(v))return NaN;t+=x[0]==='-'?-v:v}
 return Math.round(t*100)/100};""")
# linha inteira em verde quando o formando está quitado e em azul quando pagou a mais (e atualiza ao digitar)
rep(r""" return `<tr><td>${I('nome',a.nome,'nm b')}</td>`""", r""" return `<tr class="${c.sit==='ok'?'quit':c.sit==='x'?'mais':''}"><td>${I('nome',a.nome,'nm b')}</td>`""")
rep(r"""  const se=document.querySelector('[data-ls="'+a.id+'"]');if(se)se.innerHTML=badge(c.sit);""",
    r"""  const se=document.querySelector('[data-ls="'+a.id+'"]');if(se){se.innerHTML=badge(c.sit);const tr=se.closest('tr');if(tr){tr.classList.toggle('quit',c.sit==='ok');tr.classList.toggle('mais',c.sit==='x')}}""")
# cabeçalho da lista de formandos sempre visível: a área da tabela cabe na tela abaixo do título da turma
# (desconta também o espaço que sobra embaixo da tabela, senão a página rola e o título cobre o cabeçalho)
rep(r""".lw{overflow:auto;max-height:calc(100vh - var(--hh,64px) - var(--lh,90px) - 16px)}""",
    r""".lw{overflow:auto;max-height:calc(100vh - var(--hh,64px) - var(--lh,90px) - 14px - var(--lb,40px))}""")
rep(r"""r.setProperty('--lh',(lh?lh.offsetHeight:0)+'px')}""",
    r"""r.setProperty('--lh',(lh?lh.offsetHeight:0)+'px');const lw=document.querySelector('.lw');if(lw){const b=document.documentElement.scrollHeight-(lw.getBoundingClientRect().bottom+scrollY);r.setProperty('--lb',Math.max(0,Math.ceil(b))+'px')}}""")
# o "Gerar relatório" antigo da fileira de botões passa a gerar o PDF da turma (um botão só)
rep(r"""<button class="btn ghost" data-rel="1">Gerar relatório</button>""", r"""<button class="btn ghost" data-relpdf="turma" title="PDF da turma para enviar à comissão">Gerar relatório</button>""")
# card "Situação" da lista de formandos: três números com cor (quitados, pendentes, a mais), na mesma altura dos outros cards
rep(r"""sitTxt=r=>""", r"""sitHtml=r=>`<span class="sitk"><span class="ok"><b>${r.ok}</b>${r.ok===1?'quitado':'quitados'}</span><span class="w"><b>${r.w}</b>${r.w===1?'pendente':'pendentes'}</span><span class="x" title="pagaram a mais"><b>${r.x}</b>a mais</span></span>`,sitTxt=r=>""")
rep(r"""lk('lk-sit','Situação',sitTxt(r))""", r"""lk('lk-sit','Situação',sitHtml(r))""")
rep(r"""set('lk-sit',sitTxt(r));""", r"""{const e=document.getElementById('lk-sit');if(e)e.innerHTML=sitHtml(r)}""")
# valores unitários da turma (luxo, simplificado, foto, entrada, vegetal, foto família): painel que retrai e expande
rep(r"""<div class="panel"><div class="prog" style="margin:0 0 14px">""", r"""<div class="panel lpanel${window.__lpFechado&&window.__lpFechado()?' lpf':''}"><div class="prog" style="margin:0 0 14px">""")
rep(r"""<div class="params"><label>Luxo unit""", r"""<button type="button" class="lptog" data-lptog><span class="lpar">▾</span><b>Valores unitários e entrada</b><small class="lpres">${window.__lpRes?window.__lpRes(T):''}</small></button><div class="lpbody"><div class="params"><label>Luxo unit""")
rep(r"""aparece como sugestão no campo "Entrada".</p></div>""", r"""aparece como sugestão no campo "Entrada".</p></div></div>""")
# Orçamentos: cabeçalho no mesmo padrão de "Turmas e parceiros" (título, nota e botão pequeno à direita)
rep(r"""return `<h2>Orçamentos</h2>${topo}""", r"""return `<div class="vmtop"><h2>Orçamentos</h2><span class="note">tabela de preços por tamanho e período</span><span class="sp" style="flex:1"></span><button class="btn sm" data-act="addm">+ novo modelo</button></div>${topo}""", 2)
rep(r"""<button class="btn" data-act="addm">+ novo modelo</button>""", r"""""")
rep('<title>Dashboard de Convites</title>', '<title>Financeiro · Cristiano Convites</title>')

m = re.search(r'<header><h1>Dashboard de Convites</h1>(<div style="display:flex.*?</div>)<nav id="nav"></nav></header>', doc, re.S)
assert m, 'cabeçalho não encontrado'
header = ('<header><div class="appbar">'
          '<span class="finicon" aria-hidden="true"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18M16 15h2"/><path d="M6 6V5a2 2 0 0 1 2-2h8"/></svg></span>'
          '<div class="fintit"><h1>Financeiro</h1><small>Fechamento do mês · protegido por senha</small></div>'
          '</div>'
          '<div hidden>' + m.group(1) + '</div><nav id="nav"></nav></header>')
doc = doc[:m.start()] + header + doc[m.end():]
rodape = ('<span class="sync appsave" id="appsave"><i></i><span>Salvo no computador</span></span>'
          '<div class="appmenuwrap"><button class="sbtn" id="appBk" aria-haspopup="true">Backup</button>'
          '<div class="appmenu sidemenu" id="appMenu" hidden>'
          '<button data-bk="export">Exportar backup (tudo)…</button>'
          '<button data-bk="import">Importar backup…</button>'
          '<button data-bk="pasta">Abrir pasta de backups automáticos</button>'
          '<button data-bk="update">Verificar atualizações (versão <span data-ver></span>)</button>'
          '<button data-bk="senha">Alterar senha do Financeiro</button></div></div>')

style = '''<style>
header{padding-top:12px}
.appbar{display:flex;align-items:center;gap:14px;margin-bottom:10px;flex-wrap:wrap}
.finicon{width:36px;height:36px;border-radius:10px;background:#13262a;color:var(--teal);display:inline-flex;align-items:center;justify-content:center}
.fintit h1{margin:0;font-size:18px}.fintit small{display:block;color:var(--mu);font-size:12px;margin-top:2px}
.modsw{display:flex;background:var(--pn);border:1px solid var(--bd);border-radius:10px;padding:3px;gap:2px}
.modsw button{background:none;border:0;color:var(--mu);padding:6px 14px;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:600}
.modsw button:hover{color:var(--tx)}
.modsw button.on{background:var(--teal);color:#06201d}
.appsp{flex:1}
.appsave{font-size:12px;color:var(--mu);display:flex;align-items:center;gap:6px}
.appsave i{width:8px;height:8px;border-radius:50%;background:var(--g);display:inline-block}
.appsave.busy i{background:var(--o)}.appsave.err i{background:var(--r)}
.appmenuwrap{position:relative}
.appmenu.sidemenu{position:fixed;left:16px;bottom:64px;top:auto;right:auto}
#side .appsave{width:100%;padding:0 4px}
.appmenu{position:absolute;right:0;top:calc(100% + 6px);background:var(--pn);border:1px solid var(--bd);border-radius:10px;padding:6px;min-width:290px;z-index:60;box-shadow:0 12px 30px rgba(0,0,0,.45)}
.appmenu button{display:block;width:100%;text-align:left;background:none;border:0;color:var(--tx);padding:9px 10px;border-radius:7px;cursor:pointer;font:inherit;font-size:13px}
.appmenu button:hover{background:var(--pn2)}
</style>'''

bridge = '''<script>var RODAPE=''' + repr(rodape) + ''';
/* Ponte com o programa: os dados ficam no arquivo do computador, protegidos pela senha do Financeiro. */
(function(){
 var KEY='dashboard_convites_v2',SYNC_KEYS=['dashboard_convites_v2_base','dashboard_convites_v2_sync'];
 var orig=Storage.prototype.setItem,origRm=Storage.prototype.removeItem,t=null,pend=null,blocked=false,empty=false;
 function wipe(){try{origRm.call(localStorage,KEY);SYNC_KEYS.forEach(function(k){origRm.call(localStorage,k)})}catch(e){}}
 var s=null;try{s=window.api.finLoadSync()}catch(e){}
 if(s==='LOCKED'){blocked=true;wipe();document.documentElement.style.visibility='hidden';window.api.ir('producao');}
 else if(s){try{orig.call(localStorage,KEY,s)}catch(e){}}
 else{wipe();empty=true}
 function mark(c,txt){var e=document.getElementById('appsave');if(e){e.className='appsave '+c;e.lastChild.textContent=txt}}
 function flush(){if(blocked||pend==null)return Promise.resolve();var p=pend;pend=null;mark('busy','Salvando…');
  return window.api.finSave(p).then(function(r){mark(r&&r.ok?'':'err',r&&r.ok?'Salvo no computador':'Erro ao salvar')})}
 Storage.prototype.setItem=function(k,v){orig.call(this,k,v);
  if(!blocked&&this===window.localStorage&&k===KEY){empty=false;pend=v;mark('busy','Salvando…');clearTimeout(t);t=setTimeout(flush,300)}};
 function leave(page){return flush().then(function(){wipe();return window.api.ir(page)})}
 window.__beforeUpdate=function(){return flush().then(wipe)};
 window.__shellNav=function(m){if(m==='financeiro')return;try{orig.call(localStorage,'pref_module',JSON.stringify(m))}catch(e){}leave('producao')};
 /* o Electron não tem a caixinha prompt(): o programa mostra a dele */
 window.prompt=function(msg,def){try{return window.api.perguntar(String(msg==null?'':msg),def==null?'':String(def))}catch(e){return null}};
 window.__busy=function(){return !!document.querySelector('.ov')};
 /* conta digitada no Valor por formando, Entrada ou Valor pago: cada valor somado (ou tirado) vira uma linha no
    comentário da célula com a data do dia, como "11/11 - 393,75" (o primeiro número é o que já estava no campo) */
 function anotaSoma(el){try{
  var la=(el.dataset&&el.dataset.la||'').split('|'),f=la[1];if(['vf','ent','pago'].indexOf(f)<0||typeof turmaLista!=='function')return;
  var T=turmaLista(),a=T&&T.alunos.find(function(x){return x.id===+la[0]});if(!a)return;
  var s=String(el.value).replace(/R\\$|%|\\s/g,'').replace(/[−–]/g,'-').replace(/^=/,'').replace(/[+-]+$/,'');
  var p=s.match(/[+-]?[^+-]+/g);if(!p||p.length<2)return;
  var d=new Date(),dt=String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
  var fm=function(x){return x.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})};
  var nov=p.slice(1).map(function(x){var v=num1(x.replace(/^[+-]/,''));if(isNaN(v)||!v)return '';return dt+' - '+(x[0]==='-'?'retirado '+fm(v):fm(v))}).filter(Boolean);
  if(!nov.length)return;
  a.cm=a.cm||{};a.cm[f]=((a.cm[f]?a.cm[f]+'\\n':'')+nov.join('\\n')).trim();save();
  var td=el.closest('td');if(td){td.classList.add('hascm');var tip=td.querySelector('.cmtip');if(!tip){tip=document.createElement('div');tip.className='cmtip';td.appendChild(tip)}tip.textContent=a.cm[f];
   var b=td.querySelector('.cmb');if(b)b.title='Editar comentário'}
 }catch(er){}}
 /* ao sair de um campo com conta (124,69+354,38), mostra o resultado (479,07) */
 document.addEventListener('focusout',function(e){var el=e.target;if(!el||el.tagName!=='INPUT'||!/\\d\\s*[+\\-−–]\\s*\\d/.test(el.value)||typeof num!=='function')return;
  var v=num(el.value);if(isNaN(v))return;anotaSoma(el);var dec=Math.round(v*100)%100!==0;el.value=v.toLocaleString('pt-BR',{minimumFractionDigits:dec?2:0,maximumFractionDigits:2})},true);
 /* dados do Financeiro que chegaram de outro aparelho pela nuvem: recarrega se não houver edição aberta */
 var remoto=false;
 function aplicaRemoto(){if(pend!=null||document.querySelector('.ov')){remoto=true;mark('busy','Atualização de outro aparelho: aplica ao fechar a janela');return}remoto=false;wipe();window.api.ir('financeiro')}
 if(window.api.onDadosRemotos)window.api.onDadosRemotos(function(p){if(p.indexOf('fin')>=0)aplicaRemoto()});
 setInterval(function(){if(remoto&&pend==null&&!document.querySelector('.ov'))aplicaRemoto()},2000);
 window.__toastNuvem=function(m){mark('',m)};
 window.addEventListener('beforeunload',function(){if(!blocked&&pend!=null){window.api.finSaveSync(pend);pend=null}wipe()});
 /* tranca sozinho depois de 15 minutos sem uso */
 var last=Date.now();['mousemove','mousedown','keydown','wheel'].forEach(function(ev){window.addEventListener(ev,function(){last=Date.now()},{passive:true})});
 setInterval(function(){if(Date.now()-last>15*60*1000)leave('producao')},30000);
 /* downloads: PDF, relatório e backup abrem a janela "Salvar como" do Windows */
 var dl={save:function(o){var d=o.data;
  var p=(d instanceof Blob)?d.arrayBuffer().then(function(b){return new Uint8Array(b)}):Promise.resolve(d);
  return p.then(function(x){return window.api.saveFile(o.filename,x)}).then(function(r){if(!r.ok){var e=new Error('declined');e.code='declined';throw e}})}};
 window.claude={use:function(n){return Promise.resolve(n==='downloads'?dl:null)}};
 function dialog(html){var o=document.createElement('div');o.className='ov';o.innerHTML='<div class="dlg" style="max-width:440px">'+html+'</div>';document.body.appendChild(o);return o}
 function changePw(){
  var o=dialog('<h2>Alterar senha do Financeiro</h2><div class="sub">A nova senha passa a valer na próxima vez que você entrar.</div>'+
   '<div style="display:grid;gap:12px"><label>Senha atual<input id="cp0" type="password" autocomplete="off"></label><label>Nova senha<input id="cp1" type="password" autocomplete="off"></label><label>Repita a nova senha<input id="cp2" type="password" autocomplete="off"></label></div>'+
   '<p id="cperr" style="color:var(--r);min-height:18px;margin:10px 0 0"></p><div class="acts"><button class="btn ghost" data-cp="x">Cancelar</button><button class="btn" data-cp="ok">Salvar nova senha</button></div>');
  var g=function(id){return o.querySelector('#'+id)};g('cp0').focus();
  function go(){var a=g('cp1').value;if(a.length<4){g('cperr').textContent='A senha precisa ter pelo menos 4 caracteres.';return}
   if(a!==g('cp2').value){g('cperr').textContent='As duas senhas novas não são iguais.';return}
   window.api.senhaDefinir(a,g('cp0').value).then(function(r){if(!r.ok){g('cperr').textContent=r.error||'Não foi possível alterar.';return}o.remove();mark('','Senha alterada')})}
  o.addEventListener('click',function(e){var c=e.target.getAttribute('data-cp');if(c==='x'||e.target===o)o.remove();if(c==='ok')go()});
  o.addEventListener('keydown',function(e){if(e.key==='Enter')go();if(e.key==='Escape')o.remove()})}
 function doImport(){flush().then(function(){return window.api.importar()}).then(function(r){if(!r.ok){if(r.error)alert(r.error);return}
  var msg=r.kind==='fin'?'Este é um backup do Dashboard de Convites ('+r.turmas+' turmas).\\n\\nImportar SUBSTITUI todos os dados do Financeiro. A Produção não muda.'
   :'Backup completo com '+r.cards+' cartões de produção'+(r.hasFin?' e o Financeiro':'')+'.\\n\\nImportar SUBSTITUI os dados atuais'+(r.hasFin?' da Produção e do Financeiro':' da Produção')+'.';
  if(!confirm(msg+'\\n\\nO estado atual continua no backup automático de hoje. Continuar?'))return;
  window.api.aplicarImport().then(function(x){if(x.ok){wipe();window.api.ir('financeiro')}})})}
 document.addEventListener('DOMContentLoaded',function(){
  var sf=document.getElementById('sfootBtns');if(sf&&!document.getElementById('appsave')){sf.innerHTML=RODAPE;try{document.getElementById('appBk').innerHTML=ShellIcon('gear',15)+' Backup'}catch(e){}}
  if(blocked)return;var vazio=false;try{vazio=!S.turmas.length&&!S.parc.length}catch(e){vazio=empty}
  if(!vazio)return;
  var b=document.createElement('div');b.id='finEmpty';
  b.style.cssText='margin:16px 24px 0;padding:14px 16px;border:1px solid var(--teal);border-radius:12px;background:var(--pn);display:flex;gap:14px;align-items:center;flex-wrap:wrap';
  b.innerHTML='<div style="flex:1;min-width:240px"><b>O Financeiro ainda não tem dados.</b><div class="note" style="margin-top:4px">Importe o backup do Dashboard de Convites (arquivo .json) para trazer turmas, formandos, pagamentos, orçamentos e parceiros.</div></div><button class="btn" data-bk="import" style="margin:0">Importar backup</button>';
  var h=document.querySelector('header');if(h&&h.parentNode)h.parentNode.insertBefore(b,h.nextSibling)});
 document.addEventListener('click',function(e){
  var el=e.target,menu=document.getElementById('appMenu');
  var go=el.closest&&el.closest('[data-goto]');if(go){leave(go.dataset.goto);return}
  if(el.id==='appBk'){menu.hidden=!menu.hidden;return}
  if(menu&&!menu.hidden&&!(el.closest&&el.closest('.appmenuwrap')))menu.hidden=true;
  var bk=el.dataset&&el.dataset.bk;if(!bk)return;if(menu)menu.hidden=true;
  if(bk==='senha')return changePw();
  if(bk==='import')return doImport();
  flush().then(function(){
   if(bk==='pasta')return window.api.abrirBackups();
   if(bk==='update')return window.__checkUpdates&&window.__checkUpdates();
   if(bk==='export')return window.api.exportar().then(function(r){if(r.ok)alert('Backup salvo em:\\n'+r.path);else if(r.error)alert(r.error)});
  })});
})();
</script>'''
k = doc.rfind('</body>'); doc = doc[:k] + '<script src="update.js"></script>\n<script src="nuvem-ui.js"></script>\n' + doc[k:]
k = doc.find('</head>'); doc = doc[:k] + '<link rel="stylesheet" href="shell.css">\n' + style + '\n' + bridge + '\n' + doc[k:]
k = doc.find('</head>'); doc = doc[:k] + '<link rel="stylesheet" href="tema.css">\n' + doc[k:]   # tema único: por último
# Sem dados de clientes no código (o repositório é público): as planilhas embutidas viram listas vazias.
# Os dados reais ficam só no arquivo do computador (dados.json) e nos backups.
for name in ['D_ADM','D_SIS','D_AGR','D_DIR','D_ENF','D_FAI','T0']:
    doc, n = re.subn(r'const %s=\[\n.*?\n\];' % name, 'const %s=[];' % name, doc, count=1, flags=re.S)
    assert n == 1, name
doc, n = re.subn(r'const P0=\[\n.*?\n\]\.map', 'const P0=[].map', doc, count=1, flags=re.S)
assert n == 1, 'P0'
assert not re.search(r'\d{3}\.\d{3}\.\d{3}-\d{2}', doc), 'ainda há CPF no código'
(root / 'src' / 'financeiro.html').write_text(doc, encoding='utf-8')
print('ok', len(doc))
