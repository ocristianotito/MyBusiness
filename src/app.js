'use strict';
/* ===== constantes ===== */
const PAL={teal:'#2DB5AE',azul:'#60A5FA',roxo:'#A78BFA',laranja:'#F0A53F',verde:'#34D399',vermelho:'#F87171',cinza:'#8B9BAE'};
const PALN={teal:'Teal',azul:'Azul',roxo:'Roxo',laranja:'Laranja',verde:'Verde',vermelho:'Vermelho',cinza:'Cinza'};
const DEF_CFG={brand:'Cristiano Convites',
 cols:[{id:'pedido',name:'Pedido / briefing',c:'cinza'},{id:'arte',name:'Arte e layout',c:'roxo'},{id:'aprov',name:'Aprovação do cliente',c:'laranja'},{id:'grafica',name:'Gráfica',c:'azul'},{id:'acab',name:'Acabamento',c:'teal'},{id:'mont',name:'Montagem e conferência',c:'teal'},{id:'entregue',name:'Entregue',c:'verde'}],
 check:['Edição de foto','Criação Brasão','Criação Convite','Correção','Aprovação','Assinatura boneca','Impressão','Entrega']};
const CHECK_ANTIGO=['Layout aprovado pelo cliente','Arquivo enviado à gráfica','Impressão conferida','Hotstamp','Corte / faca','Lacre','Montagem','Conferência de nomes','Embalagem'];
const CHECK_EQUIV={'Layout aprovado pelo cliente':'Aprovação','Impressão conferida':'Impressão'};
const MODELOS=['23x17,5 cm','25x18 cm','20x22 cm','24x22 cm','27x25 cm','Simples 15x22 cm','Caixa','Miolo 16 páginas'];
const PRIO={alta:'Alta',media:'Média',baixa:'Baixa'};
const PRIO_RANK={alta:0,media:1,baixa:2,'':3};
const LCOL=['#E2B203','#FEA362','#F87168','#9F8FEF','#579DFF','#6CC3E0','#4BCE97','#94C748','#E774BB','#8C9BAB'];
/* cor da etapa: desde a 1.2.12 usa a mesma paleta das etiquetas (cor em #hex); os nomes antigos (roxo, azul…) continuam valendo */
const corEtapa=c=>PAL[c]||(/^#[0-9a-f]{6}$/i.test(String(c||''))?c:PAL.cinza);
const PAL_LCOL={cinza:'#8C9BAB',azul:'#579DFF',roxo:'#9F8FEF',verde:'#4BCE97',vermelho:'#F87168',laranja:'#FEA362',teal:'#6CC3E0'};
const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MESL=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

/* ===== estado ===== */
let cfg=null,cards=new Map(),events=new Map(),clients=new Map(),contracts=new Map(),modal=null,dragId=null,view='quadro',curModule='dashboard';
const F={q:'',r:'',p:'',e:'',late:false,hide:false,st:'',cli:''};
const sortL={k:'prazo',dir:1};
const pref=(k,d)=>{try{const v=localStorage.getItem('pref_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const setPref=(k,v)=>{try{localStorage.setItem('pref_'+k,JSON.stringify(v))}catch(e){}};
try{localStorage.removeItem('pref_folded')}catch(e){}   /* colunas recolhidas saíram na 1.2.4 */
let ovRange=pref('ovRange',7),ovSemData=false;

/* ===== utilidades ===== */
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* número digitado, aceitando conta com + e - (ex.: "124,69+354,38" = 479,07; "300-16" = 284) */
function conta(s){s=String(s==null?'':s).replace(/R\$|%|\s/g,'').replace(/[−–]/g,'-').replace(/^=/,'').replace(/[+-]+$/,'');if(!s)return NaN;
 const p=s.match(/[+-]?[^+-]+/g);if(!p||p.join('')!==s)return NaN;let t=0;
 for(const x of p){let y=x.replace(/^[+-]/,'');if(y.includes(','))y=y.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(y))y=y.replace(/\./g,'');
  const v=parseFloat(y);if(isNaN(v))return NaN;t+=x[0]==='-'?-v:v}
 return Math.round(t*100)/100}
const n0=v=>{const x=typeof v==='number'?v:conta(v);return isNaN(x)||x<0?0:Math.round(x)};
document.addEventListener('focusout',e=>{const el=e.target;if(!el||el.tagName!=='INPUT'||!/\d\s*[+\-−–]\s*\d/.test(el.value))return;
 const v=conta(el.value);if(isNaN(v))return;el.value=v.toLocaleString('pt-BR',{minimumFractionDigits:Math.round(v*100)%100?2:0,maximumFractionDigits:2});
 el.dispatchEvent(new Event('input',{bubbles:true}))},true);
const fmtN=n=>(+n||0).toLocaleString('pt-BR');
const C=()=>cfg||DEF_CFG;
const lastCol=()=>{const c=C().cols;return c.length?c[c.length-1].id:null};
const colOf=card=>C().cols.some(c=>c.id===card.col)?card.col:(C().cols[0]||{}).id;
const colIdx=card=>C().cols.findIndex(c=>c.id===colOf(card));
const colById=id=>C().cols.find(c=>c.id===id)||{name:'—',c:'cinza'};
const isDone=card=>colOf(card)===lastCol();
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const parseD=s=>{if(!s||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const isoD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function dueInfo(card){const d=parseD(card.prazo);if(!d)return null;
 const days=Math.round((d-today())/864e5),lbl=d.getDate()+' '+MES[d.getMonth()]+(d.getFullYear()!==today().getFullYear()?' '+d.getFullYear():'');
 if(isDone(card))return{cls:'ok',txt:lbl,days};
 if(days<0)return{cls:'late',txt:lbl+' · '+(-days)+'d atrasado',days};
 if(days===0)return{cls:'soon',txt:'Hoje',days};
 if(days<=3)return{cls:'soon',txt:lbl+' · '+days+'d',days};
 return{cls:'ok',txt:lbl,days}}
const initials=s=>String(s||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');
const chk=card=>{const l=Array.isArray(card.check)?card.check:[];return{n:l.length,d:l.filter(x=>x&&x.d).length}};
/* data da colação do pedido (campo próprio; se estiver vazio, usa a do cliente ligado ao pedido) */
const colacaoDe=c=>c.colacao||((c.clientId&&clients.get(c.clientId)||{}).colacao)||'';
const fmtColacao=iso=>{const p=String(iso||'').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0].slice(2):''};
const lbls=c=>Array.isArray(c.labels)?c.labels.filter(x=>x&&x.n):[];
const lchip=(l,x)=>`<span class="chip lb" style="background:${esc(l.c||'#8C9BAB')}26;color:${esc(l.c||'#8C9BAB')}">${esc(l.n)}${x!=null?`<button data-lx="${x}" title="Remover etiqueta">✕</button>`:''}</span>`;
function allLabels(){const m=new Map();cards.forEach(c=>lbls(c).forEach(l=>{if(!m.has(l.n))m.set(l.n,l.c)}));return m}
const newId=()=>'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function toast(msg){const t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>{t.hidden=true},2600)}
function setSync(cls,txt){const e=$('sync');if(!e)return;e.className='sync '+cls;e.querySelector('span').textContent=txt}
const cliName=id=>{const c=id&&clients.get(id);return c?c.nome:''};

/* ===== armazenamento (arquivo no computador, via processo principal) ===== */
let saveTimer=null,saving=false,dirty=false;
function snapshot(){return{v:1,cfg,cards:Object.fromEntries(cards),events:Object.fromEntries(events),clients:Object.fromEntries(clients),contracts:Object.fromEntries(contracts)}}
async function flushNow(){clearTimeout(saveTimer);while(saving)await new Promise(r=>setTimeout(r,50));await flush()}
window.__beforeUpdate=()=>flushNow();
/* dados que chegaram de outro aparelho pela nuvem */
let remotoPendente=false;
async function recarregarDados(){
 const d=await window.api.load();
 cfg=d.cfg||null;cards=new Map(Object.entries(d.cards||{}));events=new Map(Object.entries(d.events||{}));
 clients=new Map(Object.entries(d.clients||{}));contracts=new Map(Object.entries(d.contracts||{}));render()}
if(window.api.onDadosRemotos)window.api.onDadosRemotos(async partes=>{
 if(!partes.some(p=>['cfg','cards','events','clients','contracts'].includes(p)))return;
 if(window.__busy()){remotoPendente=true;toast('Chegaram atualizações de outro aparelho: elas aparecem quando você fechar esta janela.');return}
 await flushNow();await recarregarDados();toast('Atualizado com outro aparelho')});
window.__toastNuvem=m=>toast(m);
window.__busy=()=>!!(modal&&['card','ev','cfg','pw','import','cli','ct','emp'].includes(modal.t));
function persist(){dirty=true;setSync('warn','Salvando…');clearTimeout(saveTimer);saveTimer=setTimeout(flush,250)}
async function flush(){
 if(saving){saveTimer=setTimeout(flush,200);return}
 if(!dirty)return;saving=true;dirty=false;
 const r=await window.api.save(snapshot()).catch(e=>({ok:false,error:String(e)}));
 saving=false;
 if(r&&r.ok)setSync('on','Salvo no computador');
 else{setSync('err','Erro ao salvar');$('banner').innerHTML=`<div class="banner r">Não foi possível salvar: ${esc(r&&r.error)}. Suas últimas mudanças continuam na tela; tente de novo ou exporte um backup.</div>`}
}
function saveCard(id,data){cards.set(id,data);persist();render()}
function delCard(id){cards.delete(id);persist();render()}
function saveCfg(next){cfg=next;persist();render()}

/* ===== módulos (menu lateral) ===== */
const MOD_INFO={dashboard:1,demandas:1,contratos:1,clientes:1};
function goModule(m){
 if(m==='financeiro')return openFin();
 if(!MOD_INFO[m])m='dashboard';
 curModule=m;setPref('module',m);
 document.querySelectorAll('.module').forEach(s=>{s.hidden=s.id!=='mod-'+m});
 if(window.Shell)Shell.setActive(m);
 render()}
window.__shellNav=goModule;
function sideFooter(){
 const f=$('sfootBtns');if(!f)return;
 f.innerHTML='<span class="sync" id="sync"><i></i><span>Carregando…</span></span><button class="sbtn" id="bMenu" aria-haspopup="true" aria-expanded="false" title="Backup e atualizações">'+ShellIcon('gear',15)+' Backup</button>'}

async function init(){
 Shell.build('dashboard');sideFooter();
 document.querySelectorAll('[data-icon]').forEach(e=>{e.innerHTML=ShellIcon(e.dataset.icon,19)});
 window.api.trancar();
 try{localStorage.removeItem('dashboard_convites_v2')}catch(e){}
 try{
  const d=await window.api.load();
  cfg=d.cfg||null;cards=new Map(Object.entries(d.cards||{}));events=new Map(Object.entries(d.events||{}));
  clients=new Map(Object.entries(d.clients||{}));contracts=new Map(Object.entries(d.contracts||{}));
  /* pedido do dono (1.2.7): tirar do quadro as etapas Contratos assinados (agora na aba Contratos), Edição de fotos,
     Criação convites, Aprovação e Impressão.
     Só sai a etapa que estiver vazia, para nenhum pedido ficar sem etapa. Roda uma vez. */
  if(cfg&&Array.isArray(cfg.cols)&&!cfg.semEtapasVazias127){
   const tirar=['CONTRATOS ASSINADOS','EDIÇÃO DE FOTOS','CRIAÇÃO CONVITES','APROVAÇÃO','IMPRESSÃO'],usada=id=>[...cards.values()].some(c=>c.col===id);
   cfg=Object.assign({},cfg,{cols:cfg.cols.filter(c=>!(tirar.includes(String(c.name||'').trim().toUpperCase())&&!usada(c.id))),semEtapasVazias127:1});
   persist()}
  /* pedido do dono (1.2.12): etapas com as cores das etiquetas. Etapa com nome de mês ganha a cor da etiqueta
     daquele mês (JANEIRO 2027 → cor da etiqueta JANEIRO); as outras vão para a cor equivalente da paleta. Roda uma vez. */
  if(cfg&&Array.isArray(cfg.cols)&&!cfg.coresEtapas1212){
   const et=allLabels(),norm=x=>String(x||'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
   const porNome=new Map([...et].map(([n,c])=>[norm(n),c]));
   cfg=Object.assign({},cfg,{coresEtapas1212:1,cols:cfg.cols.map(col=>{
    const w=norm(col.name).split(/\s+/)[0],c=porNome.get(norm(col.name))||porNome.get(w);
    return Object.assign({},col,{c:c&&/^#[0-9a-f]{6}$/i.test(c)?c:(PAL_LCOL[col.c]||col.c)})})});
   persist()}
  /* pedido do dono (1.2.7): checklist de produção novo, no padrão e nos pedidos que usam o antigo. Roda uma vez. */
  if(!(cfg&&cfg.checklist127)){
   const novo=DEF_CFG.check;
   cfg=Object.assign({},C(),{check:novo.slice(),checklist127:1});
   cards.forEach((c,id)=>{
    const l=Array.isArray(c.check)?c.check:[];
    if(!l.some(x=>x&&CHECK_ANTIGO.includes(x.t)))return;   /* pedido sem o checklist antigo: não mexe */
    const feitos=new Set(l.filter(x=>x&&x.d&&CHECK_EQUIV[x.t]).map(x=>CHECK_EQUIV[x.t]));
    const proprios=l.filter(x=>x&&!CHECK_ANTIGO.includes(x.t)&&!novo.includes(x.t));
    const mesmos=new Map(l.filter(x=>x&&novo.includes(x.t)).map(x=>[x.t,!!x.d]));
    cards.set(id,Object.assign({},c,{check:novo.map(t=>({t,d:feitos.has(t)||!!mesmos.get(t)})).concat(proprios)}));
   });
   persist()}
  setSync('on','Salvo no computador');
 }catch(e){setSync('err','Erro ao abrir os dados');$('banner').innerHTML=`<div class="banner r">Não foi possível abrir o arquivo de dados: ${esc(e.message||e)}</div>`}
 F.hide=pref('hide',false);$('fh').checked=F.hide;
 view=pref('view','overview');setView(view,true);
 /* espera os outros módulos (dashboard.js, clientes.js…) terminarem de carregar */
 if(document.readyState==='loading')await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
 goModule(pref('module','dashboard'));
}

/* ===== filtros ===== */
function visible(card){
 if(F.hide&&isDone(card))return false;
 if(F.st&&colOf(card)!==F.st)return false;
 if(F.cli&&(card.clientId||'')!==F.cli)return false;
 if(F.r&&(card.resp||'')!==F.r)return false;
 if(F.p&&card.prio!==F.p)return false;
 if(F.e&&!lbls(card).some(l=>l.n===F.e))return false;
 if(F.late){const d=dueInfo(card);if(!d||d.cls!=='late')return false}
 if(F.q){const h=[card.title,card.sub,card.modelo,card.resp,card.notas,cliName(card.clientId),lbls(card).map(l=>l.n).join(' ')].join(' ').toLowerCase();if(!h.includes(F.q.toLowerCase()))return false}
 return true}
const filtering=()=>!!(F.q||F.r||F.p||F.e||F.late||F.hide||F.st||F.cli);
function sorted(list){return list.slice().sort((a,b)=>(a[1].ord||0)-(b[1].ord||0)||((a[1].criado||0)-(b[1].criado||0)))}

/* ===== cabeçalho, KPIs, filtros ===== */
function renderTop(){
 const cf=C(),all=[...cards.values()];
 const resps=[...new Set(all.map(c=>(c.resp||'').trim()).filter(Boolean))].sort();
 if(F.r&&!resps.includes(F.r))F.r='';
 $('fr').innerHTML='<option value="">Responsável</option>'+resps.map(r=>`<option${r===F.r?' selected':''}>${esc(r)}</option>`).join('');
 const ls=[...allLabels().keys()].sort();
 if(F.e&&!ls.includes(F.e))F.e='';
 $('fe').innerHTML='<option value="">Etiqueta</option>'+ls.map(l=>`<option${l===F.e?' selected':''}>${esc(l)}</option>`).join('');
 const shown=all.filter(visible).length;
 $('fcount').textContent=filtering()?shown+' de '+all.length+' cartões':all.length+' cartões';
 renderSub();
 if(!document.querySelector('#banner .r'))$('banner').innerHTML=all.length?'':'<div class="banner">Nenhum cartão ainda. Clique em "+ Novo pedido" para criar o primeiro, ou traga seus dados em Backup → Importar backup.</div>';
}

/* ===== quadro ===== */
function cardHTML(id,c){
 const d=dueInfo(c),k=chk(c),pct=k.n?k.d/k.n:0,done=isDone(c);
 const qty=[c.luxo?`<span><b>${fmtN(c.luxo)}</b> luxo</span>`:'',c.simp?`<span><b>${fmtN(c.simp)}</b> simplif.</span>`:'',c.foto?`<span><b>${fmtN(c.foto)}</b> fotos</span>`:''].join('');
 const prev=(c.notas||'').trim().split('\n').filter(s=>s.trim()).slice(0,2).join('\n');
 return `<div class="cardk${d&&d.cls==='late'?' late':''}${done?' done':''}" draggable="true" tabindex="0" data-id="${esc(id)}">
 <div class="chips">${c.prio?`<span class="chip ${c.prio}">${PRIO[c.prio]||''}</span>`:''}${c.modelo?`<span class="chip mod">${esc(c.modelo)}</span>`:''}${lbls(c).map(l=>lchip(l)).join('')}</div>
 <h5>${esc(c.title||'Sem título')}</h5>${c.sub?`<div class="s">${esc(c.sub)}</div>`:''}
 ${prev?`<div class="pv">${esc(prev)}</div>`:''}
 ${qty?`<div class="qty">${qty}</div>`:''}
 ${k.n?`<div class="bar"><i style="width:${pct*100}%;background:${pct>=1?'var(--green)':'var(--teal)'}"></i></div>`:''}
 <div class="foot">${d?`<span class="chip ${d.cls}">${esc(d.txt)}</span>`:'<span class="chip">Sem prazo</span>'}${colacaoDe(c)?`<span class="chip colac" title="Data da colação">Colação ${fmtColacao(colacaoDe(c)).slice(0,5)}</span>`:''}${k.n?`<span>${k.d}/${k.n}</span>`:''}<span class="sp"></span>${c.resp?`<span class="av" title="${esc(c.resp)}">${esc(initials(c.resp))}</span>`:''}</div></div>`}
function renderBoard(){
 const b=$('board'),sl=b.scrollLeft,all=[...cards.entries()],filt=filtering();
 b.classList.toggle('single',!!F.st);
 b.innerHTML=C().cols.map(col=>{
  const inCol=sorted(all.filter(([,c])=>colOf(c)===col.id)),vis=inCol.filter(([,c])=>visible(c));
  if(F.st&&col.id!==F.st)return '';
  const dot=`<span class="dot" style="background:${corEtapa(col.c)}"></span>`;
  const q=inCol.reduce((s,[,c])=>s+n0(c.luxo)+n0(c.simp),0);
  return `<div class="col" data-col="${esc(col.id)}"><h4>${dot}<span class="nm" title="${esc(col.name)}">${esc(col.name)}</span><em>${filt?vis.length+'/':''}${inCol.length}</em></h4>
  <div class="sumq">${q?fmtN(q)+' convites':'&nbsp;'}</div>
  <div class="cbody">${vis.map(([id,c])=>cardHTML(id,c)).join('')||`<div class="empty">${filt&&inCol.length?'Nenhum cartão com estes filtros':'Arraste um cartão para cá'}</div>`}</div>
  <button class="cadd" data-add="${esc(col.id)}">+ Adicionar cartão</button></div>`}).join('');
 b.scrollLeft=sl}

/* ===== lista ===== */
const LCOLS=[
 {k:'title',n:'Turma / cliente',v:c=>(c.title||'').toLowerCase()},
 {k:'colacao',n:'Colação',v:c=>colacaoDe(c)||'9999'},
 {k:'cli',n:'Cliente',v:c=>cliName(c.clientId).toLowerCase()||'~'},
 {k:'labels',n:'Etiquetas',v:c=>lbls(c).map(l=>l.n).join(' ').toLowerCase()},
 {k:'prazo',n:'Prazo',v:c=>c.prazo||'9999'},
 {k:'prio',n:'Prioridade',v:c=>PRIO_RANK[c.prio||'']},
 {k:'resp',n:'Responsável',v:c=>(c.resp||'~').toLowerCase()},
 {k:'qtd',n:'Convites',v:c=>n0(c.luxo)+n0(c.simp)},
 {k:'check',n:'Checklist',v:c=>{const k=chk(c);return k.n?k.d/k.n:-1}},
 {k:'atualizado',n:'Atualizado',v:c=>-(c.atualizado||c.criado||0)}];
let listFechados=new Set(pref('listFechados',[]));
function renderList(){
 const def=LCOLS.find(x=>x.k===sortL.k)||LCOLS[1];
 const rows=[...cards.entries()].filter(([,c])=>visible(c)).sort((a,b)=>{const x=def.v(a[1]),y=def.v(b[1]);return(x<y?-1:x>y?1:((a[1].ord||0)-(b[1].ord||0)))*sortL.dir});
 const fmtAt=t=>{if(!t)return'—';const d=new Date(t);return d.getDate()+' '+MES[d.getMonth()]+' '+String(d.getFullYear()).slice(2)};
 const linha=([id,c])=>{
  const d=dueInfo(c),k=chk(c),q=n0(c.luxo)+n0(c.simp);
  return `<tr data-id="${esc(id)}"><td><div class="ttl">${esc(c.title||'Sem título')}</div>${c.sub?`<div class="note">${esc(c.sub)}</div>`:''}</td>
  <td>${colacaoDe(c)?`<span class="colac">${fmtColacao(colacaoDe(c))}</span>`:'<span class="note">—</span>'}</td>
  <td>${cliName(c.clientId)?esc(cliName(c.clientId)):'<span class="note">—</span>'}</td>
  <td><div class="chips">${lbls(c).map(l=>lchip(l)).join('')}</div></td>
  <td>${d?`<span class="chip ${d.cls}">${esc(d.txt)}</span>`:'<span class="note">—</span>'}</td>
  <td>${c.prio?`<span class="chip ${c.prio}">${PRIO[c.prio]}</span>`:'<span class="note">—</span>'}</td>
  <td>${c.resp?esc(c.resp):'<span class="note">—</span>'}</td>
  <td class="num">${q?fmtN(q):'<span class="note">—</span>'}</td>
  <td>${k.n?`<div class="mini"><div class="bar"><i style="width:${k.d/k.n*100}%;background:${k.d===k.n?'var(--green)':'var(--teal)'}"></i></div><span class="note">${k.d}/${k.n}</span></div>`:'<span class="note">—</span>'}</td>
  <td class="note">${fmtAt(c.atualizado||c.criado)}</td></tr>`};
 /* um grupo por etapa, na ordem do quadro; clique no cabeçalho para retrair ou expandir */
 const grupos=C().cols.map(col=>[col,rows.filter(([,c])=>colOf(c)===col.id)]).filter(([,l])=>l.length);
 const corpo=grupos.map(([col,l])=>{
  const fechado=listFechados.has(col.id),qt=l.reduce((s,[,c])=>s+n0(c.luxo)+n0(c.simp),0),at=l.filter(([,c])=>{const d=dueInfo(c);return d&&d.cls==='late'}).length;
  return `<tr class="lgrp${fechado?' fechado':''}" data-lg="${esc(col.id)}" tabindex="0" aria-expanded="${!fechado}"><td colspan="${LCOLS.length}"><span class="car">${fechado?'▸':'▾'}</span><i style="background:${corEtapa(col.c)}"></i><b>${esc(col.name)}</b><em>${l.length}</em>${qt?`<small>${fmtN(qt)} convites</small>`:''}${at?`<small class="r">${at} atrasado(s)</small>`:''}</td></tr>`+(fechado?'':l.map(linha).join(''))}).join('');
 $('listbar').innerHTML=grupos.length?`<span class="note">${grupos.length} etapa(s) · ${rows.length} pedido(s)</span><span class="hsp"></span><button class="btn ghost sm" data-lgall="abrir">Expandir tudo</button><button class="btn ghost sm" data-lgall="fechar">Recolher tudo</button>`:'';
 $('tbl').innerHTML=`<thead><tr>${LCOLS.map(x=>`<th data-sort="${x.k}" class="${x.k===sortL.k?'sorted':''}">${x.n}${x.k===sortL.k?(sortL.dir>0?' ▲':' ▼'):''}</th>`).join('')}</tr></thead><tbody>${corpo||`<tr><td colspan="${LCOLS.length}" class="note" style="text-align:center;padding:24px">Nenhum cartão com estes filtros.</td></tr>`}</tbody>`}
function toggleGrupo(id){if(listFechados.has(id))listFechados.delete(id);else listFechados.add(id);setPref('listFechados',[...listFechados]);renderList()}
document.addEventListener('click',e=>{
 if(modal)return;
 const g=e.target.closest('[data-lg]');if(g)return toggleGrupo(g.dataset.lg);
 const a=e.target.closest('[data-lgall]');if(a){listFechados=a.dataset.lgall==='fechar'?new Set(C().cols.map(c=>c.id)):new Set();setPref('listFechados',[...listFechados]);renderList()}});
document.addEventListener('keydown',e=>{if(!modal&&(e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-lg]')){e.preventDefault();toggleGrupo(e.target.dataset.lg)}});

/* ===== calendário: ver agenda.js ===== */
function render(){
 if(curModule==='dashboard'&&typeof renderDashboard==='function')return renderDashboard();
 if(curModule==='clientes'&&typeof renderClientes==='function')return renderClientes();
 if(curModule==='contratos'&&typeof renderContratos==='function')return renderContratos();
 renderTop();
 if(view==='overview')renderOverview();else if(view==='quadro')renderBoard();else if(view==='lista')renderList();else renderCal();
}
function setView(v,quiet){if(!['overview','quadro','lista','calendario'].includes(v))v='overview';view=v;setPref('view',v);
 document.querySelectorAll('#views button').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
 $('vOverview').hidden=v!=='overview';$('vQuadro').hidden=v!=='quadro';$('vLista').hidden=v!=='lista';$('vCal').hidden=v!=='calendario';
 document.querySelector('#mod-demandas .filters').hidden=v==='calendario';
 if(!quiet)render()}

/* ===== coluna lateral: etapas e clientes ===== */
function renderSub(){
 const box=$('subside');if(!box)return;
 const all=[...cards.values()],cnt=f=>all.filter(f).length;
 const cliCounts=new Map();all.forEach(c=>{if(c.clientId&&clients.has(c.clientId)&&!isDone(c))cliCounts.set(c.clientId,(cliCounts.get(c.clientId)||0)+1)});
 const cl=[...clients.entries()].filter(([id,c])=>c.situacao!=='encerrado'||cliCounts.get(id)).sort((a,b)=>String(a[1].nome).localeCompare(String(b[1].nome),'pt-BR'));
 box.innerHTML=`<div class="subhead">Gestão de demandas</div>
 <button class="subitem${!F.st&&!F.cli?' on':''}" data-sub="all"><span class="sdot" style="background:var(--teal)"></span><span>Todas as demandas</span><em>${all.length}</em></button>
 <div class="sublabel">Etapas</div>
 ${C().cols.map(col=>`<button class="subitem${F.st===col.id?' on':''}" data-sub="st" data-v="${esc(col.id)}"><span class="sdot" style="background:${corEtapa(col.c)}"></span><span>${esc(col.name)}</span><em>${cnt(c=>colOf(c)===col.id)}</em></button>`).join('')}
 <div class="sublabel">Clientes <button class="sublink" data-sub="clientes">ver todos</button></div>
 ${cl.length?cl.map(([id,c])=>`<button class="subitem${F.cli===id?' on':''}" data-sub="cli" data-v="${esc(id)}"><span class="sav2">${esc(initials(c.nome))}</span><span>${esc(c.nome)}</span>${cliCounts.get(id)?`<em>${cliCounts.get(id)}</em>`:''}</button>`).join(''):'<p class="note" style="padding:4px 10px">Cadastre clientes no módulo Clientes e ligue cada pedido ao seu cliente.</p>'}`;
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-sub]');if(!b||modal)return;
 const k=b.dataset.sub,v=b.dataset.v;
 if(k==='all'){F.st='';F.cli=''}
 else if(k==='st'){F.st=F.st===v?'':v}
 else if(k==='cli'){F.cli=F.cli===v?'':v}
 else if(k==='clientes')return goModule('clientes');
 render()});

/* ===== visão geral (tabelas por prazo) ===== */
const WDL=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
function ovRow(id,c){
 const col=colById(colOf(c)),d=dueInfo(c),cn=cliName(c.clientId);
 const dt=d?(d.cls==='late'||Math.abs(d.days)>6?d.txt.split(' · ')[0]:(d.days===0?'Hoje':d.days===1?'Amanhã':WDL[parseD(c.prazo).getDay()])):'—';
 return `<tr data-id="${esc(id)}"><td><div class="ovt"><b>${esc(c.title||'Sem título')}</b></div></td>
 <td class="mu up">${esc(cn||c.sub||'—')}</td>
 <td>${c.resp?`<span class="av" title="${esc(c.resp)}">${esc(initials(c.resp))}</span>`:'<span class="av empty" title="Sem responsável"></span>'}</td>
 <td class="${d&&d.cls==='late'?'r':''}">${d?'<span class="cal-i"></span>':''}${esc(dt)}</td>
 <td>${c.prio?`<span class="flag ${c.prio}">${PRIO[c.prio]}</span>`:'<span class="flag">Sem prioridade</span>'}</td>
 <td><div class="ovst"><span class="stchip" style="--c:${corEtapa(col.c)}">${esc(col.name)}</span>${lbls(c).map(l=>lchip(l)).join('')}</div></td></tr>`}
function ovTable(title,rows,cls,open=true,key){
 const head='<tr><th>Demanda</th><th>Cliente</th><th>Resp.</th><th>Data</th><th>Prioridade</th><th>Etapa e etiquetas</th></tr>';
 return `<div class="ovgrp ${cls||''}"><button class="ovh" ${key?`data-ovt="${key}"`:''}><span class="car">${open?'▾':'▸'}</span>${title}<em>${rows.length}</em></button>
 ${open?`<div class="ovwrap"><table class="ovtbl"><thead>${head}</thead><tbody>${rows.map(([id,c])=>ovRow(id,c)).join('')}</tbody></table></div>`:''}</div>`}
function renderOverview(){
 const all=[...cards.entries()].filter(([,c])=>visible(c)&&!isDone(c));   /* entregues não entram na visão por prazo */
 const t0=today(),lim=new Date(t0);lim.setDate(lim.getDate()+ovRange);
 const late=[],byDay=new Map(),semData=[];let alem=0;
 all.forEach(([id,c])=>{const d=parseD(c.prazo);if(!d){semData.push([id,c]);return}
  if(d<t0){late.push([id,c]);return}
  if(d>lim){alem++;return}
  const k=c.prazo;if(!byDay.has(k))byDay.set(k,[]);byDay.get(k).push([id,c])});
 const byP=(a,b)=>String(a[1].prazo).localeCompare(String(b[1].prazo))||(PRIO_RANK[a[1].prio||'']-PRIO_RANK[b[1].prio||'']);
 late.sort(byP);
 const days=[...byDay.keys()].sort();
 const n=days.reduce((s,k)=>s+byDay.get(k).length,0);
 $('vOverview').innerHTML=`<div class="ovtop"><div class="seg">${[7,14,30].map(x=>`<button data-ovr="${x}" class="${ovRange===x?'on':''}">${x} dias</button>`).join('')}</div>
 <h3>Próximos ${ovRange} dias <small>${n} pedido(s) · ${late.length} atrasado(s)</small></h3></div>
 ${late.length?ovTable('<span class="warn-i"></span>Atrasados',late,'late'):''}
 ${days.map(k=>{const d=parseD(k);return ovTable(`${WDL[d.getDay()]} · ${d.getDate()} ${MES[d.getMonth()]}`,byDay.get(k).sort(byP),'')}).join('')}
 ${!late.length&&!days.length?`<div class="banner">Nenhum pedido com prazo nos próximos ${ovRange} dias. ${semData.length?'Defina o prazo de entrega dos pedidos para eles aparecerem aqui.':''}</div>`:''}
 ${semData.length?ovTable('Sem data de entrega',semData,'nodate',ovSemData,'semdata'):''}
 ${alem?`<p class="note">Mais ${alem} pedido(s) com prazo além de ${ovRange} dias.</p>`:''}`}
document.addEventListener('click',e=>{
 if(modal)return;
 const r=e.target.closest('[data-ovr]');if(r){ovRange=+r.dataset.ovr;setPref('ovRange',ovRange);return render()}
 const t=e.target.closest('[data-ovt]');if(t){ovSemData=!ovSemData;return render()}});

/* ===== janela do cartão ===== */
function openCard(id,col,prazo){
 const base=id?cards.get(id):null;if(id&&!base)return;
 const c=base?JSON.parse(JSON.stringify(base)):{clientId:F.cli||'',title:'',sub:'',modelo:'',luxo:'',simp:'',foto:'',prazo:prazo||'',resp:'',prio:'media',notas:'',labels:[],col:col||(C().cols[0]||{}).id,check:(C().check||[]).map(t=>({t,d:false}))};
 if(!Array.isArray(c.check))c.check=[];if(!Array.isArray(c.labels))c.labels=[];
 modal={t:'card',id,c,confirm:false};renderModal()}
function renderModal(){
 const m=$('modal');
 if(!modal){m.innerHTML='';if(remotoPendente){remotoPendente=false;recarregarDados()}return}
 if(modal.t==='cfg')return renderCfg();
 if(modal.t==='pw')return renderPw();
 if(modal.t==='ev')return renderEv();
 if(modal.t==='cli')return renderCli();
 if(modal.t==='ct'||modal.t==='emp')return renderCt();
 const c=modal.c,k=chk(c),cols=C().cols,fmtAt=t=>t?new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
 m.innerHTML=`<div class="ov"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="mt">
 <h2 id="mt">${modal.id?esc(c.title||'Cartão'):'Novo pedido'}</h2><div class="sub">${modal.id?'Edite as informações e clique em Salvar (Ctrl+Enter).':'Preencha o que souber agora; dá para completar depois.'}</div>
 <div class="dlgcols"><div>
 <div class="fg">
  <label class="full">Turma / cliente<input id="m-title" value="${esc(c.title)}" placeholder="Ex.: Direito · 2027.1"></label>
  <label>Lista / instituição<input id="m-sub" value="${esc(c.sub)}" placeholder="Ex.: Direito UNEX"></label>
  <label>Cliente<select id="m-cli"><option value="">Sem cliente</option>${[...clients.entries()].sort((a,b)=>String(a[1].nome).localeCompare(String(b[1].nome),'pt-BR')).map(([id,x])=>`<option value="${esc(id)}"${c.clientId===id?' selected':''}>${esc(x.nome)}</option>`).join('')}</select></label>
  <label>Etapa<select id="m-col">${cols.map(x=>`<option value="${esc(x.id)}"${x.id===colOf(c)?' selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
  <label>Modelo / tamanho<input id="m-modelo" list="modelos" value="${esc(c.modelo)}" placeholder="Ex.: 25x18 cm"></label>
  <label>Prazo de entrega<input id="m-prazo" type="date" value="${esc(c.prazo)}"></label>
  <label>Data da colação<input id="m-colacao" type="date" value="${esc(c.colacao||'')}"></label>
  <label>Prioridade<select id="m-prio"><option value=""${c.prio?'':' selected'}>Sem prioridade</option>${Object.entries(PRIO).map(([k2,v])=>`<option value="${k2}"${c.prio===k2?' selected':''}>${v}</option>`).join('')}</select></label>
  <label>Responsável<input id="m-resp" list="resps" value="${esc(c.resp)}" placeholder="Quem cuida deste pedido"></label>
 </div>
 <div class="fg3" style="margin-top:12px">
  <label>Convites luxo<input id="m-luxo" inputmode="numeric" value="${esc(c.luxo||'')}"></label>
  <label>Simplificado<input id="m-simp" inputmode="numeric" value="${esc(c.simp||'')}"></label>
  <label>Fotos<input id="m-foto" inputmode="numeric" value="${esc(c.foto||'')}"></label>
 </div>
 <div class="sect">Etiquetas</div>
 <div class="lbls">${c.labels.map((l,i)=>lchip(l,i)).join('')||'<span class="note">Nenhuma etiqueta</span>'}</div>
 <div class="addrow"><input id="m-newlb" list="lbllist" placeholder="Nova etiqueta (ex.: CONVITE LUXO)"><button class="btn ghost sm" data-act="addlb">Adicionar</button></div>
 <div class="sect">Checklist de produção <span class="note" id="m-ck">${k.d}/${k.n}</span><div class="bar"><i id="m-ckb" style="width:${k.n?k.d/k.n*100:0}%;background:var(--teal)"></i></div></div>
 <div class="cl">${c.check.map((it,i)=>`<div class="cli${it.d?' d':''}"><input type="checkbox" data-ck="${i}"${it.d?' checked':''} aria-label="Concluído"><input type="text" data-ct="${i}" value="${esc(it.t)}" aria-label="Item"><button class="x" data-cx="${i}" title="Remover item">✕</button></div>`).join('')}</div>
 <div class="addrow"><input id="m-newck" placeholder="Novo item do checklist"><button class="btn ghost sm" data-act="addck">Adicionar</button></div>
 </div><div>
 <div class="sect">Observações</div>
 <textarea id="m-notas" placeholder="Formandos, comissão, colação, fotógrafo, cores da capa, nomes com grafia especial…">${esc(c.notas)}</textarea>
 </div></div>
 <datalist id="modelos">${MODELOS.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
 <datalist id="resps">${[...new Set([...cards.values()].map(x=>(x.resp||'').trim()).filter(Boolean))].map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
 <datalist id="lbllist">${[...allLabels().keys()].map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
 <div class="acts">${modal.id?(modal.confirm?'<button class="btn danger" data-act="delok">Confirmar exclusão</button><button class="btn ghost" data-act="delno">Manter</button>':'<button class="btn danger" data-act="del">Excluir</button>'):''}
 ${c.trello?'<button class="btn ghost" data-act="trello">Abrir no Trello</button>':''}
 <span class="meta">${modal.id&&c.atualizado?'Atualizado em '+esc(fmtAt(c.atualizado)):''}</span>
 <button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-act="save">Salvar</button></div>
 </div></div>`;
 const nt=$('m-notas');const fit=()=>{nt.style.height='auto';nt.style.height=(nt.scrollHeight+2)+'px'};fit();nt.addEventListener('input',fit);
 if(!modal.id)setTimeout(()=>{const e=$('m-title');if(e)e.focus()},30)}
function readForm(){const c=modal.c,v=id=>{const e=$(id);return e?e.value:''};
 c.title=v('m-title').trim();c.sub=v('m-sub').trim();c.clientId=v('m-cli');c.col=v('m-col');c.modelo=v('m-modelo').trim();c.prazo=v('m-prazo');c.colacao=v('m-colacao');c.prio=v('m-prio');c.resp=v('m-resp').trim();
 c.luxo=n0(v('m-luxo'));c.simp=n0(v('m-simp'));c.foto=n0(v('m-foto'));c.notas=v('m-notas');
 document.querySelectorAll('[data-ct]').forEach(e=>{const i=+e.dataset.ct;if(c.check[i])c.check[i].t=e.value});
 document.querySelectorAll('[data-ck]').forEach(e=>{const i=+e.dataset.ck;if(c.check[i])c.check[i].d=e.checked})}
function updCk(){const k=chk(modal.c);$('m-ck').textContent=k.d+'/'+k.n;$('m-ckb').style.width=(k.n?k.d/k.n*100:0)+'%'}
function endOrd(col,skip){const l=[...cards.entries()].filter(([id,c])=>id!==skip&&colOf(c)===col).map(([,c])=>c.ord||0);return(l.length?Math.max(...l):0)+1024}
function saveModal(){
 readForm();const c=modal.c,id=modal.id||newId(),old=modal.id?cards.get(modal.id):null;
 if(!c.title){const e=$('m-title');e.focus();e.placeholder='Dê um nome ao cartão (ex.: Direito · 2027.1)';return}
 c.check=c.check.filter(x=>x&&String(x.t).trim());
 if(!old||old.col!==c.col){c.ord=endOrd(c.col,id);if(c.col===lastCol())c.entregueEm=Date.now()}
 if(!c.criado)c.criado=Date.now();
 c.atualizado=Date.now();
 modal=null;renderModal();saveCard(id,c);toast(old?'Cartão salvo':'Pedido criado')}

/* ===== configurações ===== */
function openCfg(){modal={t:'cfg',c:JSON.parse(JSON.stringify(C()))};if(!Array.isArray(modal.c.check))modal.c.check=[];renderModal()}
function renderCfg(){
 const c=modal.c,used=id=>[...cards.values()].some(x=>colOf(x)===id);
 $('modal').innerHTML=`<div class="ov"><div class="dlg narrow" role="dialog" aria-modal="true" aria-labelledby="ct">
 <h2 id="ct">Configurar quadro</h2><div class="sub">Nome, etapas e checklist padrão.</div>
 <label>Nome no topo<input id="c-brand" value="${esc(c.brand||'')}"></label>
 <div class="sect">Etapas (colunas)</div>
 ${c.cols.map((col,i)=>`<div class="colrow"><span class="dot" style="background:${corEtapa(col.c)}"></span><input data-cn="${i}" value="${esc(col.name)}" aria-label="Nome da etapa"><div class="csw" role="radiogroup" aria-label="Cor da etapa">${LCOL.map(h=>`<button type="button" class="sw${corEtapa(col.c).toUpperCase()===h?' on':''}" data-csw="${i}" data-h="${h}" style="--c:${h}" title="Usar esta cor" aria-label="Cor ${h}"></button>`).join('')}</div><button class="mv" data-up="${i}"${i===0?' disabled':''} title="Mover para a esquerda">↑</button><button class="mv" data-dn="${i}"${i===c.cols.length-1?' disabled':''} title="Mover para a direita">↓</button><button class="x" data-cdel="${i}"${used(col.id)||c.cols.length<2?' disabled':''} title="${used(col.id)?'Esvazie a etapa antes de excluir':'Excluir etapa'}">✕</button></div>`).join('')}
 <div class="addrow"><input id="c-newcol" placeholder="Nova etapa"><button class="btn ghost sm" data-act="addcol">Adicionar etapa</button></div>
 <p class="note">A última etapa conta como "Entregue" nos indicadores. Só dá para excluir uma etapa vazia.</p>
 <div class="sect">Checklist padrão dos novos cartões</div>
 <label>Um item por linha<textarea id="c-check" rows="8">${esc(c.check.join('\n'))}</textarea></label>
 <div class="acts"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-act="savecfg">Salvar</button></div></div></div>`}
function readCfg(){const c=modal.c;
 const b=$('c-brand');if(b)c.brand=b.value.trim();
 document.querySelectorAll('[data-cn]').forEach(e=>{c.cols[+e.dataset.cn].name=e.value});
 const t=$('c-check');if(t)c.check=t.value.split('\n').map(s=>s.trim()).filter(Boolean)}

/* ===== backup ===== */
/* ===== senha do Financeiro ===== */
async function openFin(){await flushNow();const st=await window.api.senhaStatus();modal={t:'pw',mode:st.hasPassword?'enter':'create',next:'fin'};renderModal()}
function renderPw(){
 const c=modal.mode==='create',fin=modal.next==='fin';
 const title=c?'Criar senha do Financeiro':(fin?'Financeiro protegido':'Senha do Financeiro');
 const sub=c?'Escolha uma senha para proteger os dados financeiros. Ela será pedida toda vez que você entrar no Financeiro.'
  :(fin?'Digite a senha para entrar no Financeiro.':'O backup inclui os dados financeiros. Digite a senha para continuar.');
 $('modal').innerHTML=`<div class="ov"><div class="dlg narrow pw" role="dialog" aria-modal="true" aria-labelledby="pwt">
 <div class="lock" aria-hidden="true"></div><h2 id="pwt">${title}</h2><div class="sub">${sub}</div>
 <label>Senha<input id="pw1" type="password" autocomplete="off"></label>
 ${c?'<label style="margin-top:12px">Repita a senha<input id="pw2" type="password" autocomplete="off"></label><p class="note">Pelo menos 4 caracteres. Anote num lugar seguro.</p>':''}
 <p class="pwerr" id="pwerr" role="alert"></p>
 ${c?'':'<p class="note">Esqueceu a senha? Feche o programa, abra a pasta de dados (Backup → Abrir pasta de backups automáticos e volte uma pasta) e apague o arquivo <b>seguranca.json</b>. Nenhum dado é apagado; você cria uma senha nova ao entrar.</p>'}
 <div class="acts"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-act="pwok">${c?'Criar senha e entrar':'Entrar'}</button></div></div></div>`;
 setTimeout(()=>{const e=$('pw1');if(e)e.focus()},30)}
async function submitPw(){
 const p1=$('pw1').value,err=$('pwerr');err.textContent='';
 if(modal.mode==='create'){
  if(p1.length<4){err.textContent='A senha precisa ter pelo menos 4 caracteres.';return $('pw1').focus()}
  if(p1!==$('pw2').value){err.textContent='As duas senhas não são iguais.';return $('pw2').focus()}
  const r=await window.api.senhaDefinir(p1);if(!r.ok){err.textContent=r.error||'Não foi possível criar a senha.';return}
 }else{
  const r=await window.api.senhaEntrar(p1);
  if(!r.ok){err.textContent=r.wait?`Muitas tentativas erradas. Aguarde ${r.wait} segundos.`:'Senha incorreta.';$('pw1').select();return}
 }
 const next=modal.next;modal=null;renderModal();
 if(next==='fin'){const r=await window.api.ir('financeiro');if(!r||!r.ok)toast('Não foi possível abrir o Financeiro.')}
 else doMenu(next,true)}

async function doMenu(m,ok){
 $('menu').hidden=true;$('bMenu').setAttribute('aria-expanded','false');
 if((m==='export'||m==='import')&&!ok){const st=await window.api.senhaStatus();if(st.hasPassword&&!st.unlocked){modal={t:'pw',mode:'enter',next:m};return renderModal()}}
 if(m==='export'){await flushNow();const r=await window.api.exportar();window.api.trancar();if(r.ok)toast('Backup salvo em '+r.path);else if(r.error)toast(r.error);return}
 if(m==='pasta'){window.api.abrirBackups();return}
 if(m==='update'){if(window.__checkUpdates)window.__checkUpdates();return}
 if(m==='import'){await flushNow();const r=await window.api.importar();if(!r.ok){window.api.trancar();if(r.error)toast(r.error);return}
  const what=r.kind==='fin'?`Este é um backup do <b>Dashboard de Convites</b> (${r.turmas} turmas). Importar <b>substitui todos os dados do Financeiro</b>. A Produção não muda.`
   :`O arquivo tem ${r.cards} cartões${r.hasFin?' e os dados do Financeiro':''}. Importar <b>substitui</b> os ${cards.size} cartões e a configuração atuais${r.hasFin?' e também todo o Financeiro':''}.`;
  modal={t:'import'};$('modal').innerHTML=`<div class="ov"><div class="dlg narrow"><h2>Importar backup</h2>
  <p>${what} O estado atual continua guardado no backup automático de hoje.</p>
  <div class="acts"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn danger" data-act="doimport">Substituir pelos dados do arquivo</button></div></div></div>`}}

/* ===== eventos ===== */
let downOv=false;
document.addEventListener('mousedown',e=>{downOv=e.target.classList.contains('ov')});
document.addEventListener('click',e=>{
 const t=e.target;
 const bm=t.closest('#bMenu');
 if(!bm&&!t.closest('#menu')&&!$('menu').hidden){$('menu').hidden=true;$('bMenu').setAttribute('aria-expanded','false')}
 if(bm){const mm=$('menu');mm.hidden=!mm.hidden;bm.setAttribute('aria-expanded',String(!mm.hidden));return}
 if(t.dataset.m)return doMenu(t.dataset.m);
 if(t.id==='bNew')return openCard(null);
 if(t.id==='bCfg')return openCfg();
 const vb=t.closest('#views button');if(vb)return setView(vb.dataset.view);
 if(!modal){
  const add=t.closest('[data-add]');if(add)return openCard(null,add.dataset.add);
  const th=t.closest('th[data-sort]');if(th){const k=th.dataset.sort;if(sortL.k===k)sortL.dir*=-1;else{sortL.k=k;sortL.dir=1}return render()}
  if(t.closest('#vCal'))return;   /* o calendário trata os próprios cliques (agenda.js) */
  if(t.closest('[data-sub],[data-ovr],[data-ovt],[data-lg],[data-lgall]'))return;
  const el=t.closest('[data-id]');if(el)return openCard(el.dataset.id);
  return}
 if(t.classList.contains('ov')&&downOv){modal=null;return renderModal()}
 const act=t.dataset.act;
 if(act==='close'){modal=null;window.api.trancar();return renderModal()}
 if(modal.t==='pw'&&act==='pwok')return submitPw();
 if(modal.t==='import'&&act==='doimport'){modal=null;renderModal();window.api.aplicarImport().then(r=>{if(r.ok)window.api.ir('producao')});return}
 if(modal.t==='ev')return agendaModalClick(t,act);
 if(modal.t==='cli')return clientesModalClick(t,act);
 if(modal.t==='ct'||modal.t==='emp')return contratosModalClick(t,act);
 if(modal.t==='card'){
  if(act==='save')return saveModal();
  if(act==='trello')return window.api.abrirLink(modal.c.trello);
  if(act==='del'){readForm();modal.confirm=true;return renderModal()}
  if(act==='delno'){readForm();modal.confirm=false;return renderModal()}
  if(act==='delok'){const id=modal.id;modal=null;renderModal();delCard(id);return toast('Cartão excluído')}
  if(act==='addck'){readForm();const i=$('m-newck'),v=i.value.trim();if(!v)return i.focus();modal.c.check.push({t:v,d:false});renderModal();return $('m-newck').focus()}
  if(act==='addlb'){readForm();const i=$('m-newlb'),v=i.value.trim();if(!v)return i.focus();if(!modal.c.labels.some(l=>l.n===v)){const known=allLabels().get(v);modal.c.labels.push({n:v,c:known||LCOL[modal.c.labels.length%LCOL.length]})}renderModal();return $('m-newlb').focus()}
  if(t.dataset.lx!=null){readForm();modal.c.labels.splice(+t.dataset.lx,1);return renderModal()}
  if(t.dataset.cx!=null){readForm();modal.c.check.splice(+t.dataset.cx,1);return renderModal()}
 }
 if(modal.t==='cfg'){
  const c=modal.c;
  if(t.dataset.csw!=null){readCfg();c.cols[+t.dataset.csw].c=t.dataset.h;return renderCfg()}
  if(t.dataset.up!=null){readCfg();const i=+t.dataset.up;[c.cols[i-1],c.cols[i]]=[c.cols[i],c.cols[i-1]];return renderCfg()}
  if(t.dataset.dn!=null){readCfg();const i=+t.dataset.dn;[c.cols[i+1],c.cols[i]]=[c.cols[i],c.cols[i+1]];return renderCfg()}
  if(t.dataset.cdel!=null&&!t.disabled){readCfg();c.cols.splice(+t.dataset.cdel,1);return renderCfg()}
  if(act==='addcol'){readCfg();const i=$('c-newcol'),v=i.value.trim();if(!v)return i.focus();c.cols.push({id:'k'+Date.now().toString(36),name:v,c:'teal'});return renderCfg()}
  if(act==='savecfg'){readCfg();c.cols.forEach(x=>{x.name=x.name.trim()||'Sem nome'});modal=null;renderModal();saveCfg(c);return toast('Quadro configurado')}
 }
});
document.addEventListener('change',e=>{
 if(modal&&modal.t==='card'&&e.target.dataset.ck!=null){const i=+e.target.dataset.ck;modal.c.check[i].d=e.target.checked;e.target.parentElement.classList.toggle('d',e.target.checked);updCk()}
 if(modal&&modal.t==='cfg'&&e.target.dataset.cc!=null){readCfg();renderCfg()}
});
document.addEventListener('keydown',e=>{
 const ctrl=e.ctrlKey||e.metaKey;
 if(e.key==='Enter'&&modal&&modal.t==='pw'&&(e.target.id==='pw1'||e.target.id==='pw2')){e.preventDefault();return submitPw()}
 if(e.key==='Escape'){if(modal){modal=null;window.api.trancar();renderModal()}else if(!$('menu').hidden){$('menu').hidden=true}return}
 if(ctrl&&e.key==='Enter'&&modal&&modal.t==='card'){e.preventDefault();return saveModal()}
 if(ctrl&&e.key==='Enter'&&modal&&modal.t==='ev'){e.preventDefault();return saveEv()}
 if(ctrl&&(e.key==='n'||e.key==='N')&&!modal){e.preventDefault();return openCard(null)}
 if(ctrl&&(e.key==='f'||e.key==='F')&&!modal&&curModule==='demandas'){e.preventDefault();$('fq').focus();$('fq').select();return}
 if(ctrl&&e.key>='1'&&e.key<='4'&&!modal&&curModule==='demandas'){e.preventDefault();return setView(['overview','quadro','lista','calendario'][+e.key-1])}
 if(e.key==='Enter'&&modal&&e.target.id==='m-newck'){e.preventDefault();document.querySelector('[data-act=addck]').click();return}
 if(e.key==='Enter'&&modal&&e.target.id==='m-newlb'){e.preventDefault();document.querySelector('[data-act=addlb]').click();return}
 if(e.key==='Enter'&&modal&&e.target.id==='c-newcol'){e.preventDefault();document.querySelector('[data-act=addcol]').click();return}
 if(e.key==='Enter'&&!modal&&e.target.classList.contains('cardk'))openCard(e.target.dataset.id);
});
$('fq').addEventListener('input',e=>{F.q=e.target.value;render()});
$('fr').addEventListener('change',e=>{F.r=e.target.value;render()});
$('fp').addEventListener('change',e=>{F.p=e.target.value;render()});
$('fe').addEventListener('change',e=>{F.e=e.target.value;render()});
$('fl').addEventListener('change',e=>{F.late=e.target.checked;render()});
$('fh').addEventListener('change',e=>{F.hide=e.target.checked;setPref('hide',F.hide);render()});

/* ===== arrastar e soltar ===== */
const board=$('board');
const clearMarks=()=>document.querySelectorAll('.cardk.before,.col.over').forEach(x=>x.classList.remove('before','over'));
function dropTarget(colEl,y){const cs=[...colEl.querySelectorAll('.cardk')].filter(x=>x.dataset.id!==dragId);return cs.find(x=>{const r=x.getBoundingClientRect();return y<r.top+r.height/2})||null}
board.addEventListener('dragstart',e=>{const c=e.target.closest('.cardk');if(!c)return;dragId=c.dataset.id;c.classList.add('drag');e.dataTransfer.setData('text/plain',dragId);e.dataTransfer.effectAllowed='move'});
board.addEventListener('dragend',()=>{dragId=null;clearMarks();document.querySelectorAll('.cardk.drag').forEach(x=>x.classList.remove('drag'))});
board.addEventListener('dragover',e=>{const col=e.target.closest('.col');if(!col||!dragId)return;e.preventDefault();clearMarks();col.classList.add('over');
 const b=dropTarget(col,e.clientY);if(b)b.classList.add('before')});
board.addEventListener('dragleave',e=>{const col=e.target.closest('.col');if(col&&!col.contains(e.relatedTarget))col.classList.remove('over')});
board.addEventListener('drop',e=>{const colEl=e.target.closest('.col');if(!colEl||!dragId)return;e.preventDefault();
 const id=dragId,card=cards.get(id);if(!card)return;const col=colEl.dataset.col,before=dropTarget(colEl,e.clientY);clearMarks();
 const list=sorted([...cards.entries()].filter(([k,c])=>k!==id&&colOf(c)===col));
 let ord;
 if(!before)ord=(list.length?(list[list.length-1][1].ord||0):0)+1024;
 else{const i=list.findIndex(([k])=>k===before.dataset.id),nx=list[i][1].ord||0,pv=i>0?(list[i-1][1].ord||0):nx-2048;ord=(pv+nx)/2}
 if(card.col===col&&card.ord===ord)return;
 const next=Object.assign({},card,{col,ord,atualizado:Date.now()});
 if(col===lastCol()&&card.col!==col){next.entregueEm=Date.now();toast('Entregue: '+(card.title||''))}
 saveCard(id,next)});

init();
