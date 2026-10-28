/* Gestor · aba Cliente — JS de TELA da casca de PARIDADE com o piloto cliente_v19 (aprovado pelo Léo). PICASSO, 27/10/2026, noite.
   ZERO dado aqui dentro. O TI chama  desenhar(DADOS)  depois do login e a cada troca de cliente.
   Todo campo é opcional: o que não vier aparece como "—" ou o bloco some (nunca número inventado).

   CONTRATO — campos que já existiam (o TI já entrega):
   ┌ cliente      { nome, codigo, lojas_ativas, cidade?, recorte?, marcas?:['OLY','UA'] }          → topo (nome · cidade · lojas · selos)
   ├ decidir      [ { id, texto, urgente, criado_em:'AAAA-MM-DD', bloco } ]  (ou topics)          → TOPICS largo, tratável
   ├ sem_bloco_topics? bool · prioridade? str|{titulo,detalhe} · fontes? · etiquetas?             → manchete (Conselho 0045) e legendas
   ├ agenda       [ { data:'AAAA-MM-DD', titulo, onde, tipo?:'reuniao'|'analise'|'trade'|'marco', link? } ]
   ├ carteira     { a_faturar, meses:[ { mes:'AAAA-MM', cart, base_em } ], outras? }
   ├ giro         { recorte, rotulo?, serie:[ { mes, v, e, parcial } ], estoque, estoque_mes, cobertura, cobertura_base, segmentos? }
   ├ anos         { lista, sellin, sellout, meta, estoque, sellin_carteira? }  (já filtrado pelo filtro ativo)
   └ filtro       { marca, tipo, genero, categoria }

   CAMPOS NOVOS (paridade com o v19) — lista completa e a receita de cada um em porte\CAMPOS_NOVOS_PARIDADE.md:
   ┌ hoje?        'AAAA-MM-DD' (dia de referência; sem ele, a data do navegador)
   ├ atas         [ { data, titulo } ]                                   → botão Atas: "N recentes · última dd/mm"
   ├ trade        { titulo, periodo, inicio:'AAAA-MM-DD', fim, investimento:R$, meta_pares } | null → faixa do trade (some se null)
   ├ carteira.valor  R$ total · carteira.meses[].valor R$ · carteira.meses[].estados { confirmada, aporte, atencao, cancelar } (nº de linhas)
   ├ carteira.familias [ { nome, meses:{'AAAA-MM':pares}, valor:R$ } ]  → "Carteira por família" (chinelo separado do tênis)
   ├ cobertura    { faixas?:{ ruptura:{pares,pct}, forcar:{…}, teto:{…} }, itens:[ITEM], base?:str,
   │                ponta?:{ pares, pct, itens:[ { modelo, cor, ref, venda, estoque, situacao, leitura, sem_faturar_desde } ], base?:str } }
   │                ITEM = { modelo, cor, ref, venda, estoque, cobertura, giro, carteira, fora_linha }
   ├ produtos     { base?:str, top:[P], aporte:[P], baixo:[P], tabela:[P], faixas:{ alto|medio|baixo|novo:{ modelos, pares, valor } },
   │                novos?:{ modelos, pares }, fora_sem_dispo?:[str] }
   │                P = { modelo, cor, cor_nome, ref, venda, estoque, giro(%), cobertura, carteira, valor, primeiro_fat, disponivel:{pares,data}|null, fora_linha }
   ├ metas        { base?:str, atual:'AAAA-MM', meses:{ 'AAAA-MM':{ <família>:[meta, potencial, pct, gap] } },
   │                trimestres?:{ 'AAAA-Tn':{ nome, meses:[…] } } }   famílias: 'TT CALCADOS (soma das faixas)', MEOLY, CHOLY, ACOLY, CFOLY,
   │                'TT FTW_UA', UA_ME, UA_CH, UA_AC, UA_CF (tênis em pares; o resto em R$)
   └ participacao { 'AAAA-MM'|'AAAA-Tn':{ tenis, meias, chinelo, acess, conf, ua } }  (R$, faturado + carteira do mês)

   EVENTOS (a casca chama, o TI atende; se não existir, nada quebra):
     window.onFiltro(filtro)            → recalcular DADOS.anos e chamar desenhar(DADOS) de novo
     window.onBro(contexto)             → abrir o painel IA existente (sem ele, abre a gaveta local do Bro)
     window.onTopico(acao, id, texto)   → 'feito' | 'orientar' | 'abrir' | 'novo'
     window.onTratar(ref, cor)          → "tratar" do giro baixo: abrir as linhas na carteira detalhada
     window.onAporte(ref, cor)          → selo verde "aporte": abrir o pedido de repasse no CMS PASS
     window.onAcao(nome, ctx)           → 'busca' · 'atas' · 'raiox' · 'pdf' · 'ag' · 'sugerir_pedido' · 'agenda' · 'giro_aba'
   Sem onAcao, os botões usam os endereços do v19 (#aba=atas&cliente=…, #aba=raiox…, #aba=cg…, #cms-pass/repasse…).
   "Sugerir pedido": o botão está na tela como no v19; a lógica espera o "pode seguir" do Léo (sem onAcao, avisa e não faz nada).
   Nenhum texto desta casca cita outro cliente nem a origem de um repasse.
*/
(function(){
const MS2=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],MSX=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const CORANO=['#ADAEB3','#787B86','#2E3EFC'];
const $=id=>document.getElementById(id);
const fmt=n=>n==null||isNaN(n)?'—':Math.round(n).toLocaleString('pt-BR');
const dec=n=>n==null||isNaN(n)?'—':(+n).toFixed(1).replace('.',',');
const mil=n=>n==null||isNaN(n)?'—':n>=1e6?'R$ '+(n/1e6).toFixed(2).replace('.',',')+' mi':'R$ '+fmt(n/1000)+' mil';
const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const chama=(nome,...a)=>{try{if(typeof window[nome]==='function'){window[nome](...a);return true}}catch(e){console.error(nome,e)}return false};
const dm=s=>s&&s!=='None'?String(s).slice(8,10)+'/'+String(s).slice(5,7):'—';
const mesN=m=>m?MS2[+String(m).slice(5,7)-1]+'/'+String(m).slice(2,4):'—';
let D={},CAM={so:1,si:1,mt:1,es:1},ANS={},FIL=null,AB=false,MM=null,COBF=null,CM=null,SD=null,MAIS={pre:false,bx:false};
const hoje=()=>D.hoje||new Date().toISOString().slice(0,10);
const cod=()=>encodeURIComponent((D.cliente||{}).codigo||'');
const nome=()=>(D.cliente||{}).nome||'cliente';

// ---------------- topo ----------------
function topo(){const c=D.cliente||{};$('c_nome').textContent=c.nome||'—';document.title='Gestor · '+(c.nome||'Cliente');
 $('c_sub').textContent=[c.cidade||null,c.lojas_ativas!=null?c.lojas_ativas+' lojas ativas':null,c.cidade?null:(c.recorte||null)].filter(Boolean).join(' · ')||'—';
 const mk=c.marcas||[];$('c_selos').innerHTML=(mk.includes('OLY')?'<span class="selo" style="background:#2E3EFC">Olympikus</span>':'')+(mk.includes('UA')?'<span class="selo" style="background:#fff;color:#000">Under Armour</span>':'');
 $('brctx').textContent=(c.nome||'—')+' · aba Cliente';
 $('b_atas').href='#aba=atas&cliente='+cod();$('b_raiox').href='#aba=raiox&cliente='+cod();$('b_ag').href='#aba=ag&cliente='+cod();
 const A=(D.atas||[]).slice().sort((a,b)=>a.data<b.data?1:-1);$('atmini').textContent=A.length?`${A.length} recentes · última ${dm(A[0].data)}`:'sem ata';
 $('mt_tit').textContent='Metas do '+(c.nome||'cliente')}
// ---------------- TOPICS ----------------
const escRe=x=>String(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const limpa=(t,b)=>{let x=String(t||'');if(b)x=x.replace(new RegExp('^\\s*'+escRe(b)+'\\s*[-–—:·]\\s*','i'),'');return x};
const ehCli=b=>{const n=((D.cliente||{}).nome||'').toUpperCase().replace(/\s+/g,''),bb=String(b||'').toUpperCase().replace(/\s+/g,'');return !bb||bb===n||n.startsWith(bb)||bb.startsWith(n)};
// segurança (TI, 27/10): o id do item nunca entra em código inline — vai em data-id e um único ouvinte trata os cliques
const ehTopic=t=>!String(t.id||'').startsWith('dec:');
let TODOS=false;
function decidir(){const L0=D.decidir||D.topics||[],LT=D.decidir_todos||null,L=TODOS&&LT?LT:L0;
 // selo: o total do TOPICS vem do TI (topics_pendentes); sem ele, conta só os itens do TOPICS (as linhas "dec:" da view não entram)
 const nT=D.topics_pendentes!=null?D.topics_pendentes:L.filter(ehTopic).length;$('c_ntp').textContent=nT+' no TOPICS';
 // cliente sem bloco no TOPICS: o bloco fica e diz isso por escrito (BOSS), nunca some calado
 if(D.sem_bloco_topics){$('c_dec_tit').innerHTML='<i class="ti ti-checklist"></i> TOPICS';$('c_ntp').textContent='sem bloco';
  $('tpl').innerHTML='<div class="it" style="border:0"><div style="opacity:.85">sem bloco no TOPICS para este cliente</div></div>';$('c_tp_lido').textContent='TOPICS · lido em '+dm(hoje());return}
 $('c_dec_tit').innerHTML=L.some(t=>t.urgente)?'<i class="ti ti-bolt"></i> O que decidir hoje':'<i class="ti ti-checklist"></i> TOPICS · sem urgente';
 $('tpnovo').placeholder='+ novo item para o '+nome()+' no TOPICS…';
 $('tpl').innerHTML=L.length?L.map((t,i)=>`<div class="it" data-id="${esc(t.id)}"><span class="pt ${t.urgente?'u':''}"></span><div style="flex:1"><b>${esc(limpa(t.texto,t.bloco))}</b><small>${esc([ehCli(t.bloco)?null:t.bloco,t.criado_em?dm(t.criado_em):null].filter(Boolean).join(' · '))}</small><div class="nota"></div>
  <div class="acts"><button class="ok" data-acao="feito">✓ feito</button><button data-acao="ori">✎ orientar</button><button data-acao="abrir">abrir no TOPICS</button></div>
  <div class="ori"><input placeholder="escreva a orientação…" data-acao="enter"><button data-acao="salva">salvar</button></div></div></div>`).join('')
  :'<div class="it" style="border:0"><div style="opacity:.8">nada pendente no TOPICS</div></div>';
 // abre com os itens de DADOS.decidir (4); "ver todos" mostra DADOS.decidir_todos sem nova consulta
 if(LT&&LT.length>L0.length)$('tpl').insertAdjacentHTML('beforeend',`<button class="vertodos" onclick="CLI.todos()">${TODOS?'mostrar menos':'ver todos ('+LT.length+')'}</button>`);
 $('c_tp_lido').textContent='TOPICS · lido em '+dm(hoje())}
// grava no TOPICS e só confirma quando onTopico resolver (o TI relê do banco e redesenha)
async function grava(acao,id,texto,nota){if(typeof window.onTopico!=='function'){if(nota)nota.textContent='não gravado: TOPICS fora do ar nesta tela';return false}
 if(nota)nota.textContent='gravando…';try{const r=await window.onTopico(acao,id,texto);if(r===false)throw 0;if(nota)nota.textContent=acao==='orientar'?'↳ '+texto:'gravado no TOPICS';return true}
 catch(e){if(nota)nota.textContent='não gravou — tente de novo';return false}}
function ouveTopics(){const tl=$('tpl');if(tl.__ouve)return;tl.__ouve=1;
 const item=el=>el.closest('.it[data-id]'),dado=el=>{const it=item(el);return it?{it,id:it.dataset.id,nota:it.querySelector('.nota'),ori:it.querySelector('.ori'),inp:it.querySelector('.ori input')}:null};
 const salva=async x=>{const v=x.inp.value.trim();if(!v)return;x.ori.classList.remove('ab');if(await grava('orientar',x.id,v,x.nota))x.inp.value=''};
 tl.addEventListener('click',async e=>{const b=e.target.closest('button[data-acao]');if(!b)return;const x=dado(b);if(!x)return;
  if(b.dataset.acao==='feito'){x.it.classList.add('feito');if(!await grava('feito',x.id,null,x.nota))x.it.classList.remove('feito')}
  else if(b.dataset.acao==='ori'){x.ori.classList.toggle('ab');if(x.ori.classList.contains('ab'))x.inp.focus()}
  else if(b.dataset.acao==='abrir')chama('onTopico','abrir',x.id);
  else if(b.dataset.acao==='salva')salva(x)});
 tl.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('input[data-acao="enter"]')){const x=dado(e.target);if(x)salva(x)}})}
// ---------------- agenda (tipos: reunião, análise, trade, marco) ----------------
const TPN={reun:'reunião',anal:'análise',trade:'trade',marco:'marco'};
const tipoAg=e=>{const t=String(e.tipo||'').toLowerCase();if(t.startsWith('reun'))return 'reun';if(t.startsWith('anal'))return 'anal';if(t==='trade')return 'trade';if(t==='marco')return 'marco';
 const x=(e.titulo||'')+' '+(Array.isArray(e.onde)?e.onde.join(' '):e.onde||'');return /trade|cashback|guelta|m[íi]dia/i.test(x)?'trade':/inaugura|marco|abre a loja/i.test(x)?'marco':/raio|an[áa]lise|proposta|estudo/i.test(x)?'anal':'reun'};
