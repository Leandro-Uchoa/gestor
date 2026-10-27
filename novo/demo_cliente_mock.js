// Fixture isolada: esta página nunca inicializa o SDK real ou abre conexão de rede.
const URL_SB = 'mock', CHAVE = 'mock';
let falharProxima = false;
function demoEscolher(cliente) {
  const sel = document.getElementById('ti-sel');
  if (!sel) return;
  sel.value = cliente; sel.dispatchEvent(new Event('change'));
}
function demoFalhar() { falharProxima = true; demoEscolher('CLIENTE B'); }
const vazio = () => ({data:[],error:null});
window.supabase = {createClient:()=>({
 auth:{getSession:async()=>({data:{session:{}}}),getUser:async()=>({data:{user:null}}),signOut:async()=>({})},
 rpc:async (name,args)=>{
   if(name==='clientes_lista') return {data:[{cliente:'CLIENTE A',nome:'Cliente A · fictício'},{cliente:'CLIENTE B',nome:'Cliente B · fictício'}]};
   if(name==='raio_x_consulta') return {data:null};
   if(name!=='cliente_consulta') throw Error('RPC não permitida na prévia');
   const cliente=args.p_cliente, falha=falharProxima; falharProxima=false;
   await new Promise(r=>setTimeout(r,cliente==='CLIENTE A'?3000:400));
   if(falha) throw Error('falha simulada');
   return {data:{perfil:{nome:cliente+' · FICTÍCIO'},carteira:[],giro:[],topics:{itens:[]},atas:[]}};
 },
 from:()=>{
   const q={select:()=>q,eq:()=>q,order:()=>q,gte:()=>q,range:async()=>vazio()};
   return q;
 }
})};
