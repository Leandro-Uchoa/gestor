// Topics · casca · ?v=1. Estrutura adaptada das telas de meta e trade; nenhum dado embutido.
(() => {
  const $=id=>document.getElementById(id), esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const chama=(n,...a)=>window[n]?.(...a);
  const bt=(act,v,txt,cls='')=>`<button type="button" class="tp-bt ${cls}" data-act="${act}" data-v="${esc(typeof v==='object'?JSON.stringify(v):v??'')}">${txt}</button>`;
  const data=s=>s?new Date(String(s).length===10?s+'T12:00:00':s).toLocaleString('pt-BR',String(s).length===10?{day:'2-digit',month:'2-digit',year:'numeric'}:undefined):'—';
  let D={}, ABERTOS=new Set(), FICHAS=new Set(), RASCUNHOS=new Map(), BUSY=new Set(), ERROS=new Map(), LUGARES=new Map();
  const chave=(...v)=>JSON.stringify(v), attrs=v=>`data-contexto="${esc(JSON.stringify(v))}"`;
  function formulario(ctx,k) {
    const r=RASCUNHOS.get(k)||{};
    return `<div class="tp-novo" data-form="${esc(k)}" ${attrs(ctx)}><label>Acrescentar passo<textarea rows="1" data-campo="txt" placeholder="Escreva o próximo passo">${esc(r.txt)}</textarea></label>${!ctx.tema?`<label>Tema<input data-campo="tema" value="${esc(r.tema)}" required></label>`:''}<label>Prazo opcional<input type="date" data-campo="prazo" value="${esc(r.prazo)}"></label>${bt('novo',k,'Acrescentar passo')}<div class="tp-erro" role="status" data-form-erro>${esc(r.erro)}</div></div>`;
  }
  function ficha(p) {
    const itens=[['Nota',p.nota],['Responsável',p.responsavel],['Situação',p.situacao],['Prazo',p.prazo_data?data(p.prazo_data):p.prazo],['Projeto',p.projeto_nome],['Criado',data(p.criado_em)],['Atualizado',data(p.atualizado_em)]];
    return `<div class="tp-ficha">${itens.map(([a,b])=>`<div><b>${a}</b><span>${esc(b||'—')}</span></div>`).join('')}<div class="tp-acts">${bt('algumdia',p.id,p.algumdia?'Voltar':'Algum dia')}${p.cliente?bt('cliente',p.cliente,'Abrir o cliente'):''}${bt('ver',p.id,'Fechar ficha')}</div></div>`;
  }
  function linha(p) {
    const gravando=BUSY.has(String(p.id)), erro=ERROS.get(String(p.id));
    return `<div class="tp-linha ${p.feito?'tp-feito':''}" data-linha="${esc(p.id)}"><div class="row1 tp-row"><button type="button" class="tp-check" data-act="feito" data-v="${esc(p.id)}" role="checkbox" aria-checked="${!!p.feito}" aria-label="${p.feito?'Reabrir passo':'Marcar como feito'}" ${gravando?'disabled':''}>${p.feito?'✓':'□'}</button><div class="tp-conteudo">${bt('ver',p.id,esc(p.txt),'tp-texto')}<div class="tp-etiquetas">${p.responsavel?`<span class="selo">${esc(p.responsavel)}</span>`:''}${p.prazo_data||p.prazo?`<span class="selo ${p.atrasado&&!p.feito?'tp-atrasado':p.vence_em_3_dias&&!p.feito?'tp-precisa':''}">${esc(p.prazo_data?data(p.prazo_data):p.prazo)}</span>`:''}${p.projeto_nome?bt('projeto',p.projeto_id,esc(p.projeto_nome),'selo'):''}</div><div class="tp-erro" role="status">${gravando?'gravando…':erro?'não gravou: '+esc(erro):''}</div></div>${bt('ver',p.id,'…','tp-mais')}</div>${FICHAS.has(String(p.id))?ficha(p):''}</div>`;
  }
  const linhas=l=>l.map(linha).join('')||'<p class="hora">Nenhum passo aqui.</p>';
  const secao=(k,t,corpo)=>`<details data-aberto="${esc(k)}" ${ABERTOS.has(k)?'open':''}><summary><h3>${t}</h3></summary>${corpo}</details>`;
  function projeto(p) {
    const k=chave('projeto',p.id), ctx={projeto_id:p.id,tema:p.passos_pendentes[0]?.tema||p.passos_feitos[0]?.tema||p.passos_algum_dia[0]?.tema,cliente:[...p.passos_pendentes,...p.passos_feitos,...p.passos_algum_dia][0]?.cliente};
    const barra=`<span class="tp-progresso"><i style="width:${Math.max(0,Math.min(100,p.progresso_pct))}%"></i></span>`;
    return `<article class="card tp-projeto" data-projeto="${esc(p.id)}"><div class="tp-card-topo">${bt('abrir',k,`<strong>${esc(p.nome)}</strong><span class="selo">${esc(p.status)}</span>`,'tp-projeto-titulo')}<div class="hora">${esc([p.dono,...(p.equipe||[])].filter(Boolean).join(' · '))}</div>${bt('abrir',k,`${barra}<span>${p.feitos}/${p.total_passos} passos · ${p.progresso_pct}%</span>`,'tp-barra')}${p.precisa_do_leo_n?bt('precisaProjeto',p.id,`precisa de você (${p.precisa_do_leo_n})`,'tp-precisa'):''}<p class="tp-proximo">${esc(p.proximo_passo||'Sem próximo passo')}${p.proximo_passo_com?' · '+esc(p.proximo_passo_com):''}${p.proximo_passo_prazo?' · '+esc(data(p.proximo_passo_prazo)):''}</p></div>${ABERTOS.has(k)?`<div class="tp-card-corpo"><p class="hora">${esc(p.objetivo||'')}</p><div data-bucket="pendentes">${linhas(p.passos_pendentes)}</div>${secao(chave(k,'feitos'),`Feitos (${p.passos_feitos.length})`,`<div data-bucket="feitos">${linhas(p.passos_feitos)}</div>`)}${secao(chave(k,'algumdia'),`Algum dia (${p.passos_algum_dia.length})`,`<div data-bucket="algumdia">${linhas(p.passos_algum_dia)}</div>`)}${p.status==='concluído'?'':formulario(ctx,k)}</div>`:''}</article>`;
  }
  function grupos() {
    $('a_grupos').innerHTML=(D.grupos||[]).map(g=>{
      const k=chave(D.modo,g.chave), titulo=`${esc(g.chave)} <span class="hora">(${g.n})</span>`;
      const precisa=g.precisa?bt('precisaGrupo',{area:D.modo==='projeto'?g.chave:null,cliente:D.modo==='cliente'&&g.chave!=='Sem cliente'?g.chave:null,tema:D.modo==='tema'?g.chave:null},`precisa de você (${g.precisa})`,'tp-precisa'):'';
      const conteudo=D.modo==='projeto'?`<div class="tp-cartoes">${g.projetos.map(projeto).join('')}</div>`:g.sub.map(s=>{
        const sk=chave(k,s.chave), ctx=D.modo==='cliente'?{cliente:g.chave==='Sem cliente'?null:g.chave,tema:s.chave}:{tema:g.chave,cliente:s.chave==='Geral'?null:s.chave};
        return secao(sk,`${esc(s.chave)} <span class="hora">(${s.n})</span>`,`<div class="lista tp-lista">${linhas(s.passos)}</div>${formulario(ctx,sk)}`);
      }).join('');
      return `<section class="pn tp-grupo" data-grupo="${esc(k)}"><div class="tp-grupo-cab">${bt('abrir',k,`<h3>${titulo}</h3>`,'tp-grupo-bt')}${precisa}</div>${ABERTOS.has(k)?conteudo:''}</section>`;
    }).join('')||'<div class="pn">Nenhum passo com esses filtros.</div>';
    $('a_sem_projeto').innerHTML=D.modo==='projeto'?bt('semprojeto','',`${D.passos_sem_projeto||0} passos ainda sem projeto`):'';
    for(const el of document.querySelectorAll('.tp-novo textarea')) crescer(el);
  }
  function topo() {
    $('c_nome').textContent='Topics';
    $('a_modos').innerHTML=[['cliente','Por cliente'],['tema','Por tema'],['projeto','Por projeto']].map(([k,t])=>bt('modo',k,t,'tp-modo '+(D.modo===k?'on':''))).join('');
    const busca=$('tp_busca'); if(document.activeElement!==busca) busca.value=D.filtro?.busca||'';
    const a=$('a_aviso'), falhas=Object.keys(D.falhas||{});
    a.hidden=!(D.erro||D.carregando||falhas.length);
    a.innerHTML=D.erro?`<b>não carregou</b> · ${esc(D.erro)} ${bt('acao','recarregar','tentar de novo')}`:D.carregando?`Carregando ${esc(D.carregando.rotulo)}…`:falhas.length?`Parte do dado não veio: ${esc(falhas.join(', '))} ${bt('acao','recarregar','tentar de novo')}`:'';
    const inicio=$('a_comecar');
    inicio.innerHTML='<h2>Por onde começar</h2>'+(D.erro?'':D.carregando?.passo===0?'<p>Lendo os passos…</p>':D.comecar?.length?D.comecar.map(p=>bt('inicio',p.id,`<span class="selo tp-precisa">${esc(p.motivo)}</span><span class="hora">${esc([p.cliente,p.tema,p.projeto_nome].filter(Boolean).join(' · '))}</span><span>${esc(p.txt)}</span>`,'tp-inicio')).join(''):'<p>nada precisa de você hoje</p>');
    const F=D.filtro||{},r=D.resumo||{};
    const chips=(lista,campo)=>lista.map(c=>`<span class="tp-chip-par">${bt('filtro',{[campo]:F[campo]===c.nome?null:c.nome},`${esc(c.nome)} (${c.n})`,F[campo]===c.nome?'on':'')}${c.precisa?bt('precisaGrupo',{[campo]:c.nome},`precisa (${c.precisa})`,'tp-precisa'):''}</span>`).join('');
    $('a_chips').innerHTML=bt('limpar','','Limpar filtros')+chips(D.clientes||[],'cliente')+chips(D.temas||[],'tema')+bt('filtro',{feitos:!F.feitos},`feitos (${r.feitos||0})`,F.feitos?'on':'')+bt('filtro',{algumdia:!F.algumdia},`algum dia (${r.algum_dia||0})`,F.algumdia?'on':'');
    // Cor do chip = cor do bloco (token b1…b6 do topics_bloco → classe do topics.css); o texto nunca vira CSS.
    for(const el of $('a_chips').querySelectorAll('[data-act="filtro"]')){let v;try{v=JSON.parse(el.dataset.v);}catch(e){continue;}const c=(D.clientes||[]).find(c=>c.nome===v.cliente);if(c&&/^b[1-6]$/.test(c.cor||''))el.classList.add('tp-cor-'+c.cor);}
  }
  function desenharTopics(d) {
    D=d||{};
    topo();
    if(D.erro){$('a_grupos').innerHTML='';$('a_chips').innerHTML='';$('a_sem_projeto').innerHTML='';return;}
    if(D.so_linha) {
      const p=(D.passos||[]).find(p=>String(p.id)===String(D.so_linha));
      const visivel=p&&(D.modo==='projeto'||((D.filtro?.feitos||!p.feito)&&(D.filtro?.algumdia||!p.algumdia)));
      const existentes=[...document.querySelectorAll('[data-linha]')].filter(el=>el.dataset.linha===String(D.so_linha));
      for(const el of existentes) {
        if(visivel) el.outerHTML=linha(p);
        else {const marcador=document.createComment('posição do passo');el.replaceWith(marcador);LUGARES.set(String(D.so_linha),marcador);}
      }
      const lugar=LUGARES.get(String(D.so_linha));
      if(!existentes.length&&visivel&&lugar?.isConnected){const tmp=document.createElement('div');tmp.innerHTML=linha(p);lugar.replaceWith(tmp.firstElementChild);LUGARES.delete(String(D.so_linha));}
      if(p&&D.modo==='projeto')for(const card of document.querySelectorAll('[data-projeto]'))if(card.dataset.projeto===String(p.projeto_id)) {
        const destino=card.querySelector(`[data-bucket="${p.feito?'feitos':p.algumdia?'algumdia':'pendentes'}"]`);
        const el=[...card.querySelectorAll('[data-linha]')].find(el=>el.dataset.linha===String(p.id));
        if(destino&&el&&el.parentElement!==destino){const vazio=destino.querySelector('p.hora');if(vazio)vazio.remove();destino.append(el);}
      }
      // Só cabeçalhos e contagens mudam junto da linha: os demais passos e formulários ficam intactos.
      for(const el of document.querySelectorAll('[data-grupo]')) {
        const g=(D.grupos||[]).find(g=>chave(D.modo,g.chave)===el.dataset.grupo), cab=el.querySelector('.tp-grupo-cab'), titulo=cab.querySelector('h3');
        if(titulo)titulo.innerHTML=`${esc(g?.chave||JSON.parse(el.dataset.grupo)[1])} <span class="hora">(${g?.n||0})</span>`;
        const precisa=cab.querySelector('[data-act="precisaGrupo"]');if(precisa)precisa.textContent=`precisa de você (${g?.precisa||0})`;
        for(const s of g?.sub||[]) {const k=chave(el.dataset.grupo,s.chave);for(const det of el.querySelectorAll('[data-aberto]'))if(det.dataset.aberto===k)det.querySelector('summary h3').innerHTML=`${esc(s.chave)} <span class="hora">(${s.n})</span>`;}
        for(const pr of g?.projetos||[]){const k=chave('projeto',pr.id);for(const b of el.querySelectorAll('.tp-projeto-titulo'))if(b.dataset.v===k){const card=b.closest('.tp-projeto'),tmp=document.createElement('div');tmp.innerHTML=projeto(pr);card.querySelector('.tp-card-topo').replaceWith(tmp.querySelector('.tp-card-topo'));
          for(const [tipo,lista] of [['feitos',pr.passos_feitos],['algumdia',pr.passos_algum_dia]]){const det=[...card.querySelectorAll('[data-aberto]')].find(e=>e.dataset.aberto===chave(k,tipo));if(det)det.querySelector('summary h3').textContent=(tipo==='feitos'?'Feitos':'Algum dia')+' ('+lista.length+')';}
        }}
      }
      $('a_sem_projeto').innerHTML=D.modo==='projeto'?bt('semprojeto','',`${D.passos_sem_projeto||0} passos ainda sem projeto`):'';
    }else grupos();
    delete D.so_linha;
  }
  function crescer(el){el.style.height='auto';el.style.height=Math.max(44,el.scrollHeight)+'px';}
  function guardar(el){const f=el.closest('[data-form]');if(!f)return;const r={};for(const x of f.querySelectorAll('[data-campo]'))r[x.dataset.campo]=x.value;RASCUNHOS.set(f.dataset.form,r);}
  function novo(k){const f=[...document.querySelectorAll('[data-form]')].find(f=>f.dataset.form===k);if(!f)return;guardar(f.querySelector('textarea'));const r=RASCUNHOS.get(k)||{};chama('onNovoPasso',{...JSON.parse(f.dataset.contexto),...r},k);}
  const TOPICS={modo:v=>chama('onModo',v),filtro:v=>chama('onFiltro',v),feito:id=>{const p=(D.passos||[]).find(p=>String(p.id)===String(id));if(p&&!BUSY.has(String(id)))chama('onFeito',id,!p.feito);},algumdia:id=>{const p=(D.passos||[]).find(p=>String(p.id)===String(id));if(p&&!BUSY.has(String(id)))chama('onAlgumDia',id,!p.algumdia);},novo,ver:id=>{const k=String(id);FICHAS.has(k)?FICHAS.delete(k):FICHAS.add(k);desenharTopics(D);},acao:(v,c)=>chama('onAcao',v,c),ocupado:(id,on,erro)=>{on?BUSY.add(String(id)):BUSY.delete(String(id));erro?ERROS.set(String(id),erro):ERROS.delete(String(id));},formRetorno:(k,erro)=>{const r=RASCUNHOS.get(k)||{};if(erro){r.erro=erro;RASCUNHOS.set(k,r);}else RASCUNHOS.delete(k);}};
  document.addEventListener('click',ev=>{
    const el=ev.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,v=el.dataset.v;
    if(a==='modo')TOPICS.modo(v);else if(a==='filtro')TOPICS.filtro(JSON.parse(v));else if(a==='feito')TOPICS.feito(v);else if(a==='algumdia')TOPICS.algumdia(v);else if(a==='ver')TOPICS.ver(v);else if(a==='novo')novo(v);else if(a==='acao')TOPICS.acao(v);else if(a==='cliente')TOPICS.acao('cliente',{cliente:v});else if(a==='desfazer')chama('onDesfazer');
    else if(a==='abrir'){ABERTOS.has(v)?ABERTOS.delete(v):ABERTOS.add(v);grupos();}
    else if(a==='limpar')TOPICS.filtro({cliente:null,tema:null,projeto:null,area:null,busca:'',precisa:false,feitos:false,algumdia:false});
    else if(a==='precisaGrupo')TOPICS.filtro({...JSON.parse(v),precisa:true,feitos:false,algumdia:false});
    else if(a==='precisaProjeto')TOPICS.filtro({modo:'projeto',projeto:v,precisa:true});
    else if(a==='projeto')TOPICS.filtro({modo:'projeto',projeto:v});
    else if(a==='semprojeto')TOPICS.filtro({modo:'cliente',projeto:'__sem__',feitos:true,algumdia:true});
    else if(a==='inicio'){const p=(D.passos||[]).find(p=>String(p.id)===v);if(!p)return;FICHAS.add(v);ABERTOS.add(chave('cliente',p.cliente||'Sem cliente'));ABERTOS.add(chave(chave('cliente',p.cliente||'Sem cliente'),p.tema||'Sem tema'));TOPICS.filtro({modo:'cliente',cliente:p.cliente||null,tema:p.tema,projeto:null});requestAnimationFrame(()=>[...document.querySelectorAll('[data-linha]')].find(e=>e.dataset.linha===v)?.scrollIntoView({block:'center'}));}
  });
  document.addEventListener('input',ev=>{if(ev.target.id==='tp_busca')TOPICS.filtro({busca:ev.target.value});else if(ev.target.matches('[data-campo]')){guardar(ev.target);if(ev.target.tagName==='TEXTAREA')crescer(ev.target);}});
  document.addEventListener('keydown',ev=>{if(ev.target.matches('.tp-novo textarea')&&ev.key==='Enter'&&!ev.shiftKey&&!ev.isComposing){ev.preventDefault();novo(ev.target.closest('[data-form]').dataset.form);}});
  document.addEventListener('toggle',ev=>{const k=ev.target.dataset?.aberto;if(k)ev.target.open?ABERTOS.add(k):ABERTOS.delete(k);},true);
  window.TOPICS=TOPICS;window.desenharTopics=desenharTopics;
})();
