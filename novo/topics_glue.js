// Topics · cola · ?v=2. Login da tela de meta; confirmação e desfazer por 5 s.
(() => {
  const $=id=>document.getElementById(id);
  let DADOS=null, FILTRO={modo:'cliente',feitos:false,algumdia:false}, ULTIMO=null, TOAST=null, CARGA=null;
  const main=document.querySelector('.main');
  if(new URLSearchParams(location.search).get('modo')==='cliente') {
    document.body.innerHTML='<div style="padding:40px;font-family:Inter,Arial;max-width:520px"><h2 style="font:800 22px Barlow">Página interna</h2><p>Esta página não abre no modo cliente.</p></div>'; return;
  }
  function overlayLogin() {
    const div=document.createElement('div');div.id='ti-login';
    div.style.cssText='position:fixed;inset:0;background:#F6F5F0;z-index:1000;display:flex;align-items:center;justify-content:center;font-family:Inter,Arial,sans-serif';
    div.innerHTML=`<form id="ti-form" style="background:#fff;border:1px solid #E6E7E8;border-radius:20px;padding:28px 26px;width:min(92vw,380px);box-shadow:0 10px 30px rgba(0,0,0,.08)">
      <div style="font:800 12px Barlow;letter-spacing:.18em;margin-bottom:6px">OLYMPIKUS</div><div style="font:800 24px Barlow;margin-bottom:18px">Gestor · Topics</div>
      <label for="ti-email" style="font-size:12px;color:#787B86">E-mail</label><input id="ti-email" type="email" autocomplete="username" required style="width:100%;margin:4px 0 12px;padding:10px;border:1px solid #E6E7E8;border-radius:10px;min-height:44px;box-sizing:border-box">
      <label for="ti-senha" style="font-size:12px;color:#787B86">Senha</label><input id="ti-senha" type="password" autocomplete="current-password" required style="width:100%;margin:4px 0 16px;padding:10px;border:1px solid #E6E7E8;border-radius:10px;min-height:44px;box-sizing:border-box">
      <button type="submit" style="width:100%;background:#2E3EFC;color:#fff;border:0;border-radius:12px;padding:11px;font-weight:700;min-height:44px">Entrar</button><div id="ti-msg" style="color:#E3001B;font-size:12px;margin-top:8px"></div></form>`;
    document.body.appendChild(div);
    $('ti-form').onsubmit=async ev=>{ev.preventDefault();$('ti-msg').textContent='';try{const e=await DadosTopics.entrar($('ti-email').value.trim(),$('ti-senha').value);if(e)$('ti-msg').textContent='não entrou: '+e;else location.reload();}catch(e){$('ti-msg').textContent='não entrou: '+e.message;}};
  }
  function lerHash(){const h=new URLSearchParams(location.hash.slice(1)),f={modo:['cliente','tema','projeto'].includes(h.get('modo'))?h.get('modo'):'cliente'};for(const k of ['cliente','tema','projeto','area','busca'])f[k]=h.get(k)||null;for(const k of ['feitos','algumdia','precisa'])f[k]=h.get(k)==='1';return f;}
  function hash(){const h=new URLSearchParams();for(const [k,v] of Object.entries(FILTRO))if(v)h.set(k,typeof v==='boolean'?'1':v);history.replaceState(null,'','#'+h);}
  function desenhar(d){DADOS=d;window.desenharTopics(d);}
  function refaz(f={},linha){FILTRO={...FILTRO,...f};hash();const d=DadosTopics.refiltrar(FILTRO);if(linha)d.so_linha=linha;desenhar(d);}
  function toast(texto,undo){clearTimeout(TOAST);const el=$('a_toast');el.replaceChildren(document.createTextNode('Gravado · '+texto));if(undo){const b=document.createElement('button');b.type='button';b.className='tp-bt';b.dataset.act='desfazer';b.textContent='Desfazer';el.append(b);}el.hidden=false;TOAST=setTimeout(()=>{el.hidden=true;ULTIMO=null;},5000);}
  async function abrir(){if(CARGA)return CARGA;ULTIMO=null;clearTimeout(TOAST);$('a_toast').hidden=true;CARGA=(async()=>{try{await DadosTopics.carregar(d=>desenhar(d));refaz();}catch(e){desenhar({erro:e.message||String(e),modo:FILTRO.modo,filtro:FILTRO});}finally{CARGA=null;}})();return CARGA;}
  const PENDENTES=new Set();
  async function gravar(id,tipo,on,undo=true){id=String(id);if(PENDENTES.has(id))return;const p=DadosTopics.passo(id);if(!p)return;const antes=!!p[tipo==='feito'?'feito':'algumdia'];PENDENTES.add(id);TOPICS.ocupado(id,true);refaz({},id);
    let erro;try{erro=await (tipo==='feito'?DadosTopics.marcarFeito(id,on):DadosTopics.algumDia(id,on));}catch(e){erro=e.message||String(e);}finally{PENDENTES.delete(id);}
    TOPICS.ocupado(id,false,erro);refaz({},id);if(erro)return;
    ULTIMO=undo?{id,tipo,on:antes}:null;toast(tipo==='feito'?(on?'feito':'reaberto'):(on?'algum dia':'de volta'),undo);
  }
  window.onModo=modo=>refaz({modo});window.onFiltro=f=>refaz(f);
  window.onFeito=(id,on)=>gravar(id,'feito',on);window.onAlgumDia=(id,on)=>gravar(id,'algumdia',on);
  window.onDesfazer=()=>{const u=ULTIMO;if(!u)return;ULTIMO=null;gravar(u.id,u.tipo,u.on,false);};
  const NOVOS=new Set();
  window.onNovoPasso=async(v,k)=>{if(NOVOS.has(k))return;NOVOS.add(k);let erro;try{erro=await DadosTopics.acrescentarPasso(v);}catch(e){erro=e.message||String(e);}finally{NOVOS.delete(k);}TOPICS.formRetorno(k,erro);refaz();if(!erro){ULTIMO=null;toast('passo acrescentado',false);}};
  window.onAcao=(nome,ctx)=>{if(nome==='recarregar'){abrir();return true;}if(nome==='exportar_pdf'){window.print();return true;}if(nome==='cliente'&&ctx?.cliente){location.href='cliente.html#cliente='+encodeURIComponent(ctx.cliente);return true;}return false;};
  window.addEventListener('hashchange',()=>{FILTRO=lerHash();if(DADOS)refaz();});
  async function arranque(){try{FILTRO=lerHash();DadosTopics.refiltrar(FILTRO);const s=await DadosTopics.sessao();if(!s){overlayLogin();return;}main.style.visibility='';$('ti-sair').onclick=()=>DadosTopics.sair();await abrir();}catch(e){main.style.visibility='';desenhar({erro:e.message||String(e),modo:FILTRO.modo,filtro:FILTRO});}}
  arranque();
})();
