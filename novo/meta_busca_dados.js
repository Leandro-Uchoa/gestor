// Gestor · BUSCAR A META (novo) — a CAMADA DE DADOS (TI, 28/10/2026). Contrato em TI\CONTRATO_META_BUSCA_DADOS.md; a casca é do PICASSO
// (window.desenharMeta(DADOS)). Fontes: v_onde_buscar_meta (0099–0101: placar por preposto × faixa, movimentos m1–m5), v_buscar_meta_placar
// (0109–0117: 4 estados), v_buscar_meta (0104–0117: blocos 1–5, um SKU por linha), v_buscar_meta_pedido_sugerido (0117: pedido novo com teto),
// produto.foto_url (0124, verificada). Regras: a API corta em 1.000 linhas (.range em laço); nada embutido (preposto vem da view e da URL,
// nunca do código); chinelo nunca somado ao tênis; régua ruptura <4 · ideal 4–5 · alta ≥5; grade em múltiplos de 12; a tela só MOSTRA e marca —
// nada sai sem o clique do Léo; ⛔ atrás do login, nunca em ?modo=cliente (meta de vendedor é nome + dinheiro; não sai da casa).
window.DadosMeta = (() => {
  const sb = window.supabase.createClient(URL_SB, CHAVE);
  const MES_OK = /^\d{4}-\d{2}/, DATA_OK = /^\d{4}-\d{2}-\d{2}/;
  const BLOCOS = { 1: { acao: "transferir", verbo: "Solicitar transferência", explicacao: "inchado na origem (cobertura alta) e em falta no cliente seu — até 1 mês de venda dele" },
                   2: { acao: "antecipar", verbo: "Antecipar", explicacao: "sua carteira do mês seguinte: ruptura → ideal → repasse da CMS → alta" },
                   3: { acao: "antecipar", verbo: "Antecipar", explicacao: "a origem antecipa para ela mesma só o que ela precisa (cobertura < 5)" },
                   4: { acao: "digitar", verbo: "Digitar", explicacao: "o que o EBM tem para faturar na quinzena: quem entra no pedido vem primeiro" },
                   5: { acao: null, verbo: null, explicacao: "continua inchado na origem: rever a entrada do mês seguinte ou outro cliente" } };
  const NOME_FAIXA = { "TT CALCADOS": "Total de tênis", "TT FTW_UA": "Total de tênis UA", "TT GERAL": "Total geral (R$)", "ACOLY": "Acessórios (R$)", "CHOLY": "Chinelos (R$)", "MEOLY": "Meias (R$)",
                       "CONF_FEM": "Conforto feminino", "CONF_MASC": "Conforto masculino", "CORRIDA/TREINO": "Corrida / treino", "CLASSICOS": "Clássicos", "INFANTIL": "Infantil", "CORRE": "Família Corre",
                       "UA_AC": "Acessórios UA (R$)", "UA_ME": "Meias UA (R$)", "UA_CH": "Chinelos UA (R$)", "UA_TN": "Tênis UA (R$)", "BASKETBALL": "Basquete UA", "TRAINING": "Treino UA", "RUNNING": "Corrida UA", "RUN INSPIRED": "Run inspired UA" };
  const NA_REGUA = g => /cobertura < 5|repasse CMS/i.test(g || "");                 // o que o "marcar o mínimo" pode marcar (NÚCLEO: dentro da régua)
  const FORA_REGUA = g => /alta|sem giro|a confirmar/i.test(g || "");             // recolhido atrás de "+N" (nunca misturado)
  let BRUTO = null, MARCADOS = new Set();

  async function tudo(q) { const out = []; for (let i = 0; ; i += 1000) { const { data, error } = await q.range(i, i + 999); if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) break; } return out; }
  const semErro = (fn, vazio) => Promise.resolve().then(fn).catch(e => { console.warn("fonte acessória falhou", e && e.message || e); return vazio === undefined ? [] : vazio; });
  async function sessao() { const { data: { session } } = await sb.auth.getSession(); return session; }
  async function entrar(email, senha) { const { error } = await sb.auth.signInWithPassword({ email, password: senha }); return error ? error.message : null; }
  async function sair() { await sb.auth.signOut({ scope: "local" }); location.reload(); }
  // prepostos (vendedores) que a view conhece — TODOS = a CMS inteira; a ordem vem da view (preposto_ordem)
  async function prepostos() {
    const rows = await tudo(sb.from("v_onde_buscar_meta").select("preposto,preposto_nome,preposto_ordem").order("preposto_ordem").order("preposto"));
    const vistos = new Map(); for (const r of rows) if (r.preposto && !vistos.has(r.preposto)) vistos.set(r.preposto, { codigo: r.preposto, nome: r.preposto_nome || r.preposto, ordem: r.preposto_ordem });
    return [...vistos.values()].sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
  }

  async function carregar(preposto) {
    const P = preposto || "TODOS";
    const [placar, estados, linhas, dispo, pedido, cms] = await Promise.all([
      tudo(sb.from("v_onde_buscar_meta").select("mes,marca,preposto,preposto_nome,faixa,unidade,faixa_ordem,total,gatilho_pct,meta,gatilho,real,faturado,falta_gatilho,falta_100,bate,alcanca,se_nao_faturar,m1_cobrar,m1_vencida,m2_marcado,m3_antecipar,m3_efeito_mes_seguinte,m3_cob_alta,m4_repasse,m5_rfv_clientes,m5_rfv_pares_2025,cms_bate,cms_alcanca,vale_buscar,quinzena2,dias_uteis_restantes,real_lido_em,meta_lida_em")
             .eq("preposto", P).order("marca").order("faixa_ordem")),
      semErro(() => tudo(sb.from("v_buscar_meta_placar").select("preposto,faixa,falta_gatilho,fecha_na_regua,fecha_com_alta,repasse_a_confirmar,estado,fecha_com_pedido,fecha_com_pedido_sem_teto").eq("preposto", P))),
      // blocos 1, 2, 3 e 5 (preposto da linha); o bloco 4 (dispo) não tem preposto: vem à parte
      P === "TODOS" ? tudo(sb.from("v_buscar_meta").select("*").neq("bloco", 4).order("bloco").order("faixa").order("prioridade"))
                    : tudo(sb.from("v_buscar_meta").select("*").eq("preposto", P).order("bloco").order("faixa").order("prioridade")),
      semErro(() => tudo(sb.from("v_buscar_meta").select("*").eq("bloco", 4).order("faixa").order("prioridade"))),
      semErro(() => tudo(sb.from("v_buscar_meta_pedido_sugerido").select("preposto,faixa,cliente,referencia,cor,descricao,venda_mes,estoque,carteira,transito,cob_base,cap,gdisp,pedido_sugerido,cabe_mais,cob_depois,alvo_faixa").eq("preposto", P).gt("pedido_sugerido", 0).order("faixa").order("cliente"))),
      P === "TODOS" ? Promise.resolve([]) : semErro(() => tudo(sb.from("v_onde_buscar_meta").select("marca,faixa,gatilho,real,falta_gatilho,bate,alcanca").eq("preposto", "TODOS"))),
    ]);
    // blocos 3 e 5 são do cliente de origem (pontua noutro preposto): entram na visão do vendedor que tem o bloco 1 (origem → cliente seu), porque é a mesma jogada
    let pio = [];
    if (P !== "TODOS" && linhas.some(l => +l.bloco === 1)) pio = await semErro(() => tudo(sb.from("v_buscar_meta").select("*").in("bloco", [3, 5]).order("bloco").order("faixa").order("prioridade")));
    const todas = linhas.concat(pio.filter(l => !linhas.some(x => x.bloco === l.bloco && x.referencia === l.referencia && x.cor === l.cor && x.cliente_para === l.cliente_para)), dispo);
    // fotos verificadas (produto.foto_url, 0124) e nome da cor, em blocos de 200 referências
    const refs = [...new Set(todas.map(l => l.referencia).filter(Boolean))], CAD = [];
    for (let i = 0; i < refs.length; i += 200) CAD.push(...await semErro(() => tudo(sb.from("produto").select("referencia,cor,cor_descricao,foto_url").in("referencia", refs.slice(i, i + 200)).order("referencia").order("cor"))));
    const COR = new Map(CAD.map(p => [p.referencia + "|" + (p.cor || ""), p.cor_descricao])), IMG = new Map();
    for (const p of CAD) { if (!p.foto_url) continue; IMG.set(p.referencia + "|" + (p.cor || ""), p.foto_url); (IMG.get(p.referencia) || IMG.set(p.referencia, []).get(p.referencia)).push(p.foto_url); }
    const nomeP = (placar[0] || {}).preposto_nome || (P === "TODOS" ? "CMS" : P);
    BRUTO = { P, nomeP, placar, estados, linhas: todas, pedido, cms, COR, IMG };
    MARCADOS = new Set();
    return montar(null);
  }

  const idDe = l => [l.bloco, l.referencia, l.cor || "", l.cliente_de || "", l.cliente_para || "", l.prev_fat || "", l.grupo || "", l.acao_xl || ""].join("|");   // a mesma SKU × cliente pode ter duas previsões: o id leva as duas
  const num = v => v == null || v === "" || isNaN(+v) ? null : +v;
  function montar(faixa) {
    const { P, nomeP, placar, estados, linhas, pedido, cms, COR, IMG } = BRUTO, hoje = new Date().toISOString().slice(0, 10);
    const EST = new Map(estados.map(e => [e.faixa, e])), CMS = new Map(cms.map(c => [c.marca + "|" + c.faixa, c]));
    // itens dos blocos, com a marcação
    const itens = linhas.map(l => { const k = l.referencia + "|" + (l.cor || ""), fotos = [...new Set([l.cor ? IMG.get(k) : null].concat(IMG.get(l.referencia) || []).filter(Boolean))];
      return { id: idDe(l), bloco: +l.bloco, faixa: l.faixa, ref: l.referencia, cor: l.cor || "", cor_nome: COR.get(k) || l.cor || "", modelo: l.descricao || l.referencia, fotos, foto_falta: !fotos.length,
               cliente_de: l.cliente_de, cliente_para: l.cliente_para, pares: num(l.pares) || 0, pares_origem: num(l.pares_origem), prev_fat: DATA_OK.test(String(l.prev_fat)) ? String(l.prev_fat).slice(0, 10) : null,
               cobertura_de: num(l.cobertura_de), cobertura_para: num(l.cobertura_para), regua_de: l.regua_de, regua_para: l.regua_para, venda_mes: num(l.venda_mes), estoque: num(l.estoque),
               grupo: l.grupo || "", prioridade: num(l.prioridade), acumulado: num(l.acumulado_faixa), acao: l.acao || (BLOCOS[+l.bloco] || {}).acao, acao_xl: l.acao_xl || null,
               na_regua: +l.bloco === 1 || +l.bloco === 3 ? true : +l.bloco === 4 ? /entra no pedido/i.test(l.grupo || "") : NA_REGUA(l.grupo), fora_regua: +l.bloco === 2 ? FORA_REGUA(l.grupo) : +l.bloco === 4 ? !/entra no pedido/i.test(l.grupo || "") : +l.bloco === 5,
               marcavel: +l.bloco !== 5 && (num(l.pares) || 0) > 0, marcado: MARCADOS.has(idDe(l)), grade_ok: ((num(l.pares) || 0) % 12) === 0 }; });
    // o que conta para a faixa do VENDEDOR: origem → cliente seu (1), sua carteira (2) e dispo digitada (4). O bloco 3 (a origem antecipa para ela) pontua no preposto da origem: só conta na visão CMS
    const contaFaixa = i => P === "TODOS" ? i.bloco !== 5 : [1, 2, 4].includes(i.bloco);
    const porFaixa = f => itens.filter(i => i.faixa === f && i.marcado && contaFaixa(i)).reduce((s, i) => s + i.pares, 0);
    // placar: uma linha por faixa (marca OLY e UA), com o estado do NÚCLEO e a conta ao vivo do que está marcado
    const linhasPlacar = placar.map(r => { const e = EST.get(r.faixa) || {}, c = CMS.get(r.marca + "|" + r.faixa) || null, falta = num(r.falta_gatilho) || 0, marcado = r.unidade === "pares" ? porFaixa(r.faixa) : 0;
      const estado = r.bate ? "batida" : e.estado || (r.alcanca ? "fecha com os movimentos" : "não fecha");
      return { faixa: r.faixa, nome: (NOME_FAIXA[r.faixa] || r.faixa) + (r.marca === "UA" && !/UA/.test(NOME_FAIXA[r.faixa] || "") ? " · UA" : ""), marca: r.marca, unidade: r.unidade, total: !!r.total, ordem: num(r.faixa_ordem), gatilho_pct: num(r.gatilho_pct), meta: num(r.meta), gatilho: num(r.gatilho), real: num(r.real), faturado: num(r.faturado),
               falta_gatilho: falta, falta_100: num(r.falta_100), bate: !!r.bate, alcanca: !!r.alcanca, vale_buscar: r.vale_buscar !== false, se_nao_faturar: num(r.se_nao_faturar),
               estado, fecha_na_regua: num(e.fecha_na_regua), fecha_com_alta: num(e.fecha_com_alta), fecha_com_pedido: num(e.fecha_com_pedido), repasse_a_confirmar: num(e.repasse_a_confirmar),
               cms: c ? { gatilho: num(c.gatilho), real: num(c.real), falta: num(c.falta_gatilho) || 0, bate: !!c.bate, alcanca: !!c.alcanca } : null, cms_bate: !!r.cms_bate, cms_alcanca: !!r.cms_alcanca,
               movimentos: { m1_cobrar: num(r.m1_cobrar), m1_vencida: num(r.m1_vencida), m2_marcado: num(r.m2_marcado), m3_antecipar: num(r.m3_antecipar), m3_cob_alta: num(r.m3_cob_alta), m3_efeito: num(r.m3_efeito_mes_seguinte), m4_repasse: num(r.m4_repasse), m5_clientes: num(r.m5_rfv_clientes), m5_pares: num(r.m5_rfv_pares_2025) },
               marcado, faltam: Math.max(0, falta - marcado), fecha: falta > 0 && marcado >= falta, pct_real: r.gatilho ? Math.min(1.5, (num(r.real) || 0) / +r.gatilho) : null, pct_marcado: r.gatilho ? Math.min(1.5, ((num(r.real) || 0) + marcado) / +r.gatilho) : null }; });
    // ordem do GAMER: a mais perto de fechar em cima; batida recolhida no fim; "não vale buscar" apagada
    const peso = p => p.bate ? 3 : !p.vale_buscar ? 2 : p.estado === "não fecha" ? 1 : 0;
    const placarOrd = linhasPlacar.slice().sort((a, b) => peso(a) - peso(b) || (a.total ? 1 : 0) - (b.total ? 1 : 0) || (a.faltam || 0) - (b.faltam || 0) || (a.ordem || 0) - (b.ordem || 0));
    const faixasBusca = linhasPlacar.filter(p => p.unidade === "pares" && !p.total && p.marca !== "UA").map(p => p.faixa);
    // blocos
    const blocos = [1, 2, 3, 4, 5].map(b => { const L = itens.filter(i => i.bloco === b && (!faixa || i.faixa === faixa)); if (!L.length) return null;
      const nome = (linhas.find(l => +l.bloco === b) || {}).bloco_nome || ("Bloco " + b), ordem = (x, y) => (x.fora_regua ? 1 : 0) - (y.fora_regua ? 1 : 0) || (x.na_regua ? 0 : 1) - (y.na_regua ? 0 : 1) || (x.prioridade || 9e9) - (y.prioridade || 9e9) || (x.cobertura_para ?? 99) - (y.cobertura_para ?? 99);
      L.sort(ordem);
      return Object.assign({ bloco: b, nome, n: L.length, pares: L.reduce((s, i) => s + i.pares, 0), marcados: L.filter(i => i.marcado).length, pares_marcados: L.filter(i => i.marcado).reduce((s, i) => s + i.pares, 0),
                             n_regua: L.filter(i => !i.fora_regua).length, n_fora: L.filter(i => i.fora_regua).length, itens: L }, BLOCOS[b]); }).filter(Boolean);
    // prévia do pedido: o que está marcado, nas duas abas do arquivo (ANTECIPAR · TRANSFERIR) + DIGITAR
    const marc = itens.filter(i => i.marcado);
    const aba = a => marc.filter(i => i.acao === a).map(i => ({ bloco: i.bloco, faixa: i.faixa, ref: i.ref, cor: i.cor, cor_nome: i.cor_nome, modelo: i.modelo, cliente_de: i.cliente_de, cliente_para: i.cliente_para, pares: i.pares, prev_fat: i.prev_fat, grade_ok: i.grade_ok }));
    const previa = { antecipar: aba("antecipar"), transferir: aba("transferir"), digitar: aba("digitar"), n: marc.length, pares: marc.reduce((s, i) => s + i.pares, 0), grade_quebrada: marc.filter(i => !i.grade_ok).length,
                     por_faixa: faixasBusca.map(f => ({ faixa: f, nome: NOME_FAIXA[f] || f, pares: porFaixa(f) })) };
    const pedidoNovo = pedido.map(p => ({ faixa: p.faixa, cliente: p.cliente, ref: p.referencia, cor: p.cor, cor_nome: COR.get(p.referencia + "|" + (p.cor || "")) || p.cor, modelo: p.descricao, venda_mes: num(p.venda_mes), estoque: num(p.estoque), carteira: num(p.carteira), transito: num(p.transito), cob_base: num(p.cob_base), cap: num(p.cap), gdisp: num(p.gdisp), pedido: num(p.pedido_sugerido), cabe_mais: num(p.cabe_mais), cob_depois: num(p.cob_depois), alvo_faixa: num(p.alvo_faixa) }));
    const base = placar[0] || {};
    return { hoje, preposto: { codigo: P, nome: nomeP, cms: P === "TODOS" }, mes: MES_OK.test(String(base.mes)) ? String(base.mes).slice(0, 7) : null, quinzena2: !!base.quinzena2, dias_uteis: num(base.dias_uteis_restantes),
             placar: placarOrd, faixas_busca: faixasBusca, blocos, previa, pedido_novo: pedidoNovo, filtro: { faixa: faixa || null },
             bases: { real_lido_em: base.real_lido_em || null, meta_lida_em: base.meta_lida_em || null },
             regra: "gatilhos da Vulcabras: tênis 90% no total e 100% na faixa · famílias 95% em R$ · a faixa do vendedor só paga se a CMS também alcança · régua ruptura <4 · ideal 4–5 · alta ≥5 · grade em 12 · nada sai sem o clique" };
  }
  // marcação (o estado vive aqui; a casca só pede)
  const marcar = (id, on) => { if (on === false || (on == null && MARCADOS.has(id))) MARCADOS.delete(id); else MARCADOS.add(id); };
  function marcarMinimo(faixa) {   // GAMER: pré-marca na ordem do brief, SÓ dentro da régua, até cobrir a falta; só sugere
    const p = montar(null).placar.find(x => x.faixa === faixa); if (!p || p.unidade !== "pares") return { n: 0, faltam: 0 };
    let falta = p.falta_gatilho - p.marcado, n = 0; if (falta <= 0) return { n: 0, faltam: 0 };
    const blocosOk = BRUTO.P === "TODOS" ? [1, 2, 3] : [1, 2];   // bloco 3 só conta na visão CMS
    const cand = BRUTO.linhas.filter(l => l.faixa === faixa && blocosOk.includes(+l.bloco) && (+l.bloco !== 2 || NA_REGUA(l.grupo)) && (num(l.pares) || 0) > 0 && !MARCADOS.has(idDe(l)))
      .sort((a, b) => (+a.bloco === 2 ? 0 : 1) - (+b.bloco === 2 ? 0 : 1) || (num(a.prioridade) || 9e9) - (num(b.prioridade) || 9e9));
    for (const l of cand) { if (falta <= 0) break; MARCADOS.add(idDe(l)); falta -= +l.pares; n++; }
    return { n, faltam: Math.max(0, falta) };
  }
  const limpar = faixa => { for (const l of BRUTO.linhas) if (!faixa || l.faixa === faixa) MARCADOS.delete(idDe(l)); };
  return { sb, sessao, entrar, sair, prepostos, carregar, refiltrar: f => montar(f), marcar, marcarMinimo, limpar, marcados: () => new Set(MARCADOS) };
})();
