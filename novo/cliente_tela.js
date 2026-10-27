/* Gestor · aba Cliente — JS de TELA da casca (PICASSO, 27/10/2026). Forma aprovada pelo Léo no piloto cliente_v19.
   ZERO dado aqui dentro. O TI chama  desenhar(DADOS)  depois do login e a cada troca de cliente.

   CONTRATO (nomes do TI) — o que cada bloco lê, o tipo e o que aparece quando vem vazio:
   ┌ cliente      { nome:str, codigo:str, lojas_ativas:int, recorte:str, cidade?:str } → topo (cidade · lojas; recorte só se faltar cidade). Vazio: "—".
   ├ decidir      [ { id, texto:str, urgente:bool, criado_em:'AAAA-MM-DD', bloco:str } ]
   │                                                                             → "O que decidir hoje". Vazio: "nada pendente no TOPICS".
   ├ topics       (igual a decidir; usado só se decidir vier ausente)
   ├ agenda       [ { data:'AAAA-MM-DD', titulo:str, onde:str } ]                → calendário + linha do tempo. Vazio: "sem eventos".
   ├ carteira     { meses:[ { mes:'AAAA-MM', fat:num, cart:num, base_em:'AAAA-MM-DD…' } ], a_faturar:num }
   │                                                                             → cartão Carteira (a_faturar em pares; um chip por mês com cart). Vazio: "—".
   ├ giro         { recorte:str, serie:[ { mes:'AAAA-MM', v:num, e:num, parcial:bool } ], estoque:num, estoque_mes:'AAAA-MM',
   │                cobertura:num, cobertura_base:str }                          → cartão Cobertura (régua da casa: <4 ruptura · 4–5 forçar · ≥5 no teto),
   │                                                                               venda média = média dos meses NÃO parciais da serie (3 últimos). Vazio: "—".
   ├ anos         { lista:[2024,2025,2026], sellin:{'2024':[12 núm|null]}, sellout:{…}, meta:{…}, estoque:{…},
   │                sellin_carteira?:{…} (parte do sell-in do mês que ainda é carteira → ponto vazado) }
   │                                                                             → gráfico (já filtrado pelo filtro ativo). null = sem dado (vazio, nunca 0).
   ├ filtro       { marca:['OLY'|'UA'], tipo:'tenis'|'meias'|'chinelo'|'acess'|'conf', genero:[...], categoria:[...] }
   │                genero (tênis): 'MASCULINO','FEMININO','INFANTIL','UNISSEX' · genero (meias): 'MASCULINO','FEMININO'
   │                categoria (tênis): 'CONF_MASC','CONF_FEM','CORRIDA/TREINO','CORRE','CLASSICOS','INFANTIL'
   └ etiquetas    { sellin:str, sellout:str, meta:str, estoque?:str }            → legenda dos blocos e nota de fonte.

   EVENTOS (a casca chama, o TI atende; se não existir, nada quebra):
     window.onFiltro(filtro)                 → recalcular DADOS.anos e chamar desenhar(DADOS) de novo
     window.onBro(contexto)                  → abrir o painel IA existente (se ausente, abre a gaveta local do Bro)
     window.onTopico(acao, id, texto)        → acao: 'feito' | 'orientar' | 'abrir' | 'novo'  (grava no topics_item)
     window.onTratar(ref, cor)               → reservado (lista de produtos da régua, fase 2)
   Fora desta casca (decisão do BOSS): "Sugerir pedido" e qualquer nome de outro cliente.
*/
(function(){
const MS2=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],MSX=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const CORANO=['#ADAEB3','#787B86','#2E3EFC'];                       // ano mais antigo → cinza claro; corrente → azul
const $=id=>document.getElementById(id);
const fmt=n=>n==null||isNaN(n)?'—':Math.round(n).toLocaleString('pt-BR');
const dec=n=>n==null||isNaN(n)?'—':(+n).toFixed(1).replace('.',',');
const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const chama=(nome,...a)=>{try{if(typeof window[nome]==='function')return window[nome](...a)}catch(e){console.error(nome,e)}};
let D={},CAM={so:1,si:1,mt:1,es:1},ANS={},FIL=null,AB=false;

// ---------------- topo ----------------
function topo(){const c=D.cliente||{};$('c_nome').textContent=c.nome||'—';document.title='Gestor · '+(c.nome||'Cliente');
 $('c_sub').textContent=[c.cidade||null,c.lojas_ativas!=null?c.lojas_ativas+' lojas ativas':null,c.cidade?null:(c.recorte||null)].filter(Boolean).join(' · ')||'—';
 $('brctx').textContent=(c.nome||'—')+' · aba Cliente'}
// ---------------- TOPICS ----------------
const escRe=x=>String(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const limpa=(t,b)=>{let x=String(t||'');if(b)x=x.replace(new RegExp('^\\s*'+escRe(b)+'\\s*[-–—:·]\\s*','i'),'');return x};
const ehCli=b=>{const n=((D.cliente||{}).nome||'').toUpperCase().replace(/\s+/g,''),bb=String(b||'').toUpperCase().replace(/\s+/g,'');return !bb||bb===n||n.startsWith(bb)||bb.startsWith(n)};
function decidir(){const L=D.decidir||D.topics||[];$('c_ntp').textContent=L.length+' no TOPICS';
 $('tpl').innerHTML=L.length?L.map(t=>`<div class="it" id="tp_${esc(t.id)}"><span class="pt ${t.urgente?'u':''}"></span><div style="flex:1"><b>${esc(limpa(t.texto,t.bloco))}</b><small>${esc([ehCli(t.bloco)?null:t.bloco,t.criado_em?t.criado_em.slice(8,10)+'/'+t.criado_em.slice(5,7):null].filter(Boolean).join(' · '))}</small><div class="nota" id="tpn_${esc(t.id)}"></div>
  <div class="acts"><button class="ok" onclick="CLI.topico('feito','${esc(t.id)}')">✓ feito</button><button onclick="CLI.ori('${esc(t.id)}')">✎ orientar</button><button onclick="CLI.topico('abrir','${esc(t.id)}')">abrir no TOPICS</button></div>
  <div class="ori" id="tpo_${esc(t.id)}"><input id="tpi_${esc(t.id)}" placeholder="escreva a orientação…" onkeydown="if(event.key==='Enter')CLI.salva('${esc(t.id)}')"><button onclick="CLI.salva('${esc(t.id)}')">salvar</button></div></div></div>`).join('')
  :'<div class="it" style="border:0"><div style="opacity:.8">nada pendente no TOPICS</div></div>'}
// ---------------- agenda ----------------
let CM=null,SD=null;
const tituloAg=t=>{const n=((D.cliente||{}).nome||'').toUpperCase();let x=String(t||'').replace(/^\s*(ATA|PAUTA)\s*[—–-]\s*/i,'');if(n)x=x.replace(new RegExp('\\s*'+escRe(n)+'\\s*[·—–:-]?\\s*','gi'),' ').trim();x=x.replace(/^REUNI[ÃA]O\b/i,'Reunião');x=x.charAt(0).toUpperCase()+x.slice(1);return x||String(t||'')};
const ondeAg=o=>{if(Array.isArray(o))o=o.join(',');return String(o||'').split(',').map(s=>s.trim()).filter(s=>s&&!ehCli(s)).join(' · ')};
function agenda(){const EV=(D.agenda||[]).filter(e=>e&&e.data).sort((a,b)=>a.data<b.data?1:-1),hoje=new Date().toISOString().slice(0,10);
 if(!CM){const b=(EV.find(e=>e.data<=hoje)||EV[0]||{data:hoje}).data;CM=[+b.slice(0,4),+b.slice(5,7)-1]}
 const [y,m]=CM,f=new Date(y,m,1).getDay(),n=new Date(y,m+1,0).getDate(),kk=d=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 let h=`<div class="hd"><button onclick="CLI.mes(-1)">‹</button><b>${MSX[m]} ${y}</b><button onclick="CLI.mes(1)">›</button></div><div class="gr">`+['D','S','T','Q','Q','S','S'].map(x=>`<div class="dw">${x}</div>`).join('');
 for(let i=0;i<f;i++)h+='<div class="d vz"></div>';
 for(let d=1;d<=n;d++){const e=EV.filter(x=>x.data.slice(0,10)===kk(d));h+=`<div class="d ${e.length?'ev':''} ${kk(d)===hoje?'hj':''} ${kk(d)===SD?'sel':''}" ${e.length?`onclick="CLI.dia('${kk(d)}')"`:''}>${d}${e.length?'<span class="pts"><i class="tp-reun"></i></span>':''}</div>`}
 $('cal').innerHTML=h+'</div>';
 const L=SD?EV.filter(x=>x.data.slice(0,10)===SD):EV;
 $('evl').innerHTML=(SD?`<div class="d-flex mb-1"><b>${SD.slice(8,10)}/${SD.slice(5,7)}</b><a href="#" class="ms-auto small" onclick="CLI.dia(null);return false">ver tudo</a></div>`:'<div class="d-flex mb-1"><b>Linha do tempo</b><span class="ms-auto hora">da mais nova</span></div>')+
  (L.length?L.map(x=>`<div class="e ${x.data>hoje?'fut':''}"><div class="dt">${x.data.slice(8,10)}<small>${MSX[+x.data.slice(5,7)-1].slice(0,3)}/${x.data.slice(2,4)}</small></div><div><b>${esc(tituloAg(x.titulo))}</b><small class="d2">${esc(ondeAg(x.onde))}</small></div><span></span></div>`).join(''):'<div class="hora" style="color:#fff;opacity:.8">sem eventos</div>')}
// ---------------- carteira ----------------
function carteira(){const c=D.carteira||{},M=c.meses||[];$('c_cart').textContent=fmt(c.a_faturar);$('c_cart_u').textContent=' a faturar';
 const MC=M.filter(x=>(x.cart||0)>0),tot=MC.reduce((a,x)=>a+(x.cart||0),0)||1;
 $('c_mes3').innerHTML=MC.length?MC.map(x=>`<div style="flex:${Math.max(1,x.cart||0)/tot*10}">${MS2[+String(x.mes).slice(5,7)-1]||'—'}<b>${fmt(x.cart)}</b></div>`).join(''):'';
 const be=(M.find(x=>x.base_em)||{}).base_em;$('c_cart_base').textContent=be?'carteira lida em '+String(be).slice(8,10)+'/'+String(be).slice(5,7)+(String(be).length>10?' '+String(be).slice(11,16):''):''}
// ---------------- cobertura ----------------
function cobertura(){const g=D.giro||{},c=g.cobertura;$('c_recorte').textContent=g.recorte||'—';$('c_cob').textContent=dec(c);
 const p=c==null?'—':c<4?'ruptura':c<5?'forçar a barra':'no teto';$('c_cob_pill').textContent=p;
 $('c_cob_pill').style.background=c==null?'#E6E7E8':c<4?'#FDE3E5':c<5?'#FFFF1A':'#E6E7E8';$('c_cob_pill').style.color=c!=null&&c<4?'#E3001B':'#000';
 // posição na régua de 3 faixas iguais: 0–4 | 4–5 | 5–7 (acima de 7 encosta no fim)
 const pos=c==null?-99:c<4?c/4*33.3:c<5?33.3+(c-4)*33.3:Math.min(99,66.7+(c-5)/2*33.3);$('c_cob_mk').style.left=c==null?'-99px':pos+'%';
 $('c_est').textContent=fmt(g.estoque);$('c_est_mes').textContent=g.estoque_mes?MS2[+g.estoque_mes.slice(5,7)-1]+'/'+g.estoque_mes.slice(2,4):'';
 const S=(g.serie||[]).filter(x=>x&&!x.parcial&&x.v!=null),u3=S.slice(-3);$('c_vm').textContent=u3.length?fmt(u3.reduce((a,x)=>a+x.v,0)/u3.length):'—';
 $('c_cob_base').textContent=g.cobertura_base||'';
 const a=S.map(x=>x.v);if(a.length>1){const mn=Math.min(...a),mx=Math.max(...a)||1,X=i=>i*300/(a.length-1),Y=v=>40-(v-mn)/((mx-mn)||1)*34,pp=a.map((v,i)=>`${X(i)},${Y(v)}`).join(' ');
  $('c_spark').innerHTML=`<polyline points="0,46 ${pp} 300,46" fill="rgba(255,255,255,.12)"/><polyline points="${pp}" fill="none" stroke="#fff" stroke-width="2.2" vector-effect="non-scaling-stroke"/><circle cx="300" cy="${Y(a[a.length-1])}" r="4" fill="#FFFF1A" stroke="#000"/>`}else $('c_spark').innerHTML=''}
// ---------------- filtro (3 blocos) ----------------
const TIPOS=[['tenis','Tênis (footwear)'],['meias','Meias'],['chinelo','Chinelo'],['acess','Acessório'],['conf','Confecção']];
const GT=[['MASCULINO','Masculino'],['FEMININO','Feminino'],['INFANTIL','Infantil'],['UNISSEX','Unissex']],GM=[['MASCULINO','Masculino (39/44)'],['FEMININO','Feminino (33/38)']];
const CATS=[['CONF_MASC','Conforto masculino'],['CONF_FEM','Conforto feminino'],['CORRIDA/TREINO','Corrida / treino'],['CORRE','Corre'],['CLASSICOS','Clássicos'],['INFANTIL','Infantil']];
function titulo(f){const mk=(f.marca||[]).map(x=>x==='UA'?'Under Armour':'Olympikus').join(' + ')||'—',tp=((TIPOS.find(x=>x[0]===f.tipo)||[,''])[1]).replace(' (footwear)','');
 const det=(f.categoria||[]).length?f.categoria.map(c=>(CATS.find(x=>x[0]===c)||[,c])[1]).join(' + '):(f.genero||[]).length?f.genero.map(g=>((f.tipo==='meias'?GM:GT).find(x=>x[0]===g)||[,g])[1]).join(' + '):'';
 return `${mk} · ${tp}${det?' · '+det:''} · ${f.tipo==='meias'?'packs':f.tipo==='acess'?'peças':'pares'}`}
function painel(){const f=FIL,ck=(a,v)=>(a||[]).includes(v)?'checked':'',ehT=f.tipo==='tenis',ehM=f.tipo==='meias';
 const b1=`<div class="fb"><h4>1 · Marca</h4>${[['OLY','Olympikus'],['UA','Under Armour']].map(([k,n])=>`<label><input type="checkbox" ${ck(f.marca,k)} onchange="CLI.liga('marca','${k}',this.checked)">${n}</label>`).join('')}</div>`;
 const b2=`<div class="fb"><h4>2 · Tipo</h4>${TIPOS.map(([k,n])=>`<label><input type="radio" name="tp" ${f.tipo===k?'checked':''} onchange="CLI.tipo('${k}')">${n}</label>`).join('')}<small>Um tipo por vez: chinelo nunca se soma ao tênis.</small></div>`;
 const b3=ehM?`<div class="fb"><h4>3 · Dentro das meias</h4><div class="sub">Gênero</div>${GM.map(([k,n])=>`<label><input type="checkbox" ${ck(f.genero,k)} onchange="CLI.liga('genero','${k}',this.checked)">${n}</label>`).join('')}<small>Marque os dois para somar.</small></div>`
  :`<div class="fb" style="${ehT?'':'opacity:.45;pointer-events:none'}"><h4>3 · Dentro do tênis</h4><div class="sub">Gênero</div>${GT.map(([k,n])=>`<label><input type="checkbox" ${ck(f.genero,k)} onchange="CLI.liga('genero','${k}',this.checked)">${n}</label>`).join('')}
   <div class="sub">Categoria</div>${CATS.map(([k,n])=>`<label><input type="checkbox" ${ck(f.categoria,k)} onchange="CLI.liga('categoria','${k}',this.checked)">${n}</label>`).join('')}<small>Marque quantos quiser: soma. Gênero e categoria não se somam entre si — marcar um lado limpa o outro.</small></div>`;
 $('menu').innerHTML=b1+b2+b3+`<div class="fbar"><button onclick="CLI.limpa()">limpar</button><span class="hora">${esc(titulo(f))}</span><button class="ok" onclick="CLI.fecha()">ver no gráfico</button></div>`}
function mudouFiltro(){$('htit').textContent=titulo(FIL);painel();chama('onFiltro',JSON.parse(JSON.stringify(FIL)))}
// ---------------- gráfico ----------------
function grafico(){const A=D.anos||{},AN=(A.lista||[]).map(String),k=(y,i)=>{const s=A[y];return null};
 AN.forEach(y=>{if(ANS[y]==null)ANS[y]=1});const cor=y=>CORANO[Math.max(0,CORANO.length-AN.length+AN.indexOf(y))]||'#2E3EFC';
 const ser=(c,y)=>((A[c]||{})[y])||[],val=(c,y,i)=>{const v=ser(c,y)[i];return v==null?null:+v};
 const svg=$('gx'),W=Math.max(260,Math.round(svg.getBoundingClientRect().width)||1100),HH=280,P=30,CEL=W<600;svg.setAttribute('viewBox',`0 0 ${W} ${HH}`);
 const X=i=>P+40+i*(W-2*P-80)/11,vals=[];AN.forEach(y=>MS2.forEach((_,i)=>{['sellout','sellin','meta'].forEach((c,j)=>{const on=[CAM.so,CAM.si,CAM.mt][j],v=val(c,y,i);if(on&&v!=null)vals.push(v)})}));
 const mx=Math.max(1,...vals)*1.12,Y=v=>HH-P-(HH-2*P)*v/mx;let g='';
 for(let t=0;t<=4;t++){const v=mx/1.12*t/4,y=Y(v);g+=`<line x1="${P+40}" x2="${W-P-40}" y1="${y}" y2="${y}" stroke="#E6E7E8"/><text x="${W-P-34}" y="${y+4}" font-size="11" fill="#787B86" font-family="Inter">${v>=1000?(v/1000).toFixed(1).replace('.',',')+'k':Math.round(v)}</text>`}
 MS2.forEach((m,i)=>g+=`<text x="${X(i)}" y="${HH-8}" text-anchor="middle" font-size="12" font-weight="600" fill="#787B86" font-family="Inter">${CEL?m[0].toUpperCase():m}</text>`);
 const on=AN.filter(y=>ANS[y]);
 if(CAM.es){const ev=[];AN.forEach(y=>MS2.forEach((_,i)=>{const v=val('estoque',y,i);if(v!=null)ev.push(v)}));const emx=Math.max(1,...ev)*1.15,YE=v=>HH-P-(HH-2*P)*v/emx;
  on.forEach(y=>{const pts=MS2.map((_,i)=>{const v=val('estoque',y,i);return v==null?null:[X(i),YE(v),v]}).filter(Boolean);if(!pts.length)return;
   g+=`<polygon points="${pts[0][0]},${HH-P} ${pts.map(p=>p[0]+','+p[1]).join(' ')} ${pts[pts.length-1][0]},${HH-P}" fill="${cor(y)}" opacity=".10"/><polyline points="${pts.map(p=>p[0]+','+p[1]).join(' ')}" fill="none" stroke="${cor(y)}" stroke-width="1.2" opacity=".55" vector-effect="non-scaling-stroke"/>`;
   pts.forEach((p,j)=>{if(j%2===0||j===pts.length-1)g+=`<text x="${p[0]}" y="${p[1]-6}" text-anchor="middle" font-size="10" fill="${cor(y)}" opacity=".85" font-family="Inter">${(p[2]/1000).toFixed(1).replace('.',',')}k</text>`})})}
 const linha=(c,y,st,w)=>{let seg=[],out='';const fl=()=>{if(seg.length>1)out+=`<polyline fill="none" stroke="${cor(y)}" stroke-width="${w}" ${st} points="${seg.join(' ')}" vector-effect="non-scaling-stroke"/>`;else if(seg.length===1){const[a,b]=seg[0].split(',');out+=`<circle cx="${a}" cy="${b}" r="3" fill="${cor(y)}"/>`}seg=[]};
  MS2.forEach((_,i)=>{const v=val(c,y,i);if(v!=null)seg.push(`${X(i)},${Y(v)}`);else fl()});fl();return out};
 on.forEach(y=>{const c=cor(y);
  if(CAM.mt){g+=linha('meta',y,'stroke-dasharray="10 6"',2.2);MS2.forEach((_,i)=>{const v=val('meta',y,i);if(v==null)return;const bat=(val('sellin',y,i)||0)>=v;g+=`<rect x="${X(i)-4}" y="${Y(v)-4}" width="8" height="8" fill="${bat?c:'#fff'}" stroke="${c}" stroke-width="2" transform="rotate(45 ${X(i)} ${Y(v)})"/>`})}
  if(CAM.so)g+=linha('sellout',y,'',3.2);
  if(CAM.si){g+=linha('sellin',y,'stroke-dasharray="2 4" stroke-linecap="round"',3);MS2.forEach((_,i)=>{const v=val('sellin',y,i);if(v==null)return;const ca=(val('sellin_carteira',y,i)||0)>0;g+=`<circle cx="${X(i)}" cy="${Y(v)}" r="4.5" fill="${ca?'#fff':c}" stroke="${c}" stroke-width="2"><title>${ca?'inclui carteira ainda não faturada':'faturado'}</title></circle>`})}});
 // botão do ano no começo da linha (posição fixa: escala por todos os anos)
 const yJ={};AN.forEach(y=>{const v=[val('sellout',y,0),val('sellin',y,0),val('meta',y,0)].find(x=>x!=null);yJ[y]=v!=null?Y(v):HH/2});
 const ord=AN.slice().sort((a,b)=>yJ[a]-yJ[b]);let last=-99;ord.forEach(y=>{if(yJ[y]-last<24)yJ[y]=last+24;last=yJ[y]});
 AN.forEach(y=>{const o=ANS[y],c=cor(y),yy=Math.min(HH-P-10,Math.max(P,yJ[y]));g+=`<g class="chip" style="cursor:pointer" onclick="CLI.ano('${y}')" ondblclick="CLI.so('${y}')"><title>toque: ${o?'esconder':'mostrar'} ${y} · dois toques: só ${y}</title><rect x="${P-30}" y="${yy-22}" width="62" height="44" fill="transparent"/><rect x="${P-26}" y="${yy-11}" width="54" height="22" rx="11" fill="${o?c:'#fff'}" stroke="${c}" stroke-width="2"/><text x="${P+1}" y="${yy+4}" text-anchor="middle" font-size="12" font-weight="800" fill="${o?'#fff':c}" font-family="Barlow">${o?'':'+ '}${y}</text></g>`});
 svg.innerHTML=g;$('vazio').style.display=(on.length&&(CAM.so||CAM.si||CAM.mt||CAM.es))?'none':'flex';
 // dica ao passar o mouse/dedo
 svg.onmousemove=svg.ontouchmove=ev=>{const r=svg.getBoundingClientRect(),cx=((ev.touches?ev.touches[0].clientX:ev.clientX)-r.left)/r.width*W,i=Math.max(0,Math.min(11,Math.round((cx-P-40)/((W-2*P-80)/11))));
  let h=`<b>${MS2[i]}</b>`;on.slice().reverse().forEach(y=>{const p=String(+y-1),f=(c,n)=>{const v=val(c,y,i);if(v==null)return '';const a=val(c,p,i),d=a?Math.round((v/a-1)*100):null;return `<div>${n} ${y.slice(2)}: <b>${fmt(v)}</b>${d!=null?` <span class="${d>=0?'up':'dn'}">${d>=0?'▲':'▼'}${Math.abs(d)}%</span>`:''}</div>`};
   h+=(CAM.so?f('sellout','sell-out'):'')+(CAM.si?f('sellin','sell-in'):'')+(CAM.mt?f('meta','meta'):'')+(CAM.es?f('estoque','estoque'):'')});
  const tp=$('tip');tp.innerHTML=h;tp.style.display='block';tp.style.left=Math.min(r.width-210,Math.max(0,X(i)/W*r.width+12))+'px'};
 svg.onmouseleave=()=>{$('tip').style.display='none'};
 // os 4 bloquinhos
 const E=D.etiquetas||{},ult=c=>{for(let j=AN.length-1;j>=0;j--){const s=ser(c,AN[j]);if(s.some(v=>v!=null))return AN[j]}return null};
 const tot=(c,y)=>ser(c,y).reduce((a,v)=>a+(v||0),0),lastm=(c,y)=>{const s=ser(c,y);for(let i=11;i>=0;i--)if(s[i]!=null)return [i,s[i]];return null};
 const am=(st,cr)=>`<svg width="40" height="14"><line x1="2" x2="38" y1="7" y2="7" stroke="${cr}" stroke-width="3" ${st}/></svg>`;
 const B=[['so','sellout','Sell-out',E.sellout||'venda na loja',am('','#000')],['si','sellin','Sell-in',E.sellin||'faturado ao cliente',am('stroke-dasharray="2 4" stroke-linecap="round"','#000')],['mt','meta','Metas',E.meta||'meta rateada por cliente',am('stroke-dasharray="10 6"','#000')],['es','estoque','Estoque',E.estoque||'área clara · escala própria',`<svg width="40" height="14"><rect x="2" y="3" width="36" height="9" rx="2" fill="#2E3EFC" opacity=".18"/></svg>`]];
 $('blk').innerHTML=B.map(([c,s,n,d,sv])=>{const y=ult(s),lm=y&&lastm(s,y);const txt=!y?'sem dado neste recorte':s==='estoque'?`${MS2[lm[0]]}/${y.slice(2)}: ${fmt(lm[1])}`:`${y}: ${fmt(tot(s,y))}`;
  return `<button class="${CAM[c]?'':'off'}" onclick="CLI.cam('${c}')">${sv}<span><b>${n}</b><small>${esc(d)}</small><small>${txt}</small></span><span class="sw"></span></button>`}).join('');
 $('nx').textContent=[E.sellout,E.sellin,E.meta,E.estoque].filter(Boolean).join(' · ')}
// ---------------- Bro ----------------
window.abrirBro=function(){const ctx={cliente:(D.cliente||{}).codigo||null,nome:(D.cliente||{}).nome||null,aba:'cliente'};
 if(typeof window.onBro==='function'){chama('onBro',ctx);return}$('bro').classList.toggle('ab')};
addEventListener('keydown',e=>{if(e.key==='Escape'){$('bro').classList.remove('ab');CLI.fecha()}});
// ---------------- API pública ----------------
window.CLI={
 topico:(acao,id,texto)=>{if(acao==='feito'){const el=$('tp_'+id);if(el)el.classList.toggle('feito')}chama('onTopico',acao,id,texto)},
 ori:id=>{const o=$('tpo_'+id);o.classList.toggle('ab');if(o.classList.contains('ab'))$('tpi_'+id).focus()},
 salva:id=>{const v=$('tpi_'+id).value.trim();if(!v)return;$('tpn_'+id).textContent='↳ '+v;$('tpi_'+id).value='';$('tpo_'+id).classList.remove('ab');chama('onTopico','orientar',id,v)},
 mes:d=>{CM=[CM[0]+(CM[1]+d>11?1:CM[1]+d<0?-1:0),(CM[1]+d+12)%12];agenda()},dia:d=>{SD=d;agenda()},
 ano:y=>{clearTimeout(CLI._t);CLI._t=setTimeout(()=>{ANS[y]=ANS[y]?0:1;grafico()},220)},so:y=>{clearTimeout(CLI._t);Object.keys(ANS).forEach(a=>ANS[a]=a===y?1:0);grafico()},
 cam:c=>{CAM[c]=CAM[c]?0:1;grafico()},
 liga:(campo,v,on)=>{const a=new Set(FIL[campo]||[]);on?a.add(v):a.delete(v);FIL[campo]=[...a];if(on&&campo==='genero'&&FIL.tipo==='tenis')FIL.categoria=[];if(on&&campo==='categoria')FIL.genero=[];if(!FIL.marca.length)FIL.marca=['OLY'];mudouFiltro()},
 tipo:t=>{FIL.tipo=t;FIL.genero=[];FIL.categoria=[];mudouFiltro()},
 limpa:()=>{FIL={marca:['OLY'],tipo:'tenis',genero:[],categoria:[]};mudouFiltro()},
 fecha:()=>{AB=false;$('menu').classList.remove('ab')}
};
window.abreFiltro=function(){AB=!AB;$('menu').classList.toggle('ab',AB);if(AB)painel()};
window.tpNovo=function(){const i=$('tpnovo'),v=i.value.trim();if(!v)return;i.value='';chama('onTopico','novo',null,v);
 $('tpl').insertAdjacentHTML('beforeend',`<div class="it"><span class="pt u"></span><div style="flex:1"><b>${esc(v)}</b><small>novo · enviado ao TOPICS</small></div></div>`)};
// ---------------- desenhar(DADOS) ----------------
window.desenhar=function(dados){D=dados||{};FIL=JSON.parse(JSON.stringify(D.filtro||{marca:['OLY'],tipo:'tenis',genero:[],categoria:[]}));
 FIL.marca=FIL.marca||['OLY'];FIL.genero=FIL.genero||[];FIL.categoria=FIL.categoria||[];
 topo();decidir();agenda();carteira();cobertura();$('htit').textContent=titulo(FIL);if(AB)painel();grafico()};
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(grafico,150)});
if(new URLSearchParams(location.search).get('modo')==='cliente')document.body.classList.add('cliente');
// sem DADOS ainda: desenha a casca vazia ("—")
desenhar(window.DADOS||{});
})();
