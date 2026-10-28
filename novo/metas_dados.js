// Gestor · Metas por cliente (novo) — a CAMADA DE DADOS (TI, 28/10/2026). Casca do PICASSO (metas_casca.html, piloto metas_v2 aprovado
// pelo Léo); contrato no topo do <script> da casca: desenharMetas({ linhas, clientes, controle, participacao, periodos, periodo_atual, preposto }).
// Fontes: v_meta_cliente (0073/0086: mês × chave × cliente + 'LÉO (3 clientes)') · v_meta_cliente_controle (soma dos três × Carta do preposto)
// · venda_mensal (DETALHADA: valor_fat + valor_cart por família → participação por família, em R$, sem alvo) · clientes_lista (ordem da casa).
// Regras: a API corta em 1.000 linhas (.range em laço); nada embutido; cada mês tem a sua meta (o trimestre não soma); modo cliente não abre.
window.DadosMetas = (() => {
  const sb = window.supabase.createClient(URL_SB, CHAVE);
  const MODO_CLIENTE = new URLSearchParams(location.search).get("modo") === "cliente";
  const MES_OK = /^\d{4}-\d{2}/;
  async function tudo(q) { const out = []; for (let i = 0; ; i += 1000) { const { data, error } = await q.range(i, i + 999); if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) break; } return out; }
  async function sessao() { const { data: { session } } = await sb.auth.getSession(); return session; }
  async function entrar(email, senha) { const { error } = await sb.auth.signInWithPassword({ email, password: senha }); return error ? error.message : null; }
  async function sair() { await sb.auth.signOut({ scope: "local" }); location.reload(); }   // escopo local: não derruba os outros aparelhos dele
  const m2 = d => String(d).slice(0, 7), ym = (y, m) => `${y}-${String(m).padStart(2, "0")}`;

  // os períodos do seletor: o trimestre FECHADO anterior, os 3 meses do trimestre corrente e o trimestre corrente (ex.: 2026-T3 · out · nov · dez · 2026-T4)
  function periodosDe(hoje) {
    const y = hoje.getFullYear(), m = hoje.getMonth() + 1, q = Math.floor((m - 1) / 3) + 1;
    const qa = q === 1 ? 4 : q - 1, ya = q === 1 ? y - 1 : y;
    const meses = [0, 1, 2].map(i => ym(y, (q - 1) * 3 + i + 1));
    return { periodos: [`${ya}-T${qa}`, ...meses, `${y}-T${q}`], atual: ym(y, m), desde: ym(ya, (qa - 1) * 3 + 1) + "-01", ate: ym(y, q * 3) + "-01", meses, tri: `${y}-T${q}`, triAnt: { k: `${ya}-T${qa}`, meses: [0, 1, 2].map(i => ym(ya, (qa - 1) * 3 + i + 1)) } };
  }

  async function carregar() {
    if (MODO_CLIENTE) throw new Error("metas não abrem em modo cliente");
    const hoje = new Date(), P = periodosDe(hoje);
    const [linhas, controle, lista, venda] = await Promise.all([
      tudo(sb.from("v_meta_cliente").select("*").gte("mes", P.desde).lte("mes", P.ate).order("mes").order("cliente").order("chave")),
      tudo(sb.from("v_meta_cliente_controle").select("mes,chave,soma_tres,carta,diferenca,tolerancia,situacao,carta_lida_em").gte("mes", P.desde).lte("mes", P.ate).order("mes").order("chave")).catch(() => []),
      sb.rpc("clientes_lista").then(r => { if (r.error) throw r.error; return r.data || []; }),
      tudo(sb.from("venda_mensal").select("cliente,mes,marca,valor_fat,valor_cart").eq("fonte", "DETALHADA").gte("mes", P.desde).lte("mes", P.ate).order("mes").order("cliente")).catch(() => []),
    ]);
    const L = linhas.filter(x => MES_OK.test(String(x.mes)));
    // clientes: os que têm linha na view, na ordem da casa (clientes_lista); o total 'LÉO (…)' por último
    const temMeta = new Set(L.map(x => x.cliente)), nomes = Object.fromEntries(lista.map(c => [c.cliente, c.nome || c.cliente]));
    const clientes = lista.filter(c => temMeta.has(c.cliente)).map(c => ({ codigo: c.cliente, nome: nomes[c.cliente] }));
    const leo = [...temMeta].find(c => /^L[ÉE]O/i.test(c)); if (leo) clientes.push({ codigo: leo, nome: leo });
    // participação por família: R$ (faturado + carteira) por cliente × mês; UA inteira numa cor; o total é a soma dos clientes com meta
    const FAM = m => /^OLY$/i.test(m) ? "tenis_rs" : /^MEOLY$/i.test(m) ? "meias_rs" : /^CHOLY$/i.test(m) ? "chinelo_rs" : /^ACOLY$/i.test(m) ? "acessorio_rs" : /^CFOLY$/i.test(m) ? "confeccao_rs" : /^UA/i.test(m) ? "ua_rs" : null;
    const zero = () => ({ tenis_rs: 0, meias_rs: 0, chinelo_rs: 0, acessorio_rs: 0, confeccao_rs: 0, ua_rs: 0 }), PM = {};
    for (const v of venda) { const m = m2(v.mes), k = FAM(v.marca); if (!k || !MES_OK.test(m) || !temMeta.has(v.cliente)) continue; const x = (PM[v.cliente + "|" + m] = PM[v.cliente + "|" + m] || zero()); x[k] += (+v.valor_fat || 0) + (+v.valor_cart || 0); }
    const participacao = [], etq = ms => ms.some(m => m >= P.atual) ? "potencial" : "faturado";
    const clis = clientes.filter(c => !/^L[ÉE]O/i.test(c.codigo)).map(c => c.codigo);
    const soma = (cli, ms) => { const x = zero(); for (const m of ms) { const y = PM[cli + "|" + m]; if (y) for (const k of Object.keys(x)) x[k] += y[k]; } return x; };
    for (const per of P.periodos) {
      const ms = /T\d$/.test(per) ? (per === P.tri ? P.meses : P.triAnt.meses) : [per];
      const tot = zero();
      for (const cli of clis) { const x = soma(cli, ms); if (Object.values(x).some(v => v > 0)) participacao.push(Object.assign({ periodo: per, cliente: cli, etiqueta: etq(ms) }, x)); for (const k of Object.keys(tot)) tot[k] += x[k]; }
      if (leo && Object.values(tot).some(v => v > 0)) participacao.push(Object.assign({ periodo: per, cliente: leo, etiqueta: etq(ms) }, tot));
    }
    return { linhas: L, clientes, controle: controle.filter(x => MES_OK.test(String(x.mes))), participacao, periodos: P.periodos, periodo_atual: P.atual, preposto: null };
  }
  return { sb, sessao, entrar, sair, carregar, MODO_CLIENTE };
})();
