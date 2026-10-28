// Gestor · Cliente (novo) — a CAMADA DE DADOS (TI, 27–28/10/2026). Tudo vem do banco com o login; nada embutido. Monta o objeto
// DADOS do contrato da casca de PARIDADE com o piloto v19 (PICASSO, porte\CAMPOS_NOVOS_PARIDADE.md) e chama desenhar(DADOS).
// Fontes: clientes_lista · cliente_consulta (perfil, carteira, giro só tênis OLY + recorte, TOPICS, atas, raio_x, trade) · raio_x_consulta
// (sazonal) · v_sellin_mensal · v_meta_cliente + v_meta_cliente_hist · v_decidir_cliente (0087/0090: "O QUE DECIDIR", R0–R5 do NÚCLEO;
// a linha 1 é a manchete) · v_cliente_gtm (0089: CDs e lojas pelo GTM) · trade_acao_deck · os módulos do PICASSO (dados_paridade.js:
// drillCobertura = régua por produto; carteiraMesEstadoFamilia = carteira por mês/estado/família) · carteira_linha, produto,
// produto_situacao, raio_x.ponta (produtos: aporte, giro baixo, ranking, faixas, ponta).
// Regras: a API corta em 1.000 linhas (.range em laço); chinelo nunca entra no tênis; meia em packs; a página de um cliente nunca cita
// outro cliente nem a origem de um repasse ("disponível para aporte: X pares · data"); cobertura "—" sem dado; nunca número inventado;
// modo cliente (?modo=cliente) sem TOPICS, agenda interna, meta, verba e gravação.
window.Dados = (() => {
  const sb = window.supabase.createClient(URL_SB, CHAVE);
  const MODO_CLIENTE = new URLSearchParams(location.search).get("modo") === "cliente";
  const FAIXAS_TENIS = ["CONF_MASC", "CONF_FEM", "CORRIDA/TREINO", "CORRE", "CLASSICOS", "INFANTIL"];
  const CAT_SAZ = { "CONF_MASC": "CONFORTO MASCULINO", "CONF_FEM": "CONFORTO FEMININO", "CORRIDA/TREINO": "CORRIDA/TREINO", "CORRE": "CORRE", "CLASSICOS": "CLÁSSICOS", "INFANTIL": "INFANTIL" };
  const ALIAS = { acess: "acessorio", conf: "confeccao" };
  const TIPO_MARCA = { tenis: m => /^OLY$|^UA_TN$|FTW/i.test(m), meias: m => /^MEOLY$|^UA_ME$/i.test(m), chinelo: m => /^CHOLY$|^UA_CH$/i.test(m), acessorio: m => /^ACOLY$|^UA_AC$/i.test(m), confeccao: m => /^CFOLY$|^UA_CF$/i.test(m) };
  const TIPO_FAM = { tenis: /T[EÊ]NIS/i, meias: /MEIA/i, chinelo: /CHINEL/i, acessorio: /ACESS/i, confeccao: /CONFEC/i };
  const TIPO_CHAVE = { tenis: k => FAIXAS_TENIS.includes(k) || k === "TT FTW_UA", meias: k => k === "MEOLY" || k === "UA_ME", chinelo: k => k === "CHOLY" || k === "UA_CH", acessorio: k => k === "ACOLY" || k === "UA_AC", confeccao: k => k === "UA_CF" };
  const marcaDe = m => /^UA/i.test(m) ? "UA" : "OLY";
  const MES_OK = /^\d{4}-\d{2}/, DATA_OK = /^\d{4}-\d{2}-\d{2}/;                 // segurança (revisão 27/10): ano e data do banco só passam neste formato
  const idOk = s => /^[\p{L}\p{N}_.:-]{1,80}$/u.test(String(s || ""));              // id do TOPICS vai para dentro de onclick na casca: só caracteres seguros (acento vale: "r1:tênis")
  const FONTE_TELA = { "v_meta_cliente (potencial) × giro_mensal": "meta do mês × giro", "v_meta_cliente (potencial)": "meta do mês", "carteira_linha (AÇÃO da DETALHADA)": "ação marcada na DETALHADA", "carteira_linha": "carteira", "venda_mensal (carteira) × giro_mensal (AG)": "carteira × giro (AG)", "trade_acao": "ação de trade", "raio_x (AG por loja)": "raio-x (AG por loja)", "topics_item": "TOPICS" };   // GAMER: nome de tabela não vai à tela do Caio
  const fonteTela = f => FONTE_TELA[String(f || "").trim()] || String(f || "").replace(/v_meta_cliente|venda_mensal|giro_mensal|carteira_linha|topics_item|trade_acao|raio_x/g, m => ({ v_meta_cliente: "meta", venda_mensal: "venda", giro_mensal: "giro", carteira_linha: "carteira", topics_item: "TOPICS", trade_acao: "trade", raio_x: "raio-x" }[m]));
  const FAM_GIRO = { tenis: "OLY FOOTWEAR", meias: "OLY MEIAS", chinelo: "OLY CHINELO", acess: "OLY ACESSÓRIOS", ua: "UA FOOTWEAR" };   // abas do Giro da casca
  const MARCA_CART = { "OLY FOOTWEAR": ["OLY"], "OLY MEIAS": ["MEOLY"], "OLY CHINELO": ["CHOLY"], "OLY ACESSÓRIOS": ["ACOLY"], "UA FOOTWEAR": ["UA_TN"] };
  let BRUTO = null;                                                                 // o que veio do banco para o cliente atual (o filtro recalcula em cima)

  async function tudo(q) {                                                          // a API corta em 1.000 linhas: lê em páginas
    const out = []; for (let i = 0; ; i += 1000) { const { data, error } = await q.range(i, i + 999); if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) break; } return out;
  }
  const semErro = (fn, vazio) => Promise.resolve().then(fn).catch(e => { console.warn("fonte acessória falhou", e && e.message || e); return vazio === undefined ? [] : vazio; });   // a página não cai: fica "—"
  async function sessao() { const { data: { session } } = await sb.auth.getSession(); return session; }
  async function entrar(email, senha) { const { error } = await sb.auth.signInWithPassword({ email, password: senha }); return error ? error.message : null; }
  async function sair() { await sb.auth.signOut({ scope: "local" }); location.reload(); }   // GAMER 27/10: o escopo padrão (global) derrubava a sessão dele em TODOS os aparelhos
  async function clientes() { const { data, error } = await sb.rpc("clientes_lista"); if (error) throw error; return (data || []).map(c => ({ cliente: c.cliente, nome: c.nome })); }

  async function carregar(cliente) {
    const DP = window.DadosParidade || {};
    const m12 = new Date(); m12.setMonth(m12.getMonth() - 12); const desde12 = m12.toISOString().slice(0, 7) + "-01";   // curva dos 80% (NÚCLEO 28/10): 12 meses de venda da família
    const [doc, rx, sellin, meta, hist, decidir, gtm, deck, drill, cartMEF, cartLin, dispo, situ, ponta, direto, giro12] = await Promise.all([
      sb.rpc("cliente_consulta", { p_cliente: cliente }).then(r => { if (r.error) throw r.error; return r.data; }),
      sb.rpc("raio_x_consulta", { p_cliente: cliente }).then(r => r.error ? null : r.data),
      tudo(sb.from("v_sellin_mensal").select("mes,marca,faixa,pares,valor,unidade,puxado_em").eq("cliente", cliente).order("mes")),
      tudo(sb.from("v_meta_cliente").select("mes,chave,unidade,meta_cliente,faturado,carteira,potencial,gap,etiqueta,base_em,meta_lida_em").eq("cliente", cliente).order("mes")),
      tudo(sb.from("v_meta_cliente_hist").select("mes,chave,unidade,meta_cliente,faturado,base").eq("cliente", cliente).order("mes")),
      semErro(() => tudo(sb.from("v_decidir_cliente").select("ordem,regra,id,texto,numero,unidade,valor_rs,fonte,base_em,urgente,bloco").eq("cliente", cliente).order("ordem"))),
      semErro(() => tudo(sb.from("v_cliente_gtm").select("n_cd,cidades_cd,n_lojas,ufs,lojas_por_uf,data_foto").eq("cliente", cliente))),
      sb.rpc("trade_acao_deck", { p_cliente: cliente }).then(r => r.error ? null : r.data, () => null),
      semErro(() => DP.drillCobertura ? DP.drillCobertura(sb, cliente, "OLY FOOTWEAR", { minVenda: 0 }) : [], []),
      semErro(() => DP.carteiraMesEstadoFamilia ? DP.carteiraMesEstadoFamilia(sb, cliente, { desde: "2026-07" }) : null, null),
      semErro(() => tudo(sb.from("carteira_linha").select("marca,referencia,descricao,cor,cart,valor_total,preco_unit,prev_fat").eq("cliente", cliente).eq("excluida", false).gt("cart", 0).order("referencia").order("cor"))),
      // disponível para aporte: carteira de OUTROS clientes posta à disposição (ação CMS / repasse na DETALHADA). A ORIGEM NUNCA VAI À TELA.
      semErro(() => tudo(sb.from("carteira_linha").select("referencia,cor,cart,prev_fat").neq("cliente", cliente).eq("excluida", false).gt("cart", 0)
                           .in("acao_xl", ["CMS", "REPASSAR", "REPASSE", "REPASSE PARCIAL", "REPASSAR PARCIAL", "EM REPASSE"]).order("referencia").order("cor"))),
      semErro(() => tudo(sb.from("produto_situacao").select("referencia,marca,em_linha").eq("em_linha", false).order("referencia"))),
      semErro(() => tudo(sb.from("raio_x").select("ponta,ponta_em").eq("cliente", cliente)), []),
      // meta DIRETA (0093, 28/10): cliente que pontua sozinho num código CMS da carta = 100% da carta desse código, sem rateio (tabela meta_cliente_direto)
      semErro(() => tudo(sb.from("v_meta_cliente_direto").select("mes,chave,unidade,meta_cliente,faturado,carteira,potencial,gap,etiqueta,base_em,meta_lida_em,participacao_regra").eq("cliente", cliente).order("mes"))),
      // 12 meses de venda por modelo-cor (tênis OLY, AG consolidada): a curva dos 80% que decide quem entra nas barras da cobertura (NÚCLEO 28/10)
      semErro(() => tudo(sb.from("giro_mensal").select("referencia,cor,venda").eq("cliente", cliente).is("praca", null).like("marca", "OLY_FTW*").gte("mes", desde12).order("mes").order("fonte").order("referencia").order("cor"))),
    ]);
    // sem meta rateada do preposto e com meta direta na carta do próprio código CMS → a meta direta vale como a meta do cliente
    const rateada = meta.some(r => r.meta_cliente != null), usaDireto = !rateada && direto.some(r => r.meta_cliente != null);
    BRUTO = { cliente, doc, rx, sellin: sellin.filter(s => MES_OK.test(String(s.mes))), meta: usaDireto ? direto : meta, hist: usaDireto ? direto : hist, meta_direta: usaDireto ? (direto.find(r => r.participacao_regra) || {}).participacao_regra || "meta do código CMS do cliente" : null,
              decidir, gtm: gtm[0] || null, deck, drill, cartMEF, cartLin, dispo, situ, ponta: ponta[0] || null, giro12, cores: new Map(), cartFam: [] };
    BRUTO.cartFam = await tudo(sb.from("venda_mensal").select("mes,marca,faixa,pares_fat,pares_cart,base_em").eq("cliente", cliente).eq("fonte", "DETALHADA").gte("mes", "2026-07-01"));
    await nomesDasCores(drill.concat(cartLin || []));                                 // nomes de cor também para as linhas da carteira (família × mês, Léo 28/10)
    return montar({ marca: ["OLY"], tipo: "tenis", genero: [], categoria: [] });
  }
  async function nomesDasCores(itens) {                                              // cor_descricao do cadastro, só para as referências da lista (em blocos de 200)
    const refs = [...new Set((itens || []).map(r => r.referencia).filter(Boolean))];
    for (let i = 0; i < refs.length; i += 200) {
      const rows = await semErro(() => tudo(sb.from("produto").select("referencia,cor,cor_descricao").in("referencia", refs.slice(i, i + 200)).order("referencia").order("cor")));
      for (const p of rows) if (p.cor_descricao) BRUTO.cores.set(p.referencia + "|" + p.cor, p.cor_descricao);
    }
  }
  // o Giro por aba (Meias · Chinelos · Acessórios · UA): roda o drill da família e remonta os produtos
  async function giroAba(tipo) {
    const DP = window.DadosParidade || {}, fam = FAM_GIRO[tipo] || "OLY FOOTWEAR";
    const itens = await semErro(() => DP.drillCobertura ? DP.drillCobertura(sb, BRUTO.cliente, fam, { minVenda: 0 }) : [], []);
    await nomesDasCores(itens);
    BRUTO.drillAba = { tipo, fam, itens };
    return montar(BRUTO.filtro || { marca: ["OLY"], tipo: "tenis", genero: [], categoria: [] });
  }

  // ---------- o objeto DADOS a partir do bruto + filtro
  function montar(filtro) {
    BRUTO.filtro = filtro;
    const { cliente, doc, rx, sellin, meta, hist, decidir: DEC, gtm, deck, drill, cartMEF, cartLin, dispo, situ, ponta, cores, giro12, meta_direta } = BRUTO, perfil = doc.perfil || {};
    const DP = window.DadosParidade || {}, famDe = DP.familiaDe || (m => String(m || "").toUpperCase());
    const hoje = new Date().toISOString().slice(0, 7), hojeD = new Date().toISOString().slice(0, 10), cod = perfil.cod_lider || "";
    const dtBR = d => d && DATA_OK.test(String(d)) ? String(d).slice(8, 10) + "/" + String(d).slice(5, 7) : null;
    // ---------- carteira por família (venda_mensal, DETALHADA): tênis OLY é o número; as outras ao lado, na unidade delas (chinelo nunca no total do tênis)
    const FAM = m => /^OLY$/i.test(m) ? "tênis OLY" : /^UA_TN$/i.test(m) ? "tênis UA" : /^MEOLY$|^UA_ME$/i.test(m) ? "meias (packs)" : /^CHOLY$|^UA_CH$/i.test(m) ? "chinelo" : /^ACOLY$|^UA_AC$/i.test(m) ? "acessórios (peças)" : "confecção (peças)";
    const porMesFam = {}, outras = {};
    for (const r of (BRUTO.cartFam || [])) { const m = String(r.mes).slice(0, 7), f = FAM(r.marca); if (m < hoje) continue; porMesFam[m] = porMesFam[m] || {}; porMesFam[m][f] = (porMesFam[m][f] || 0) + (r.pares_cart || 0); if (f !== "tênis OLY") outras[f] = (outras[f] || 0) + (r.pares_cart || 0); }
    const cart = (doc.carteira || []).filter(x => MES_OK.test(String(x.mes))).map(x => ({ mes: String(x.mes).slice(0, 7), fat: x.fat || 0, cart: (porMesFam[String(x.mes).slice(0, 7)] || {})["tênis OLY"] || 0, cart_todas: x.cart || 0, base_em: x.base_em }));
    const baseMax = cart.reduce((m, x) => (x.base_em && (!m || x.base_em > m)) ? x.base_em : m, null); for (const x of cart) x.base_em = baseMax;   // a base da carteira é UMA, a leitura mais nova
    // carteira por mês e estado + por família (módulo do PICASSO); valor em R$ só do tênis OLY no cartão (as outras famílias são outro dinheiro)
    const MEF = cartMEF || {}, PM = Object.fromEntries((MEF.por_mes || []).map(x => [x.mes, x]));
    const ESTN = { CONFIRMADA: "confirmada", APORTE: "aporte", SUGESTAO: "aporte", ATENCAO: "atencao", CANCELAR: "cancelar" };
    for (const x of cart) {
      const f = ((MEF.matriz || {})[x.mes] || {})["OLY FOOTWEAR"] || {}, est = { confirmada: 0, aporte: 0, atencao: 0, cancelar: 0 }; let valor = 0;
      for (const [e, c] of Object.entries(f)) { if (e === "FATURADA") continue; valor += c.valor || 0; const k = ESTN[e]; if (k) est[k] += c.itens || 0; }
      x.valor = valor; x.estados = est;
    }
    const familias = (MEF.por_familia || []).map(f => ({ nome: f.nome, unidade: f.unidade, meses: f.meses, valor: f.valor, total: f.total }));
    const cartValor = cart.filter(x => x.mes >= hoje).reduce((s, x) => s + (x.valor || 0), 0) || null;
    // Léo 28/10 (demo), item 2a: o "+" de cada mês abre a carteira do mês por ESTADO, família a família (chinelo nunca somado ao tênis)
    const NOMEF = Object.fromEntries((MEF.familias || []).map(f => [f.familia, f])), ordemFam = (MEF.familias || []).map(f => f.familia);
    for (const x of cart) {
      const fams = (MEF.matriz || {})[x.mes] || {};
      x.detalhe = Object.keys(fams).sort((a, b) => ordemFam.indexOf(a) - ordemFam.indexOf(b)).map(f => { const est = {}; let tot = 0;
        for (const [e, c] of Object.entries(fams[f])) { if (e === "FATURADA") continue; est[e] = (est[e] || 0) + (c.qtd || 0); tot += c.qtd || 0; }
        return { nome: (NOMEF[f] || {}).nome || f, unidade: (NOMEF[f] || {}).unidade || "pares", estados: est, total: tot }; }).filter(d => d.total > 0);
    }
    // item 2b: todo número da matriz família × mês abre a carteira daquela família naquele mês, linha a linha (carteira_linha, PREV FAT no mês)
    const LIN = {};
    for (const l of (cartLin || [])) {
      if (!DATA_OK.test(String(l.prev_fat))) continue;
      const m = String(l.prev_fat).slice(0, 7), f = famDe(l.marca), k = ((NOMEF[f] || {}).nome || f) + "|" + m;
      (LIN[k] = LIN[k] || []).push({ modelo: l.descricao || l.referencia, ref: l.referencia, cor: l.cor || "", cor_nome: cores.get(l.referencia + "|" + (l.cor || "")) || l.cor || "", pares: +l.cart || 0,
                                     valor: +l.valor_total || (+l.cart * +(l.preco_unit || 0)) || 0, prev_fat: String(l.prev_fat).slice(0, 10) });
    }
    for (const k of Object.keys(LIN)) LIN[k].sort((a, b) => a.prev_fat < b.prev_fat ? -1 : a.prev_fat > b.prev_fat ? 1 : b.pares - a.pares);
    // ---------- giro (já vem só tênis OLY do banco) + cobertura: último mês COM estoque ÷ média dos 3 meses fechados — "—" quando falta
    const g = (doc.giro || []).filter(x => MES_OK.test(String(x.mes))).map(x => ({ mes: String(x.mes).slice(0, 7), v: x.v || 0, e: x.e, parcial: String(x.mes).slice(0, 7) >= hoje }));
    const fech = g.filter(x => !x.parcial), tres = fech.slice(-3), media = tres.length ? tres.reduce((s, x) => s + x.v, 0) / tres.length : 0;
    const comE = g.filter(x => x.e != null), ue = comE[comE.length - 1] || null;
    const giro = { recorte: doc.giro_recorte || "tênis Olympikus · AG consolidada", rotulo: "tênis OLY", serie: g.slice(-12), estoque: ue ? ue.e : null, estoque_mes: ue ? ue.mes : null,
                   cobertura: ue && media ? ue.e / media : null, cobertura_base: ue ? `estoque de ${mesBR(ue.mes)} · média dos ${tres.length} meses fechados` : "sem estoque no banco" };
    // ---------- produtos (modelo + cor): drill do PICASSO (3 meses fechados, igual ao cartão) + carteira_linha + disponível + fora de linha
    const FORA = new Set((situ || []).filter(s => /^OLY/i.test(s.marca || "OLY")).map(s => s.referencia));
    const aba = BRUTO.drillAba && BRUTO.drillAba.tipo !== "tenis" ? BRUTO.drillAba : null, itensDrill = aba ? aba.itens : (drill || []), famAba = aba ? aba.fam : "OLY FOOTWEAR";
    const marcasCart = MARCA_CART[famAba] || ["OLY"];
    const CL = new Map(), CR = new Map();                                             // carteira do cliente por ref|cor e por ref (AG sem cor soma as cores)
    for (const l of (cartLin || [])) { if (!marcasCart.includes(l.marca)) continue; const k = l.referencia + "|" + (l.cor || ""), v = +l.valor_total || (+l.cart * +(l.preco_unit || 0)) || 0;
      const a = CL.get(k) || { cart: 0, valor: 0, p1: null }; a.cart += +l.cart || 0; a.valor += v; if (l.prev_fat && (!a.p1 || l.prev_fat < a.p1)) a.p1 = l.prev_fat; CL.set(k, a);
      const b = CR.get(l.referencia) || { cart: 0, valor: 0, p1: null }; b.cart += +l.cart || 0; b.valor += v; if (l.prev_fat && (!b.p1 || l.prev_fat < b.p1)) b.p1 = l.prev_fat; CR.set(l.referencia, b); }
    const DI = new Map(), DR = new Map();                                             // disponível para aporte (volume e data; nunca a origem)
    for (const d of (dispo || [])) { const k = d.referencia + "|" + (d.cor || ""); const a = DI.get(k) || { pares: 0, data: null }; a.pares += +d.cart || 0; if (d.prev_fat && (!a.data || d.prev_fat < a.data)) a.data = d.prev_fat; DI.set(k, a);
      const b = DR.get(d.referencia) || { pares: 0, data: null }; b.pares += +d.cart || 0; if (d.prev_fat && (!b.data || d.prev_fat < b.data)) b.data = d.prev_fat; DR.set(d.referencia, b); }
    const P = itensDrill.map(r => { const c = r.cor ? (CL.get(r.referencia + "|" + r.cor) || { cart: 0, valor: 0, p1: null }) : (CR.get(r.referencia) || { cart: 0, valor: 0, p1: null }), d = r.cor ? DI.get(r.referencia + "|" + r.cor) : DR.get(r.referencia);
      return { modelo: r.produto, cor: r.cor || "", cor_nome: r.cor ? (cores.get(r.referencia + "|" + r.cor) || r.cor) : "todas as cores", ref: r.referencia, venda: r.venda_media != null ? Math.round(r.venda_media) : null, estoque: r.estoque,
               giro: r.giro, cobertura: r.cobertura != null ? Math.round(r.cobertura * 10) / 10 : null, carteira: c.cart, valor: Math.round(c.valor), primeiro_fat: c.p1 || null,
               disponivel: d && d.pares > 0 ? { pares: d.pares, data: d.data } : null, fora_linha: FORA.has(r.referencia), base: r.base }; });
    const meta_d = (itensDrill && itensDrill.meta) || {}, txtBase = meta_d.nota || "";
    const top = P.filter(r => (r.venda || 0) >= 40 && r.giro != null && !r.fora_linha).sort((a, b) => b.giro - a.giro).slice(0, 10);
    const aporte = P.filter(r => r.cobertura != null && r.cobertura < 5 && (r.venda || 0) >= 20 && (!r.fora_linha || r.disponivel)).sort((a, b) => (a.cobertura >= 4) - (b.cobertura >= 4) || b.venda - a.venda);
    const baixo = P.filter(r => r.giro != null && r.giro <= 20 && r.carteira > 0).sort((a, b) => b.carteira - a.carteira);
    const tabela = P.filter(r => (r.venda || 0) > 0).sort((a, b) => b.venda - a.venda).slice(0, 20);
    const fx = { alto: { modelos: 0, pares: 0, valor: 0 }, medio: { modelos: 0, pares: 0, valor: 0 }, baixo: { modelos: 0, pares: 0, valor: 0 }, novo: { modelos: 0, pares: 0, valor: 0 } };
    for (const r of P) { if (!(r.carteira > 0)) continue; const k = r.giro == null ? "novo" : r.giro >= 30 ? "alto" : r.giro <= 20 ? "baixo" : "medio"; fx[k].modelos++; fx[k].pares += r.carteira; fx[k].valor += r.valor; }
    const produtos = { base: `${meta_d.nome || "tênis Olympikus"} · AG consolidada · ${txtBase}`, top_base: "venda ≥ 40/mês, em linha, por giro", top, aporte, baixo, tabela, faixas: fx,
                       novos: { modelos: fx.novo.modelos, pares: fx.novo.pares }, fora_sem_dispo: [...new Set(P.filter(r => r.fora_linha && r.cobertura != null && r.cobertura < 5 && (r.venda || 0) >= 20 && !r.disponivel).map(r => r.modelo))].sort(), aba: aba ? aba.tipo : "tenis" };
    // cobertura por produto (só tênis OLY): lista das faixas (≥ 20/mês, corte do v19), % do estoque por faixa (todos) e a ponta de estoque (raio-x do NÚCLEO)
    // critério das barras (NÚCLEO 28/10, pedido do Léo na demo — o CHALLENGER 5 fora de linha aparecia em ruptura): antes da régua, sai das barras
    // quem está fora de linha (→ PONTA); entra numa barra só quem vende ≥ 12/mês (3 meses fechados) E está na curva dos 80% da venda de 12 meses
    // da família no cliente; o TETO exige estoque ≥ 24. Venda 0 e estoque 0 não têm cobertura (sem base). É proposta do NÚCLEO; o Léo veta.
    const V12 = new Map(); for (const r of (giro12 || [])) { const k = r.referencia + "|" + (r.cor || ""); V12.set(k, (V12.get(k) || 0) + (+r.venda || 0)); }
    const ordC = [...V12.entries()].sort((a, b) => b[1] - a[1]), tot12 = ordC.reduce((s, [, v]) => s + v, 0), NACURVA = new Set(); let acc = 0;
    for (const [k, v] of ordC) { if (acc / tot12 < 0.8) NACURVA.add(k); acc += v; }
    const temCurva = tot12 > 0, PISO = 12, EST_TETO = 24;
    const PT = (drill || []).map(r => { const k = r.referencia + "|" + (r.cor || ""), venda = r.venda_media != null ? Math.round(r.venda_media) : null, cob = r.cobertura != null ? Math.round(r.cobertura * 10) / 10 : null, fora = FORA.has(r.referencia);
      const na_curva = !temCurva || NACURVA.has(k), relevante = (venda || 0) >= PISO && na_curva && !(cob != null && cob >= 5 && (r.estoque || 0) < EST_TETO);
      return { modelo: r.produto, cor: r.cor ? (cores.get(k) || r.cor) : "todas as cores", ref: r.referencia, venda, estoque: r.estoque, cobertura: cob, giro: r.giro,
               carteira: r.cor ? (CL.get(k) || {}).cart || 0 : (CR.get(r.referencia) || {}).cart || 0, fora_linha: fora, na_curva, relevante }; });
    const totEst = ((drill || {}).meta || {}).total_estoque || PT.reduce((s, r) => s + (r.estoque || 0), 0) || 0;
    const naBarra = PT.filter(r => !r.fora_linha && r.relevante && r.cobertura != null);
    const fx2 = (fn) => { const p = naBarra.filter(fn).reduce((s, r) => s + (r.estoque || 0), 0); return { pares: p, pct: totEst ? p / totEst * 100 : null }; };
    const foraBarra = PT.filter(r => !(!r.fora_linha && r.relevante && r.cobertura != null)).reduce((s, r) => s + (r.estoque || 0), 0);
    const cobertura = { itens: naBarra, base: `${((drill || {}).meta || {}).nota || ""} · entra na barra quem vende ${PISO}+/mês e está nos 80% da venda de 12 meses · fora de linha vai à ponta · teto só com estoque ≥ ${EST_TETO} · regra do NÚCLEO (28/10)`,
                        faixas: { ruptura: fx2(r => r.cobertura < 4), forcar: fx2(r => r.cobertura >= 4 && r.cobertura < 5), teto: fx2(r => r.cobertura >= 5), sem_base: { pares: foraBarra, pct: totEst ? foraBarra / totEst * 100 : null } },
                        fora_barra: { ponta: PT.filter(r => r.fora_linha).length, irrelevantes: PT.filter(r => !r.fora_linha && !r.relevante).length, sem_base: PT.filter(r => !r.fora_linha && r.relevante && r.cobertura == null).length } };
    // ponta de estoque: o raio-x do NÚCLEO + os fora de linha com estoque (não estão em ruptura: não há o que antecipar de produto que saiu de linha)
    {
      const itRX = (ponta && ponta.ponta && Array.isArray(ponta.ponta.itens)) ? ponta.ponta.itens.filter(x => /^OLY[ _]FTW/i.test(x.marca || "") && !x.excluido).map(x => ({ modelo: x.desc, cor: x.cor || "", ref: x.ref, venda: x.venda_mes, estoque: x.estoque || 0, situacao: x.situacao || "", leitura: x.sugestao || "", sem_faturar_desde: x.sem_fat_desde || "" })) : [];
      const ja = new Set(itRX.map(x => x.ref + "|" + (x.cor || "")));
      const itFL = PT.filter(r => r.fora_linha && (r.estoque || 0) > 0 && !ja.has(r.ref + "|" + (r.cor === "todas as cores" ? "" : r.cor))).map(r => ({ modelo: r.modelo, cor: r.cor === "todas as cores" ? "" : r.cor, ref: r.ref, venda: r.venda, estoque: r.estoque || 0, situacao: "fora de linha", leitura: "fora de linha: ponta, não ruptura" + (r.carteira ? ` · carteira ${r.carteira}` : ""), sem_faturar_desde: "" }));
      const it = itRX.concat(itFL).sort((a, b) => b.estoque - a.estoque);
      if (it.length) { const pares = it.reduce((s, x) => s + (x.estoque || 0), 0), tot = totEst || giro.estoque || 0;
        cobertura.ponta = { pares, pct: tot ? pares / tot * 100 : null, modelos: it.length, itens: it, base: `${itRX.length ? `raio-x do NÚCLEO (ponta de estoque${ponta.ponta_em ? ", lido em " + dtBR(ponta.ponta_em) : ""}) + ` : ""}fora de linha pelo cadastro (${itFL.length} modelos-cor) · tênis Olympikus · fora da lista o que está na coleção 1S27 e a lista manual` }; }
    }
    // ---------- O QUE DECIDIR (v_decidir_cliente, regras do NÚCLEO): as linhas da view primeiro (a 1ª é a manchete), depois o resto do TOPICS do cliente
    const t = MODO_CLIENTE ? {} : (doc.topics || {}), bloco = String(t.bloco || perfil.bloco_topics || "");
    const limpa = s => { const b = bloco.trim(); let x = String(s || "").trim(); if (b && x.toUpperCase().startsWith(b.toUpperCase())) x = x.slice(b.length).replace(/^\s*[-–:·]\s*/, ""); return x; };
    const linhas = MODO_CLIENTE ? [] : (DEC || []).filter(l => idOk(l.id)).map(l => ({
      id: /^(r\d|reg|trade:)/.test(l.id) ? "dec:" + l.id : l.id, texto: limpa(l.texto), urgente: !!l.urgente, criado_em: DATA_OK.test(String(l.base_em)) ? String(l.base_em).slice(0, 10) : null, bloco: "",
      regra: l.regra, fonte: fonteTela(l.fonte), numero: l.numero, unidade: l.unidade, valor_rs: l.valor_rs, da_view: true }));
    const jaTem = new Set(linhas.map(l => l.id));
    const itens = (t.itens || []).filter(i => !i.feito_em && !i.feito && idOk(i.id) && !jaTem.has(i.id)).map(i => ({ id: i.id, texto: limpa(i.txt || i.texto), urgente: !!i.alerta, criado_em: i.criado_em || i.data || null, bloco: "", sub: i.sub || "", prazo: i.prazo || null, dono: i.dono || "" }));
    const decidir_todos = linhas.concat(itens), decidir = decidir_todos.slice(0, 4), topics_pendentes = MODO_CLIENTE ? 0 : (t.pendentes != null ? +t.pendentes : itens.length + linhas.filter(l => !/^dec:/.test(l.id)).length);   // v19: 4 itens na tela + "N no TOPICS" (GAMER)
    const pri = linhas[0] ? { titulo: linhas[0].texto, detalhe: `${linhas[0].fonte}${dtBR(linhas[0].criado_em) ? " · base " + dtBR(linhas[0].criado_em) : ""}` }   // GAMER: o código da regra (R1…) não vai à tela do Caio
             : MODO_CLIENTE ? undefined : { titulo: "Sem decisão apontada pelas regras do NÚCLEO", detalhe: "nada na carteira marcada, meta do mês, trade, ruptura ou TOPICS" };
    // ---------- ação de trade em andamento: a faixa da casca (v19) + o ritmo (trade_acao_deck) para a agenda e o decidir
    const acoesDoc = ((doc.trade || {}).acoes || []).filter(a => a && a.status === "em andamento");
    const deckA = ((deck || {}).acoes || []).filter(a => a && a.status === "em andamento");
    const a0 = acoesDoc[0] || deckA[0] || null, d0 = a0 ? (deckA.find(x => x.id === a0.id) || deckA[0] || {}) : {};
    const trade = a0 ? { id: a0.id, titulo: a0.titulo || a0.mecanica || "ação de trade", periodo: a0.periodo || "", inicio: DATA_OK.test(String(a0.periodo_ini)) ? a0.periodo_ini : null, fim: DATA_OK.test(String(a0.periodo_fim)) ? a0.periodo_fim : null,
                         investimento: MODO_CLIENTE ? null : (a0.provisionado != null ? +a0.provisionado : a0.verba != null ? +a0.verba : null), meta_pares: a0.meta_pares || d0.meta_pares || null, mecanica: a0.mecanica || "",
                         ritmo_base: (d0.produtos || []).length ? (d0.produtos || []).reduce((s, p) => s + (+p.vm || 0), 0) / 30 : null, produtos: (d0.produtos || []).map(p => ({ modelo: p.modelo, est: p.est, vm: p.vm })) } : null;
    // ---------- agenda: atas (internas) + prazos com data do TOPICS (internos) + fim e apuração da ação de trade (vale para o cliente também)
    const agenda = [], atas = [];
    if (!MODO_CLIENTE) {
      for (const a of (doc.atas || [])) if (DATA_OK.test(String(a.data))) { atas.push({ data: String(a.data).slice(0, 10), titulo: a.titulo }); if (atas.length <= 5) agenda.push({ data: String(a.data).slice(0, 10), titulo: a.titulo, onde: a.assunto || "", tipo: "reuniao", link: "../#aba=atas&cliente=" + encodeURIComponent(cliente) }); }
      for (const ev of prazosTopics(t.itens || [], hojeD)) agenda.push(Object.assign(ev, { tipo: "marco" }));
      const rxb = ((doc.raio_x || {}).base_em); if (rxb && DATA_OK.test(String(rxb))) agenda.push({ data: String(rxb).slice(0, 10), titulo: "Raio-X do cliente (análise)", onde: "AG", tipo: "analise", link: "../#aba=raiox&cliente=" + encodeURIComponent(cliente) });
    }
    if (trade && trade.fim) { agenda.push({ data: trade.fim, titulo: "Fim da ação: " + trade.titulo, onde: "trade", tipo: "trade" }); const ap = new Date(new Date(trade.fim).getTime() + 864e5).toISOString().slice(0, 10); agenda.push({ data: ap, titulo: "Apuração da ação de trade pelo sell-out", onde: "trade", tipo: "trade" }); }
    const tetoAg = new Date(Date.now() + 548 * 864e5).toISOString().slice(0, 10);   // janela sã: de jan/24 a 18 meses à frente (uma ata com data digitada errada, 2030, puxava o calendário)
    for (let i = agenda.length - 1; i >= 0; i--) if (!(agenda[i].data >= "2024-01-01" && agenda[i].data <= tetoAg)) agenda.splice(i, 1);
    // ---------- anos: sell-in × sell-out × meta × estoque, pelo filtro
    const anos = montarAnos(filtro, sellin, rx, MODO_CLIENTE ? [] : meta, MODO_CLIENTE ? [] : hist, g, BRUTO.cartFam || []);   // modo cliente: sem a meta rateada do Léo (BOSS)
    const temMeta = !MODO_CLIENTE && meta.some(r => r.meta_cliente != null);
    // ---------- metas do cliente (v19): mês × família [meta, potencial, pct, gap] + trimestre corrente; participação por família (R$, faturado + carteira)
    let metas = undefined, participacao = undefined;
    if (temMeta) {
      const corte = hoje.slice(0, 4) + "-" + String(Math.floor((+hoje.slice(5, 7) - 1) / 3) * 3 + 1).padStart(2, "0"), meses = {};
      for (const r of meta) { const m = String(r.mes).slice(0, 7); if (!MES_OK.test(m) || m < corte || r.meta_cliente == null) continue;
        const M = meses[m] = meses[m] || {}; const k = FAIXAS_TENIS.includes(r.chave) ? "TT CALCADOS (soma das faixas)" : r.chave;
        const x = M[k] = M[k] || [0, 0, null, 0]; x[0] += +r.meta_cliente; x[1] += +(r.potencial || 0); }
      for (const M of Object.values(meses)) { for (const x of Object.values(M)) { x[2] = x[0] > 0 ? Math.round(x[1] / x[0] * 100) : null; x[3] = Math.round(x[1] - x[0]); } if (!M.CFOLY) M.CFOLY = [0, 0, null, 0]; }
      const ks = Object.keys(meses).sort(), q = Math.floor((+hoje.slice(5, 7) - 1) / 3) + 1, trimestres = {};
      if (ks.length) trimestres[hoje.slice(0, 4) + "-T" + q] = { nome: q + "º TRI", meses: ks.filter(m => m >= corte).slice(0, 3) };
      const lida = meta.length ? dtBR(meta[meta.length - 1].meta_lida_em) : null;
      metas = meta_direta
        ? { atual: meses[hoje] ? hoje : ks[0], meses, trimestres, base: `${meta_direta} · inclui conta própria da CMS (~1%) · potencial = faturado + carteira do mês${lida ? " · carta lida em " + lida : ""}`, sem_numero: "sem meta na carta para esta família", direta: true }
        : { atual: meses[hoje] ? hoje : ks[0], meses, trimestres, base: `meta do preposto dividida pela participação do cliente · potencial = faturado + carteira do mês · regra do NÚCLEO${lida ? " · carta lida em " + lida : ""}` };
    }
    // participação por família é o MIX do cliente (R$, faturado + carteira do mês): vale para todos, com ou sem meta rateada
    if (!MODO_CLIENTE && (MEF.por_mes || []).length) {
      const corte = hoje.slice(0, 4) + "-" + String(Math.floor((+hoje.slice(5, 7) - 1) / 3) * 3 + 1).padStart(2, "0"), q = Math.floor((+hoje.slice(5, 7) - 1) / 3) + 1;
      participacao = {}; const PFAM = { "OLY FOOTWEAR": "tenis", "OLY MEIAS": "meias", "OLY CHINELO": "chinelo", "OLY ACESSÓRIOS": "acess", "OLY CONFECÇÃO": "conf" };
      for (const pm of (MEF.por_mes || [])) { if (pm.mes < corte) continue; const x = participacao[pm.mes] = { tenis: 0, meias: 0, chinelo: 0, acess: 0, conf: 0, ua: 0 };
        for (const [f, v] of Object.entries(pm.familias || {})) { const k = /^UA/.test(f) ? "ua" : PFAM[f]; if (k) x[k] += v.valor || 0; } }
      const tk = hoje.slice(0, 4) + "-T" + q, msT = Object.keys(participacao).filter(m => /^\d{4}-\d{2}$/.test(m)).sort().slice(0, 3);
      if (msT.length) { const x = participacao[tk] = { tenis: 0, meias: 0, chinelo: 0, acess: 0, conf: 0, ua: 0 }; for (const m of msT) for (const k of Object.keys(x)) x[k] += ((participacao[m] || {})[k] || 0); }
      if (!metas) metas = { atual: participacao[hoje] ? hoje : msT[0], meses: {}, trimestres: { [tk]: { nome: q + "º TRI", meses: msT } }, base: "meta do vendedor responsável, não do Léo · sem número: o gráfico compara com o ano anterior", sem_meta: true };
    }
    // ---------- cabeçalho: CDs e lojas pelo GTM (NÚCLEO/Léo 27/10); sem GTM, "praças na AG: N" — nunca "lojas ativas" pela AG
    const pracas = ((doc.raio_x || {}).base || {}).lojas_ativas;
    const recorte = gtm ? [gtm.n_cd ? `${gtm.n_cd} CD${gtm.n_cd > 1 ? "s" : ""}${gtm.cidades_cd ? " (" + gtm.cidades_cd + ")" : ""}` : null,
                           gtm.n_lojas != null ? `${gtm.n_lojas} lojas${gtm.lojas_por_uf ? " (" + gtm.lojas_por_uf + ")" : ""}` : null,
                           gtm.data_foto ? "GTM " + dtBR(gtm.data_foto) : "GTM"].filter(Boolean).join(" · ")
                  : (pracas != null ? `praças na AG: ${pracas}` : "");
    const marcas = ["OLY"].concat(sellin.some(s => /^UA/i.test(s.marca)) || (BRUTO.cartFam || []).some(r => /^UA/i.test(r.marca)) ? ["UA"] : []);
    return {
      hoje: hojeD,
      cliente: { nome: perfil.nome || cliente, codigo: cod, lojas_ativas: null, recorte, marcas },
      agenda, atas, decidir, prioridade: pri, trade,
      carteira: { meses: cart, a_faturar: cart.filter(x => x.mes >= hoje).reduce((s, x) => s + x.cart, 0), valor: cartValor, recorte: "tênis Olympikus", familias, linhas: LIN,
                  outras: Object.entries(outras).map(([f, n]) => `${f} ${Math.round(n).toLocaleString("pt-BR")}`).join(" · "), base_em: baseMax, estado_lido_em: MEF.estado_lido_em || null, reserva: MEF.reserva || null },
      giro, cobertura, produtos, metas, participacao, anos, filtro,
      etiquetas: { sellin: "sell-in = faturado (EBM até jun/26 · DETALHADA por data de NF depois) · do mês corrente em diante soma a carteira a faturar (ponto vazado)", sellout: "sell-out pela AG do cliente",
                   meta: MODO_CLIENTE ? "meta: não mostrada nesta visão" : meta_direta ? meta_direta + " · losango" : temMeta ? "meta rateada por cliente · leitura nossa (a Vulcabras dá a meta ao preposto)" : "meta do vendedor responsável, não do Léo · sem número: o gráfico compara com o ano anterior",
                   estoque: "estoque na AG (tênis Olympikus)" },
      fontes: { sellout_ate: (() => { const sz = ((rx || {}).sazonal || {})["TÊNIS"]; const ms = sz ? Object.keys(sz.mensal || {}).filter(m => MES_OK.test(m)).sort() : []; return ms.length ? ms[ms.length - 1] : null; })(),
                sellin_ate: sellin.length ? String(sellin[sellin.length - 1].puxado_em).slice(0, 10) : null, meta_lida_em: meta.length ? String(meta[meta.length - 1].meta_lida_em).slice(0, 10) : null },
      sem_bloco_topics: !bloco, topics: decidir, decidir_todos, topics_pendentes, modo_cliente: MODO_CLIENTE, sem_meta: !temMeta,
      atualizado: { carteira: baseMax, sellin: sellin.length ? sellin[sellin.length - 1].puxado_em : null }
    };
  }

  // prazos do TOPICS com data: coluna prazo (AAAA-MM-DD ou dd/mm) e datas escritas no texto/nota ("02 a 05/11", "fatura 31/10", "1º/11")
  function prazosTopics(itens, hojeD) {
    const out = [], visto = new Set(), hoje = new Date(hojeD), anoH = hoje.getFullYear(), mesH = hoje.getMonth() + 1, lim = new Date(hoje.getTime() - 14 * 864e5);
    const anoDe = (m, aa) => aa ? (aa.length === 2 ? 2000 + +aa : +aa) : (m < mesH - 1 ? anoH + 1 : anoH);
    const iso = (d, m, a) => { if (m < 1 || m > 12 || d < 1 || d > 31) return null; const x = new Date(a, m - 1, d); return isNaN(x) ? null : `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; };
    const poe = (data, it, rot) => { if (!data || new Date(data) < lim) return; const k = it.id + "|" + data; if (visto.has(k)) return; visto.add(k); out.push({ data, titulo: String(it.txt || "").slice(0, 110), onde: (rot ? rot + " · " : "") + (it.sub || "TOPICS") }); };
    for (const it of itens) {
      if (it.feito) continue;
      const p = String(it.prazo || "").trim(); let m;
      if (/^\d{4}-\d{2}-\d{2}/.test(p)) poe(p.slice(0, 10), it, "prazo");
      else if ((m = p.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/))) poe(iso(+m[1], +m[2], anoDe(+m[2], m[3])), it, "prazo");
      const re = /(\d{1,2})(?:º)?(?:\s*(?:a|e|–|-)\s*(\d{1,2}))?\/(\d{1,2})(?:\/(\d{2,4}))?/g, txt = String(it.txt || "") + " " + String(it.nota || "");
      while ((m = re.exec(txt))) { const mm = +m[3]; if (mm < 1 || mm > 12) continue; const a = anoDe(mm, m[4]); poe(iso(+m[1], mm, a), it, m[2] ? `${m[1]}–${m[2]}/${String(mm).padStart(2, "0")}` : null); }
    }
    return out;
  }

  function montarAnos(f, sellin, rx, meta, hist, g, det) {
    f = Object.assign({}, f, { tipo: ALIAS[f.tipo] || f.tipo || "tenis" });
    const anos = [...new Set([...sellin.map(s => s.mes.slice(0, 4)), ...Object.keys(((rx || {}).sazonal || {})["TÊNIS"] ? (rx.sazonal["TÊNIS"].mensal || {}) : {}).filter(m => MES_OK.test(m)).map(m => m.slice(0, 4))])].filter(a => /^\d{4}$/.test(a)).sort();
    const vazio = () => Object.fromEntries(anos.map(a => [a, Array(12).fill(null)]));
    const S = vazio(), O = vazio(), M = vazio(), E = vazio(), SC = vazio(), ehTipo = TIPO_MARCA[f.tipo] || TIPO_MARCA.tenis, marcas = f.marca && f.marca.length ? f.marca : ["OLY", "UA"];
    const cats = f.categoria || [], gens = f.genero || [];
    const catOk = faixa => !cats.length || cats.includes(faixa);
    const genOk = faixa => !gens.length || (gens.includes("MASCULINO") && faixa === "CONF_MASC") || (gens.includes("FEMININO") && faixa === "CONF_FEM") || (gens.includes("INFANTIL") && faixa === "INFANTIL") || !["CONF_MASC", "CONF_FEM", "INFANTIL"].includes(faixa);
    // sell-in (EBM): mês × marca × faixa; só tênis responde a categoria/gênero
    for (const s of sellin) {
      if (!ehTipo(s.marca) || !marcas.includes(marcaDe(s.marca))) continue;
      if (f.tipo === "tenis" && marcaDe(s.marca) === "OLY" && (!catOk(s.faixa) || !genOk(s.faixa))) continue;
      const [a, m] = [s.mes.slice(0, 4), +s.mes.slice(5, 7) - 1]; if (!S[a]) continue; S[a][m] = (S[a][m] || 0) + (+s.pares || 0);
    }
    const ultEBM = sellin.length ? sellin[sellin.length - 1].mes.slice(0, 7) : "0000-00";
    const dH = new Date(), hojeM = dH.getFullYear() + "-" + String(dH.getMonth() + 1).padStart(2, "0");
    for (const r of det) {
      const m = String(r.mes).slice(0, 7); if (!MES_OK.test(m) || !ehTipo(r.marca) || !marcas.includes(marcaDe(r.marca))) continue;
      const usaFat = m > ultEBM, usaCart = m >= hojeM; if (!usaFat && !usaCart) continue;   // faturado: só onde o EBM ainda não chegou; carteira: do mês corrente em diante (o EBM não a tem)
      const fx = String(r.faixa || "").toUpperCase() === "VISUAL" ? "CONF_MASC" : String(r.faixa || "").toUpperCase();
      if (f.tipo === "tenis" && marcaDe(r.marca) === "OLY" && (!catOk(fx) || !genOk(fx))) continue;
      const [a, mi] = [m.slice(0, 4), +m.slice(5, 7) - 1]; if (!S[a]) continue;
      if (usaFat && r.pares_fat) S[a][mi] = (S[a][mi] || 0) + (+r.pares_fat || 0);
      // Léo 28/10 (demo, item 3a): "o sell-in morre em outubro, e não pode — a carteira futura conta como sell-in". Do mês corrente em diante
      // a linha segue com faturado + carteira (PREV FAT no mês), e o ponto vai vazado (sellin_carteira > 0 = inclui carteira). Mês fechado: só faturado.
      if (usaCart && r.pares_cart) { SC[a][mi] = (SC[a][mi] || 0) + (+r.pares_cart || 0); S[a][mi] = (S[a][mi] || 0) + (+r.pares_cart || 0); }
    }
    // sell-out (AG, raio-x): família do tipo; tênis por categoria (categorias) ou gênero (subs) quando pedido
    const SZ = (rx || {}).sazonal || {};
    for (const fam of Object.keys(SZ)) {
      const ehUA = /^UA/i.test(fam); if (!(TIPO_FAM[f.tipo] || TIPO_FAM.tenis).test(fam) || !marcas.includes(ehUA ? "UA" : "OLY")) continue;
      let serie = SZ[fam].mensal || {};
      if (f.tipo === "tenis" && !ehUA && cats.length && SZ[fam].categorias) { serie = {}; for (const c of cats) for (const [m, v] of Object.entries(SZ[fam].categorias[CAT_SAZ[c]] || {})) serie[m] = (serie[m] || 0) + v; }
      else if ((f.tipo === "tenis" || f.tipo === "meias") && !ehUA && gens.length && SZ[fam].subs) { serie = {}; for (const gn of gens) for (const [m, v] of Object.entries(SZ[fam].subs[gn] || {})) serie[m] = (serie[m] || 0) + v; }
      for (const [m, v] of Object.entries(serie)) { if (!MES_OK.test(m)) continue; const a = m.slice(0, 4); if (O[a]) O[a][+m.slice(5, 7) - 1] = (O[a][+m.slice(5, 7) - 1] || 0) + v; }
    }
    // meta rateada: v_meta_cliente (trimestre corrente, potencial) e v_meta_cliente_hist (antes, faturado); por chave do tipo
    const chaveOk = k => (TIPO_CHAVE[f.tipo] || TIPO_CHAVE.tenis)(k) && marcas.includes(/^UA|TT FTW_UA/.test(k) ? "UA" : "OLY") && (f.tipo !== "tenis" || /^UA|TT FTW_UA/.test(k) || (catOk(k) && genOk(k)));
    const hojeD = new Date(), corte = hojeD.getFullYear() + "-" + String(Math.floor(hojeD.getMonth() / 3) * 3 + 1).padStart(2, "0");   // 1º mês do trimestre corrente
    for (const r of hist) { if (!MES_OK.test(String(r.mes)) || r.mes.slice(0, 7) >= corte || !chaveOk(r.chave) || r.meta_cliente == null) continue; const a = r.mes.slice(0, 4); if (M[a]) M[a][+r.mes.slice(5, 7) - 1] = (M[a][+r.mes.slice(5, 7) - 1] || 0) + (+r.meta_cliente); }
    for (const r of meta) { if (!MES_OK.test(String(r.mes)) || r.mes.slice(0, 7) < corte || !chaveOk(r.chave) || r.meta_cliente == null) continue; const a = r.mes.slice(0, 4); if (M[a]) M[a][+r.mes.slice(5, 7) - 1] = (M[a][+r.mes.slice(5, 7) - 1] || 0) + (+r.meta_cliente); }
    // estoque: só tênis Olympikus (é o que o banco tem por mês); fica nulo nos outros tipos para não mentir
    if (f.tipo === "tenis" && marcas.includes("OLY") && !cats.length && !gens.length) for (const x of g) { const a = x.mes.slice(0, 4); if (E[a] && x.e != null) E[a][+x.mes.slice(5, 7) - 1] = x.e; }
    return { lista: anos, sellin: S, sellin_carteira: SC, sellout: O, meta: M, estoque: E, unidade: f.tipo === "meias" ? "packs" : (f.tipo === "acessorio" || f.tipo === "confeccao") ? "peças" : "pares" };
  }

  const mesBR = m => ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][+String(m).slice(5, 7) - 1] + "/" + String(m).slice(2, 4);
  return { sb, sessao, entrar, sair, clientes, carregar, refiltrar: montar, giroAba, MODO_CLIENTE, mesBR };
})();