const tituloAg=t=>{const n=((D.cliente||{}).nome||'').toUpperCase();let x=String(t||'').replace(/^\s*(ATA|PAUTA)\s*[—–-]\s*/i,'');if(n)x=x.replace(new RegExp('\\s*'+escRe(n)+'\\s*[·—–:-]?\\s*','gi'),' ').trim();x=x.replace(/^REUNI[ÃA]O\b/i,'Reunião');x=x.charAt(0).toUpperCase()+x.slice(1);return x||String(t||'')};
const ondeAg=o=>{if(Array.isArray(o))o=o.join(',');return String(o||'').split(',').map(s=>s.trim()).filter(s=>s&&!ehCli(s)).join(' · ')};
function agenda(){const EV=(D.agenda||[]).filter(e=>e&&e.data).map((e,i)=>Object.assign({},e,{_t:tipoAg(e),_i:i})).sort((a,b)=>a.data<b.data?1:-1),HJ=hoje();
 if(!CM){const b=(EV.find(e=>e.data<=HJ)||EV[0]||{data:HJ}).data;CM=[+b.slice(0,4),+b.slice(5,7)-1]}
 const [y,m]=CM,f=new Date(y,m,1).getDay(),n=new Date(y,m+1,0).getDate(),kk=d=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 let h=`<div class="hd"><button onclick="CLI.mes(-1)">‹</button><b>${MSX[m]} ${y}</b><button onclick="CLI.mes(1)">›</button></div><div class="gr">`+['D','S','T','Q','Q','S','S'].map(x=>`<div class="dw">${x}</div>`).join('');
 for(let i=0;i<f;i++)h+='<div class="d vz"></div>';
 for(let d=1;d<=n;d++){const e=EV.filter(x=>x.data.slice(0,10)===kk(d));h+=`<div class="d ${e.length?'ev':''} ${kk(d)===HJ?'hj':''} ${kk(d)===SD?'sel':''}" ${e.length?`onclick="CLI.dia('${kk(d)}')"`:''}>${d}${e.length?`<span class="pts">${e.map(x=>`<i class="tp-${x._t}"></i>`).join('')}</span>`:''}</div>`}
 h+=`</div><div class="leg small text-secondary mt-3">${Object.entries(TPN).map(([t,nn])=>`<span class="me-2"><i class="tp-${t}"></i>${nn}</span>`).join('')}</div>`;
 $('cal').innerHTML=h;
 const L=SD?EV.filter(x=>x.data.slice(0,10)===SD):EV;
 const bt=x=>x._t==='reun'?'ver ata':x._t==='anal'?'abrir':null;
 $('evl').innerHTML=(SD?`<div class="d-flex mb-1"><b>${dm(SD)}</b><a href="#" class="ms-auto small" onclick="CLI.dia(null);return false">ver tudo</a></div>`:'<div class="d-flex mb-1"><b>Linha do tempo</b><span class="ms-auto hora">da mais nova · cinza = vem aí</span></div>')+
  (L.length?L.map(x=>`<div class="e ${x.data>HJ?'fut':''}"><div class="dt">${x.data.slice(8,10)}<small>${MSX[+x.data.slice(5,7)-1].slice(0,3)}/${x.data.slice(2,4)}</small></div><div><span class="tp tp-${x._t}">${TPN[x._t]}</span><b>${esc(tituloAg(x.titulo))}</b><small class="d2">${esc(ondeAg(x.onde))}</small></div>${bt(x)?`<a class="trt" href="${esc(x.link||'#')}" onclick="return CLI.ag(${x._i})">${bt(x)}</a>`:'<span></span>'}</div>`).join(''):'<div class="hora" style="color:#fff;opacity:.8">sem eventos</div>')}
// ---------------- faixa do trade ----------------
function trade(){const t=D.trade;$('trd').hidden=!t;if(!t)return;
 $('trt').textContent=t.titulo||'—';$('trm').textContent=t.periodo||(t.inicio&&t.fim?dm(t.inicio)+' a '+dm(t.fim):'');
 const ini=t.inicio?new Date(t.inicio):null,fim=t.fim?new Date(t.fim):null,hj=new Date(hoje());
 $('trp').style.width=ini&&fim?Math.max(2,Math.min(100,(hj-ini)/(fim-ini)*100))+'%':'0';
 $('trv').textContent=t.investimento!=null?'R$ '+fmt(t.investimento):'—';$('trmeta').textContent=fmt(t.meta_pares);   // Léo 28/10 (via TRADE): verba nunca arredonda — o MESMO número da aba de trade, em reais cheios
 $('trf').textContent=fim?Math.max(0,Math.round((fim-hj)/864e5))+' dias':'—'}
// ---------------- cartões: sell-out, estoque, carteira ----------------
function spark(id,a){const el=$(id);if(!a||a.length<2){el.innerHTML='';return}const mn=Math.min(...a),mx=Math.max(...a),X=i=>i*300/(a.length-1),Y=v=>40-(v-mn)/((mx-mn)||1)*34;
 const p=a.map((v,i)=>`${X(i)},${Y(v)}`).join(' ');
 el.innerHTML=`<polyline points="0,46 ${p} 300,46" fill="rgba(255,255,255,.12)" stroke="none"/><polyline points="${p}" fill="none" stroke="#fff" stroke-width="2.2" vector-effect="non-scaling-stroke"/><circle cx="${X(a.length-1)}" cy="${Y(a[a.length-1])}" r="4" fill="#FFFF1A" stroke="#000" stroke-width="1"/>`}
function cartoes(){const g=D.giro||{},rot=g.rotulo||'tênis OLY',S=(g.serie||[]).filter(x=>x&&!x.parcial&&x.v!=null);
 $('so_lb').textContent='Sell-out '+rot+' / mês';$('es_lb').textContent='Estoque '+rot;
 // sell-out: média dos 2 últimos meses fechados (como no v19) · delta contra a média do ano · traço = os meses do ano
 const y=S.length?String(S[S.length-1].mes).slice(0,4):null,Sa=S.filter(x=>String(x.mes).slice(0,4)===y),u2=S.slice(-2);
 const med=u2.length?u2.reduce((a,x)=>a+x.v,0)/u2.length:null,ma=Sa.length?Sa.reduce((a,x)=>a+x.v,0)/Sa.length:null,d=med&&ma?Math.round((med/ma-1)*100):null;
 $('so_ns').textContent=fmt(med);
 $('so_delta').innerHTML=d==null?'':`<i class="ti ti-arrow-${d>=0?'up':'down'}-right"></i>${d>=0?'+':''}${d}% vs média do ano`;
 $('so_base').textContent=u2.length?`média ${MS2[+u2[0].mes.slice(5,7)-1]}${u2.length>1?'–'+mesN(u2[1].mes):'/'+u2[0].mes.slice(2,4)} · ${Sa.length>1?MS2[+Sa[0].mes.slice(5,7)-1]+'–'+MS2[+Sa[Sa.length-1].mes.slice(5,7)-1]+' no traço':''}`:'';
 spark('sp1',Sa.map(x=>x.v));
 $('es_ns').textContent=fmt(g.estoque);spark('sp2',Sa.filter(x=>x.e!=null).map(x=>x.e));
 // carteira aberta: pares · R$ · um chip por mês com carteira
 const c=D.carteira||{},M=(c.meses||[]).filter(x=>(x.cart||0)>0),tot=M.reduce((a,x)=>a+x.cart,0)||1;
 // pares e R$ do MESMO recorte (carteira.recorte, ex.: 'tênis OLY'); chinelo nunca somado ao tênis
 $('car_lb').textContent='Carteira aberta'+(c.recorte?' · '+c.recorte:'');
 $('c_cart').textContent=fmt(c.a_faturar);$('c_cart_u').textContent='pares'+(c.valor!=null?' · '+mil(c.valor):'');const cc=$('c_cart'),cu=$('c_cart_u');for(const el of [cc,cu]){el.classList.toggle('abre',c.a_faturar!=null);el.title=c.a_faturar!=null?'ver a carteira por mês e família':'';el.onclick=c.a_faturar!=null?()=>CLI.famAbre('todos'):null;if(c.a_faturar!=null){el.setAttribute('role','button');el.tabIndex=0;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();CLI.famAbre('todos')}}}else{el.removeAttribute('role');el.removeAttribute('tabindex')}}   // GAMER 28/10: abre a lista inteira do tênis, não só rola   // PICASSO: marca .abre só com número
 $('c_mes3').innerHTML=M.map(x=>`<div role="button" tabindex="0" style="flex:${Math.max(1,x.cart)/tot*10};cursor:pointer" title="abrir a carteira de tênis de ${MSX[+String(x.mes).slice(5,7)-1]}" onclick="CLI.famAbre('${x.mes}')">${MS2[+String(x.mes).slice(5,7)-1]}<b class="abre">${fmt(x.cart)}</b></div>`).join('')}
// ---------------- base da cobertura (Conselho 0045): sem venda ou com base curta não há semáforo ----------------
function baseCob(){const g=D.giro||{},S=(g.serie||[]).filter(x=>x&&!x.parcial&&x.v!=null&&x.v>0),u3=S.slice(-3);
 const vm=u3.length?u3.reduce((a,x)=>a+x.v,0)/u3.length:null;return {ok:g.cobertura!=null&&u3.length>=3&&vm>0,vm,n:u3.length}}
const faixaCob=c=>c==null?null:c<4?'ruptura':c<5?'ideal':'alta';   // nomes da régua (Léo, 28/10): ruptura < 4 · ideal 4–5 · alta ≥ 5
function leituraEstoque(){const g=D.giro||{},b=baseCob(),c=g.cobertura;if(!b.ok)return null;
 const hm=hoje().slice(0,7),M=((D.carteira||{}).meses||[]).filter(x=>(x.cart||0)>0&&String(x.mes).slice(0,7)>hm),prox=M[0],mn=m=>MSX[+String(m).slice(5,7)-1];
 if(c>=5&&prox)return {t:`Rever a entrada de ${mn(prox.mes)}: ${fmt(prox.cart)} pares de tênis com ${dec(c)} meses de cobertura`,s:'cobertura alta: acima de 5 meses · leitura da régua de cobertura'};
 if(c<4)return {t:`Antecipar: cobertura de ${dec(c)} meses, abaixo de 4`,s:'ruptura · leitura da régua de cobertura'};
 if(c<5)return {t:`Cobertura ideal: ${dec(c)} meses`,s:'entre 4 e 5 meses · leitura da régua de cobertura'};
 return null}
// ---------------- manchete da 1ª dobra (Conselho 0045): prioridade · evidência · decisão pendente ----------------
function manchete(){const L=(D.decidir||D.topics||[]),urg=L.filter(t=>t.urgente),A=D.anos||{},AN=(A.lista||[]).map(String),y=AN[AN.length-1],g=D.giro||{},b=baseCob(),c=g.cobertura;
 const PR=D.prioridade?(typeof D.prioridade==='string'?{titulo:D.prioridade}:D.prioridade):null,leit=leituraEstoque();
 const pri=PR?`<div class="h">${esc(PR.titulo)}</div><div class="s">${esc(PR.detalhe||'leitura do NÚCLEO')}</div>`
  :leit?`<div class="h">${esc(leit.t)}</div><div class="s">${esc(leit.s)}</div>`
  :urg[0]?`<div class="h">${esc(limpa(urg[0].texto,urg[0].bloco))}</div><div class="s">${urg.length>1?`+ ${urg.length-1} urgente${urg.length>2?'s':''} no TOPICS`:'único urgente no TOPICS'}</div>`
  :`<div class="h">Sem urgência hoje</div><div class="s">${L.length?L.length+(L.length===1?' item':' itens')+' em aberto no TOPICS, nenhum marcado como urgente':'nada pendente no TOPICS'}</div>`;
 const so=(A.sellout||{})[y]||[],si=(A.sellin||{})[y]||[],mt=(A.meta||{})[y]||[];let ult=-1;for(let i=11;i>=0;i--)if(so[i]!=null){ult=i;break}
 const m3=ult>=0?[ult-2,ult-1,ult].filter(i=>i>=0):[],sm=a=>m3.length&&m3.every(i=>a[i]!=null)?m3.reduce((t,i)=>t+a[i],0):null;
 const S=sm(so),I=sm(si),M=sm(mt),per=m3.length?`${MS2[m3[0]]}–${MS2[ult]}/${String(y).slice(2)}`:'—';
 let ler='';if(S!=null&&I!=null){const r=I/S;ler=r>1.15?`<span class="tag al">abastecendo acima do que vende (sell-in ${Math.round((r-1)*100)}% acima)</span>`:r<0.85?`<span class="tag rd">vendendo acima do que compra (sell-in ${Math.round((1-r)*100)}% abaixo)</span>`:`<span class="tag ok">compra no ritmo em que vende</span>`}
 else ler=`<span class="tag ok">${S==null?'sem sell-out fechado no período':'sell-in do período ainda em carga'}</span>`;
 const F=D.fontes||{},dt=v=>v?String(v).slice(8,10)?dm(v):mesN(v):'—';
 const ev=`<div class="ev"><div><small>sell-out ${per}</small><b>${fmt(S)}</b><small>${F.sellout_ate?'até '+dt(F.sellout_ate):'AG'}</small></div><div><small>sell-in ${per}</small><b>${fmt(I)}</b><small>${F.sellin_ate?'até '+dt(F.sellin_ate):'EBM'}</small></div><div><small>meta ${per}</small><b>${fmt(M)}</b><small>${F.meta_lida_em?'lida '+dt(F.meta_lida_em):'rateio'}</small></div><div><small>estoque</small><b>${fmt(g.estoque)}</b><small>${g.estoque_mes?mesN(g.estoque_mes):'—'}</small></div></div>${ler}`;
 const dc=!b.ok?`<div class="h">Cobertura sem base para estimar</div><div class="s">${b.n<3?'menos de 3 meses fechados com venda':'venda média nula'} — não dá para dizer se falta ou sobra</div>`
  :c<4?`<div class="h">Ruptura: ${dec(c)} meses</div><div class="s">antecipar já · abaixo de 4 meses</div>`:c<5?`<div class="h">Ideal: ${dec(c)} meses</div><div class="s">entre 4 e 5 meses</div>`:`<div class="h">Alta: ${dec(c)} meses</div><div class="s">não antecipar · ${L.length} ${L.length===1?'decisão':'decisões'} no TOPICS</div>`;
 // estado vazio (GAMER): sem dado o topo diz "sem dado" — nunca um "sem urgência" que acalma
 if(!D.giro&&!D.anos){$('manch').style.gridTemplateColumns='1fr';$('manch').innerHTML=`<div><div class="t">Prioridade</div>${PR?pri:`<div class="h">Sem dado deste cliente</div><div class="s">nada lido de venda, estoque ou carteira — não dá para dizer se está tudo bem</div>`}</div>`;return}
 $('manch').style.gridTemplateColumns='';
 $('manch').innerHTML=`<div><div class="t">Prioridade</div>${pri}</div><div><div class="t">Evidência · vendendo ao consumidor ou só abastecendo?</div>${ev}</div><div><div class="t">Decisão pendente</div>${dc}</div>`}
