// Topics · dados · ?v=1. Consultas em fila, paginação e escrita conferida pela RLS. Concluir projeto fica fora da tela (só topics.py).
window.DadosTopics = (() => {
  const sb = window.supabase.createClient(URL_SB, CHAVE);
  let B = { passos: [], projetos: [], blocos: [], falhas: {} }, F = { modo: 'cliente', feitos: false, algumdia: false }, G = null;
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
  const pend = p => !p.feito && !p.algumdia;
  const mesmo = (a,b) => norm(a) === norm(b);   /* a view traz o nome em caixa normal e o bloco em caixa alta: compara sem caixa e sem acento */
  const blocoDe = nome => B.blocos.find(b => mesmo(b.nome, nome));
  const ordem = (a,b) => Number(!!b.precisa_do_leo)-Number(!!a.precisa_do_leo) || String(a.prazo_data || '9999').localeCompare(String(b.prazo_data || '9999')) || (+a.seq||0)-(+b.seq||0);
  async function tudo(q) { const out=[]; for(let i=0;;i+=1000) { const r=await q.range(i,i+999); if(r.error) throw r.error; out.push(...(r.data||[])); if(!r.data || r.data.length<1000) return out; } }
  async function sessao() { const r=await sb.auth.getSession(); if(r.error) throw r.error; return r.data.session; }
  async function entrar(email,senha) { const r=await sb.auth.signInWithPassword({email,password:senha}); return r.error ? r.error.message : null; }
  async function sair() { await sb.auth.signOut({scope:'local'}); location.reload(); }
  function montar(carregando=null) {
    const base=B.passos.filter(p => (!F.area || p.projeto_area===F.area) && (!F.cliente || p.cliente===F.cliente) && (!F.tema || p.tema===F.tema) && (!F.projeto || (F.projeto==='__sem__' ? !p.projeto_id : String(p.projeto_id)===F.projeto)) && (!F.precisa || (pend(p)&&p.precisa_do_leo)) && norm([p.txt,p.nota,p.cliente,p.tema,p.projeto_nome,p.responsavel].join(' ')).includes(norm(F.busca)));
    const vis=base.filter(p => (F.feitos || !p.feito) && (F.algumdia || !p.algumdia)).sort(ordem);
    const contar=lista=>({n:lista.length,precisa:lista.filter(p=>pend(p)&&p.precisa_do_leo).length});
    const faceta=campo=>[...new Set(B.passos.map(p=>p[campo]).filter(Boolean))].map(nome=>({nome,...contar(B.passos.filter(p=>p[campo]===nome&&pend(p)))}));
    const clientes=faceta('cliente').map(c=>({...c,cor:(blocoDe(c.nome)||{}).cor}));
    const pos=n=>(blocoDe(n)||{}).seq ?? Infinity;
    clientes.sort((a,b)=>pos(a.nome)-pos(b.nome)||a.nome.localeCompare(b.nome,'pt-BR'));
    const projetos=B.projetos.filter(p=>(!F.area || p.area===F.area) && (!F.projeto || String(p.id)===F.projeto) && ((!F.cliente&&!F.tema&&!F.busca&&!F.precisa) || base.some(s=>String(s.projeto_id)===String(p.id)))).map(p=>{
      const todos=B.passos.filter(s=>String(s.projeto_id)===String(p.id)), lista=base.filter(s=>String(s.projeto_id)===String(p.id));
      const feitos=todos.filter(s=>s.feito).length, total=todos.length, pp=todos.filter(pend).sort(ordem);
      return {...p,total_passos:total,feitos,pendentes:pp.length,progresso_pct:total?Math.round(feitos/total*100):0,proximo_passo:pp[0]?.txt,proximo_passo_com:pp[0]?.responsavel,proximo_passo_prazo:pp[0]?.prazo_data,precisa_do_leo_n:pp.filter(s=>s.precisa_do_leo).length,passos_pendentes:lista.filter(pend).sort(ordem),passos_feitos:lista.filter(s=>s.feito).sort(ordem),passos_algum_dia:lista.filter(s=>!s.feito&&s.algumdia).sort(ordem)};
    });
    let grupos=[];
    if(F.modo==='projeto') {
      for(const p of projetos) { let g=grupos.find(g=>g.chave===p.area); if(!g) grupos.push(g={chave:p.area||'Sem área',n:0,precisa:0,projetos:[]}); g.projetos.push(p); g.n++; g.precisa+=p.precisa_do_leo_n; }
    } else {
      const prim=F.modo==='tema'?'tema':'cliente', seg=prim==='tema'?'cliente':'tema';
      for(const p of vis) { const chave=p[prim]||(prim==='cliente'?'Sem cliente':'Sem tema'); let g=grupos.find(g=>g.chave===chave); if(!g) grupos.push(g={chave,n:0,precisa:0,sub:[]}); g.n++; if(pend(p)&&p.precisa_do_leo) g.precisa++; const k=p[seg]||(seg==='cliente'?'Geral':'Sem tema'); let s=g.sub.find(s=>s.chave===k); if(!s) g.sub.push(s={chave:k,n:0,passos:[]}); s.n++; s.passos.push(p); }
      grupos.sort((a,b)=> prim==='cliente' ? (a.chave==='Sem cliente'?1:b.chave==='Sem cliente'?-1:pos(a.chave)-pos(b.chave)||a.chave.localeCompare(b.chave,'pt-BR')) : a.chave.localeCompare(b.chave,'pt-BR'));
    }
    const ativos=base.filter(pend), dias=p=>Math.round((Date.parse((p.prazo_data||'').slice(0,10)+'T12:00:00Z')-Date.parse(hoje()+'T12:00:00Z'))/86400000);
    const comecar=ativos.filter(p=>p.precisa_do_leo||p.atrasado||p.vence_em_3_dias).sort(ordem).slice(0,5).map(p=>({...p,motivo:p.precisa_do_leo?'precisa de você':dias(p)<0?'atrasado há '+Math.abs(dias(p))+' dias':dias(p)===0?'vence hoje':'vence em '+dias(p)+' dias'}));
    return {hoje:hoje(),carregando,falhas:B.falhas,erro:B.erro,modo:F.modo,filtro:{...F},resumo:{pendentes:ativos.length,precisa_de_voce:ativos.filter(p=>p.precisa_do_leo).length,vencem_3_dias:ativos.filter(p=>p.vence_em_3_dias).length,atrasados:ativos.filter(p=>p.atrasado).length,algum_dia:base.filter(p=>p.algumdia).length,feitos:base.filter(p=>p.feito).length,sem_projeto:base.filter(p=>!p.projeto_id).length},comecar,clientes,temas:faceta('tema'),areas:grupos.map(g=>({nome:g.chave,n:g.n,precisa:g.precisa})),grupos,projetos_sem_passo:projetos.filter(p=>!p.total_passos).length,passos_sem_projeto:base.filter(p=>!p.projeto_id).length,n:vis.length,n_total:B.passos.length,gravado:G,passos:base};
  }
  async function carregar(aoPasso) {
    B={passos:[],projetos:[],blocos:[],falhas:{}}; G=null;
    const emitir=(passo,rotulo)=>{ const d=montar({passo,total:3,rotulo}); if(aoPasso) aoPasso(d); };
    emitir(0,'passos');
    try { B.passos=await tudo(sb.from('v_topics_passo').select('*').order('id')); } catch(e) { B.erro=e.message||String(e); return montar(); }
    emitir(1,'projetos');
    const acess=async(nome,fn)=>{try{return await fn();}catch(e){B.falhas[nome]=e.message||String(e);return [];}};
    B.projetos=await acess('projetos',()=>tudo(sb.from('v_topics_projeto').select('*').order('criado_em').order('id'))); emitir(2,'blocos');
    B.blocos=await acess('blocos',()=>tudo(sb.from('topics_bloco').select('*').order('seq'))); return montar();
  }
  const mensagem=e=>e?.message||String(e);
  async function gravar(id,patch) {
    const p=B.passos.find(p=>String(p.id)===String(id));
    try { if(!p?.escritorio_id) throw Error('escritório do passo indisponível'); const s=await sessao(); if(!s) throw Error('sessão encerrada');
      const r=await sb.from('topics_item').update({...patch,atualizado_por:s.user.email}).match({escritorio_id:p.escritorio_id,id:p.id}).select('id');
      if(r.error) throw r.error; if(!r.data?.length) throw Error('o banco não confirmou a gravação');
      Object.assign(p,patch,{atualizado_em:new Date().toISOString()}); p.situacao=p.feito?'feito':p.algumdia?'algum dia':'pendente'; G={texto:patch.feito?'feito':patch.algumdia?'algum dia':'de volta',id}; return null;
    } catch(e) { G={erro:mensagem(e),id}; return G.erro; }
  }
  async function acrescentarPasso(v) {
    try { if(!v.txt?.trim() || !v.tema?.trim()) throw Error('preencha o passo e o tema'); const s=await sessao(); if(!s) throw Error('sessão encerrada');
      const bloco=v.cliente?blocoDe(v.cliente):blocoDe('CMS')||B.blocos.find(b=>!b.cliente);   /* sem cliente: o bloco geral da CMS (contrato) */ if(!bloco) throw Error('bloco indisponível; tente carregar de novo');
      const esc=bloco.escritorio_id || B.passos.find(p=>mesmo(p.bloco,bloco.nome))?.escritorio_id; if(!esc) throw Error('escritório indisponível');
      /* id no esquema da casa: prefixo do bloco (o mais comum entre os ids que já existem nele) + ddmm + slug curto; repetido ganha sufixo 2, 3… */
      const doBloco=B.passos.filter(p=>mesmo(p.bloco,bloco.nome)), cont={};
      for(const p of doBloco){const m=/^([a-z]+?)\d{4}/.exec(String(p.id)); if(m) cont[m[1]]=(cont[m[1]]||0)+1;}
      const prefixo=Object.keys(cont).sort((a,b)=>cont[b]-cont[a])[0] || norm(bloco.nome).replace(/[^a-z]/g,'').slice(0,2) || 'lw';
      const h=hoje(), base=prefixo+h.slice(8,10)+h.slice(5,7)+(norm(v.txt).replace(/[^a-z0-9]/g,'').slice(0,10)||'passo');
      let id=base; for(let n=2; B.passos.some(p=>p.id===id); n++) id=base+n;
      const p={id,escritorio_id:esc,bloco:bloco.nome,seq:Math.max(0,...doBloco.map(p=>+p.seq||0))+1,txt:v.txt.trim(),prazo:v.prazo||null,cliente:v.cliente||null,tema:v.tema,projeto_id:v.projeto_id||null,tipo:'tarefa',dono:'LEO',quem:'Léo',feito:false,algumdia:false,atualizado_por:s.user.email};
      const r=await sb.from('topics_item').insert(p).select('id'); if(r.error) throw r.error; if(!r.data?.length) throw Error('o banco não confirmou o passo');
      const pr=B.projetos.find(x=>String(x.id)===String(p.projeto_id)); B.passos.push({...p,projeto_nome:pr?.nome,projeto_area:pr?.area,prazo_data:p.prazo,responsavel:p.quem,precisa_do_leo:true,situacao:'pendente',criado_em:new Date().toISOString()}); G={texto:'passo acrescentado',id}; return null;
    }catch(e){G={erro:mensagem(e)};return G.erro;}
  }
  return {sessao,entrar,sair,carregar,refiltrar:f=>{F={...F,...f};return montar();},marcarFeito:(id,on)=>gravar(id,{feito:!!on}),algumDia:(id,on)=>gravar(id,{algumdia:!!on}),acrescentarPasso,passo:id=>B.passos.find(p=>String(p.id)===String(id))};
})();
