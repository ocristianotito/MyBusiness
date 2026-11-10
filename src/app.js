'use strict';
/* ===== constantes ===== */
const PAL={teal:'#2DB5AE',azul:'#60A5FA',roxo:'#A78BFA',laranja:'#F0A53F',verde:'#34D399',vermelho:'#F87171',cinza:'#8B9BAE'};
const PALN={teal:'Teal',azul:'Azul',roxo:'Roxo',laranja:'Laranja',verde:'Verde',vermelho:'Vermelho',cinza:'Cinza'};
const DEF_CFG={brand:'Cristiano Convites',
 cols:[{id:'pedido',name:'Pedido / briefing',c:'cinza'},{id:'arte',name:'Arte e layout',c:'roxo'},{id:'aprov',name:'Aprovação do cliente',c:'laranja'},{id:'grafica',name:'Gráfica',c:'azul'},{id:'acab',name:'Acabamento',c:'teal'},{id:'mont',name:'Montagem e conferência',c:'teal'},{id:'entregue',name:'Entregue',c:'verde'}],
 check:['Layout aprovado pelo cliente','Arquivo enviado à gráfica','Impressão conferida','Hotstamp','Corte / faca','Lacre','Montagem','Conferência de nomes','Embalagem']};
const MODELOS=['23x17,5 cm','25x18 cm','20x22 cm','24x22 cm','27x25 cm','Simples 15x22 cm','Caixa','Miolo 16 páginas'];
const PRIO={alta:'Alta',media:'Média',baixa:'Baixa'};
const PRIO_RANK={alta:0,media:1,baixa:2,'':3};
const LCOL=['#E2B203','#FEA362','#F87168','#9F8FEF','#579DFF','#6CC3E0','#4BCE97','#94C748','#E774BB','#8C9BAB'];
const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MESL=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

