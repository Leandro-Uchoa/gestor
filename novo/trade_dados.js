// Gestor · TRADE (novo) — a CAMADA DE DADOS (TI, 28/10/2026). Contrato em TI\CONTRATO_TRADE_DADOS.md; a casca (trade_tela.js) chama
// window.desenharTrade(DADOS). Fontes: trade_resumo(p_semestre) (0102: verba · consumido · saldo · só aprovadas · controle da planilha),
// trade_consulta() (0046: todas as ações, semestres, carga) e trade_acao para gravar status/atualização (como no Gestor atual).
// Regras: carga EM FILA (o banco corta cada consulta em 8 s), o placar primeiro; nada embutido; tela interna (?modo=cliente não abre);
// consumido = feita + em andamento; arquivada some da frente e volta pelo chip; nenhuma tela arredonda verba.
window.DadosTrade = (() => {
  const sb = window.supabase.createClient(URL_SB, CHAVE);
  const MODO_CLIENTE = new URLSearchParams(location.search).get("modo") === "cliente";
  const ARQ = s => s === "arquivada" || s === "cancelada";
  const APROVADA = s => s === "feita" || s === "em andamento";
  const ORD_ST = ["em andamento", "planejada", "feita", "não usada", "arquivada"];
  const ROTULO_ST = { arquivada: "arquivadas" };
  const num = v => v == null || v === "" ? null : (isNaN(+v) ? null : +v);
  let BRUTO = null, FILTRO = { vendedor: [], status: [], busca: "" };

  async function tudo(q) { const out = []; for (let i = 0; ; i += 1000) { const { data, error } = await q.range(i, i + 999); if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) break; } return out; }
  const semErro = (fn, vazio) => Promise.resolve().then(fn).catch(e => { console.warn("fonte acessória falhou", e && e.message || e); return vazio === undefined ? [] : vazio; });
  async function sessao() { const { data: { session } } = await sb.auth.getSession(); return session; }
  async function entrar(email, senha) { const { error } = await sb.auth.signInWithPassword({ email, password: senha }); return error ? error.message : null; }
  async function sair() { await sb.auth.signOut({ scope: "local" }); location.reload(); }

  const PASSOS = 3;
  async function carregar(semestre, aoPasso) {
    const emitir = (passo, rotulo) => { try { if (aoPasso) aoPasso(montar({ passo, total: PASSOS, rotulo })); } catch (e) { console.error("passo " + passo, e); } };
    BRUTO = { semestre: semestre || null, resumo: null, consulta: null, esc: null, falhas: {} };
    // 1 · o placar: verba, consumido, saldo e o controle da planilha (uma RPC leve)
    const r = await sb.rpc("trade_resumo", { p_semestre: semestre || null });
    if (r.error) throw r.error;
    BRUTO.resumo = r.data || null;
    if (!BRUTO.semestre && BRUTO.resumo && BRUTO.resumo.semestre) BRUTO.semestre = BRUTO.resumo.semestre;
    emitir(1, "verba e saldo");
    // 2 · todas as ações (para os chips de vendedor e status e para as arquivadas)
    const c = await sb.rpc("trade_consulta");
    if (c.error) { BRUTO.falhas.acoes = c.error.message || "sem resposta"; BRUTO.consulta = { acoes: [], semestres: [], carga: null }; }
    else BRUTO.consulta = c.data || { acoes: [], semestres: [], carga: null };
    if (!BRUTO.semestre) { const sems = (BRUTO.consulta.semestres || []).slice().sort().reverse(); BRUTO.semestre = sems[0] || null; }
    emitir(2, "ações");
    // 3 · o escritório (só para o match da gravação; acessório)
    const e = await semErro(() => tudo(sb.from("escritorio").select("id").limit(1)), []);
    BRUTO.esc = (e[0] || {}).id || null;
    return montar(null);
  }

  function montar(carregando) {
    const { semestre, resumo, consulta, falhas } = BRUTO, hoje = new Date().toISOString().slice(0, 10);
    const todas = (consulta && consulta.acoes) || [];
    const doSem = todas.filter(a => (a.semestre || null) === (semestre || null));
    const valor = a => num(a.provisionado != null ? a.provisionado : a.verba) || 0;
    const stDe = a => ARQ(a.status) ? "arquivada" : a.status;
    const sems = [...new Set(todas.map(a => a.semestre).filter(Boolean))].sort().reverse();
    if (resumo && resumo.semestre && !sems.includes(resumo.semestre)) sems.unshift(resumo.semestre);
    const semestres = sems.map(s => ({ chave: s, n: todas.filter(a => a.semestre === s).length }));
    // verba: da RPC (0102) quando o semestre tem verba lançada; se não, só o que se soma das ações
    const semVerba = !resumo || resumo.verba == null;
    const consumidoLocal = doSem.filter(a => APROVADA(a.status)).reduce((s, a) => s + valor(a), 0);
    const verba = {
      total: semVerba ? null : num(resumo.verba), consumido: semVerba ? consumidoLocal : num(resumo.consumido),
      saldo: semVerba ? null : num(resumo.saldo), feita: semVerba ? doSem.filter(a => a.status === "feita").reduce((s, a) => s + valor(a), 0) : num(resumo.feita),
      em_andamento: semVerba ? doSem.filter(a => a.status === "em andamento").reduce((s, a) => s + valor(a), 0) : num(resumo.em_andamento),
      n_aprovadas: semVerba ? doSem.filter(a => APROVADA(a.status)).length : num(resumo.n_acoes),
      provisionada: doSem.filter(a => a.status === "planejada").reduce((s, a) => s + valor(a), 0),
      arquivadas: { n: doSem.filter(a => ARQ(a.status)).length, valor: doSem.filter(a => ARQ(a.status)).reduce((s, a) => s + valor(a), 0) },
      nao_usada: { n: doSem.filter(a => a.status === "não usada").length, valor: doSem.filter(a => a.status === "não usada").reduce((s, a) => s + valor(a), 0) },
      sem_verba: semVerba,
    };
    verba.em_aberto = verba.total == null ? null : verba.total - (verba.consumido || 0) - verba.provisionada;
    const ct = (resumo && resumo.controle) || {};
    const controle = semVerba ? null : { saldo_planilha: num(ct.saldo_planilha), consumido_planilha: num(ct.consumido_planilha), saldo_celula: num(ct.saldo_celula), bate: !!ct.bate, diferenca: num(ct.diferenca),
      lida_em: resumo.verba_lida_em || null, rotulo: resumo.verba_rotulo || null, celula: resumo.verba_celula || null, arquivo: resumo.arquivo || null };
    const carga = (resumo && resumo.carga) || (consulta && consulta.carga) || null;
    // chips: status contado no semestre inteiro; vendedor contado só no que o filtro de status deixa ver (arquivada fora da frente não conta no chip)
    const passaSt = a => FILTRO.status.length ? FILTRO.status.includes(stDe(a)) : !ARQ(a.status);
    const cv = new Map(), cs = new Map();
    for (const a of doSem) { cs.set(stDe(a), (cs.get(stDe(a)) || 0) + 1); if (passaSt(a)) { const v = a.vendedor || "—"; cv.set(v, (cv.get(v) || 0) + 1); } }
    const filtros = { vendedores: [...cv.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([nome, n]) => ({ nome, n })),
                      status: ORD_ST.filter(s => cs.has(s)).map(s => ({ chave: s, rotulo: ROTULO_ST[s] || s, n: cs.get(s) })),
                      vendedor: FILTRO.vendedor.slice(), status_sel: FILTRO.status.slice(), busca: FILTRO.busca };
    const B = String(FILTRO.busca || "").trim().toUpperCase();
    const lista = doSem.filter(a => (!FILTRO.vendedor.length || FILTRO.vendedor.includes(a.vendedor || "—")) && passaSt(a)
      && (!B || [a.nome, a.cliente, a.titulo, a.nota, a.vendedor, a.tipo].map(x => String(x || "").toUpperCase()).join(" ").includes(B)));
    const max = Math.max(1, ...lista.map(valor));
    const acoes = lista.map(a => ({ id: a.id, cliente: a.cliente, nome: a.nome || a.cliente, vendedor: a.vendedor || null, portas: num(a.portas), titulo: a.titulo, tipo: a.tipo || null,
      status: a.status, status_tela: stDe(a), arquivada: ARQ(a.status), aprovada: APROVADA(a.status), provisionado: valor(a), utilizada: num(a.utilizada), restante: num(a.restante),
      nota: a.nota || null, atualizacao: a.atualizacao || null, periodo: a.periodo || null, periodo_ini: a.periodo_ini || null, periodo_fim: a.periodo_fim || null, meta_pares: num(a.meta_pares),
      semestre: a.semestre || null, pct: Math.round(100 * valor(a) / max) }));
    const tot = k => acoes.reduce((s, a) => s + (num(a[k]) || 0), 0);
    return { hoje, semestre, semestres, carregando: carregando || null, falhas: Object.keys(falhas).length ? falhas : null, aviso: null, gravado: null,
      verba, controle, carga, filtros, acoes, n: acoes.length, n_total: doSem.length, totais: { provisionado: tot("provisionado"), utilizada: tot("utilizada"), restante: tot("restante") },
      regra: "consumido = feita + em andamento · planejada é provisionada · arquivada some da frente e volta pelo chip · nenhum valor arredondado" };
  }

  function refiltrar(f) { FILTRO = { vendedor: (f && f.vendedor) || [], status: (f && f.status) || [], busca: (f && f.busca) || "" }; return montar(null); }
  // grava status ou atualização em trade_acao (o gatilho guarda o histórico); devolve null ou a mensagem de erro
  async function gravar(id, patch) {
    const q = sb.from("trade_acao").update(Object.assign({ atualizado_em: new Date().toISOString() }, patch));
    const r = await (BRUTO.esc ? q.match({ id: Number(id), escritorio_id: BRUTO.esc }) : q.match({ id: Number(id) }));
    if (r.error) return r.error.message || "o banco recusou";
    const a = ((BRUTO.consulta || {}).acoes || []).find(x => Number(x.id) === Number(id)); if (a) Object.assign(a, patch);
    // o resumo (verba · consumido · saldo) vem da RPC: depois de mudar status, relê só ela (leve)
    if (patch.status !== undefined) { const r2 = await semErro(() => sb.rpc("trade_resumo", { p_semestre: BRUTO.semestre }).then(x => { if (x.error) throw x.error; return x.data; }), null); if (r2) BRUTO.resumo = r2; }
    return null;
  }

  return { sb, MODO_CLIENTE, sessao, entrar, sair, carregar, refiltrar, gravar, semestre: () => BRUTO && BRUTO.semestre, filtro: () => FILTRO };
})();