// ---------------- cobertura: régua clicável, % do estoque por faixa, ponta de estoque, leitura ----------------
const P=()=>D.produtos||{},CO=()=>D.cobertura||{};
const bxT=()=>(P().baixo||[]).reduce((s,r)=>s+(r.carteira||0),0),bxV=()=>(P().baixo||[]).reduce((s,r)=>s+(r.valor||0),0);
const fxPares=()=>Object.values(P().faixas||{}).reduce((s,f)=>s+((f&&f.pares)||0),0);
function cobertura(){const g=D.giro||{},B=baseCob(),c=B.ok?g.cobertura:null,fx=faixaCob(c);
 $('c_cob').textContent=B.ok?dec(c):'—';$('c_cob_pill').textContent=fx||'sem base para estimar';
 $('c_cob_pill').style.background=c==null?'#E6E7E8':c<4?'#FDE3E5':c<5?'#FFFF1A':'';$('c_cob_pill').style.color=c!=null&&c<4?'#E3001B':c!=null&&c<5?'#000':'';
 const pos=c==null?-99:c<4?c/4*33.3:c<5?33.3+(c-4)*33.3:Math.min(99,66.7+(c-5)/2*33.3);$('c_cob_mk').style.left=c==null?'-99px':pos+'%';
 // % do estoque por faixa (faixas do TI; sem elas, soma os itens)
 const IT=CO().itens||[],FX=CO().faixas||(IT.length?(()=>{const s=k=>IT.filter(r=>k==='rup'?r.cobertura<4:k==='for'?r.cobertura>=4&&r.cobertura<5:r.cobertura>=5).reduce((a,r)=>a+(r.estoque||0),0),t=IT.reduce((a,r)=>a+(r.estoque||0),0)||1;
  return {ruptura:{pares:s('rup'),pct:s('rup')/t*100},forcar:{pares:s('for'),pct:s('for')/t*100},teto:{pares:s('teto'),pct:s('teto')/t*100}}})():null);
 const FXN=[['rup','ruptura','#ff6b78','ruptura'],['for','forcar','#FFFF1A','ideal'],['teto','teto','','alta']];   // PICASSO: rótulo visível = ruptura · ideal · alta (chaves internas iguais)
 $('c_cobpct').innerHTML=FX?FXN.map(([k,n,cr,rot])=>{const x=FX[n]||{},tem=x.pct!=null;return `<span class="fx3" onclick="CLI.cobp('${k}')"${cr?` style="color:${cr}"`:''} title="ver os produtos: ${rot}"><b class="${tem?'abre':''}">${tem?Math.round(x.pct)+'%':'—'}</b><small>do estoque · ${fmt(x.pares)} pares</small></span>`}).join('')
  // o que fica FORA das três barras, aberto em linhas (NÚCLEO/Léo 28/10: nada de caixa-preta): com corte do cliente = ponta · ação/rebaixo · fora de linha; sem corte = ponta · cauda de pouco volume
  // PICASSO: extras não se confundem com as 3 faixas — fio separador · ponta = ⌛ + borda tracejada · fora de linha = #787B86 · ação = #000 · demais = borda fina
  +((CO().extras||[]).filter(e=>e&&e.pares).length?'<i class="xsep" aria-hidden="true"></i>':'')
  +(CO().extras||[]).filter(e=>e&&e.pares).map(e=>{const cl=e.k==='ponta'?'xf xf-ponta':e.k==='fora_linha'?'xf xf-fora':e.k==='acao'?'xf xf-acao':'xf xf-outra',tem=e.pct!=null;
   return `<span class="${cl}" onclick="CLI.cobp('${esc(e.k)}')" title="${esc(e.desc||'')}"><b class="${tem?'abre':''}">${e.k==='ponta'?'⌛ ':''}${tem?Math.round(e.pct)+'%':'—'}</b><small>${esc(e.nome)} · ${fmt(e.pares)} pares · ${fmt(e.n)} modelos-cor</small></span>`}).join(''):'';
 const PO=CO().ponta;$('c_ponta').hidden=!PO;
 if(PO){const n=PO.modelos!=null?PO.modelos:(PO.itens||[]).length;$('c_ponta').innerHTML=`<span style="font-size:18px">⌛</span><span><b class="abre">${fmt(PO.pares)} pares</b> <small>· ${PO.pct!=null?Math.round(PO.pct)+'% do estoque de tênis':''}</small><br><small>parados há 6+ meses (raio-x do NÚCLEO): ${fmt(n)} modelos-cor sem faturar e sem carteira · toque para ver</small></span>`}
 // onde falta / onde sobra por segmento (opcional)
 const SG=(g.segmentos||[]).filter(s=>s&&s.cobertura!=null),fal=SG.filter(s=>s.cobertura<4).sort((a,b)=>a.cobertura-b.cobertura),sob=SG.filter(s=>s.cobertura>=7).sort((a,b)=>b.cobertura-a.cobertura);
 $('c_segs').innerHTML=SG.length?(fal.length?`<span class="f">falta: ${fal.slice(0,3).map(s=>esc(s.nome)+' '+dec(s.cobertura)).join(' · ')}</span>`:'')+(sob.length?`<span class="s">sobra: ${sob.slice(0,3).map(s=>esc(s.nome)+' '+dec(s.cobertura)).join(' · ')}</span>`:''):'';
 // leitura automática (sinal, não veredito) — a mesma frase do v19, com o número do cliente
 const rup=(P().aporte||[]).filter(r=>r.cobertura<4),m1=rup.slice().sort((a,b)=>b.venda-a.venda)[0],ct=fxPares(),bT=bxT(),bb=(P().baixo||[]).length;
 const fr=[];if(B.ok)fr.push(`Cobertura geral <b>${fx}</b> (${dec(c)})`);
 if(rup.length)fr.push(`${B.ok?'mas ':''}<b>${rup.length} ${rup.length===1?'modelo-cor</b> está':'modelos-cor</b> estão'} abaixo de 4 meses${m1?` — o ${esc(m1.modelo)} ${esc(String(m1.cor_nome||m1.cor||'').toLowerCase())} vende ${fmt(m1.venda)}/mês com ${dec(m1.cobertura)} de cobertura`:''}`);
 let txt=fr.length?fr.join(', ')+'.':'';
 if(bb)txt+=` ${txt?'Do outro lado, ':''}<b>${fmt(bT)} pares</b>${ct?` (${Math.round(bT/ct*100)}% da carteira de tênis, ${mil(bxV())})`:''} estão em ${bb} modelos-cor de giro até 20%.`;
 const L=txt?txt+' <span style="opacity:.8">Leitura automática: sinal para olhar, não veredito — conferir estoque em peças, entrada recente e trânsito.</span>':'';
 $('cobleit').innerHTML=$('leit').innerHTML=L}
// faixa de resumo do celular (Opção A): os mesmos números dos cartões, com a base; o toque leva ao cartão
function resumoCel(){const c=D.carteira||{},g=D.giro||{},B=baseCob(),cb=B.ok?g.cobertura:null,fx=faixaCob(cb);
 const be=c.base_em||((c.meses||[]).find(x=>x.base_em)||{}).base_em,pl=cb==null?'':`<span class="pl" style="${cb<4?'background:#FDE3E5;color:#E3001B':cb<5?'background:#FFFF1A':''}">${fx}</span>`;
 // 2 linhas por lado: 1ª = rótulo + número; 2ª = base + âncora
 $('rcel').innerHTML=`<a role="button" tabindex="0" onclick="CLI.ir('car')"><span class="l1"><span class="t">Carteira</span><b class="${c.a_faturar!=null?'abre':''}">${fmt(c.a_faturar)}</b><span class="u">pares</span></span><small>${c.valor!=null?mil(c.valor)+' · ':''}${be?'lida '+dm(be):'sem base'} ↓</small></a>`+
  `<a role="button" tabindex="0" onclick="CLI.ir('cob')"><span class="l1"><span class="t">Cobertura</span><b class="${B.ok?'abre':''}">${B.ok?dec(cb):'—'}</b></span><small>${pl||'sem base'}${g.estoque_mes?' · '+mesN(g.estoque_mes):''} ↓</small></a>`}
function pontaLista(el){const PO=CO().ponta||{},IT=PO.itens||[],t=IT.reduce((a,r)=>a+(r.estoque||0),0);
 el.innerHTML=`<div class="ct"><span style="font-size:16px">⌛</span><b>Parados há 6+ meses · raio-x</b><span style="font-size:12px;opacity:.85">${IT.length} modelos-cor · ${fmt(t)} pares · sem faturar há 6+ meses, sem carteira futura, cobertura ≥ 9 meses ou venda ≤ 10/mês · não é a faixa "ponta" do corte do cliente</span>
  <div class="tabs ms-3"><button onclick="CLI.cobp('rup',1)">Ruptura</button><button onclick="CLI.cobp('for',1)">Ideal</button><button onclick="CLI.cobp('teto',1)">Alta</button>${(CO().extras||[]).filter(e=>e&&e.n).map(e=>`<button onclick="CLI.cobp('${esc(e.k)}',1)">${esc(e.nome.replace(/\s*\(.*\)$/,''))}</button>`).join('')}<button class="on">Raio-x</button></div><button class="x" onclick="CLI.cobp('rx')" title="fechar">×</button></div>
  <div class="lst">${[0,1].map(()=>`<div class="it hd2"><span>modelo · cor</span><span class="num" title="estoque" aria-label="estoque">est.</span><span class="num" title="venda/mês" aria-label="venda/mês">v/mês</span><span class="num">leitura</span></div>`).join('')}
  ${IT.length?IT.map(r=>`<div class="it"><span><b title="${esc(r.modelo)}">${esc(r.modelo)}</b> ${esc(r.cor)}${/fora/i.test(r.situacao||'')?' <span class="fl">fora de linha</span>':''}<small>${esc(r.ref)}${r.sem_faturar_desde?' · sem faturar desde '+esc(r.sem_faturar_desde):''}</small></span><span class="num fw-bold">${fmt(r.estoque)}</span><span class="num">${dec(r.venda)}</span><span class="num" style="font-size:11px">${esc(r.leitura||'—')}</span></div>`).join(''):'<div class="it">sem ponta de estoque lida</div>'}</div>
  <div style="font-size:11px;opacity:.75;margin-top:6px">${esc(PO.base||'raio-x do NÚCLEO (ponta de estoque)')}</div>`;
 el.style.display='block'}
