/* Gestor · AÇÃO DE PREÇO — JS de TELA sobre a casca da aba Cliente (layout aprovado; decisão do BOSS 28/10: copiar antes de criar; o delta de desenho é do PICASSO).
   ZERO dado aqui. O TI chama desenharAcao(DADOS) — contrato em TI\CONTRATO_ACAO_PRECO_DADOS.md.
   ⛔ Trava do Léo (28/10): nunca produto em linha, nunca preço de referência externa — esta tela não tem campo de preço.
   Modo cliente: só lista e foto (sem custo, carteira, meses sem faturar, botões internos). Régua em texto: ruptura · ideal · alta. Piso de 11 px. */
(function(){
const $=id=>document.getElementById(id);
const fmt=n=>n==null||isNaN(n)?'—':Math.round(n).toLocaleString('pt-BR');
const dec=n=>n==null||isNaN(n)?'—':(+n).toFixed(1).replace('.',',');
const mil=n=>n==null||isNaN(n)?'—':n>=1e6?'R$ '+(n/1e6).toFixed(2).replace('.',',')+' mi':'R$ '+fmt(n/1000)+' mil';
const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MS2=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],mesN=m=>m?MS2[+String(m).slice(5,7)-1]+'/'+String(m).slice(2,4):'—',dm=s=>s?String(s).slice(8,10)+'/'+String(s).slice(5,7):'—';
const chama=(nome,...a)=>{try{if(typeof window[nome]==='function'){window[nome](...a);return true}}catch(e){console.error(nome,e)}return false};
const faixaCob=c=>c==null?'—':c<4?'ruptura':c<5?'ideal':'alta';
const cobCh=c=>c==null?'<span class="ch ch-n">—</span>':c<4?`<span class="ch ch-r">${dec(c)}</span>`:c<5?`<span class="ch ch-a">${dec(c)}</span>`:`<span class="ch ch-n">${dec(c)}</span>`;
// PICASSO v4 · status = ponto + palavra (Primer/Polaris), nunca chip colorido: fora de linha = ponto preto · ponta = cinza escuro · ação/rebaixo = cinza claro
const tagCl=t=>/fora/i.test(t||'')?'t-fl':/ponta/i.test(t||'')?'t-pt':'t-ac';
const stTag=t=>`<span class="st ${tagCl(t)}"><i aria-hidden="true"></i>${esc(t)}</span>`;
const cobN=c=>c==null||isNaN(c)?'<b class="tn nd">—</b>':`<b class="tn">${dec(c)}</b>`;   // skill §7.5: ausente = traço cinza; zero real = "0"
// fechado PICASSO × TI 28/10: número abre o giro do produto SÓ fora do modo cliente (o cliente nunca cai no Gestor atual)
const MODO=()=>!!D.modo_cliente||document.body.classList.contains('cliente');   // GAMER 28/10: em modo cliente o interno não entra no DOM (nem escondido)
const abreNum=(it,html)=>MODO()?html:`<span class="abre" role="button" tabindex="0" title="abrir o giro deste modelo" onclick="ACAO.tratar('${esc(it.ref)}','${esc(it.cor)}')">${html}</span>`;
const estN=e=>e==null||isNaN(e)?'<b class="tn nd">—</b>':`<b class="tn">${fmt(e)}</b>`;
let D={},MOSTRAR={};
const PER=[['bf','Black Friday'],['outlet','Outlet'],['queima','Queima'],['aniversario','Aniversário'],['promocao','Promoção']];
// a foto tenta uma URL por vez (cores da referência) e cai na silhueta
window.fotoOk=function(img){try{if(img.dataset.k)localStorage.setItem("acao_foto:"+img.dataset.k,img.src)}catch(e){}};
window.fotoErro=function(img){const L=(img.dataset.fotos||'').split('|').filter(Boolean),i=(+img.dataset.i||0)+1;if(i<L.length){img.dataset.i=i;img.src=L[i]}else{img.onerror=null;img.closest('.ft').classList.add('sem');img.remove()}};
const foto=it=>it.fotos&&it.fotos.length?`<div class="ft"><img src="${esc(it.fotos[0])}" data-fotos="${esc(it.fotos.join('|'))}" data-k="${esc(it.ref+'|'+(it.cor||''))}" alt="" loading="lazy" onload="fotoOk(this)" onerror="fotoErro(this)"></div>`:`<div class="ft sem"></div>`;
function topo(){const c=D.cliente||{},p=D.periodo||{};$('c_nome').textContent=c.nome||'—';document.title='Gestor · Ação de preço · '+(c.nome||'');
 $('c_sub').textContent=c.recorte||'';$('a_per').innerHTML=PER.map(([k,n])=>`<span class="${k===p.chave?'on':''}" role="button" tabindex="0" aria-pressed="${k===p.chave?'true':'false'}" onclick="ACAO.per('${k}')">${n}</span>`).join('');
 const av=D.aviso;$('a_aviso').hidden=!av;if(av){$('a_aviso').innerHTML=`<b>${esc(av.titulo)}</b><small> · ${esc(av.detalhe||'')}</small>`}
 $('a_regra').textContent=D.regra||'';}
function filtros(){const F=D.familias||[],f=(D.filtro||{}).familia||null;
 $('a_fam').innerHTML=`<span class="${!f?'on':''}" role="button" tabindex="0" aria-pressed="${!f?'true':'false'}" onclick="ACAO.fam(null)">Todas</span>`+F.map(x=>`<span class="${f===x.chave?'on':''}" role="button" tabindex="0" aria-pressed="${f===x.chave?'true':'false'}" onclick="ACAO.fam('${esc(x.chave)}')">${esc(x.nome)} <small>${fmt(x.n)}</small></span>`).join('');
 const b=$('a_busca');if(b&&b.value!==((D.filtro||{}).busca||''))b.value=(D.filtro||{}).busca||'';}
function resumo(){const T=D.tipos||[],tot=T.reduce((s,t)=>s+(t.n||0),0),est=T.reduce((s,t)=>s+(t.estoque||0),0);
 // PICASSO v4: abas de visão com contagem (Polaris IndexFilters / Linear) — o número abre a lista (.abre); o total vai numa linha cinza
 $('a_res').innerHTML=T.length?`<div class="a-abas" role="tablist" aria-label="listas da ação">`+T.map(t=>`<button type="button" class="a-aba" role="tab" title="${fmt(t.estoque)} em estoque" onclick="ACAO.vai('${esc(t.tipo)}')"><span class="nm">${esc(t.nome_tela)}</span><b class="${MODO()?'':'abre'}">${fmt(t.n)}</b></button>`).join('')+`</div><div class="a-tot">total <b>${fmt(tot)}</b> modelos-cor · <b>${fmt(est)}</b> em estoque</div>`:'';
 const ex=D.excluidos_em_linha||0,ax=$('a_exc');if(ax)ax.textContent=ex?`${ex} ${ex===1?'item':'itens'} que a regra do banco trouxe pelo corte de estoque, mas ainda vendem (menos de 6 meses sem faturar): ficaram de fora — ação de preço nunca leva produto em linha.`:'';}
function listas(){const T=D.tipos||[],u=it=>it.unidade||'pares';
 $('a_listas').innerHTML=T.map(t=>{const L=t.itens||[],k=t.tipo.replace(/\W/g,'_'),n=MOSTRAR[k]?L.length:12;
  const rows=L.slice(0,n).map(it=>`<div class="row1 ac${it.segurar?' seg':''}">${foto(it)}<div class="nm"><b class="mo">${esc(it.modelo)}</b><small class="mt">${esc(it.cor_nome)} · ${esc(it.ref)}</small><span class="tgs">${stTag(it.tag)}${!MODO()&&it.segurar?'<span class="sg interno" title="carteira chegando: não se promove o que está chegando"><i aria-hidden="true"></i>segurar</span>':''}</span><small class="dt">${esc(it.familia)}${it.genero?' · '+esc(it.genero).toLowerCase():''} · vende ${fmt(it.venda_mes)}/mês (média de 3 meses)${it.ult_venda?' · última venda '+mesN(it.ult_venda):''}${!MODO()&&it.meses_sem_fat!=null?' · <span class="interno">'+fmt(it.meses_sem_fat)+' meses sem faturar'+(it.ult_fat?' (último '+mesN(it.ult_fat)+')':'')+'</span>':''}</small></div><div class="num">${abreNum(it,cobN(it.cobertura))}<small>${faixaCob(it.cobertura)}</small></div><div class="num">${abreNum(it,estN(it.estoque))}<small>${u(it)}</small></div>${MODO()?'':`<div class="num interno">${it.valor_estoque!=null?mil(it.valor_estoque):'—'}<small>custo</small><a class="trt" href="#" onclick="return ACAO.tratar('${esc(it.ref)}','${esc(it.cor)}')" title="abrir a carteira e o giro deste modelo">giro</a></div>`}</div>`).join('');
  return `<div class="sec" id="sec_${k}"><h2>${esc(t.nome_tela)}</h2><span class="hora ms-auto">${esc(t.explicacao||'')}</span></div>
  <div class="pn lista acl"><div class="d-flex align-items-center flex-wrap gap-2"><h3>${fmt(t.n)} modelos-cor · ${fmt(t.estoque)} em estoque${!MODO()&&t.valor_estoque!=null?'<span class="interno"> · '+mil(t.valor_estoque)+' custo</span>':''}</h3><span class="ms-auto hora">${(D.bases||{}).venda?'venda média '+esc(D.bases.venda):''}${(D.bases||{}).giro?' · estoque '+mesN(D.bases.giro):''}</span></div>
   <div class="row1 hd ac"><div></div><div>Modelo · cor</div><div class="num">Cob.</div><div class="num">Estoque</div>${MODO()?'':'<div class="num interno">Custo</div>'}</div>
   ${rows||'<div class="text-secondary small mt-2">nenhum modelo-cor neste tipo para o filtro</div>'}
   ${L.length>12?`<a class="mais abre" href="#" onclick="ACAO.mais('${k}');return false">${MOSTRAR[k]?'− mostrar só 12':'+ '+(L.length-12)+' modelos-cor'}</a>`:''}</div>`}).join('')||'<div class="pn"><div class="text-secondary">sem produto para ação de preço neste cliente</div></div>';}
window.ACAO={
 per:k=>{chama('onPeriodo',k)},fam:k=>{chama('onFamilia',k)},busca:v=>{clearTimeout(ACAO._t);ACAO._t=setTimeout(()=>chama('onBusca',v),250)},
 mais:k=>{MOSTRAR[k]=!MOSTRAR[k];listas()},vai:t=>{const el=$('sec_'+t.replace(/\W/g,'_'));if(el)el.scrollIntoView({behavior:'smooth',block:'start',inline:'nearest'})},
 tratar:(ref,cor)=>!chama('onTratar',ref,cor),acao:n=>{if(chama('onAcao',n,{cliente:(D.cliente||{}).codigo||null,periodo:(D.periodo||{}).chave}))return;if(n==='exportar_pdf')window.print()}
};
window.desenharAcao=function(d){D=d||{};if(MODO()){const r=$('rodape');if(r)r.textContent='Gestor · ação de preço';const x=$('a_exc');if(x)x.remove();}const passo=(n,f)=>{try{f()}catch(e){console.error('desenharAcao · '+n,e)}};passo('topo',topo);passo('filtros',filtros);passo('resumo',resumo);passo('listas',listas)};
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){const b=$('a_busca');if(b){e.preventDefault();b.focus();b.select()}}});   // PICASSO v4: busca com Ctrl K
if(new URLSearchParams(location.search).get('modo')==='cliente')document.body.classList.add('cliente');
desenharAcao(window.DADOS||{});
})();
