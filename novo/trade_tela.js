/* Gestor · TRADE — JS de TELA sobre a casca da aba Cliente (copiar antes de criar; o delta de desenho é do PICASSO).
   ZERO dado aqui. O TI chama desenharTrade(DADOS) — contrato em TI\CONTRATO_TRADE_DADOS.md.
   Pedido do Léo via TRADE: VERBA TOTAL · CONSUMIDO · SALDO na frente, só aprovadas contam; "arquivada some da frente" e volta pelo chip "arquivadas".
   Cada ação numa linha: cliente, vendedor · portas, estratégia com a barra do provisionado, provisionado · utilizada · restante, status (select) e a
   sua atualização (campo, Enter grava). Piso 11 px; toque ≥ 44 px. ⛔ Nunca em ?modo=cliente. */
(function(){
const $=id=>document.getElementById(id);
const fmt=n=>n==null||isNaN(n)?'—':Math.round(n).toLocaleString('pt-BR');
const rs=n=>n==null||isNaN(n)?'—':'R$ '+(+n).toLocaleString('pt-BR',{minimumFractionDigits:Number.isInteger(+n)?0:2,maximumFractionDigits:2});
const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dm=s=>s?String(s).slice(8,10)+'/'+String(s).slice(5,7)+'/'+String(s).slice(2,4):'—';
const hhmm=s=>{if(!s)return '—';const d=new Date(s);return isNaN(d)?'—':d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
const chama=(nome,...a)=>{try{if(typeof window[nome]==='function'){window[nome](...a);return true}}catch(e){console.error(nome,e)}return false};
const STATUS=['planejada','em andamento','feita','não usada','arquivada'],ROTULO={arquivada:'arquivar'};
let D={},NOTA={};
function topo(){$('c_nome').textContent=D.semestre?'Trade · '+D.semestre:'Trade';document.title='Gestor · Trade'+(D.semestre?' · '+D.semestre:'');
 const c=D.controle||{},cg=D.carga||{};$('c_sub').innerHTML=[c.arquivo?'planilha '+esc(c.arquivo):(cg.arquivo?'planilha '+esc(cg.arquivo):'sem carga da planilha de verbas'),c.lida_em?'verba lida '+esc(hhmm(c.lida_em)):null,cg.carregado_em?'carga de '+esc(hhmm(cg.carregado_em)):null,D.n_total!=null?fmt(D.n_total)+' ações no semestre':null].filter(Boolean).join(' · ');
 const av=D.aviso,ld=D.carregando,fl=D.falhas,gv=D.gravado,el=$('a_aviso');el.hidden=!(av||ld||fl||gv);
 if(av)el.innerHTML=`<b>${esc(av.titulo)}</b><small> · ${esc(av.detalhe||'')}</small>`;else if(gv)el.innerHTML=gv.erro?`<b>Não gravou</b><small> · ${esc(gv.erro)}</small>`:`<b>Gravado</b><small> · ${esc(gv.texto||'')}</small>`;else if(ld)el.innerHTML=`<b>Carregando ${esc(ld.rotulo||'')}…</b><small> · passo ${ld.passo} de ${ld.total}${ld.passo>=1?' · verba e saldo já valem; as ações chegam em seguida':''}</small>`;else if(fl)el.innerHTML=`<b>Parte do dado não veio</b><small> · ${esc(Object.keys(fl).map(k=>({acoes:'lista de ações'})[k]||k).join(', '))} sem resposta do banco — <a href="#" onclick="TRADE.acao('recarregar');return false">tentar de novo</a></small>`;
 $('a_regra').textContent=D.regra||'';}
function placar(){const v=D.verba||{},c=D.controle||{},semV=!!v.sem_verba||v.total==null;const st=(D.filtros||{}).status_sel||[];
 const card=(cls,tit,val,sub,on,act)=>`<div class="tr-card ${cls}${on?' on':''}"><div class="t">${tit}</div><div class="num"><b class="abre" role="button" tabindex="0" onclick="${act}" title="ver as ações que compõem este número">${val}</b></div><small>${sub}</small></div>`;
 const aprov=st.length===2&&st.includes('feita')&&st.includes('em andamento'),plan=st.length===1&&st[0]==='planejada';
 $('a_placar').innerHTML=semV?`${card('',`Verba total`,'—','sem verba lançada para este semestre',false,"TRADE.status(null)")}${card('',`Consumido`,rs(v.consumido),`feita ${rs(v.feita)} · em andamento ${rs(v.em_andamento)} · ${fmt(v.n_aprovadas)} aprovadas`,aprov,"TRADE.status('aprovadas')")}${card('',`Saldo`,'—','precisa da verba do semestre',false,"TRADE.status(null)")}`
  :`${card('',`Verba total`,rs(v.total),`${esc(c.rotulo||'verba do semestre')}${c.celula?' · célula '+esc(c.celula):''}`,!st.length,"TRADE.status(null)")}${card('',`Consumido`,rs(v.consumido),`feita ${rs(v.feita)} · em andamento ${rs(v.em_andamento)} · ${fmt(v.n_aprovadas)} ${v.n_aprovadas===1?'ação aprovada':'ações aprovadas'}`,aprov,"TRADE.status('aprovadas')")}${card(v.saldo<0?'neg':'',`Saldo`,rs(v.saldo),c.bate?'bate com a planilha':(c.saldo_planilha!=null?`planilha ${rs(c.saldo_planilha)} · difere ${rs(Math.abs(c.diferenca||0))}`:'planilha sem saldo lido'),false,"TRADE.vai('a_lista')")}`;
 $('a_sec').innerHTML=`<span class="abre${plan?' on':''}" role="button" tabindex="0" onclick="TRADE.status('planejada')" title="ações planejadas: provisionadas, ainda não aprovadas">provisionada <b>${rs(v.provisionada)}</b></span>${v.em_aberto!=null?`<span title="verba − consumido − provisionada"${v.em_aberto<0?' class="neg"':''}>em aberto <b>${rs(v.em_aberto)}</b></span>`:''}<span class="abre${st.length===1&&st[0]==='arquivada'?' on':''}" role="button" tabindex="0" onclick="TRADE.status('arquivada')" title="arquivadas somem da frente; toque para ver">arquivadas <b>${fmt(v.arquivadas&&v.arquivadas.n)}</b>${v.arquivadas&&v.arquivadas.valor?` <small>${rs(v.arquivadas.valor)}</small>`:''}</span>${v.nao_usada&&v.nao_usada.n?`<span class="abre${st.length===1&&st[0]==='não usada'?' on':''}" role="button" tabindex="0" onclick="TRADE.status('não usada')">não usada <b>${fmt(v.nao_usada.n)}</b> <small>${rs(v.nao_usada.valor)}</small></span>`:''}${!semV&&c.saldo_celula!=null&&!c.bate?`<span class="hora" title="o que a célula SALDO da planilha mostrava ao ler (cache do Excel)">célula da planilha ${rs(c.saldo_celula)}</span>`:''}`;}
function filtros(){const F=D.filtros||{},vs=F.vendedor||[],ss=F.status_sel||[];
 $('a_vend').innerHTML=`<span class="${vs.length?'':'on'}" role="button" tabindex="0" onclick="TRADE.vendedor(null)">todos</span>`+(F.vendedores||[]).map(v=>`<span class="${vs.includes(v.nome)?'on':''}" role="button" tabindex="0" onclick="TRADE.vendedor('${esc(v.nome)}')">${esc(v.nome)} <small>${fmt(v.n)}</small></span>`).join('');
 $('a_st').innerHTML=`<span class="${ss.length?'':'on'}" role="button" tabindex="0" onclick="TRADE.status(null)" title="todas menos as arquivadas">todas</span>`+(F.status||[]).map(s=>`<span class="${ss.includes(s.chave)?'on':''}${s.chave==='arquivada'?' arq':''}" role="button" tabindex="0" onclick="TRADE.status('${esc(s.chave)}')" title="${s.chave==='arquivada'?'arquivadas somem da frente; este chip as traz de volta':''}">${esc(s.rotulo)} <small>${fmt(s.n)}</small></span>`).join('');
 const b=$('a_busca');if(b&&b.value!==(F.busca||'')&&document.activeElement!==b)b.value=F.busca||'';}
function linha(a){const pref=a.cliente?`onclick="TRADE.cliente('${esc(a.cliente)}')"`:'';
 return `<div class="row1 tr st-${esc(a.status_tela).replace(/\s/g,'-')}${a.arquivada?' arq':''}" data-id="${a.id}">
  <div class="nm"><button type="button" class="cli abre" ${pref} title="abrir a aba Cliente">${esc(a.nome)}</button><small class="mt">${esc(a.vendedor||'—')}${a.portas!=null?' · '+fmt(a.portas)+(a.portas===1?' porta':' portas'):''}</small></div>
  <div class="es"><i class="barra" style="--w:${a.pct}%"></i><b class="ti">${esc(a.titulo)}</b>${a.tipo&&a.tipo!=='outro'?` <span class="selo tp">${esc(a.tipo)}</span>`:''}${a.periodo_ini||a.periodo_fim?`<small class="dt">${a.periodo_ini?dm(a.periodo_ini):'—'} → ${a.periodo_fim?dm(a.periodo_fim):'—'}${a.meta_pares?' · meta '+fmt(a.meta_pares)+' pares':''}</small>`:(a.periodo?`<small class="dt">${esc(a.periodo)}</small>`:'')}${a.nota?`<small class="nota${NOTA[a.id]?' aberta':''}" role="button" tabindex="0" onclick="TRADE.nota(${a.id})" title="a nota dos e-mails; toque para ler inteira">${esc(a.nota)}</small>`:''}</div>
  <div class="num"><b class="tn">${rs(a.provisionado)}</b><small>provisionado</small></div><div class="num"><b class="tn">${a.utilizada!=null?rs(a.utilizada):'—'}</b><small>utilizada</small></div><div class="num"><b class="tn${a.restante!=null&&a.restante<0?' neg':''}">${a.restante!=null?rs(a.restante):'—'}</b><small>restante</small></div>
  <div class="st"><select aria-label="status de ${esc(a.titulo)}" onchange="TRADE.statusDe(${a.id},this.value)">${STATUS.map(s=>`<option value="${s}" ${s===a.status_tela?'selected':''}>${ROTULO[s]||s}</option>`).join('')}</select><input class="atu" aria-label="sua atualização" placeholder="sua atualização… (Enter grava)" value="${esc(a.atualizacao||'')}" data-antes="${esc(a.atualizacao||'')}" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="TRADE.atualizacao(${a.id},this)"></div>
 </div>`}
function lista(){const L=D.acoes||[],T=D.totais||{},F=D.filtros||{},filtrado=(F.vendedor||[]).length||(F.status_sel||[]).length||F.busca;
 $('a_lista').innerHTML=`<div class="pn lista trl"><div class="d-flex align-items-center flex-wrap gap-2"><h3>${fmt(L.length)} ${L.length===1?'ação':'ações'}${filtrado?` <span class="hora">de ${fmt(D.n_total)} no semestre</span>`:''}</h3><span class="ms-auto hora">${(F.status_sel||[]).includes('arquivada')?'arquivadas à vista':'arquivadas fora da frente'}</span></div>
  <div class="row1 hd tr"><div>Cliente · vendedor</div><div>Estratégia</div><div class="num">Provisionado</div><div class="num">Utilizada</div><div class="num">Restante</div><div>Status · atualização</div></div>
  ${L.map(linha).join('')||'<div class="text-secondary small mt-2">nenhuma ação de trade com esses filtros</div>'}
  ${L.length?`<div class="row1 ft tr"><div>${fmt(L.length)} ${L.length===1?'ação':'ações'}</div><div></div><div class="num"><b class="tn">${rs(T.provisionado)}</b></div><div class="num"><b class="tn">${rs(T.utilizada)}</b></div><div class="num"><b class="tn">${rs(T.restante)}</b></div><div></div></div>`:''}
 </div>`;}
window.TRADE={
 semestre:k=>{chama('onSemestre',k)},
 vendedor:v=>{const F=D.filtros||{},cur=(F.vendedor||[]).slice();let nv;if(v==null)nv=[];else if(cur.includes(v))nv=cur.filter(x=>x!==v);else nv=cur.concat([v]);chama('onFiltro',{vendedor:nv,status:(F.status_sel||[]).slice(),busca:F.busca||''})},
 status:s=>{const F=D.filtros||{},cur=(F.status_sel||[]).slice();let ns;if(s==null)ns=[];else if(s==='aprovadas')ns=cur.length===2&&cur.includes('feita')&&cur.includes('em andamento')?[]:['feita','em andamento'];else if(cur.includes(s))ns=cur.filter(x=>x!==s);else ns=cur.concat([s]);chama('onFiltro',{vendedor:(F.vendedor||[]).slice(),status:ns,busca:F.busca||''});if(s)TRADE.vai('a_lista')},
 busca:t=>{clearTimeout(TRADE._t);TRADE._t=setTimeout(()=>{const F=D.filtros||{};chama('onFiltro',{vendedor:(F.vendedor||[]).slice(),status:(F.status_sel||[]).slice(),busca:String(t||'')})},150)},
 statusDe:(id,st)=>{chama('onStatus',id,st)},
 atualizacao:(id,el)=>{const v=el.value.trim();if(v===(el.dataset.antes||''))return;chama('onAtualizacao',id,v)},
 nota:id=>{NOTA[id]=!NOTA[id];const el=document.querySelector(`.row1.tr[data-id="${id}"] .nota`);if(el)el.classList.toggle('aberta',!!NOTA[id])},
 cliente:c=>{chama('onAcao','cliente',{cliente:c})},
 acao:n=>{if(chama('onAcao',n,{semestre:D.semestre}))return;if(n==='exportar_pdf')window.print()},
 vai:id=>{const el=$(id);if(el)el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
};
window.desenharTrade=function(d){D=d||{};const passo=(n,f)=>{try{f()}catch(e){console.error('desenharTrade · '+n,e)}};passo('topo',topo);passo('placar',placar);passo('filtros',filtros);passo('lista',lista)};
desenharTrade(window.DADOS||{});
})();