function cobp(f,troca){const el=$('cobp');if(!troca&&COBF===f&&el.style.display!=='none'){el.style.display='none';COBF=null;return}COBF=f;
 if(f==='rx'||(f==='ponta'&&!(CO().extras||[]).some(e=>e&&e.k==='ponta')))return pontaLista(el);   // 'rx' = a ponta do raio-x (cartão ⌛); 'ponta' é a faixa de estoque pequeno quando o cliente tem corte
 const G={rup:['Ruptura','abaixo de 4 meses · antecipar já','#E3001B',r=>r.cobertura<4],for:['Ideal','de 4 a 5 meses','#FFFF1A',r=>r.cobertura>=4&&r.cobertura<5],teto:['Alta','5 meses ou mais · não antecipar','#ADAEB3',r=>r.cobertura>=5]};
 const EXS=CO().extras||[],EX=EXS.find(e=>e&&e.k===f);                      // as faixas fora das barras (ponta · ação/rebaixo · fora de linha · cauda), já com as linhas
 const [n,d,c,fn]=EX?[EX.nome,EX.desc||'',EX.k==='fora_linha'?'#787B86':EX.k==='acao'?'#000':EX.k==='ponta'?'transparent;border:1.5px dashed currentColor':'#ADAEB3',null]:G[f];
 const L=EX?(EX.itens||[]).slice():(CO().itens||[]).filter(r=>r&&r.cobertura!=null).filter(fn).sort((a,b)=>(b.venda||0)-(a.venda||0)),nf=L.filter(r=>r.fora_linha).length;
 el.innerHTML=`<div class="ct"><span style="width:14px;height:14px;border-radius:4px;background:${c};display:inline-block"></span><b>${esc(n)}</b><span style="font-size:12px;opacity:.85">${esc(d)} · ${L.length} ${L.length===1?'modelo-cor':'modelos-cor'}${nf?' ('+nf+' fora de linha)':''} · ${fmt(L.reduce((a,r)=>a+(r.estoque||0),0))} pares em estoque</span>
  <div class="tabs ms-3">${Object.entries(G).map(([k,g])=>`<button class="${k===f?'on':''}" onclick="CLI.cobp('${k}',1)">${g[0]}</button>`).join('')}${EXS.filter(e=>e&&e.n).map(e=>`<button class="${e.k===f?'on':''}" onclick="CLI.cobp('${esc(e.k)}',1)">${esc(e.nome.replace(/\s*\(.*\)$/,''))}</button>`).join('')}${CO().ponta?'<button onclick="CLI.cobp(\'rx\',1)">Raio-x</button>':''}</div><button class="x" onclick="CLI.cobp('${f}')" title="fechar">×</button></div>
  <div class="lst">${[0,1].map(()=>`<div class="it it5 hd2"><span>modelo · cor</span><span class="num" title="cobertura" aria-label="cobertura">cob.</span><span class="num" title="venda/mês" aria-label="venda/mês">v/mês</span><span class="num" title="estoque atual" aria-label="estoque atual">est.</span><span class="num" title="carteira" aria-label="carteira">cart.</span></div>`).join('')}
  ${L.length?L.map(r=>`<div class="it it5"><span><b title="${esc(r.modelo)}">${esc(r.modelo)}</b> ${esc(r.cor)}${r.fora_linha?' <span class="fl">fora de linha</span>':''}${exc(r.cobertura)}<small>${esc(r.ref)}${r.giro!=null?' · giro '+r.giro+'%':''}${r.base_curta_txt?' · '+esc(r.base_curta_txt):r.base_curta?' · base curta: '+r.base_curta+' de 3':''}</small></span><span class="cb" style="background:${f==='for'?'#FFFF1A':f==='rup'?'#FDE3E5':'rgba(255,255,255,.15)'};color:${f==='rup'?'#E3001B':f==='for'?'#000':'#fff'}">${dec(r.cobertura)}</span><span class="num">${fmt(r.venda)}</span><span class="num fw-bold">${fmt(r.estoque)}</span><span class="num">${r.carteira?fmt(r.carteira):'—'}</span></div>`).join(''):'<div class="it">nenhum modelo-cor nesta faixa</div>'}</div>
  <div style="font-size:11px;opacity:.75;margin-top:6px">${esc(CO().base||'régua: ruptura < 4 · ideal 4–5 · alta ≥ 5 · leitura é sinal, não veredito')}</div>`;
 el.style.display='block'}
// ---------------- metas do cliente + participação por família ----------------
const MTK=[['TT CALCADOS (soma das faixas)','Tênis','pares'],['MEOLY','Meias','R$'],['CHOLY','Chinelos','R$'],['ACOLY','Acessórios','R$'],['CFOLY','Confecção','R$']],MTU=[['TT FTW_UA','Tênis','pares'],['UA_ME','Meias','R$'],['UA_CH','Chinelos','R$'],['UA_AC','Acessórios','R$'],['UA_CF','Confecção','R$']];
function metas(){const X=D.metas||{},MT=X.meses||{},TR=X.trimestres||{},ks=Object.keys(MT).sort();
 if(!MM||!(MT[MM]||TR[MM]))MM=X.atual&&MT[X.atual]?X.atual:ks[0]||null;
 $('mt_base').textContent=X.base||'meta do preposto dividida pela participação do cliente · potencial = faturado + carteira do mês · regra do NÚCLEO';
 $('mtm').innerHTML=ks.map(m=>`<span class="${m===MM?'on':''}" style="cursor:pointer" onclick="CLI.mm('${m}')">${mesN(m)}</span>`).join('')+Object.entries(TR).map(([k,t])=>`<span class="${MM===k?'on':''}" style="cursor:pointer;border-left:1px solid #E6E7E8;margin-left:4px" onclick="CLI.mm('${k}')">${esc(t.nome||k)}</span>`).join('');
 $('mt15').innerHTML=participacao(MM);
 const zero=n=>`<div class="c zero"><div class="t">${n}</div><div class="p">0</div><small>${X.direta?'sem meta na carta':'sem meta para o Léo'}</small><small>${X.direta?'família sem meta no código':'quadro guardado para a equipe'}</small></div>`,anda=n=>`<div class="c zero"><div class="t">${n}</div><div class="p">—</div><small>${X.sem_meta?'meta do vendedor responsável, não do Léo':(X.sem_numero||'rateio em andamento (NÚCLEO)')}</small></div>`;
 if(X.sem_meta)MM=null;
 if(!MM){$('mtb').innerHTML=MTK.map(([,n])=>n==='Confecção'?zero(n):anda(n)).join('');$('mtu').innerHTML=MTU.map(([,n])=>n==='Confecção'?zero(n):anda(n)).join('');return}
 if(TR[MM]){const ms=(TR[MM].meses||[]).filter(m=>MT[m]);
  const ct=([k,n])=>{if(n==='Confecção')return zero(n);const xs=ms.map(m=>MT[m][k]);if(!xs.some(x=>x&&x[0]))return anda(n);
   return `<div class="c"><div class="t">${n} · cada mês com a sua meta</div><div class="tri">${ms.map((m,i)=>{const x=xs[i];return `<div><small>${MS2[+m.slice(5,7)-1]}</small><b class="${x&&x[2]>=100?'g-hi':''}">${x&&x[0]?fmt(x[2])+'%':'—'}</b></div>`}).join('')}</div></div>`};
  $('mtb').innerHTML=MTK.map(ct).join('');$('mtu').innerHTML=MTU.map(ct).join('');return}
 const card=([k,n,u])=>{const x=MT[MM][k];if(n==='Confecção')return zero(n);if(!x||!x[0])return anda(n);
  const [mt,pt,pc,gp]=x,f=v=>u==='R$'?mil(v):fmt(v)+' pares',mx=Math.max(mt,pt)||1;
  const fat=x[4]||0,car=x[5]||0,direta=!!X.direta,dif=pt-(fat+car);
  const comp=`<div class="mtd"><div><span>faturado no mês (DETALHADA)</span><b>${f(fat)}</b></div><div><span>carteira do mês (DETALHADA)</span><b>${f(car)}</b></div>${direta&&Math.abs(dif)>=(u==='R$'?1000:10)?`<div><span>${dif>0?'a mais na Carta (EBM conta no mês)':'a menos na Carta'}</span><b>${f(Math.abs(dif))}</b></div>`:''}<div><span>potencial${direta?' (Carta)':''}</span><b>${f(pt)}</b></div><div><span>meta</span><b>${f(mt)}</b></div><div><span>${gp<0?'faltam':'acima'}</span><b>${f(Math.abs(gp))}</b></div></div>`;
  return `<div class="c" role="button" tabindex="0" style="cursor:pointer" title="ver a composição" onclick="CLI.mtd(this)"><div class="t">${n}</div><div class="p ${pc>=100?'g-hi':''}"><span class="abre">${fmt(pc)}%</span></div><small>${f(pt)} de ${f(mt)}</small><small class="${gp<0?'g-lo':'g-hi'} fw-bold">${gp<0?'faltam '+f(-gp):f(gp)+' acima'}</small><div class="b"><i style="width:${pt/mx*100}%"></i><em style="left:${mt/mx*100}%"></em></div>${comp}</div>`};
 $('mtb').innerHTML=MTK.map(card).join('');$('mtu').innerHTML=MTU.map(card).join('')}
function participacao(p){const x=(D.participacao||{})[p];if(!x)return '';const TR=(D.metas||{}).trimestres||{},hm=hoje().slice(0,7);
 const nm=TR[p]?(TR[p].nome||p):mesN(p),et=TR[p]?((TR[p].meses||[]).some(m=>m>=hm)?'potencial':'faturado'):(p>=hm?'potencial':'faturado');
 const F=[['Tênis Olympikus','tenis','#2E3EFC'],['Meias','meias','#FFFF1A'],['Chinelo','chinelo','#FF8A00'],['Acessório','acess','#7B2EFC'],['Confecção','conf','#00B0F0'],['Under Armour','ua','#E3001B']],tot=F.reduce((a,f)=>a+(x[f[1]]||0),0);
 return `<div class="b15"><div class="d-flex align-items-baseline flex-wrap gap-2"><b style="font:800 16px Barlow">Participação por família · ${esc(nm)}</b><span class="selo" style="background:${et==='potencial'?'#2E3EFC':'#000'};color:#fff">${et}</span><span class="hora ms-auto">quanto cada família contribui no total do ${esc(nome())}, em R$ · faturado + carteira do mês · pela DETALHADA (PDC), não pela Carta</span></div>
 <div class="d-flex align-items-end gap-3 mt-2 flex-wrap"><span class="pc">${mil(tot)}</span><span class="mb-1 hora">no total · fora o tênis Olympikus: ${tot?Math.round((tot-(x.tenis||0))/tot*100):0}%</span></div>
 <div class="bar">${F.map(([n,k,c])=>x[k]>0?`<i style="width:${x[k]/tot*100}%;background:${c}" title="${n}: ${mil(x[k])}"></i>`:'').join('')}</div>
 <div class="lg">${F.map(([n,k,c])=>`<span><i style="background:${c}"></i>${n} ${mil(x[k]||0)} · <b>${tot?Math.round((x[k]||0)/tot*100):0}%</b></span>`).join('')}</div></div>`}
