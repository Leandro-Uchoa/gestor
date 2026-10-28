// Prévia isolada da aba Cliente: esta página NUNCA inicializa o SDK real nem abre rede (CSP connect-src 'none'). Dados fictícios.
// Passos do Conselho (ponte 0059→0064): A lento (3 s) → B rápido (troca antes dos 3 s fica em B) · falha simulada → "tentar de novo" recupera.
const URL_SB = 'mock', CHAVE = 'mock';
let falharProxima = false;
function demoEscolher(cliente) { const sel = document.getElementById('ti-sel'); if (!sel) return; sel.value = cliente; sel.dispatchEvent(new Event('change')); }
function demoFalhar() { falharProxima = true; demoEscolher('CLIENTE B'); }
const vazio = () => ({ data: [], error: null });
const FIC = c => ({ perfil: { nome: c + ' · FICTÍCIO', cliente: c }, carteira: [], giro: [], topics: { itens: [] }, atas: [], raio_x: null, trade: null });
window.supabase = { createClient: () => ({
  auth: { getSession: async () => ({ data: { session: {} } }), getUser: async () => ({ data: { user: null } }), signOut: async () => ({}), signInWithPassword: async () => ({ error: { message: 'prévia isolada' } }) },
  rpc: async (name, args) => {
    if (name === 'clientes_lista') return { data: [{ cliente: 'CLIENTE A', nome: 'Cliente A · fictício' }, { cliente: 'CLIENTE B', nome: 'Cliente B · fictício' }] };
    if (name !== 'cliente_consulta') return { data: null, error: null };
    const cliente = (args || {}).p_cliente, falha = falharProxima; falharProxima = false;
    await new Promise(r => setTimeout(r, cliente === 'CLIENTE A' ? 3000 : 400));
    if (falha) throw Error('falha simulada');
    return { data: FIC(cliente) };
  },
  from: () => { const q = {}; for (const m of ['select','eq','neq','gt','gte','lt','lte','in','is','like','not','or','order','limit']) q[m] = () => q;
    q.range = async () => vazio(); q.single = async () => ({ data: null, error: null }); q.maybeSingle = q.single; q.then = (ok) => Promise.resolve(vazio()).then(ok); return q; }
}) };
