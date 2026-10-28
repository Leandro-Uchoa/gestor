/* Gestor · TRADE — JS de TELA sobre a casca da aba Cliente (copiar antes de criar; o delta de desenho é do PICASSO).
   ZERO dado aqui. O TI chama desenharTrade(DADOS) — contrato em TI\CONTRATO_TRADE_DADOS.md.
   Pedido do Léo via TRADE: VERBA TOTAL · CONSUMIDO · SALDO na frente, só aprovadas contam; "arquivada some da frente" e volta pelo chip "arquivadas".
   v2 (GAMER 28/10): todo número abre o detalhe (cartão → "como se chega"; linha → ficha da ação); clique por data-atributo (nome com apóstrofo não quebra);
   gravação redesenha SÓ a linha; falha avisa na linha e não apaga o que se digitou; "Desfazer" no aviso por 5 s; passo 1 mostra "—" no que ainda não veio.
   Piso 11 px; toque ≥ 44 px. ⛔ Nunca em ?modo=cliente. */
(function(){
const $=id=>document.getElementById(id);
const fmt=n=>n==null||isNaN(n)?'—':Math.round(n).toLocaleString('pt-BR');
const rs=n=>n==null||isNaN(n)?'—':'R$ '+(+n).toLocaleString('pt-BR',{minimumFractionDigits:Number.isInteger(+n)?0:2,maximumFractionDigits:2});
const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dm=s=>s?String(s).slice(8,10)+'/'+String(s).slice(5,7)+'/'+String(s).slice(2,4):'—';
const hhmm=s=>{if(!s)return '—';const d=new Date(s);return isNaN(d)?'—':d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
const chama=(nome,...a)=>{try{if(typeof window[nome]==='function'){window[nome](...a);return true}}catch(e){console.error(nome,e)}return false};
const STATUS=['planejada','em andamento','feita','não usada','arquivada'],ROTULO={arquivada:'arquivar'};
const bt=(act,v,cls,inner,title)=>`<span class="${cls}" role="button" tabindex="0" data-act="${act}"${v!=null?` data-v="${esc(v)}"`:''}${title?` title="${esc(title)}"`:''}>${inner}</span>`;
let D={},NOTA={},DET={},EXPL=null,TOAST_T=null;
function topo(){$('c_nome').textContent=D.semestre?'Trade · '+D.semestre:'Trade';document.title='Gestor · Trade'+(D.semestre?' · '+D.semestre:'');
 const c=D.controle||{},cg=D.carga||{};$('c_sub').innerHTML=[c.arquivo?'planilha '+esc(c.arquivo):(cg.arquivo?'planilha '+esc(cg.arquivo):'sem carga da planilha de verbas'),c.lida_em?'verba lida '+esc(hhmm(c.lida_em)):null,cg.carregado_em?'carga de '+esc(hhmm(cg.carregado_em)):null,D.n_total!=null?bt('status','tudo','abre',fmt(D.n_total)+' ações no semestre','ver todas, inclusive as arquivadas'):(D.verba&&D.verba.parcial?'— ações no semestre':null)].filter(Boolean).join(' · ');
 const av=D.aviso,ld=D.carregando,fl=D.falhas,el=$('a_aviso');el.hidden=!(av||ld||fl);
 if(av)el.innerHTML=`<b>${esc(av.titulo)}</b><small> · ${esc(av.detalhe||'')}</small>`;else if(ld)el.innerHTML=`<b>Carregando ${esc(ld.rotulo||'')}…</b><small> · passo ${ld.passo} de ${ld.total}${ld.passo>=1?' · verba e saldo já valem; as ações chegam em seguida':''}</small>`;else if(fl)el.innerHTML=`<b>Parte do dado não veio</b><small> · ${esc(Object.keys(fl).map(k=>({acoes:'lista de ações'})[k]||k).join(', '))} sem resposta do banco — ${bt('acao','recarregar','lk','tentar de novo')}</small>`;
 $('a_regra').textContent=D.regra||'';}
function placar(){const v=D.verba||{},c=D.controle||{},semV=!!v.sem_verba||v.total==null,par=!!v.parcial;const st=(D.filtros||{}).status_sel||[];
 const card=(cls,tit,val,sub,on,act,vv,title)=>`<div class="tr-card ${cls}${on?' on':''}${EXPL===vv&&act==='expl'?' on':''}"><div class="t">${tit}</div><div class="num">${bt(act,vv,'abre',val,title)}</div><small>${sub}</small></div>`;
 const aprov=st.length===2&&st.includes('feita')&&st.includes('em andamento');
 const subC=par?'feita — · em andamento — · — aprovadas':`${bt('status','feita','lk','feita '+rs(v.feita),'ver as feitas')} · ${bt('status','em andamento','lk','em andamento '+rs(v.em_andamento),'ver as em andamento')} · ${bt('status','aprovadas','lk',fmt(v.n_aprovadas)+' '+(v.n_aprovadas===1?'ação aprovada':'ações aprovadas'),'ver as aprovadas')}`;
 $('a_placar').innerHTML=semV?`${card('','Verba total','—','sem verba lançada para este semestre',false,'expl','verba','de onde vem a verba')}${card('','Consumido',rs(v.consumido),subC,aprov,'status','aprovadas','ver as ações aprovadas')}${card('','Saldo','—','precisa da verba do semestre',false,'expl','saldo','como se chega ao saldo')}`
  :`${card('','Verba total',rs(v.total),`${esc(c.rotulo||'verba do semestre')}${c.celula?' · célula '+esc(c.celula):''}`,false,'expl','verba','de onde vem a verba')}${card('','Consumido',rs(v.consumido),subC,aprov,'status','aprovadas','ver as ações aprovadas')}${card(v.saldo<0?'neg':'','Saldo',rs(v.saldo),c.bate?'bate com a planilha':(c.saldo_planilha!=null?`planilha ${rs(c.saldo_planilha)} · difere ${rs(Math.abs(c.diferenca||0))}`:'planilha sem saldo lido'),false,'expl','saldo','como se chega ao saldo')}`;
 const pill=(k,v2,inner,title,clic)=>clic?bt('status',k,'abre'+(st.length===1&&st[0]===k?' on':''),inner,title):`<span class="pl"${title?` title="${esc(title)}"`:''}>${inner}</span>`;   /* pílula com 0 não leva a lista vazia: a provisionada abre a conta do em aberto */
 $('a_sec').innerHTML=par?`<span class="pl">provisionada <b>—</b></span><span class="pl">em aberto <b>—</b></span><span class="pl">arquivadas <b>—</b></span>`
  :`${v.n_planejada?pill('planejada',null,'provisionada <b>'+rs(v.provisionada)+'</b>','ações planejadas: provisionadas, ainda não aprovadas',true):bt('expl','aberto','abre'+(EXPL==='aberto'?' on':''),'provisionada <b>'+rs(v.provisionada)+'</b>','nenhuma planejada: veja a conta do em aberto')}${v.em_aberto!=null?bt('expl','aberto','abre'+(EXPL==='aberto'?' on':'')+(v.em_aberto<0?' neg':''),'em aberto <b>'+rs(v.em_aberto)+'</b>','verba − consumido − provisionada'):''}${pill('arquivada',null,'arquivadas <b>'+fmt(v.arquivadas&&v.arquivadas.n)+'</b>'+(v.arquivadas&&v.arquivadas.valor?' <small>'+rs(v.arquivadas.valor)+'</small>':''),'arquivadas somem da frente; toque para ver',!!(v.arquivadas&&v.arquivadas.n))}${v.nao_usada&&v.nao_usada.n?pill('não usada',null,'não usada <b>'+fmt(v.nao_usada.n)+'</b> <small>'+rs(v.nao_usada.valor)+'</small>','',true):''}`;
 explica();}
// "como se chega": a conta por trás de cada número do placar
function explica(){const el=$('a_expl');if(!el)return;const v=D.verba||{},c=D.controle||{},L=D.acoes||[],k=EXPL;if(!k||v.parcial){el.hidden=true;el.innerHTML='';return}
 const porStatus=()=>{const m=new Map();for(const a of L){const s=a.status_tela;const o=m.get(s)||{n:0,p:0,u:0,r:0};o.n++;o.p+=a.provisionado||0;o.u+=a.utilizada||0;o.r+=a.restante||0;m.set(s,o)}return[...m.entries()]};
 const porVend=()=>{const m=new Map();for(const a of L){const s=a.vendedor||'—';const o=m.get(s)||{n:0,p:0};o.n++;o.p+=a.provisionado||0;m.set(s,o)}return[...m.entries()].sort((x,y)=>y[1].p-x[1].p)};
 const linhas={
  verba:()=>[['Verba total do semestre',rs(v.total)],['De onde vem',`${esc(c.rotulo||'—')}${c.celula?' · célula '+esc(c.celula):''}${c.arquivo?' · '+esc(c.arquivo):''}`],['Lida em',hhmm(c.lida_em)],['Soma das ações na frente',rs(L.reduce((s,a)=>s+(a.provisionado||0),0))+' <small>(a verba é o teto do semestre, não a soma das ações)</small>']],
  saldo:()=>[['Verba total',rs(v.total)],['− consumido (feita + em andamento)',rs(v.consumido)],['= saldo',`<b>${rs(v.saldo)}</b>`],['Saldo recalculado da planilha',c.saldo_planilha!=null?rs(c.saldo_planilha)+(c.bate?' · bate':' · difere '+rs(Math.abs(c.diferenca||0))):'—'],['O que a célula SALDO mostrava',c.saldo_celula!=null?rs(c.saldo_celula)+' <small>(cache do Excel; só conferência)</small>':'—']],
  aberto:()=>[['Verba total',rs(v.total)],['− consumido',rs(v.consumido)],['− provisionada (planejada)',rs(v.provisionada)],['= em aberto',`<b>${rs(v.em_aberto)}</b>`]],
  lista:()=>porStatus().map(([s,o])=>[s,`${fmt(o.n)} ${o.n===1?'ação':'ações'} · ${rs(o.p)}`]).concat([['Total na frente',`<b>${fmt(L.length)} · ${rs(L.reduce((s,a)=>s+(a.provisionado||0),0))}</b>`]]),
  rodape:()=>porStatus().map(([s,o])=>[s,`${fmt(o.n)} · provisionado ${rs(o.p)} · utilizada ${rs(o.u)} · restante ${rs(o.r)}`]).concat(porVend().map(([s,o])=>['vendedor '+esc(s),`${fmt(o.n)} · ${rs(o.p)}`])),
 };
 const tit={verba:'Verba total · de onde vem',saldo:'Saldo · como se chega',aberto:'Em aberto · como se chega',lista:'Ações na frente · por status',rodape:'Totais · por status e por vendedor'};
 const f=linhas[k];if(!f){el.hidden=true;return}el.hidden=false;el.innerHTML=`<div class="hd"><b>${tit[k]||k}</b>${bt('expl',k,'fx','fechar','fechar')}</div>`+f().map(([a,b])=>`<div class="ln"><span>${a}</span><span>${b}</span></div>`).join('');}
function filtros(){const F=D.filtros||{},vs=F.vendedor||[],ss=F.status_sel||[];
 $('a_vend').innerHTML=bt('vendedor','',vs.length?'':'on','todos')+(F.vendedores||[]).map(v=>bt('vendedor',v.nome,vs.includes(v.nome)?'on':'',`${esc(v.nome)} <small>${fmt(v.n)}</small>`)).join('');
 $('a_st').innerHTML=bt('status','',ss.length?'':'on','todas','todas menos as arquivadas')+(F.status||[]).map(s=>bt('status',s.chave,(ss.includes(s.chave)?'on':'')+(s.chave==='arquivada'?' arq':''),`${esc(s.rotulo)} <small>${fmt(s.n)}</small>`,s.chave==='arquivada'?'arquivadas somem da frente; este chip as traz de volta':'')).join('');
 const b=$('a_busca');if(b&&b.value!==(F.busca||'')&&document.activeElement!==b)b.value=F.busca||'';}
function ficha(a){const campo=(r,v)=>v==null||v===''?'':`<div class="ln"><span>${r}</span><span>${v}</span></div>`;
 return `<div class="det">${campo('Provisionado',rs(a.provisionado)+' <small>(a planilha de verbas)</small>')}${campo('Utilizada',a.utilizada!=null?rs(a.utilizada):'— <small>(sem apuração lançada)</small>')}${campo('Restante',a.restante!=null?rs(a.restante)+(a.utilizada!=null?' <small>= provisionado − utilizada</small>':''):'—')}${campo('Portas',a.portas!=null?fmt(a.portas)+' <small>(da planilha de verbas; as lojas de verdade estão na aba Cliente)</small>':null)}${campo('Meta',a.meta_pares?fmt(a.meta_pares)+' pares':a.meta)}${campo('Período',a.periodo_ini||a.periodo_fim?`${a.periodo_ini?dm(a.periodo_ini):'—'} → ${a.periodo_fim?dm(a.periodo_fim):'—'}`:a.periodo)}${campo('Mecânica',esc(a.mecanica))}${campo('Produtos',esc(a.produtos))}${campo('Objetivo',esc(a.objetivo))}${campo('Aprovação',esc(a.aprovacao))}${campo('Próximo passo',esc(a.proximo))}${campo('Loja',esc(a.loja))}${campo('Status na planilha',esc(a.status_planilha))}${campo('Nota',esc(a.nota))}${campo('Fonte',esc(a.fonte))}${campo('Registro',`${a.criado_por?esc(a.criado_por)+' · ':''}criada ${hhmm(a.criado_em)} · mexida ${hhmm(a.atualizado_em)}`)}<div class="ln"><span></span><span>${bt('cliente',a.cliente,'lk','abrir a aba Cliente ›')}</span></div></div>`}
function linha(a){const ab=!!DET[a.id];
 return `<div class="row1 tr st-${esc(a.status_tela).replace(/\s/g,'-')}${a.arquivada?' arq':''}${ab?' ab':''}" data-id="${a.id}">
  <div class="nm">${bt('cliente',a.cliente,'cli abre',esc(a.nome),'abrir a aba Cliente')}<small class="mt">${esc(a.vendedor||'—')}${a.portas!=null?' · '+bt('det',a.id,'lk',fmt(a.portas)+(a.portas===1?' porta':' portas'),'ficha da ação'):''}</small></div>
  <div class="es"><i class="barra" style="--w:${a.pct}%"></i>${bt('det',a.id,'tt abre',esc(a.titulo),'ficha da ação')}${a.tipo&&a.tipo!=='outro'?` <span class="selo tp">${esc(a.tipo)}</span>`:''}${a.periodo_ini||a.periodo_fim?`<small class="dt">${bt('det',a.id,'lk',(a.periodo_ini?dm(a.periodo_ini):'—')+' → '+(a.periodo_fim?dm(a.periodo_fim):'—')+(a.meta_pares?' · meta '+fmt(a.meta_pares)+' pares':''),'ficha da ação')}</small>`:(a.periodo?`<small class="dt">${bt('det',a.id,'lk',esc(a.periodo),'ficha da ação')}</small>`:'')}${a.nota?bt('nota',a.id,'nota'+(NOTA[a.id]?' aberta':''),esc(a.nota),'a nota dos e-mails; toque para ler inteira'):''}</div>
  <div class="num">${bt('det',a.id,'tn abre',rs(a.provisionado),'ficha da ação')}<small>provisionado</small></div><div class="num">${bt('det',a.id,'tn abre',a.utilizada!=null?rs(a.utilizada):'—','ficha da ação')}<small>utilizada</small></div><div class="num">${bt('det',a.id,'tn abre'+(a.restante!=null&&a.restante<0?' neg':''),a.restante!=null?rs(a.restante):'—','ficha da ação')}<small>restante</small></div>
  <div class="st"><select aria-label="status de ${esc(a.titulo)}" onchange="TRADE.statusDe(${+a.id},this.value)">${STATUS.map(s=>`<option value="${s}" ${s===a.status_tela?'selected':''}>${ROTULO[s]||s}</option>`).join('')}</select><textarea class="atu" rows="1" aria-label="sua atualização" placeholder="sua atualização… (Enter grava)" data-antes="${esc(a.atualizacao||'')}" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();this.blur()}" onblur="TRADE.atualizacao(${+a.id},this)">${esc(a.atualizacao||'')}</textarea><div class="msg" hidden></div></div>
  ${ab?ficha(a):''}
 </div>`}
function cabecalho(){const L=D.acoes||[],F=D.filtros||{},filtrado=(F.vendedor||[]).length||(F.status_sel||[]).length||F.busca,par=(D.verba||{}).parcial;
 return `<h3>${par?'carregando as ações…':bt('expl','lista','abre'+(EXPL==='lista'?' on':''),fmt(L.length)+' '+(L.length===1?'ação':'ações'),'por status')+(filtrado?` <span class="hora">de ${fmt(D.n_total)} no semestre</span>`:'')}</h3><span class="ms-auto hora">${(F.status_sel||[]).includes('arquivada')?'arquivadas à vista':'arquivadas fora da frente'}</span>`}
function rodape(){const L=D.acoes||[],T=D.totais||{};if(!L.length)return '';
 return `<div>${bt('expl','rodape','abre'+(EXPL==='rodape'?' on':''),fmt(L.length)+' '+(L.length===1?'ação':'ações'),'por status e por vendedor')}</div><div></div><div class="num">${bt('expl','rodape','tn abre',rs(T.provisionado),'por status e por vendedor')}</div><div class="num">${bt('expl','rodape','tn abre',rs(T.utilizada),'por status e por vendedor')}</div><div class="num">${bt('expl','rodape','tn abre',rs(T.restante),'por status e por vendedor')}</div><div></div>`}
function lista(){const L=D.acoes||[],par=(D.verba||{}).parcial;
 $('a_lista').innerHTML=`<div class="pn lista trl"><div class="d-flex align-items-center flex-wrap gap-2" id="a_h3">${cabecalho()}</div>
  <div class="row1 hd tr"><div>Cliente · vendedor</div><div>Estratégia</div><div class="num">Provisionado</div><div class="num">Utilizada</div><div class="num">Restante</div><div>Status · atualização</div></div>
  <div id="a_rows">${par?'<div class="text-secondary small mt-2">as ações chegam em seguida…</div>':(L.map(linha).join('')||'<div class="text-secondary small mt-2">nenhuma ação de trade com esses filtros</div>')}</div>
  <div class="row1 ft tr" id="a_ft"${L.length?'':' hidden'}>${rodape()}</div>
 </div>`;}
// redesenha SÓ a linha gravada (GAMER: o que se digita noutra linha não pode sumir); a linha que saiu da frente é removida
function linhaSo(id){const row=document.querySelector(`.row1.tr[data-id="${id}"]`),a=(D.acoes||[]).find(x=>+x.id===+id);
 if(row&&a)row.outerHTML=linha(a);else if(row)row.remove();else if(a&&$('a_rows'))$('a_rows').insertAdjacentHTML('beforeend',linha(a));
 if($('a_h3'))$('a_h3').innerHTML=cabecalho();const ft=$('a_ft');if(ft){ft.innerHTML=rodape();ft.hidden=!(D.acoes||[]).length}
 if($('a_rows')&&!(D.acoes||[]).length)$('a_rows').innerHTML='<div class="text-secondary small mt-2">nenhuma ação de trade com esses filtros</div>';}
// aviso de gravação: toast fixo (na vista mesmo com a lista rolada), com "Desfazer" por 5 s; a falha também fica escrita na linha
function toast(g){let el=$('a_toast');if(!el){el=document.createElement('div');el.id='a_toast';el.className='tr-toast';document.body.appendChild(el)}
 clearTimeout(TOAST_T);if(!g){el.hidden=true;return}
 el.hidden=false;el.className='tr-toast'+(g.erro?' erro':'');el.innerHTML=`<span>${g.erro?'<b>Não gravou</b> · '+esc(g.erro):'<b>Gravado</b> · '+esc(g.texto||'')}</span>${g.desfazer?bt('desfazer',null,'mb-bt sec','Desfazer'):''}${bt('toast',null,'fx','fechar','fechar')}`;
 TOAST_T=setTimeout(()=>{el.hidden=true},g.erro?8000:5000);
 if(g.erro&&g.id!=null){const m=document.querySelector(`.row1.tr[data-id="${g.id}"] .msg`);if(m){m.hidden=false;m.textContent='não gravou: '+g.erro}}
 else if(g.id!=null){const m=document.querySelector(`.row1.tr[data-id="${g.id}"] .msg`);if(m){m.hidden=true;m.textContent=''}}}
// cliques por data-atributo (um apóstrofo no nome do cliente ou do vendedor não quebra nada)
function agir(el){const act=el.dataset.act,v=el.dataset.v;
 if(act==='status')TRADE.status(v===''?null:v);else if(act==='vendedor')TRADE.vendedor(v===''?null:v);else if(act==='cliente')TRADE.cliente(v);
 else if(act==='nota')TRADE.nota(+v);else if(act==='det')TRADE.det(+v);else if(act==='expl')TRADE.explica(v);else if(act==='acao')TRADE.acao(v);
 else if(act==='desfazer')TRADE.desfazer();else if(act==='toast')toast(null);}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(el){e.preventDefault();agir(el)}});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const el=e.target.closest('[data-act][role=button]');if(el){e.preventDefault();agir(el)}});