// ---------------- giro do cliente ----------------
// PICASSO: EXCESSO — cobertura ≥ 6 ganha o selo preto nas listas
const exc=c=>c!=null&&+c>=6?'<span class="exc" title="cobertura de 6 meses ou mais">excesso</span>':'';
const cobCh=c=>(c==null?'<span class="ch ch-n">—</span>':c<4?`<span class="ch ch-r">${dec(c)}</span>`:c<5?`<span class="ch ch-a">${dec(c)}</span>`:`<span class="ch ch-n">${dec(c)}</span>`)+exc(c);
const gCl=g=>g>=30?'g-hi':g<=20?'g-lo':'';
const cn=r=>esc(r.cor_nome||r.cor||'');
function giro(){const X=P(),T=X.top||[],A=X.aporte||[],BX=X.baixo||[],TB=X.tabela||[],FX=X.faixas||{};
 $('gr_abas').innerHTML=[['tenis','Tênis OLY'],['meias','Meias'],['chinelo','Chinelos'],['acess','Acessórios'],['ua','UA']].map(([k,n],i)=>`<span class="${i?'':'on'}" onclick="CLI.acao('giro_aba',{tipo:'${k}'})">${n}</span>`).join('');
 $('gr_base').textContent=X.base||'giro = venda ÷ (venda + estoque), igual à AG';
 $('top_sub').textContent=X.top_base||'modelo + cor com venda ≥ 40 pares/mês · verde ≥30% · vermelho ≤20%';
 $('top').innerHTML=T.length?T.map(r=>`<div class="rk"><div class="nm"><span class="nmt" title="${esc(r.modelo)}">${esc(r.modelo)}</span><span class="cor">${cn(r)}</span><small>${esc(r.ref)} · cob ${dec(r.cobertura)}${exc(r.cobertura)}${r.carteira?' · cart. '+fmt(r.carteira):''}</small></div><div class="br"><i style="width:${Math.min(100,(r.giro||0)/60*100)}%;background:${r.giro>=30?'#00B050':r.giro<=20?'#E3001B':'#2E3EFC'}"></i></div><div class="pc ${gCl(r.giro)}">${r.giro!=null?r.giro+'%':'—'}</div></div>`).join(''):'<div class="text-secondary small">sem giro lido para este cliente</div>';
 const F=[['alto','giro ≥30%','#00B050'],['medio','giro 20–30%','#2E3EFC'],['baixo','giro ≤20%','#E3001B'],['novo','novo, sem giro','#ADAEB3']],tp=fxPares();
 $('fx_sub').textContent=tp?`onde estão os ${fmt(tp)} pares que ainda vão chegar · modelo + cor`:'modelo + cor';
 $('fx').innerHTML=tp?F.map(([k,,c])=>(FX[k]||{}).pares?`<i style="flex:${FX[k].pares};background:${c}"></i>`:'').join(''):'';
 $('fxl').innerHTML=F.map(([k,t,c])=>{const f=FX[k]||{};return `<div><div class="t"><i style="background:${c}"></i>${t}</div><div class="q">${fmt(f.pares)}</div><small>pares · ${fmt(f.modelos)} modelos · ${mil(f.valor)}</small></div>`}).join('');
 const L=(h,rows)=>`<div class="row1 hd"><div>Modelo</div><div class="num">Giro</div><div class="num">Cob.</div><div class="num">${h}</div></div>`+rows;
 const apo=r=>r.disponivel&&r.disponivel.pares?`<a class="ap ap-v" href="#cms-pass/repasse?ref=${encodeURIComponent(r.ref)}&cor=${encodeURIComponent(r.cor)}" onclick="return CLI.aporte('${esc(r.ref)}','${esc(r.cor)}')" title="Pedir aporte no CMS PASS"><i class="ti ti-arrow-right"></i>aporte</a><div class="rp">disponível para aporte: ${fmt(r.disponivel.pares)} pares · ${dm(r.disponivel.data)}</div>`
  :`<span class="ap ap-r" title="Sem disponível para aporte e sem dispo lida — puxar a dispo sob demanda">aporte S/dispo</span><div class="rp x">sem disponível no momento</div>`;
 $('pre').innerHTML=A.length?L('Carteira',A.slice(0,MAIS.pre?A.length:10).map(r=>`<div class="row1"><div class="nm"><b>${esc(r.modelo)}</b><span class="cor">${cn(r)}</span>${r.fora_linha?'<span class="fl">fora de linha</span>':''}${apo(r)}<small>${esc(r.ref)} · vende ${fmt(r.venda)}/mês · ${r.cobertura<4?'ruptura':'ideal'}</small></div><div class="num fw-bold ${gCl(r.giro)}">${r.giro!=null?r.giro+'%':'—'}</div><div class="num">${cobCh(r.cobertura)}</div><div class="num">${r.carteira?fmt(r.carteira):'<span class="text-secondary">—</span>'}</div></div>`).join(''))+(A.length>10?`<a class="mais abre" href="#" onclick="CLI.mais('pre');return false">${MAIS.pre?'− mostrar só 10':'+ '+(A.length-10)+' modelos-cor'}</a>`:''):'<div class="text-secondary small mt-2">nenhum modelo-cor abaixo de 5 meses de cobertura</div>';
 if((X.fora_sem_dispo||[]).length)$('pre').innerHTML+=`<div class="hora mt-2">Fora da lista por estar fora de linha, sem disponível: ${X.fora_sem_dispo.map(esc).join(', ')}.</div>`;
 const ab=BX.length?'abre':'';   // PICASSO: os 3 totais abrem a lista inteira — marca só com número
 $('tot').innerHTML=`<div role="button" tabindex="0" style="cursor:pointer" title="ver todos os modelos-cor" onclick="CLI.maisTodos('bx')"><b class="${ab}">${BX.length?fmt(bxT()):'—'}</b><small>pares em carteira</small></div><div role="button" tabindex="0" style="cursor:pointer" onclick="CLI.maisTodos('bx')"><b class="${ab}">${BX.length?mil(bxV()):'—'}</b><small>a faturar</small></div><div role="button" tabindex="0" style="cursor:pointer" onclick="CLI.maisTodos('bx')"><b class="${ab}">${BX.length||'—'}</b><small>modelos-cor</small></div>`;
 $('bx').innerHTML=BX.length?L('Carteira',BX.slice(0,MAIS.bx?BX.length:10).map(r=>`<div class="row1"><div class="nm"><b>${esc(r.modelo)}</b><span class="cor">${cn(r)}</span>${r.fora_linha?'<span class="fl">fora de linha</span>':''}<small>${esc(r.ref)} · 1º fat. ${dm(r.primeiro_fat)}</small></div><div class="num fw-bold g-lo">${r.giro!=null?r.giro+'%':'—'}</div><div class="num">${cobCh(r.cobertura)}</div><div class="num"><b class="abre" role="button" tabindex="0" title="ver as linhas da carteira deste modelo-cor" onclick="CLI.linRef(this,'${esc(r.ref)}','${esc(r.cor)}')">${fmt(r.carteira)}</b> <a class="trt" href="#aba=cg&cliente=${cod()}&ref=${encodeURIComponent(r.ref)}&cor=${encodeURIComponent(r.cor)}" onclick="return CLI.tratar('${esc(r.ref)}','${esc(r.cor)}')" title="Abrir as linhas na carteira detalhada para postergar, transferir ou cancelar">tratar</a><small class="d-block text-secondary" style="font-size:11px">${mil(r.valor)}</small></div></div>`).join(''))+(BX.length>10?`<a class="mais abre" href="#" onclick="CLI.mais('bx');return false">${MAIS.bx?'− mostrar só 10':'+ '+(BX.length-10)+' modelos-cor'}</a>`:''):'<div class="text-secondary small mt-2">nenhum modelo-cor de giro baixo com carteira</div>';
 const NV=X.novos||(FX.novo?{modelos:FX.novo.modelos,pares:FX.novo.pares}:null);$('novo').textContent=NV&&NV.modelos?`Fora da conta: ${fmt(NV.modelos)} modelos-cor novos, ainda sem giro (${fmt(NV.pares)} pares) — conferir, não alertar.`:'';
 $('tab_tit').textContent=TB.length?`Ver tabela completa (${TB.length} modelos-cor que mais vendem)`:'Ver tabela completa';
 setTimeout(()=>rolaSombra('tab'),0);
 $('tab').innerHTML=TB.map(r=>`<tr><td><b>${esc(r.modelo)}</b> <span class="cor">${cn(r)}</span>${r.fora_linha?'<span class="fl">fora de linha</span>':''}<div class="text-secondary small">${esc(r.ref)}</div></td><td class="num">${fmt(r.venda)}</td><td class="num">${fmt(r.estoque)}</td><td class="num fw-bold ${gCl(r.giro)}">${r.giro!=null?r.giro+'%':'—'}</td><td class="num">${cobCh(r.cobertura)}</td><td class="num">${r.carteira?fmt(r.carteira):'—'}</td></tr>`).join('')}
// ---------------- carteira: por mês e estado · por família ----------------
function carteiraSec(){const c=D.carteira||{},M=(c.meses||[]).filter(x=>(x.cart||0)>0),be=((c.meses||[]).find(x=>x.base_em)||{}).base_em;
 $('ct_base').textContent=(be?'carteira '+dm(be)+(String(be).length>10?' '+String(be).slice(11,16):'')+' · ':'')+'estado pela cor da AG';
 // Léo 28/10 (demo): o "+" do mês abre a carteira do mês por ESTADO, família a família (carteira.meses[].detalhe); o estado é o da AG
 const ESTC={CONFIRMADA:['confirmada','#92D050'],APORTE:['aporte','#00B050'],SUGESTAO:['sugestão','#2E3EFC'],ATENCAO:['atenção','#FFFF00'],CANCELAR:['a cancelar','#FF0000']};
 $('cart').innerHTML=M.length?M.map((x,i)=>{const e=x.estados||{},t=(e.confirmada||0)+(e.aporte||0)+(e.atencao||0)+(e.cancelar||0),DT=x.detalhe||[];
  const PU=x.por_uf||null,curto=n=>String(n).replace(' Olympikus','').replace(' Under Armour',' UA');
  const ufs=PU?`<div style="border-top:1px solid var(--cl);margin-top:4px"><b>por UF de destino (CD)</b></div>`+Object.entries(PU).map(([uf,f])=>`<div><b>${esc(uf)}</b>${Object.entries(f).filter(([,q])=>q>0).map(([n,q])=>`<span>${esc(curto(n))} ${fmt(q)}</span>`).join('')}</div>`).join(''):'';
  const det=DT.length?`<div class="cart-d" id="cartd${i}">${DT.map(d=>`<div><b>${esc(d.nome)} · ${fmt(d.total)} ${esc(d.unidade)}</b>${Object.entries(d.estados||{}).filter(([,q])=>q>0).map(([k,q])=>`<span><i style="background:${(ESTC[k]||['',''])[1]}"></i>${esc((ESTC[k]||[k])[0])} ${fmt(q)}</span>`).join('')}</div>`).join('')}${ufs}</div>`:'';
  return `<div class="mb-3 cart-m"><div class="d-flex mb-1 align-items-center">${DT.length?`<button class="mais-m" onclick="CLI.cartd(${i},this)" title="abrir o mês por estado">+</button>`:''}<b class="text-capitalize">${MS2[+String(x.mes).slice(5,7)-1]}</b><span class="ms-auto num${DT.length?' abre':''}" ${DT.length?`role="button" title="abrir o mês por estado e por UF" onclick="CLI.cartd(${i},this.closest('.cart-m').querySelector('.mais-m'))"`:''}>${fmt(x.cart)} pares${x.valor!=null?' · R$ '+fmt(x.valor/1000)+' mil':''}</span></div><div class="est-b">${t?[['confirmada','e-conf'],['aporte','e-ap'],['atencao','e-at'],['cancelar','e-can']].map(([k,cl])=>e[k]?`<span class="${cl}" style="width:${e[k]/t*100}%"></span>`:'').join(''):''}</div>${det}</div>`}).join(''):'<div class="text-secondary small">sem carteira aberta</div>';
 // a matriz família × mês: todo número com carteira abre a carteira daquela família naquele mês, linha a linha (carteira.linhas['nome|AAAA-MM'])
 const FM=c.familias||[],ms=[...new Set(FM.flatMap(f=>Object.keys(f.meses||{})))].sort(),LN=c.linhas||{};
 const totCel=f=>{const t=ms.reduce((a,m)=>a+((f.meses||{})[m]||0),0);return `<td class="num fw-bold">${t?`<a class="abre" role="button" tabindex="0" data-k="${esc(f.nome)}|todos" onclick="CLI.famcel(this)" title="abrir a carteira de ${esc(f.nome)} em todos os meses">${fmt(t)}</a>`:fmt(t)} <small class="text-secondary">${esc(f.unidade||'pares')}</small></td>`},CEL=innerWidth<576;   // v37 (GAMER): no celular o TOTAL vem antes dos meses, sem coluna fixa cobrindo o último mês
 $('fam_h').innerHTML=`<tr><th>Família</th>${CEL?'<th class="num">total</th>':''}${ms.map(m=>`<th class="num">${MS2[+m.slice(5,7)-1]}</th>`).join('')}${CEL?'':'<th class="num">total</th><th class="num">R$</th>'}</tr>`;
 const curtoF=n=>String(n).replace('Olympikus','OLY').replace('Under Armour','UA').replace('Acessórios','Acess.').replace('Confecção','Conf.');   // v38 (GAMER): no celular a coluna Família encurta para caberem os 3 meses
 $('fam').innerHTML=FM.length?FM.map(f=>{const t=ms.reduce((a,m)=>a+((f.meses||{})[m]||0),0);if(f.sem_linhas)return `<tr class="sem-lin"><td>${esc(CEL?curtoF(f.nome):f.nome)}</td><td class="num text-secondary" colspan="${ms.length+(CEL?1:2)}">sem linha na carteira · o resumo diz ${mil(f.resumo_valor)} — valor em conferência</td></tr>`;return `<tr><td>${esc(CEL?curtoF(f.nome):f.nome)}</td>${CEL?totCel(f):''}${ms.map(m=>{const q=(f.meses||{})[m]||0,k=f.nome+'|'+m;return `<td class="num">${q&&LN[k]?`<a class="abre" role="button" tabindex="0" data-k="${esc(k)}" onclick="CLI.famcel(this)" title="abrir a carteira de ${esc(f.nome)} em ${MSX[+m.slice(5,7)-1]}">${fmt(q)}</a>`:(q===0&&(((D.carteira||{}).valor_resumo||{})[k]||0)>=1?(()=>{const vr=((D.carteira||{}).valor_resumo||{})[k],tx=`${typeof curtoF==='function'&&CEL?curtoF(f.nome):f.nome} · ${mesN(m)}: sem linha na carteira; o resumo diz ${vr<1000?'R$ '+fmt(vr):mil(vr)} — valor em conferência`;return `<span class="zero-res" role="button" tabindex="0" title="${esc(tx)}" aria-label="${esc(tx)}" data-msg="${esc(tx)}" onclick="CLI.zeroRes(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();CLI.zeroRes(this)}">0<i class="pt-av" aria-hidden="true"></i></span>`})():fmt(q))}</td>`}).join('')}${CEL?'':`<td class="num fw-bold">${t?`<a class="abre" role="button" tabindex="0" data-k="${esc(f.nome)}|todos" onclick="CLI.famcel(this)" title="abrir a carteira de ${esc(f.nome)} em todos os meses">${fmt(t)}</a>`:fmt(t)} <small class="text-secondary">${esc(f.unidade||'pares')}</small></td><td class="num">${f.valor!=null?(t?`<a class="abre" role="button" tabindex="0" data-k="${esc(f.nome)}|todos" onclick="CLI.famcel(this)">${fmt(f.valor/1000)} mil</a>`:fmt(f.valor/1000)+' mil'):'—'}</td>`}</tr>`}).join(''):`<tr><td colspan="${ms.length+3}" class="text-secondary">sem carteira por família</td></tr>`;
 const fd=$('famd');if(fd){fd.classList.remove('ab');fd.innerHTML=''}}
