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
rep('<title>Dashboard de Convites</title>', '<title>Financeiro · Cristiano Convites</title>')

m = re.search(r'<header><h1>Dashboard de Convites</h1>(<div style="display:flex.*?</div>)<nav id="nav"></nav></header>', doc, re.S)
assert m, 'cabeçalho não encontrado'
header = ('<header><div class="appbar">'
          '<b class="appbrand">Cristiano Convites</b>'
          '<div class="modsw" role="tablist" aria-label="Área"><button data-goto="producao">Produção</button><button class="on" aria-selected="true">Financeiro</button></div>'
          '<span class="appsp"></span><span class="appsave" id="appsave"><i></i><span>Salvo no computador</span></span>'
          '<div class="appmenuwrap"><button class="btn sm ghost" id="appBk" style="margin:0">Backup ▾</button>'
          '<div class="appmenu" id="appMenu" hidden>'
          '<button data-bk="export">Exportar backup (produção + financeiro)…</button>'
          '<button data-bk="import">Importar backup…</button>'
          '<button data-bk="pasta">Abrir pasta de backups automáticos</button>'
          '<button data-bk="update">Verificar atualizações (versão <span data-ver></span>)</button></div></div></div>'
          '<div hidden>' + m.group(1) + '</div><nav id="nav"></nav></header>')
doc = doc[:m.start()] + header + doc[m.end():]

style = '''<style>
header{padding-top:12px}
.appbar{display:flex;align-items:center;gap:14px;margin-bottom:10px;flex-wrap:wrap}
.appbrand{color:var(--teal);font-size:16px}
.modsw{display:flex;background:var(--pn);border:1px solid var(--bd);border-radius:10px;padding:3px;gap:2px}
.modsw button{background:none;border:0;color:var(--mu);padding:6px 14px;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:600}
.modsw button:hover{color:var(--tx)}
.modsw button.on{background:var(--teal);color:#06201d}
.appsp{flex:1}
.appsave{font-size:12px;color:var(--mu);display:flex;align-items:center;gap:6px}
.appsave i{width:8px;height:8px;border-radius:50%;background:var(--g);display:inline-block}
.appsave.busy i{background:var(--o)}.appsave.err i{background:var(--r)}
.appmenuwrap{position:relative}
.appmenu{position:absolute;right:0;top:calc(100% + 6px);background:var(--pn);border:1px solid var(--bd);border-radius:10px;padding:6px;min-width:290px;z-index:60;box-shadow:0 12px 30px rgba(0,0,0,.45)}
.appmenu button{display:block;width:100%;text-align:left;background:none;border:0;color:var(--tx);padding:9px 10px;border-radius:7px;cursor:pointer;font:inherit;font-size:13px}
.appmenu button:hover{background:var(--pn2)}
</style>'''

bridge = '''<script>
/* Ponte com o programa: os dados ficam no arquivo do computador, não só no navegador. */
(function(){
 var KEY='dashboard_convites_v2';
 try{var s=window.api.finLoadSync();if(s)localStorage.setItem(KEY,s);}catch(e){}
 var orig=Storage.prototype.setItem,t=null,pend=null;
 function mark(c,txt){var e=document.getElementById('appsave');if(e){e.className='appsave '+c;e.lastChild.textContent=txt}}
 function flush(){if(pend==null)return Promise.resolve();var p=pend;pend=null;mark('busy','Salvando…');
  return window.api.finSave(p).then(function(r){mark(r&&r.ok?'':'err',r&&r.ok?'Salvo no computador':'Erro ao salvar')})}
 Storage.prototype.setItem=function(k,v){orig.call(this,k,v);
  if(this===window.localStorage&&k===KEY){pend=v;mark('busy','Salvando…');clearTimeout(t);t=setTimeout(flush,300)}};
 window.__beforeUpdate=flush;
 window.addEventListener('beforeunload',function(){if(pend!=null){window.api.finSaveSync(pend);pend=null}});
 /* downloads: PDF, relatório e backup abrem a janela "Salvar como" do Windows */
 var dl={save:function(o){var d=o.data;
  var p=(d instanceof Blob)?d.arrayBuffer().then(function(b){return new Uint8Array(b)}):Promise.resolve(d);
  return p.then(function(x){return window.api.saveFile(o.filename,x)}).then(function(r){if(!r.ok){var e=new Error('declined');e.code='declined';throw e}})}};
 window.claude={use:function(n){return Promise.resolve(n==='downloads'?dl:null)}};
 document.addEventListener('click',function(e){
  var t=e.target,menu=document.getElementById('appMenu');
  if(t.closest&&t.closest('[data-goto]')){var g=t.closest('[data-goto]').dataset.goto;flush().then(function(){window.api.ir(g)});return}
  if(t.id==='appBk'){menu.hidden=!menu.hidden;return}
  if(menu&&!menu.hidden&&!(t.closest&&t.closest('.appmenuwrap')))menu.hidden=true;
  var bk=t.dataset&&t.dataset.bk;if(!bk)return;menu.hidden=true;
  flush().then(function(){
   if(bk==='pasta')return window.api.abrirBackups();
   if(bk==='update')return window.__checkUpdates&&window.__checkUpdates();
   if(bk==='export')return window.api.exportar().then(function(r){if(r.ok)alert('Backup salvo em:\\n'+r.path);else if(r.error)alert(r.error)});
   if(bk==='import')return window.api.importar().then(function(r){if(!r.ok){if(r.error)alert(r.error);return}
    var msg=r.kind==='fin'?'Este é um backup do Dashboard de Convites ('+r.turmas+' turmas).\\n\\nImportar SUBSTITUI todos os dados do Financeiro. A Produção não muda.'
     :'Backup completo com '+r.cards+' cartões de produção'+(r.hasFin?' e o Financeiro':'')+'.\\n\\nImportar SUBSTITUI os dados atuais'+(r.hasFin?' da Produção e do Financeiro':' da Produção')+'.';
    if(!confirm(msg+'\\n\\nO estado atual continua no backup automático de hoje. Continuar?'))return;
    window.api.aplicarImport().then(function(x){if(x.ok){try{localStorage.removeItem(KEY)}catch(e){}location.reload()}})});
  })});
})();
</script>'''
k = doc.rfind('</body>'); doc = doc[:k] + '<script src="update.js"></script>\n' + doc[k:]
k = doc.find('</head>'); doc = doc[:k] + style + '\n' + bridge + '\n' + doc[k:]
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