window.TRADE={
 semestre:k=>{chama('onSemestre',k)},
 vendedor:v=>{const F=D.filtros||{},cur=(F.vendedor||[]).slice();let nv;if(v==null)nv=[];else if(cur.includes(v))nv=cur.filter(x=>x!==v);else nv=cur.concat([v]);chama('onFiltro',{vendedor:nv,status:(F.status_sel||[]).slice(),busca:F.busca||''})},
 status:s=>{const F=D.filtros||{},cur=(F.status_sel||[]).slice();let ns;if(s==null)ns=[];else if(s==='tudo')ns=(F.status||[]).map(x=>x.chave);else if(s==='aprovadas')ns=cur.length===2&&cur.includes('feita')&&cur.includes('em andamento')?[]:['feita','em andamento'];else if(cur.includes(s))ns=cur.filter(x=>x!==s);else ns=cur.concat([s]);EXPL=null;chama('onFiltro',{vendedor:(F.vendedor||[]).slice(),status:ns,busca:F.busca||''});if(s)TRADE.vai('a_lista')},
 busca:t=>{clearTimeout(TRADE._t);TRADE._t=setTimeout(()=>{const F=D.filtros||{};chama('onFiltro',{vendedor:(F.vendedor||[]).slice(),status:(F.status_sel||[]).slice(),busca:String(t||'')})},150)},
 statusDe:(id,st)=>{chama('onStatus',id,st)},
 atualizacao:(id,el)=>{const v=el.value.trim();if(v===(el.dataset.antes||''))return;chama('onAtualizacao',id,v)},
 desfazer:()=>{toast(null);chama('onDesfazer')},
 nota:id=>{NOTA[id]=!NOTA[id];const el=document.querySelector(`.row1.tr[data-id="${id}"] .nota`);if(el)el.classList.toggle('aberta',!!NOTA[id])},
 det:id=>{DET[id]=!DET[id];linhaSo(id)},
 explica:k=>{EXPL=EXPL===k?null:k;placar();if($('a_h3'))$('a_h3').innerHTML=cabecalho();const ft=$('a_ft');if(ft)ft.innerHTML=rodape();if(EXPL&&['verba','saldo','aberto'].includes(EXPL))TRADE.vai('a_expl');else if(EXPL)TRADE.vai('a_expl')},
 cliente:c=>{chama('onAcao','cliente',{cliente:c})},
 acao:n=>{if(chama('onAcao',n,{semestre:D.semestre}))return;if(n==='exportar_pdf')window.print()},
 vai:id=>{const el=$(id);if(el)el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
};
window.desenharTrade=function(d){D=d||{};const passo=(n,f)=>{try{f()}catch(e){console.error('desenharTrade · '+n,e)}};
 if(D.so_linha!=null){const id=D.so_linha;D.so_linha=null;passo('topo',topo);passo('placar',placar);passo('filtros',filtros);passo('linha',()=>linhaSo(id))}
 else{passo('topo',topo);passo('placar',placar);passo('filtros',filtros);passo('lista',lista)}
 if(D.gravado){const g=D.gravado;D.gravado=null;passo('toast',()=>toast(g))}
 placeholder()};
function placeholder(){const b=$('a_busca');if(b)b.placeholder=innerWidth<576?'Buscar cliente ou ação':'Buscar cliente, estratégia, nota ou vendedor'}
addEventListener('resize',placeholder);
desenharTrade(window.DADOS||{});
})();