function famcel(a){const fd=$('famd');if(!fd)return;const k=a.dataset.k,[nome,m]=k.split('|'),LN=(D.carteira||{}).linhas||{},L=m==='todos'?Object.keys(LN).filter(x=>x.startsWith(nome+'|')).sort().flatMap(x=>LN[x]):(LN[k]||[]);
 const on=fd.classList.contains('ab')&&fd.dataset.k===k;[...document.querySelectorAll('#fam td.num a.on')].forEach(x=>x.classList.remove('on'));
 if(on){fd.classList.remove('ab');fd.innerHTML='';fd.dataset.k='';return}
 a.classList.add('on');fd.dataset.k=k;const u=/meia/i.test(nome)?'packs':/acess|confec/i.test(nome)?'peças':'pares',tp=L.reduce((s,r)=>s+(r.pares||0),0),tv=L.reduce((s,r)=>s+(r.valor||0),0);
 const bl=(D.carteira||{}).linhas_base,bm=String((D.carteira||{}).base_em||'').slice(0,10),difB=bl&&bm&&bl!==bm;
 const VRS=(D.carteira||{}).valor_resumo||{},vr=k in VRS?VRS[k]:null,dC=vr==null?null:Math.round(Math.abs(tv-vr)*100),difV=vr==null?tv>0:dC>=100,txtV=vr==null?'sem resumo para conferir':`o resumo diz ${mil(vr)} (diferença de R$ ${fmt(Math.abs(tv-vr))})`;   // v38 (GAMER): centavos com tolerância de R$ 1; sem chave avisa também no 'todos'   // GAMER: número ≠ detalhe vale para qualquer diferença   // GAMER 28/10: R$ das linhas (pares × preço unitário) × R$ do resumo (venda_mensal): se diverge, a tela diz   // GAMER 28/10: linhas de hoje × resumo de ontem — a tela diz, nunca dois números calados
 fd.innerHTML=`<div class="ct"><b>${esc(nome)} · ${m==='todos'?'todos os meses':MSX[+m.slice(5,7)-1]+'/'+m.slice(2,4)}</b><span class="hora">${fmt(tp)} ${u} · ${mil(tv)} · ${L.length} ${L.length===1?'linha':'linhas'} da carteira · previsão de faturamento ${m==='todos'?'por mês':'no mês'}${difB?` · <b>base de ${dm(bl)}: ${fmt(tp)} ${u} (o resumo do mês é de ${dm(bm)})</b>`:''}${difV?` · <b>R$ pelas linhas da carteira; ${txtV} — valor em conferência</b>`:''}</span><button class="x" onclick="CLI.famfecha()" title="fechar">×</button></div>
  <div class="lst"><div class="it hd2"><span>modelo · cor</span><span class="num">prev. fat.</span><span class="num">${u}</span><span class="num rs">R$</span></div>${L.map(r=>`<div class="it"><span><b>${esc(r.modelo)}</b> <span class="cor">${esc(r.cor_nome||r.cor||'')}</span><small>${esc(r.ref)}${r.uf?' · '+esc(r.uf):''}</small></span><span class="num">${dm(r.prev_fat)}</span><span class="num fw-bold">${fmt(r.pares)}</span><span class="num rs">${r.valor?fmt(r.valor):'—'}</span></div>`).join('')}</div>`;
 fd.classList.add('ab');fd.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'})}
// ---------------- filtro (3 blocos) ----------------
const TIPOS=[['tenis','Tênis (footwear)'],['meias','Meias'],['chinelo','Chinelo'],['acess','Acessório'],['conf','Confecção']];
const GT=[['MASCULINO','Masculino'],['FEMININO','Feminino'],['INFANTIL','Infantil'],['UNISSEX','Unissex']],GM=[['MASCULINO','Masculino (39/44)'],['FEMININO','Feminino (33/38)']];
const CATS=[['CONF_MASC','Conforto masculino'],['CONF_FEM','Conforto feminino'],['CORRIDA/TREINO','Corrida / treino'],['CORRE','Corre'],['CLASSICOS','Clássicos'],['INFANTIL','Infantil']];
const unid=f=>f.tipo==='meias'?'packs':f.tipo==='acess'?'peças':'pares';
function titulo(f){const mk=(f.marca||[]).map(x=>x==='UA'?'Under Armour':'Olympikus').join(' + ')||'—',tp=((TIPOS.find(x=>x[0]===f.tipo)||[,''])[1]).replace(' (footwear)','');
 const det=(f.categoria||[]).length?f.categoria.map(c=>(CATS.find(x=>x[0]===c)||[,c])[1]).join(' + '):(f.genero||[]).length?f.genero.map(g=>((f.tipo==='meias'?GM:GT).find(x=>x[0]===g)||[,g])[1]).join(' + '):'';
 return `${mk} · ${tp}${det?' · '+det:''} · ${unid(f)}`}
function painel(){const f=FIL,ck=(a,v)=>(a||[]).includes(v)?'checked':'',ehT=f.tipo==='tenis',ehM=f.tipo==='meias';
 const b1=`<div class="fb"><h4>1 · Marca</h4>${[['OLY','Olympikus'],['UA','Under Armour']].map(([k,n])=>`<label><input type="checkbox" ${ck(f.marca,k)} onchange="CLI.liga('marca','${k}',this.checked)">${n}</label>`).join('')}<small>Under Armour: só tênis tem histórico de sell-out hoje.</small></div>`;
 const b2=`<div class="fb"><h4>2 · Tipo</h4>${TIPOS.map(([k,n])=>`<label><input type="radio" name="tp" ${f.tipo===k?'checked':''} onchange="CLI.tipo('${k}')">${n}</label>`).join('')}<small>Um tipo por vez: chinelo nunca se soma ao tênis.</small></div>`;
 const b3=ehM?`<div class="fb"><h4>3 · Dentro das meias</h4><div class="sub">Gênero</div>${GM.map(([k,n])=>`<label><input type="checkbox" ${ck(f.genero,k)} onchange="CLI.liga('genero','${k}',this.checked)">${n}</label>`).join('')}<small>Marque os dois para somar.</small></div>`
  :`<div class="fb" style="${ehT?'':'opacity:.45;pointer-events:none'}"><h4>3 · Dentro do tênis</h4><div class="sub">Gênero</div>${GT.map(([k,n])=>`<label><input type="checkbox" ${ck(f.genero,k)} onchange="CLI.liga('genero','${k}',this.checked)">${n}</label>`).join('')}
   <div class="sub">Categoria</div>${CATS.map(([k,n])=>`<label><input type="checkbox" ${ck(f.categoria,k)} onchange="CLI.liga('categoria','${k}',this.checked)">${n}</label>`).join('')}<small>Marque quantos quiser: o gráfico soma. Gênero e categoria não se somam entre si — marcar um lado limpa o outro.</small></div>`;
 $('menu').innerHTML=b1+b2+b3+`<div class="fbar"><button onclick="CLI.limpa()">limpar</button><span class="hora">${esc(titulo(f))}</span><button class="ok" onclick="CLI.fecha()">ver no gráfico</button></div>`}
function mudouFiltro(){$('htit').textContent=titulo(FIL);painel();chama('onFiltro',JSON.parse(JSON.stringify(FIL)))}
const ehPadrao=()=>FIL&&FIL.tipo==='tenis'&&(FIL.marca||[]).join()==='OLY'&&!(FIL.genero||[]).length&&!(FIL.categoria||[]).length;
// ---------------- leitura do NÚCLEO acima do gráfico (sinal, não veredito) ----------------
function leituraGraf(){const A=D.anos||{},AN=(A.lista||[]).map(String),y=AN[AN.length-1],yp=String(+y-1),ser=(c,a)=>((A[c]||{})[a])||[];
 if(!y){$('leitx').textContent='';return}
 const so=ser('sellout',y),ult=so.map((v,i)=>v!=null?i:-1).filter(i=>i>=0).pop();
 if(ult==null){$('leitx').textContent='Sem sell-out neste recorte.';return}
 const m3=[ult-2,ult-1,ult].filter(i=>i>=0),med=m3.reduce((a,i)=>a+(so[i]||0),0)/m3.length,fr=[],g=D.giro||{},COB=ehPadrao()&&baseCob().ok?g.cobertura:null;
 if(COB!=null){const fx=faixaCob(COB);fr.push(`Cobertura de ${dec(COB)} meses, ${fx==='alta'?'alta (acima de 5)':fx}.${COB>=5&&ult>=8&&ult<=10?' Em set–nov cobertura alta é o colchão do dezembro, não alarme.':''}`)}
 // regra 2 (NÚCLEO, revista 27/10): olha primeiro o atingimento do mês corrente
 const mi=+hoje().slice(5,7)-1,TK=ehPadrao()?(((D.metas||{}).meses||{})[hoje().slice(0,7)]||{})['TT CALCADOS (soma das faixas)']:null;   // GAMER 28/10: uma fonte só — o cartão de Metas
 const mo=TK&&TK[0]?TK[0]:(hoje().slice(0,4)===y?ser('meta',y)[mi]:null),po=TK&&TK[0]?TK[1]:(hoje().slice(0,4)===y?ser('sellin',y)[mi]:null),fat=TK&&TK[0]?TK[4]:null;
 if(mo){const pc=(po||0)/mo*100,bate=fat!=null&&fat<mo?`bate se a carteira de ${MS2[mi]} faturar (faturado ${fmt(fat)} na DETALHADA, ${Math.round(fat/mo*100)}% · com a carteira, ${fmt(po)} pela Carta, ${Math.round(pc)}%)`:`já está batida (${fmt(po)}, ${Math.round(pc)}%)`;
  if(pc>=100&&mo>med)fr.push(`A meta de ${MS2[mi]} (${fmt(mo)}) ${bate}, mas ele gira ${fmt(med)}/mês: o que entra acima disso vira estoque. Segurar o próximo pedido e acelerar o sell-out (trade).`);
  else if(pc<100&&mo>med*1.3&&COB!=null&&COB>=5)fr.push(`A meta de ${MS2[mi]} pede ${fmt(mo)} e ele gira ${fmt(med)}/mês: só cabe com ação de sell-out (trade), não com mais pedido.`);
  else if(pc<100&&COB!=null&&COB<4)fr.push('Gira acima da meta e está curto: cabe mais pedido.');
  else fr.push(`Meta de ${MS2[mi]}: ${fmt(po)} de ${fmt(mo)} com a carteira (${Math.round(pc)}%)${fat!=null?`, faturado ${fmt(fat)}`:''}; ele gira ${fmt(med)}/mês.`)}
 const sp=ser('sellout',yp),a26=m3.reduce((a,i)=>a+(so[i]||0),0),a25=m3.reduce((a,i)=>a+(sp[i]||0),0);
 if(a25&&m3.every(i=>sp[i]!=null)){const d=Math.round((a26/a25-1)*100);fr.push(`Sell-out de ${MS2[m3[0]]}–${MS2[ult]} ${d>=0?'+':''}${d}% contra ${yp}.`)}
 const d25=sp[11],md25=sp.slice(0,11).filter(v=>v!=null),mm=md25.length?md25.reduce((a,v)=>a+v,0)/md25.length:0;if(d25&&mm&&ult>=8&&ult<=10)fr.push(`Dezembro vende ${(d25/mm).toFixed(1).replace('.',',')}× a média dele: o sell-in tem de entrar até novembro.`);
 if(!fr.length)fr.push(`Neste recorte só há ${MS2[m3[0]]}–${MS2[ult]}/${y.slice(2)}: sem ano anterior para comparar e sem meta própria. Venda média de ${fmt(med)}/mês nos últimos 3 meses.`);
 $('leitx').innerHTML='<b>Leitura:</b> '+fr.slice(0,3).join(' ')}
// ---------------- "ver números": ano a ano ----------------
// PICASSO 28/10 · tabela que rola de lado (padrão Carbon/Primer): 1ª coluna e TOTAL fixos no CSS; aqui só liga .tem-mais-esq/.tem-mais-dir
function rolaSombra(id){const t=$(id),el=t&&t.closest('.rola');if(!el)return;const f=()=>{const w=el.clientWidth;el.classList.toggle('tem-mais-esq',w>0&&el.scrollLeft>1);el.classList.toggle('tem-mais-dir',w>0&&el.scrollLeft+w<el.scrollWidth-1)};
 if(!el.__rola){el.__rola=1;el.addEventListener('scroll',f,{passive:true});addEventListener('resize',f);const d=el.closest('details');if(d)d.addEventListener('toggle',f)}f()}
function numeros(){const A=D.anos||{},AN=(A.lista||[]).map(String),y=AN[AN.length-1],ser=(c,a)=>((A[c]||{})[a])||[];if(!y){$('tx').innerHTML='';return}
 const so=ser('sellout',y),ate=(so.map((v,i)=>v!=null?i:-1).filter(i=>i>=0).pop()??8)+1,per=`jan–${MS2[ate-1]}`;
 const sm=(c,a,n)=>ser(c,a).slice(0,n).reduce((t,v)=>t+(v||0),0),nm=(c,a,n)=>ser(c,a).slice(0,n).filter(v=>v!=null).length,tem=(c,a)=>ser(c,a).some(v=>v!=null),cheio=(c,a,n)=>nm(c,a,n)===n;
 const cel=(c,a)=>!tem(c,a)?'<span class="text-secondary">falta carregar</span>':nm(c,a,ate)===0?'—':cheio(c,a,ate)?fmt(sm(c,a,ate)):fmt(sm(c,a,ate))+' <small class="text-secondary">só '+nm(c,a,ate)+' meses</small>';
 const mt=ser('meta',y),mi=mt.map((v,i)=>v!=null?i:-1).filter(i=>i>=0),mtT=mi.reduce((a,i)=>a+mt[i],0),siQ=mi.reduce((a,i)=>a+(ser('sellin',y)[i]||0),0),u=unid(FIL||{});
 setTimeout(()=>rolaSombra('tx'),0);
 $('tx').innerHTML=`<thead><tr><th></th>${AN.map(a=>`<th class="num">${a} · ${per}</th>`).join('')}<th class="num">${y} · ano</th></tr></thead><tbody>
  <tr><td>Sell-out</td>${AN.map(a=>`<td class="num">${cel('sellout',a)}</td>`).join('')}<td class="num text-secondary">${MS2[ate-1]}/${y.slice(2)} é o último mês</td></tr>
  <tr><td>Sell-in</td>${AN.map(a=>`<td class="num">${cel('sellin',a)}</td>`).join('')}<td class="num">${tem('sellin',y)?fmt(sm('sellin',y,12))+' <small class="text-secondary">com carteira</small>':'—'}</td></tr>
  <tr><td>Sell-in ÷ sell-out</td>${AN.map(a=>`<td class="num">${cheio('sellin',a,ate)&&cheio('sellout',a,ate)?(sm('sellin',a,ate)/Math.max(1,sm('sellout',a,ate))).toFixed(2).replace('.',','):'—'}</td>`).join('')}<td></td></tr>
  <tr><td>Meta do ${esc(nome())}${mi.length?` (${MS2[mi[0]]}–${MS2[mi[mi.length-1]]})`:''}</td>${AN.map(()=>'<td class="num">—</td>').join('')}<td class="num">${mtT?fmt(mtT)+' · sell-in '+fmt(siQ)+' ('+Math.round(siQ/mtT*100)+'%)':'<span class="text-secondary">'+(['meias','chinelo','acess'].includes((FIL||{}).tipo)?'meta em R$: ver Metas':'sem meta neste recorte')+'</span>'}</td></tr></tbody>`;
 void u}
// ---------------- gráfico ----------------
let animou=false;
// PICASSO 28/10 · rótulos sem sobreposição — a regra do hideOverlap do ECharts: guarda a caixa de cada rótulo desenhado e descarta o que colidir.
// Prioridade: último ponto de cada série > maior valor > o resto. Abaixo de 576 px, só o último ponto de cada série (o resto fica na dica do toque).
// PICASSO v41 · no celular, a regra do moveOverlap/shiftY do ECharts para o ÚLTIMO ponto de cada série: nunca é descartado; se colide nas
// duas posições (acima/abaixo), desce/sobe em degraus de uma linha até caber dentro da área do gráfico e ganha um traço fino até o ponto.
// Os outros rótulos (e tudo no PC) seguem a regra de descartar do hideOverlap.
function semSobrepor(R,FIXO,W,HH){const cel=W<576||(typeof matchMedia==='function'&&matchMedia('(max-width:575.98px)').matches),M=2,FS=11,LH=FS+2,cx=(t)=>t.length*FS*0.58,TOPO=2,BASE=HH-20;
 const cand=(cel?R.filter(r=>r.ul):R).slice().sort((a,b)=>(b.ul-a.ul)||(b.v-a.v)),usadas=FIXO.slice();let out='';
 const bate=b=>usadas.some(u=>b[0]<u[2]+M&&b[2]>u[0]-M&&b[1]<u[3]+M&&b[3]>u[1]-M),caixa=(x0,w,ty)=>[x0,ty-FS+1,x0+w,ty+2];
 const poe=(r,x0,w,ty,liga)=>{usadas.push(caixa(x0,w,ty));if(liga){const yl=ty<r.y?ty+3:ty-FS+1;out+=`<line class="rot-liga" x1="${r.x}" y1="${r.y}" x2="${x0+w/2}" y2="${yl}" stroke="${r.c}" stroke-width="1" opacity=".6"/>`}
  out+=`<text class="rot" x="${x0+w/2}" y="${ty}" text-anchor="middle" font-size="${FS}" fill="${r.c}" stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke" font-family="Inter">${r.t}</text>`};
 cand.forEach(r=>{const w=cx(r.t),x0=Math.max(2,Math.min(W-2-w,r.x-w/2));
  for(const dy of [-6,14]){const ty=r.y+dy,b=caixa(x0,w,ty);if(b[1]<0||b[3]>HH)continue;if(bate(b))continue;poe(r,x0,w,ty,false);return}
  if(!r.ul)return;                                                         // hideOverlap: descarta (v42: o último ponto nunca, em nenhuma largura)
  for(let k=1;k<=16;k++)for(const ty of [r.y-6-k*LH,r.y+14+k*LH]){const b=caixa(x0,w,ty);if(b[1]<TOPO||b[3]>BASE)continue;if(bate(b))continue;poe(r,x0,w,ty,true);return}
  poe(r,x0,w,Math.max(TOPO+FS,Math.min(BASE-2,r.y-6)),false)});           // sem vaga: fica no lugar (nunca some)
 return out}
function grafico(){const A=D.anos||{},AN=(A.lista||[]).map(String);
 AN.forEach(y=>{if(ANS[y]==null)ANS[y]=1});const cor=y=>CORANO[Math.max(0,CORANO.length-AN.length+AN.indexOf(y))]||'#2E3EFC';
 const ser=(c,y)=>((A[c]||{})[y])||[],val=(c,y,i)=>{const v=ser(c,y)[i];return v==null?null:+v};
 const svg=$('gx'),W=Math.max(260,Math.round(svg.getBoundingClientRect().width)||1100),HH=280,P=30,CEL=W<600;svg.setAttribute('viewBox',`0 0 ${W} ${HH}`);
 const X=i=>P+40+i*(W-2*P-80)/11,vals=[];AN.forEach(y=>MS2.forEach((_,i)=>{['sellout','sellin','meta'].forEach((c,j)=>{const on=[CAM.so,CAM.si,CAM.mt][j],v=val(c,y,i);if(on&&v!=null)vals.push(v)})}));
 const mx=Math.max(1,...vals)*1.12,Y=v=>HH-P-(HH-2*P)*v/mx;let g='';
 let ROTS='';const ROT=[],FIXO=[],cx=(t,fs)=>String(t).length*fs*0.58;   // PICASSO (hideOverlap): ROT = rótulos candidatos; FIXO = caixas que já estão no SVG (eixos)
 for(let t=0;t<=4;t++){const v=mx/1.12*t/4,y=Y(v),tt=v>=1000?(v/1000).toFixed(1).replace('.',',')+'k':String(Math.round(v));FIXO.push([W-P-34,y-7,W-P-34+cx(tt,11),y+5]);g+=`<line x1="${P+40}" x2="${W-P-40}" y1="${y}" y2="${y}" stroke="#E6E7E8"/><text x="${W-P-34}" y="${y+4}" font-size="11" fill="#787B86" font-family="Inter">${v>=1000?(v/1000).toFixed(1).replace('.',',')+'k':Math.round(v)}</text>`}
 MS2.forEach((m,i)=>g+=`<text x="${X(i)}" y="${HH-8}" text-anchor="middle" font-size="12" font-weight="600" fill="#787B86" font-family="Inter">${CEL?m[0].toUpperCase():m}</text>`);
 const on=AN.filter(y=>ANS[y]);
 if(CAM.es){const ev=[];AN.forEach(y=>MS2.forEach((_,i)=>{const v=val('estoque',y,i);if(v!=null)ev.push(v)}));const emx=Math.max(1,...ev)*1.15,YE=v=>HH-P-(HH-2*P)*v/emx;
  if(ev.length){FIXO.push([W-4-cx('estoque',11),P-20,W-4,P-8]);g+=`<text x="${W-4}" y="${P-10}" text-anchor="end" font-size="11" font-weight="700" fill="#2E3EFC" opacity=".7" font-family="Inter">estoque</text>`;
   [0,.5,1].forEach(f=>{const v=emx/1.15*f,tt=v?(v/1000).toFixed(v>=10000?0:1).replace('.',',')+'k':'0';FIXO.push([W-4-cx(tt,11),YE(v)-7,W-4,YE(v)+5]);g+=`<text x="${W-4}" y="${YE(v)+4}" text-anchor="end" font-size="11" fill="#2E3EFC" opacity=".7" font-family="Inter">${v?(v/1000).toFixed(v>=10000?0:1).replace('.',',')+'k':'0'}</text>`})}
  on.forEach(y=>{const pts=MS2.map((_,i)=>{const v=val('estoque',y,i);return v==null?null:[X(i),YE(v),v]}).filter(Boolean);if(!pts.length)return;
   g+=`<polygon points="${pts[0][0]},${HH-P} ${pts.map(p=>p[0]+','+p[1]).join(' ')} ${pts[pts.length-1][0]},${HH-P}" fill="${cor(y)}" opacity=".10"/><polyline points="${pts.map(p=>p[0]+','+p[1]).join(' ')}" fill="none" stroke="${cor(y)}" stroke-width="1.2" opacity=".55" vector-effect="non-scaling-stroke"/>`;
   pts.forEach((p,j)=>{const ul=j===pts.length-1;if(j%2===0||ul)ROT.push({x:p[0],y:p[1],v:p[2],ul,c:cor(y),t:(p[2]/1000).toFixed(1).replace('.',',')+'k'})})});
  ROTS=semSobrepor(ROT,FIXO,W,HH)}
 const linha=(c,y,st,w)=>{let seg=[],out='';const fl=()=>{if(seg.length>1)out+=`<polyline fill="none" stroke="${cor(y)}" stroke-width="${w}" ${st} points="${seg.join(' ')}" vector-effect="non-scaling-stroke"/>`;else if(seg.length===1){const[a,b]=seg[0].split(',');out+=`<circle cx="${a}" cy="${b}" r="3" fill="${cor(y)}"/>`}seg=[]};
  MS2.forEach((_,i)=>{const v=val(c,y,i);if(v!=null)seg.push(`${X(i)},${Y(v)}`);else fl()});fl();return out};
 on.forEach(y=>{const c=cor(y);
  if(CAM.mt){g+=linha('meta',y,'stroke-dasharray="10 6"',2.2);MS2.forEach((_,i)=>{const v=val('meta',y,i);if(v==null)return;const bat=(val('sellin',y,i)||0)>=v;g+=`<rect x="${X(i)-4}" y="${Y(v)-4}" width="8" height="8" fill="${bat?c:'#fff'}" stroke="${c}" stroke-width="2" transform="rotate(45 ${X(i)} ${Y(v)})"/>`})}
  if(CAM.so)g+=linha('sellout',y,'',3.2);
  if(CAM.si){g+=linha('sellin',y,'stroke-dasharray="2 4" stroke-linecap="round"',3);MS2.forEach((_,i)=>{const v=val('sellin',y,i);if(v==null)return;const ca=(val('sellin_carteira',y,i)||0)>0;g+=`<circle cx="${X(i)}" cy="${Y(v)}" r="4.5" fill="${ca?'#fff':c}" stroke="${c}" stroke-width="2"><title>${ca?'potencial: inclui carteira ainda não faturada':'faturado'}</title></circle>`})}});
 // GAMER 28/10: as pílulas ficavam na altura do valor de janeiro, com áreas de toque de 44 px a 24 px uma da outra (toque na 2025 mudava a 2026) e o toque duplo virava "só este ano" — agora fileira fixa, por ano, sem sobreposição; "só este ano" é segurar o toque (≥ 500 ms)
 // PICASSO: os anos saem do SVG para a fileira FIXA #anos acima do gráfico — alvo ≥ 44 px; mesmos handlers CLI.pd/pu (toque = CLI.ano · segurar ≥ 500 ms = CLI.so) · teclado Enter/Espaço = CLI.ano
 const an=$('anos');if(an)an.innerHTML=AN.map(y=>{const o=ANS[y],c=cor(y);return `<button type="button" class="anop${o?' on':''}" style="--c:${c}" aria-pressed="${o?'true':'false'}" title="toque: ${o?'esconder':'mostrar'} ${y} · segurar: só ${y}" onpointerdown="CLI.pd('${y}')" onpointerup="CLI.pu('${y}')" onpointercancel="CLI.pd(null)" onpointerleave="CLI.pd(null)" oncontextmenu="return false" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();CLI.ano('${y}')}">${y}</button>`}).join('');   // sem "+ ": largura fixa (GAMER 28/10: no celular a fileira quebrava e o toque caía no vazio)
 g+=ROTS;   // v42: rótulos e traços por último, sobre as linhas
 svg.innerHTML=g;$('vazio').style.display=(on.length&&(CAM.so||CAM.si||CAM.mt||CAM.es))?'none':'flex';
 if(!animou&&on.length){animou=true;[...svg.querySelectorAll('polyline')].forEach((p,i)=>{const Lg=p.getTotalLength?p.getTotalLength():0;if(!Lg||p.getAttribute('stroke-dasharray'))return;p.style.setProperty('--len',Lg);p.classList.add('anim');p.style.animationDelay=(i*0.35)+'s'})}
 svg.onmousemove=svg.ontouchmove=ev=>{const r=svg.getBoundingClientRect(),cx=((ev.touches?ev.touches[0].clientX:ev.clientX)-r.left)/r.width*W,i=Math.max(0,Math.min(11,Math.round((cx-P-40)/((W-2*P-80)/11))));
  let h=`<b>${MS2[i]}</b>`;on.slice().reverse().forEach(y=>{const p=String(+y-1),f=(c,n)=>{const v=val(c,y,i);if(v==null)return '';const a=val(c,p,i),d=a?Math.round((v/a-1)*100):null;return `<div>${n} ${y.slice(2)}: <b>${fmt(v)}</b>${d!=null?` <span class="${d>=0?'up':'dn'}">${d>=0?'▲':'▼'}${Math.abs(d)}%</span>`:''}</div>`};
   h+=(CAM.so?f('sellout','sell-out'):'')+(CAM.si?f('sellin','sell-in'):'')+(CAM.mt?f('meta','meta'):'')+(CAM.es?f('estoque','estoque'):'')});
  const tp=$('tip');tp.innerHTML=h;tp.style.display='block';tp.style.left=Math.min(r.width-210,Math.max(0,X(i)/W*r.width+12))+'px';
  let rg=$('regua');if(!rg){rg=document.createElementNS('http://www.w3.org/2000/svg','line');rg.id='regua';rg.setAttribute('stroke','#000');rg.setAttribute('stroke-width','1');rg.setAttribute('stroke-dasharray','3 3');svg.appendChild(rg)}
  rg.setAttribute('x1',X(i));rg.setAttribute('x2',X(i));rg.setAttribute('y1',P);rg.setAttribute('y2',HH-P)};
 svg.onmouseleave=()=>{$('tip').style.display='none';const rg=$('regua');if(rg)rg.remove()};
 // os 4 bloquinhos, com o PERÍODO na legenda ("jan–set/26: 45.629")
 const E=D.etiquetas||{},ult=c=>{for(let j=AN.length-1;j>=0;j--){if(ser(c,AN[j]).some(v=>v!=null))return AN[j]}return null};
 const tot=(c,y)=>ser(c,y).reduce((a,v)=>a+(v||0),0),lastm=(c,y)=>{const s=ser(c,y);for(let i=11;i>=0;i--)if(s[i]!=null)return [i,s[i]];return null};
 const am=(st,cr)=>`<svg width="40" height="14"><line x1="2" x2="38" y1="7" y2="7" stroke="${cr}" stroke-width="3" ${st}/></svg>`;
 const B=[['so','sellout','Sell-out',E.sellout||'venda do cliente na loja',am('','#000')],['si','sellin','Sell-in',E.sellin||'o que a Vulcabras faturou · vazado = carteira',am('stroke-dasharray="2 4" stroke-linecap="round"','#000')],['mt','meta','Metas',E.meta||'sua meta dividida pelo cliente · losango',am('stroke-dasharray="10 6"','#000')],['es','estoque','Estoque',E.estoque||'área clara · escala própria · valor escrito',`<svg width="40" height="14"><rect x="2" y="3" width="36" height="9" rx="2" fill="#2E3EFC" opacity=".18"/></svg>`]];
 const faixa=(c,y)=>{const s=ser(c,y),ix=s.map((v,i)=>v!=null?i:-1).filter(i=>i>=0);return ix.length?`${MS2[ix[0]]}${ix.length>1?'–'+MS2[ix[ix.length-1]]:''}/${y.slice(2)}`:y};
 const u=unid(FIL||{});
 $('blk').innerHTML=B.map(([c,s,n,d,sv])=>{const y=ult(s),lm=y&&lastm(s,y);const txt=!y?'sem dado neste recorte':s==='estoque'?`${MS2[lm[0]]}/${y.slice(2)}: ${fmt(lm[1])} ${u}`:`${faixa(s,y)}: ${fmt(tot(s,y))} ${u}`;
  return `<button class="${CAM[c]?'':'off'}" onclick="CLI.cam('${c}')">${sv}<span><b>${n}</b><small>${esc(d)}</small><small>${txt}</small></span><span class="sw"></span></button>`}).join('');
 $('nx').textContent=[E.sellout,E.sellin,E.meta,E.estoque].filter(Boolean).join(' · ');
 leituraGraf();numeros()}
// ---------------- Bro ----------------
function broSug(){const r=((P().aporte||[]).filter(x=>x.cobertura<4).sort((a,b)=>(b.venda||0)-(a.venda||0))[0]),n=nome();
 const S=[`o que antecipar no ${n}?`,r?`por que o ${r.modelo} está em ruptura?`:null,'resume a meta do mês'].filter(Boolean);
 $('brsug').innerHTML=S.map(t=>`<button onclick="CLI.brq(this.textContent)">${esc(t)}</button>`).join('');
 if(!$('brmsg').children.length)$('brmsg').innerHTML=`<div class="m b">Fala, Léo. Estou vendo a mesma tela que você. Pergunta o que quiser deste cliente: aporte, giro, carteira, metas, participação por família.</div>`}
window.abrirBro=function(){const sec=[...document.querySelectorAll('.sec h2')].filter(h=>h.getBoundingClientRect().top<innerHeight*.6).pop();
 const ctx={cliente:(D.cliente||{}).codigo||null,nome:(D.cliente||{}).nome||null,aba:'cliente',secao:sec?sec.textContent:'topo'};
 if(chama('onBro',ctx))return;$('brctx').textContent=(ctx.nome||'—')+' · aba Cliente · '+ctx.secao;const el=$('bro');el.classList.toggle('ab');if(el.classList.contains('ab'))setTimeout(()=>$('brin').focus(),260)};
addEventListener('keydown',e=>{if(e.key==='Escape'){$('bro').classList.remove('ab');CLI.fecha()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();CLI.acao('busca')}});
document.addEventListener('click',e=>{const el=$('bro');if(el.classList.contains('ab')&&!el.contains(e.target)&&!e.target.closest('.bro-fab,.bro-m'))el.classList.remove('ab')});
// ---------------- API pública (handlers dos botões) ----------------
window.CLI={
 mes:d=>{CM=[CM[0]+(CM[1]+d>11?1:CM[1]+d<0?-1:0),(CM[1]+d+12)%12];agenda()},dia:d=>{SD=d;agenda()},
 ag:i=>{const e=(D.agenda||[])[i];if(chama('onAcao','agenda',e))return false;return !!(e&&e.link)},
 // Léo 28/10 (demo, item 3b): o toque no ano liga/desliga NA HORA (a espera de 220 ms para separar do toque duplo engolia o segundo toque e
 // o toque duplo virava "só este ano", apagando os outros — por isso "custava religar"); "só este ano" continua no toque duplo, sem espera
 ano:y=>{ANS[y]=ANS[y]?0:1;grafico()},so:y=>{Object.keys(ANS).forEach(a=>ANS[a]=a===y?1:0);grafico()},
 pd:y=>{CLI._pt=y?Date.now():0;CLI._py=y||null},pu:y=>{if(!CLI._pt||CLI._py!==y){CLI._pt=0;CLI._py=null;return}const t=Date.now()-CLI._pt;CLI._pt=0;CLI._py=null;if(t>=500)CLI.so(y);else CLI.ano(y)},   // v37 (GAMER): só o toque que começou nesta pílula vale; 0 ms vale como toque
 mais:k=>{MAIS[k]=!MAIS[k];giro()},maisTodos:k=>{MAIS[k]=true;giro();const el=$(k);if(el)el.scrollIntoView({behavior:'smooth',block:'start',inline:'nearest'})},
 mtd:el=>{el.classList.toggle('ab')},
 linRef:(b,ref,cor)=>{const row=b.closest('.row1');if(!row)return;const nx=row.nextElementSibling;if(nx&&nx.classList.contains('lin-ref')){nx.remove();return}const LR=(D.carteira||{}).linhas_ref||{},L=(cor?LR[ref+'|'+cor]:null)||LR[ref]||[];
  row.insertAdjacentHTML('afterend',`<div class="lin-ref">${L.length?L.map(r=>`<div><span>${dm(r.prev_fat)}${r.uf?' · '+esc(r.uf):''}${r.cor_nome&&!cor?' · '+esc(r.cor_nome):''}</span><b>${fmt(r.pares)}</b><span class="num">${r.valor?'R$ '+fmt(r.valor):'—'}</span></div>`).join(''):'<div><span>sem linha de carteira para este modelo-cor</span></div>'}</div>`)},
 vai:id=>{const el=$(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start',inline:'nearest'})},
 famAbre:m=>{const a=[...document.querySelectorAll('#fam td.num a')].find(x=>/^T[êe]nis Olympikus\|/i.test(x.dataset.k||'')&&(x.dataset.k||'').endsWith(m));if(a){a.click();return}CLI.vai('fam')},
 cam:c=>{CAM[c]=CAM[c]?0:1;grafico()},
 cartd:(i,b)=>{const el=$('cartd'+i);if(!el)return;el.classList.toggle('ab');const ab=el.classList.contains('ab');if(b){b.classList.toggle('ab',ab);b.textContent=ab?'−':'+'}},
 zeroRes:el=>{const n=$('zrnota');if(!n)return;const on=!n.hidden&&n.dataset.k===el.dataset.msg;n.hidden=on;n.dataset.k=on?'':el.dataset.msg;n.textContent=on?'':el.dataset.msg},   // v42: no toque o aviso aparece escrito (o title não aparece no celular)
 famcel:a=>famcel(a),famfecha:()=>{const fd=$('famd');if(fd){fd.classList.remove('ab');fd.innerHTML='';fd.dataset.k=''}[...document.querySelectorAll('#fam td.num a.on')].forEach(x=>x.classList.remove('on'))},
 mm:m=>{MM=m;metas()},
 cobp:(f,troca)=>cobp(f,troca),
 todos:()=>{TODOS=!TODOS;decidir()},
 ir:k=>{const el=document.querySelector('.bento>.'+k);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})},
 tratar:(ref,cor)=>!chama('onTratar',ref,cor),
 aporte:(ref,cor)=>!chama('onAporte',ref,cor),
 acao:(n,x)=>{const ctx=Object.assign({cliente:(D.cliente||{}).codigo||null},x||{});if(chama('onAcao',n,ctx))return;
  if(n==='pdf')window.print();else if(n==='sugerir_pedido')alert('Sugerir pedido: a lógica espera o "pode seguir" do Léo.')},
 brq:t=>{if(!t||!t.trim())return;const m=$('brmsg');m.insertAdjacentHTML('beforeend',`<div class="m u">${esc(t)}</div><div class="m b">No Gestor, eu respondo isso com o dado do banco e a regra da casa.</div>`);m.scrollTop=m.scrollHeight},
 liga:(campo,v,on)=>{const a=new Set(FIL[campo]||[]);on?a.add(v):a.delete(v);FIL[campo]=[...a];if(on&&campo==='genero'&&FIL.tipo==='tenis')FIL.categoria=[];if(on&&campo==='categoria')FIL.genero=[];if(!FIL.marca.length)FIL.marca=['OLY'];mudouFiltro()},
 tipo:t=>{FIL.tipo=t;FIL.genero=[];FIL.categoria=[];mudouFiltro()},
 limpa:()=>{FIL={marca:['OLY'],tipo:'tenis',genero:[],categoria:[]};mudouFiltro()},
 fecha:()=>{AB=false;$('menu').classList.remove('ab')}
};
window.abreFiltro=function(){AB=!AB;$('menu').classList.toggle('ab',AB);if(AB)painel()};
window.tpNovo=async function(){const i=$('tpnovo'),v=i.value.trim();if(!v)return;
 $('tpl').insertAdjacentHTML('beforeend',`<div class="it novo-it"><span class="pt u"></span><div style="flex:1"><b>${esc(v)}</b><small class="nota"></small></div></div>`);
 const el=$('tpl').lastElementChild,ok=await grava('novo',null,v,el.querySelector('.nota'));if(ok)i.value='';else el.style.opacity='.6'};
// ---------------- desenhar(DADOS) ----------------
window.desenhar=function(dados){const troca=((dados||{}).cliente||{}).codigo!==((D||{}).cliente||{}).codigo;D=dados||{};
 if(troca){CM=null;SD=null;MM=null;COBF=null;$('cobp').style.display='none';$('brmsg').innerHTML=''}
 FIL=JSON.parse(JSON.stringify(D.filtro||{marca:['OLY'],tipo:'tenis',genero:[],categoria:[]}));FIL.marca=FIL.marca||['OLY'];FIL.genero=FIL.genero||[];FIL.categoria=FIL.categoria||[];
 const passo=(n,f)=>{try{f()}catch(e){console.error('desenhar · '+n,e)}};
 passo('topo',topo);passo('manchete',manchete);passo('decidir',decidir);passo('ouvinte',ouveTopics);passo('agenda',agenda);passo('trade',trade);passo('cartoes',cartoes);passo('cobertura',cobertura);passo('resumo',resumoCel);
 passo('metas',metas);passo('giro',giro);passo('carteira',carteiraSec);passo('filtro',()=>{$('htit').textContent=titulo(FIL);if(AB)painel()});passo('grafico',grafico);passo('bro',broSug)};
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(grafico,150)});
if(new URLSearchParams(location.search).get('modo')==='cliente')document.body.classList.add('cliente');
desenhar(window.DADOS||{});
})();