/* ===== estado ===== */
let cfg=null,cards=new Map(),modal=null,dragId=null,view='quadro';
const F={q:'',r:'',p:'',e:'',late:false,hide:false};
const sortL={k:'col',dir:1};
let calY=new Date().getFullYear(),calM=new Date().getMonth();
const pref=(k,d)=>{try{const v=localStorage.getItem('pref_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const setPref=(k,v)=>{try{localStorage.setItem('pref_'+k,JSON.stringify(v))}catch(e){}};
let folded=new Set(pref('folded',[]));

/* ===== utilidades ===== */
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n0=v=>{const x=parseInt(v,10);return isNaN(x)||x<0?0:x};
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
const lbls=c=>Array.isArray(c.labels)?c.labels.filter(x=>x&&x.n):[];
const lchip=(l,x)=>`<span class="chip lb" style="background:${esc(l.c||'#8C9BAB')}26;color:${esc(l.c||'#8C9BAB')}">${esc(l.n)}${x!=null?`<button data-lx="${x}" title="Remover etiqueta">✕</button>`:''}</span>`;
function allLabels(){const m=new Map();cards.forEach(c=>lbls(c).forEach(l=>{if(!m.has(l.n))m.set(l.n,l.c)}));return m}
const newId=()=>'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function toast(msg){const t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>{t.hidden=true},2600)}
function setSync(cls,txt){const e=$('sync');e.className='sync '+cls;e.querySelector('span').textContent=txt}

/* ===== armazenamento (arquivo no computador, via processo principal) ===== */
let saveTimer=null,saving=false,dirty=false;
function snapshot(){return{v:1,cfg,cards:Object.fromEntries(cards)}}
async function flushNow(){clearTimeout(saveTimer);while(saving)await new Promise(r=>setTimeout(r,50));await flush()}
window.__beforeUpdate=()=>flushNow();
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

async function init(){
 window.api.trancar();
 try{localStorage.removeItem('dashboard_convites_v2')}catch(e){}
 try{
  const d=await window.api.load();
  cfg=d.cfg||null;cards=new Map(Object.entries(d.cards||{}));
  setSync('on','Salvo no computador');
 }catch(e){setSync('err','Erro ao abrir os dados');$('banner').innerHTML=`<div class="banner r">Não foi possível abrir o arquivo de dados: ${esc(e.message||e)}</div>`}
 F.hide=pref('hide',false);$('fh').checked=F.hide;
 view=pref('view','quadro');setView(view);
}

/* ===== filtros ===== */
function visible(card){
 if(F.hide&&isDone(card))return false;
 if(F.r&&(card.resp||'')!==F.r)return false;
 if(F.p&&card.prio!==F.p)return false;
 if(F.e&&!lbls(card).some(l=>l.n===F.e))return false;
 if(F.late){const d=dueInfo(card);if(!d||d.cls!=='late')return false}
 if(F.q){const h=[card.title,card.sub,card.modelo,card.resp,card.notas,lbls(card).map(l=>l.n).join(' ')].join(' ').toLowerCase();if(!h.includes(F.q.toLowerCase()))return false}
 return true}
const filtering=()=>!!(F.q||F.r||F.p||F.e||F.late||F.hide);
function sorted(list){return list.slice().sort((a,b)=>(a[1].ord||0)-(b[1].ord||0)||((a[1].criado||0)-(b[1].criado||0)))}

/* ===== cabeçalho, KPIs, filtros ===== */
function renderTop(){
 const cf=C(),all=[...cards.values()];
 $('brandName').textContent=cf.brand||'Cristiano Convites';
 const ativos=all.filter(c=>!isDone(c)),late=ativos.filter(c=>{const d=dueInfo(c);return d&&d.cls==='late'}),
  soon=ativos.filter(c=>{const d=dueInfo(c);return d&&d.days>=0&&d.days<=7}),
  qtd=ativos.reduce((s,c)=>s+n0(c.luxo)+n0(c.simp),0),semPrazo=ativos.filter(c=>!parseD(c.prazo)).length;
 $('kpis').innerHTML=
  `<div class="kpi"><small>Pedidos em produção</small><b class="t">${ativos.length}</b><em>${semPrazo?semPrazo+' sem prazo definido':'todos com prazo'}</em></div>`+
  `<div class="kpi"><small>Convites em produção</small><b>${fmtN(qtd)}</b><em>luxo + simplificado</em></div>`+
  `<div class="kpi"><small>Atrasados</small><b class="${late.length?'r':''}">${late.length}</b><em>prazo já passou</em></div>`+
  `<div class="kpi"><small>Vencem em 7 dias</small><b class="${soon.length?'o':''}">${soon.length}</b><em>incluindo hoje</em></div>`+
  `<div class="kpi"><small>Entregues</small><b class="g">${all.length-ativos.length}</b><em>em "${esc((cf.cols[cf.cols.length-1]||{}).name||'')}"</em></div>`;
 const resps=[...new Set(all.map(c=>(c.resp||'').trim()).filter(Boolean))].sort();
 if(F.r&&!resps.includes(F.r))F.r='';
 $('fr').innerHTML='<option value="">Todos os responsáveis</option>'+resps.map(r=>`<option${r===F.r?' selected':''}>${esc(r)}</option>`).join('');
 const ls=[...allLabels().keys()].sort();
 if(F.e&&!ls.includes(F.e))F.e='';
 $('fe').innerHTML='<option value="">Todas as etiquetas</option>'+ls.map(l=>`<option${l===F.e?' selected':''}>${esc(l)}</option>`).join('');
 const shown=all.filter(visible).length;
 $('fcount').textContent=filtering()?shown+' de '+all.length+' cartões':all.length+' cartões';
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
 <div class="foot">${d?`<span class="chip ${d.cls}">${esc(d.txt)}</span>`:'<span class="chip">Sem prazo</span>'}${k.n?`<span>${k.d}/${k.n}</span>`:''}<span class="sp"></span>${c.resp?`<span class="av" title="${esc(c.resp)}">${esc(initials(c.resp))}</span>`:''}</div></div>`}
function renderBoard(){
 const b=$('board'),sl=b.scrollLeft,all=[...cards.entries()],filt=filtering();
 b.innerHTML=C().cols.map(col=>{
  const inCol=sorted(all.filter(([,c])=>colOf(c)===col.id)),vis=inCol.filter(([,c])=>visible(c));
  const dot=`<span class="dot" style="background:${PAL[col.c]||PAL.cinza}"></span>`;
  if(folded.has(col.id))return `<div class="col slim" data-col="${esc(col.id)}" data-unfold="${esc(col.id)}" title="Mostrar ${esc(col.name)}"><h4>${dot}<span>${esc(col.name)} · ${vis.length}</span></h4></div>`;
  const q=inCol.reduce((s,[,c])=>s+n0(c.luxo)+n0(c.simp),0);
  return `<div class="col" data-col="${esc(col.id)}"><h4>${dot}<span class="nm" title="${esc(col.name)}">${esc(col.name)}</span><em>${filt?vis.length+'/':''}${inCol.length}</em><button class="fold" data-fold="${esc(col.id)}" title="Recolher etapa">◂</button></h4>
  <div class="sumq">${q?fmtN(q)+' convites':'&nbsp;'}</div>
  <div class="cbody">${vis.map(([id,c])=>cardHTML(id,c)).join('')||`<div class="empty">${filt&&inCol.length?'Nenhum cartão com estes filtros':'Arraste um cartão para cá'}</div>`}</div>
  <button class="cadd" data-add="${esc(col.id)}">+ Adicionar cartão</button></div>`}).join('');
 b.scrollLeft=sl}

/* ===== lista ===== */
const LCOLS=[
 {k:'title',n:'Turma / cliente',v:c=>(c.title||'').toLowerCase()},
 {k:'col',n:'Etapa',v:c=>colIdx(c)},
 {k:'labels',n:'Etiquetas',v:c=>lbls(c).map(l=>l.n).join(' ').toLowerCase()},
 {k:'prazo',n:'Prazo',v:c=>c.prazo||'9999'},
 {k:'prio',n:'Prioridade',v:c=>PRIO_RANK[c.prio||'']},
 {k:'resp',n:'Responsável',v:c=>(c.resp||'~').toLowerCase()},
 {k:'qtd',n:'Convites',v:c=>n0(c.luxo)+n0(c.simp)},
 {k:'check',n:'Checklist',v:c=>{const k=chk(c);return k.n?k.d/k.n:-1}},
 {k:'atualizado',n:'Atualizado',v:c=>-(c.atualizado||c.criado||0)}];
function renderList(){
 const def=LCOLS.find(x=>x.k===sortL.k)||LCOLS[1];
 const rows=[...cards.entries()].filter(([,c])=>visible(c)).sort((a,b)=>{const x=def.v(a[1]),y=def.v(b[1]);return(x<y?-1:x>y?1:((a[1].ord||0)-(b[1].ord||0)))*sortL.dir});
 const fmtAt=t=>{if(!t)return'—';const d=new Date(t);return d.getDate()+' '+MES[d.getMonth()]+' '+String(d.getFullYear()).slice(2)};
 $('tbl').innerHTML=`<thead><tr>${LCOLS.map(x=>`<th data-sort="${x.k}" class="${x.k===sortL.k?'sorted':''}">${x.n}${x.k===sortL.k?(sortL.dir>0?' ▲':' ▼'):''}</th>`).join('')}</tr></thead><tbody>${rows.map(([id,c])=>{
  const col=colById(colOf(c)),d=dueInfo(c),k=chk(c),q=n0(c.luxo)+n0(c.simp);
  return `<tr data-id="${esc(id)}"><td><div class="ttl">${esc(c.title||'Sem título')}</div>${c.sub?`<div class="note">${esc(c.sub)}</div>`:''}</td>
  <td><span class="stage"><i style="background:${PAL[col.c]||PAL.cinza}"></i>${esc(col.name)}</span></td>
  <td><div class="chips">${lbls(c).map(l=>lchip(l)).join('')}</div></td>
  <td>${d?`<span class="chip ${d.cls}">${esc(d.txt)}</span>`:'<span class="note">—</span>'}</td>
  <td>${c.prio?`<span class="chip ${c.prio}">${PRIO[c.prio]}</span>`:'<span class="note">—</span>'}</td>
  <td>${esc(c.resp||'—')}</td>
  <td class="num">${q?fmtN(q):'—'}</td>
  <td>${k.n?`<div class="mini"><div class="bar"><i style="width:${k.d/k.n*100}%;background:${k.d===k.n?'var(--green)':'var(--teal)'}"></i></div><span class="note">${k.d}/${k.n}</span></div>`:'<span class="note">—</span>'}</td>
  <td class="note">${fmtAt(c.atualizado||c.criado)}</td></tr>`}).join('')||`<tr><td colspan="${LCOLS.length}" class="note" style="text-align:center;padding:24px">Nenhum cartão com estes filtros.</td></tr>`}</tbody>`}

/* ===== calendário ===== */
function renderCal(){
 const first=new Date(calY,calM,1),start=new Date(first);start.setDate(1-((first.getDay()+6)%7));
 const byDay=new Map();let semPrazo=0;
 [...cards.entries()].filter(([,c])=>visible(c)).forEach(([id,c])=>{if(!parseD(c.prazo)){if(!isDone(c))semPrazo++;return}const k=c.prazo;if(!byDay.has(k))byDay.set(k,[]);byDay.get(k).push([id,c])});
 const td=isoD(today());let cells='';
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=isoD(d),ev=byDay.get(k)||[];
  cells+=`<div class="day${d.getMonth()!==calM?' out':''}${k===td?' today':''}"><span class="dn">${d.getDate()}</span>${ev.slice(0,4).map(([id,c])=>{const di=dueInfo(c);return `<div class="ev${isDone(c)?' done':(di&&di.cls==='late'?' late':'')}" data-id="${esc(id)}" title="${esc(c.title)} · ${esc(colById(colOf(c)).name)}">${esc(c.title)}</div>`}).join('')}${ev.length>4?`<div class="more" data-day="${k}">+${ev.length-4} mais</div>`:''}</div>`}
 $('vCal').innerHTML=`<div class="calhead"><button class="btn ghost sm" data-cal="-1" title="Mês anterior">◂</button><h3>${MESL[calM]} ${calY}</h3><button class="btn ghost sm" data-cal="1" title="Próximo mês">▸</button><button class="btn ghost sm" data-cal="0">Hoje</button></div>
 <div class="calwd">${['seg','ter','qua','qui','sex','sáb','dom'].map(x=>`<span>${x}</span>`).join('')}</div>
 <div class="calgrid">${cells}</div>
 <div class="calside">${semPrazo?`${semPrazo} pedido(s) em produção sem prazo não aparecem no calendário. Defina o prazo na janela do cartão.`:'Todos os pedidos em produção têm prazo.'}</div>`}

function render(){
 renderTop();
 if(view==='quadro')renderBoard();else if(view==='lista')renderList();else renderCal();
}
function setView(v){view=v;setPref('view',v);
 document.querySelectorAll('#views button').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
 $('vQuadro').hidden=v!=='quadro';$('vLista').hidden=v!=='lista';$('vCal').hidden=v!=='calendario';render()}

/* ===== janela do cartão ===== */
function openCard(id,col,prazo){
 const base=id?cards.get(id):null;if(id&&!base)return;
 const c=base?JSON.parse(JSON.stringify(base)):{title:'',sub:'',modelo:'',luxo:'',simp:'',foto:'',prazo:prazo||'',resp:'',prio:'media',notas:'',labels:[],col:col||(C().cols[0]||{}).id,check:(C().check||[]).map(t=>({t,d:false}))};
 if(!Array.isArray(c.check))c.check=[];if(!Array.isArray(c.labels))c.labels=[];
 modal={t:'card',id,c,confirm:false};renderModal()}
function renderModal(){
 const m=$('modal');
 if(!modal){m.innerHTML='';return}
 if(modal.t==='cfg')return renderCfg();
 if(modal.t==='pw')return renderPw();
 const c=modal.c,k=chk(c),cols=C().cols,fmtAt=t=>t?new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
 m.innerHTML=`<div class="ov"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="mt">
 <h2 id="mt">${modal.id?esc(c.title||'Cartão'):'Novo pedido'}</h2><div class="sub">${modal.id?'Edite as informações e clique em Salvar (Ctrl+Enter).':'Preencha o que souber agora; dá para completar depois.'}</div>
 <div class="dlgcols"><div>
 <div class="fg">
  <label class="full">Turma / cliente<input id="m-title" value="${esc(c.title)}" placeholder="Ex.: Direito · 2027.1"></label>
  <label class="full">Lista / instituição<input id="m-sub" value="${esc(c.sub)}" placeholder="Ex.: Direito UNEX"></label>
  <label>Etapa<select id="m-col">${cols.map(x=>`<option value="${esc(x.id)}"${x.id===colOf(c)?' selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
  <label>Modelo / tamanho<input id="m-modelo" list="modelos" value="${esc(c.modelo)}" placeholder="Ex.: 25x18 cm"></label>
  <label>Prazo de entrega<input id="m-prazo" type="date" value="${esc(c.prazo)}"></label>
  <label>Prioridade<select id="m-prio"><option value=""${c.prio?'':' selected'}>Sem prioridade</option>${Object.entries(PRIO).map(([k2,v])=>`<option value="${k2}"${c.prio===k2?' selected':''}>${v}</option>`).join('')}</select></label>
  <label class="full">Responsável<input id="m-resp" list="resps" value="${esc(c.resp)}" placeholder="Quem cuida deste pedido"></label>
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
 c.title=v('m-title').trim();c.sub=v('m-sub').trim();c.col=v('m-col');c.modelo=v('m-modelo').trim();c.prazo=v('m-prazo');c.prio=v('m-prio');c.resp=v('m-resp').trim();
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
 ${c.cols.map((col,i)=>`<div class="colrow"><span class="dot" style="background:${PAL[col.c]||PAL.cinza}"></span><input data-cn="${i}" value="${esc(col.name)}" aria-label="Nome da etapa"><select data-cc="${i}" aria-label="Cor">${Object.keys(PAL).map(k=>`<option value="${k}"${col.c===k?' selected':''}>${PALN[k]}</option>`).join('')}</select><button class="mv" data-up="${i}"${i===0?' disabled':''} title="Mover para a esquerda">↑</button><button class="mv" data-dn="${i}"${i===c.cols.length-1?' disabled':''} title="Mover para a direita">↓</button><button class="x" data-cdel="${i}"${used(col.id)||c.cols.length<2?' disabled':''} title="${used(col.id)?'Esvazie a etapa antes de excluir':'Excluir etapa'}">✕</button></div>`).join('')}
 <div class="addrow"><input id="c-newcol" placeholder="Nova etapa"><button class="btn ghost sm" data-act="addcol">Adicionar etapa</button></div>
 <p class="note">A última etapa conta como "Entregue" nos indicadores. Só dá para excluir uma etapa vazia.</p>
 <div class="sect">Checklist padrão dos novos cartões</div>
 <label>Um item por linha<textarea id="c-check" rows="8">${esc(c.check.join('\n'))}</textarea></label>
 <div class="acts"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-act="savecfg">Salvar</button></div></div></div>`}
function readCfg(){const c=modal.c;
 const b=$('c-brand');if(b)c.brand=b.value.trim();
 document.querySelectorAll('[data-cn]').forEach(e=>{c.cols[+e.dataset.cn].name=e.value});
 document.querySelectorAll('[data-cc]').forEach(e=>{c.cols[+e.dataset.cc].c=e.value});
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
 if(!t.closest('.menuwrap')&&!$('menu').hidden){$('menu').hidden=true;$('bMenu').setAttribute('aria-expanded','false')}
 if(t.id==='bMenu'){const mm=$('menu');mm.hidden=!mm.hidden;t.setAttribute('aria-expanded',String(!mm.hidden));return}
 if(t.dataset.m)return doMenu(t.dataset.m);
 if(t.dataset.goto){openFin();return}
 if(t.id==='bNew')return openCard(null);
 if(t.id==='bCfg')return openCfg();
 const vb=t.closest('#views button');if(vb)return setView(vb.dataset.view);
 if(!modal){
  const add=t.closest('[data-add]');if(add)return openCard(null,add.dataset.add);
  const fo=t.closest('[data-fold]');if(fo){folded.add(fo.dataset.fold);setPref('folded',[...folded]);return render()}
  const uf=t.closest('[data-unfold]');if(uf){folded.delete(uf.dataset.unfold);setPref('folded',[...folded]);return render()}
  const th=t.closest('th[data-sort]');if(th){const k=th.dataset.sort;if(sortL.k===k)sortL.dir*=-1;else{sortL.k=k;sortL.dir=1}return render()}
  if(t.dataset.cal!=null){const s=+t.dataset.cal;if(s===0){calY=new Date().getFullYear();calM=new Date().getMonth()}else{calM+=s;if(calM<0){calM=11;calY--}if(calM>11){calM=0;calY++}}return render()}
  const more=t.closest('[data-day]');if(more){F.q='';$('fq').value='';setView('lista');sortL.k='prazo';sortL.dir=1;return render()}
  const el=t.closest('[data-id]');if(el)return openCard(el.dataset.id);
  return}
 if(t.classList.contains('ov')&&downOv){modal=null;return renderModal()}
 const act=t.dataset.act;
 if(act==='close'){modal=null;window.api.trancar();return renderModal()}
 if(modal.t==='pw'&&act==='pwok')return submitPw();
 if(modal.t==='import'&&act==='doimport'){modal=null;renderModal();window.api.aplicarImport().then(r=>{if(r.ok)window.api.ir('producao')});return}
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
  if(t.dataset.up!=null){readCfg();const i=+t.dataset.up;[c.cols[i-1],c.cols[i]]=[c.cols[i],c.cols[i-1]];return renderCfg()}
  if(t.dataset.dn!=null){readCfg();const i=+t.dataset.dn;[c.cols[i+1],c.cols[i]]=[c.cols[i],c.cols[i+1]];return renderCfg()}
  if(t.dataset.cdel!=null&&!t.disabled){readCfg();c.cols.splice(+t.dataset.cdel,1);return renderCfg()}
  if(act==='addcol'){readCfg();const i=$('c-newcol'),v=i.value.trim();if(!v)return i.focus();c.cols.push({id:'k'+Date.now().toString(36),name:v,c:'teal'});return renderCfg()}
  if(act==='savecfg'){readCfg();c.cols.forEach(x=>{x.name=x.name.trim()||'Sem nome'});modal=null;renderModal();saveCfg(c);return toast('Quadro configurado')}
 }
});
document.addEventListener('dblclick',e=>{
 if(modal||view!=='calendario')return;const day=e.target.closest('.day');if(!day||e.target.closest('.ev'))return;
 const idx=[...day.parentElement.children].indexOf(day),first=new Date(calY,calM,1),start=new Date(first);start.setDate(1-((first.getDay()+6)%7));start.setDate(start.getDate()+idx);
 openCard(null,null,isoD(start))});
document.addEventListener('change',e=>{
 if(modal&&modal.t==='card'&&e.target.dataset.ck!=null){const i=+e.target.dataset.ck;modal.c.check[i].d=e.target.checked;e.target.parentElement.classList.toggle('d',e.target.checked);updCk()}
 if(modal&&modal.t==='cfg'&&e.target.dataset.cc!=null){readCfg();renderCfg()}
});
document.addEventListener('keydown',e=>{
 const ctrl=e.ctrlKey||e.metaKey;
 if(e.key==='Enter'&&modal&&modal.t==='pw'&&(e.target.id==='pw1'||e.target.id==='pw2')){e.preventDefault();return submitPw()}
 if(e.key==='Escape'){if(modal){modal=null;window.api.trancar();renderModal()}else if(!$('menu').hidden){$('menu').hidden=true}return}
 if(ctrl&&e.key==='Enter'&&modal&&modal.t==='card'){e.preventDefault();return saveModal()}
 if(ctrl&&(e.key==='n'||e.key==='N')&&!modal){e.preventDefault();return openCard(null)}
 if(ctrl&&(e.key==='f'||e.key==='F')&&!modal){e.preventDefault();$('fq').focus();$('fq').select();return}
 if(ctrl&&e.key>='1'&&e.key<='3'&&!modal){e.preventDefault();return setView(['quadro','lista','calendario'][+e.key-1])}
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
 if(col.classList.contains('slim'))return;const b=dropTarget(col,e.clientY);if(b)b.classList.add('before')});
board.addEventListener('dragleave',e=>{const col=e.target.closest('.col');if(col&&!col.contains(e.relatedTarget))col.classList.remove('over')});
board.addEventListener('drop',e=>{const colEl=e.target.closest('.col');if(!colEl||!dragId)return;e.preventDefault();
 const id=dragId,card=cards.get(id);if(!card)return;const col=colEl.dataset.col,before=colEl.classList.contains('slim')?null:dropTarget(colEl,e.clientY);clearMarks();
 const list=sorted([...cards.entries()].filter(([k,c])=>k!==id&&colOf(c)===col));
 let ord;
 if(!before)ord=(list.length?(list[list.length-1][1].ord||0):0)+1024;
 else{const i=list.findIndex(([k])=>k===before.dataset.id),nx=list[i][1].ord||0,pv=i>0?(list[i-1][1].ord||0):nx-2048;ord=(pv+nx)/2}
 if(card.col===col&&card.ord===ord)return;
 const next=Object.assign({},card,{col,ord,atualizado:Date.now()});
 if(col===lastCol()&&card.col!==col){next.entregueEm=Date.now();toast('Entregue: '+(card.title||''))}
 saveCard(id,next)});

init();
