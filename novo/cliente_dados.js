// Gestor · Cliente (novo) — a CAMADA DE DADOS (TI, 27–28/10/2026). Tudo vem do banco com o login; nada embutido. Monta o objeto
// DADOS do contrato combinado com o PICASSO e chama desenhar(DADOS). Fontes: clientes_lista · cliente_consulta (perfil, carteira,
// giro só tênis OLY + recorte, TOPICS, atas, raio_x) · raio_x_consulta (sazonal: sell-out por família, categoria e gênero) ·
// v_sellin_mensal (sell-in pelo EBM, faixa pela referência) · v_meta_cliente + v_meta_cliente_hist (meta rateada por cliente) ·
// v_decidir_cliente (0087: "O QUE DECIDIR", regras R0–R5 do NÚCLEO; a linha 1 é a manchete) · v_cliente_gtm (0087/0088: CDs e lojas
// pelo GTM, nunca pela contagem de praças da AG) · trade_acao_deck (ação em andamento: meta, período, ritmo).
// Regras: a API corta em 1.000 linhas (consultas com .range em laço); chinelo nunca entra no tênis; meia em packs; a página de um
// cliente nunca cita outro cliente; cobertura "—" sem dado; modo cliente (?modo=cliente) sem TOPICS, agenda interna, meta e gravação.
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
  const idOk = s => /^[\w.:-]{1,80}$/.test(String(s || ""));                       // id do TOPICS vai para dentro de onclick na casca: só caracteres seguros
  let BRUTO = null;                                                                 // o que veio do banco para o cliente atual (o filtro recalcula em cima)

  async function tudo(q) {                                                          // a API corta em 1.000 linhas: lê em páginas
    const out = []; for (let i = 0; ; i += 1000) { const { data, error } = await q.range(i, i + 999); if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) break; } return out;
  }
  const semErro = q => Promise.resolve().then(() => tudo(q)).catch(() => []);        // fonte acessória: se falhar, a página não cai (fica "sem dado")
  async function sessao() { const { data: { session } } = await sb.auth.getSession(); return session; }
  async function entrar(email, senha) { const { error } = await sb.auth.signInWithPassword({ email, password: senha }); return error ? error.message : null; }
  async function sair() { await sb.auth.signOut({ scope: "local" }); location.reload(); }   // GAMER 27/10: o escopo padrão (global) derrubava a sessão dele em TODOS os aparelhos
  async function clientes() { const { data, error } = await sb.rpc("clientes_lista"); if (error) throw error; return (data || []).map(c => ({ cliente: c.cliente, nome: c.nome })); }

  async function carregar(cliente) {
    const hojeMes = new Date().toISOString().slice(0, 7) + "-01";
    const [doc, rx, sellin, meta, hist, decidir, gtm, deck] = await Promise.all([
      sb.rpc("cliente_consulta", { p_cliente: cliente }).then(r => { if (r.error) throw r.error; return r.data; }),
      sb.rpc("raio_x_consulta", { p_cliente: cliente }).then(r => r.error ? null : r.data),
      tudo(sb.from("v_sellin_mensal").select("mes,marca,faixa,pares,valor,unidade,puxado_em").eq("cliente", cliente).order("mes")),
      tudo(sb.from("v_meta_cliente").select("mes,chave,unidade,meta_cliente,faturado,carteira,potencial,etiqueta,base_em,meta_lida_em").eq("cliente", cliente).order("mes")),
      tudo(sb.from("v_meta_cliente_hist").select("mes,chave,unidade,meta_cliente,faturado,base").eq("cliente", cliente).order("mes")),
      semErro(sb.from("v_decidir_cliente").select("ordem,regra,id,texto,numero,unidade,valor_rs,fonte,base_em,urgente,bloco").eq("cliente", cliente).order("ordem")),
      semErro(sb.from("v_cliente_gtm").select("n_cd,cidades_cd,n_lojas,ufs,lojas_por_uf,data_foto").eq("cliente", cliente)),
      sb.rpc("trade_acao_deck", { p_cliente: cliente }).then(r => r.error ? null : r.data, () => null),
    ]);
    BRUTO = { cliente, doc, rx, sellin: sellin.filter(s => MES_OK.test(String(s.mes))), meta, hist, decidir, gtm: gtm[0] || null, deck, cartFam: [] };
    BRUTO.cartFam = await tudo(sb.from("venda_mensal").select("mes,marca,faixa,pares_fat,pares_cart,base_em").eq("cliente", cliente).eq("fonte", "DETALHADA").gte("mes", "2026-07-01"));
    void hojeMes;
    return montar({ marca: ["OLY"], tipo: "tenis", genero: [], categoria: [] });
  }

  // ---------- o objeto DADOS a partir do bruto + filtro
  function montar(filtro) {
    const { cliente, doc, rx, sellin, meta, hist, decidir: DEC, gtm, deck } = BRUTO, perfil = doc.perfil || {};
    const hoje = new Date().toISOString().slice(0, 7), hojeD = new Date().toISOString().slice(0, 10);
    // carteira por família (venda_mensal, DETALHADA): tênis OLY é o número; as outras ao lado, na unidade delas (chinelo nunca no total do tênis)
    const FAM = m => /^OLY$/i.test(m) ? "tênis OLY" : /^UA_TN$/i.test(m) ? "tênis UA" : /^MEOLY$|^UA_ME$/i.test(m) ? "meias (packs)" : /^CHOLY$|^UA_CH$/i.test(m) ? "chinelo" : /^ACOLY$|^UA_AC$/i.test(m) ? "acessórios (peças)" : "confecção (peças)";
    const porMesFam = {}, outras = {};
    for (const r of (BRUTO.cartFam || [])) { const m = String(r.mes).slice(0, 7), f = FAM(r.marca); if (m < hoje) continue; porMesFam[m] = porMesFam[m] || {}; porMesFam[m][f] = (porMesFam[m][f] || 0) + (r.pares_cart || 0); if (f !== "tênis OLY") outras[f] = (outras[f] || 0) + (r.pares_cart || 0); }
    const cart = (doc.carteira || []).map(x => ({ mes: String(x.mes).slice(0, 7), fat: x.fat || 0, cart: (porMesFam[String(x.mes).slice(0, 7)] || {})["tênis OLY"] || 0, cart_todas: x.cart || 0, base_em: x.base_em }));
    const baseMax = cart.reduce((m, x) => (x.base_em && (!m || x.base_em > m)) ? x.base_em : m, null); for (const x of cart) x.base_em = baseMax;   // a base da carteira é UMA, a leitura mais nova
    // giro (já vem só tênis OLY do banco) + cobertura: último mês COM estoque ÷ média dos 3 meses fechados — "—" quando falta
    const g = (doc.giro || []).filter(x => MES_OK.test(String(x.mes))).map(x => ({ mes: String(x.mes).slice(0, 7), v: x.v || 0, e: x.e, parcial: String(x.mes).slice(0, 7) >= hoje }));
    const fech = g.filter(x => !x.parcial), tres = fech.slice(-3), media = tres.length ? tres.reduce((s, x) => s + x.v, 0) / tres.length : 0;
    const comE = g.filter(x => x.e != null), ue = comE[comE.length - 1] || null;
    const giro = { recorte: doc.giro_recorte || "tênis Olympikus · AG consolidada", serie: g.slice(-12), estoque: ue ? ue.e : null, estoque_mes: ue ? ue.mes : null,
                   cobertura: ue && media ? ue.e / media : null, cobertura_base: ue ? `estoque de ${mesBR(ue.mes)} · média dos ${tres.length} meses fechados` : "sem estoque no banco" };
    // O QUE DECIDIR (v_decidir_cliente, regras do NÚCLEO): as linhas da view primeiro (a 1ª é a manchete), depois o resto do TOPICS do cliente
    const t = MODO_CLIENTE ? {} : (doc.topics || {}), bloco = String(t.bloco || perfil.bloco_topics || "");
    const limpa = s => { const b = bloco.trim(); let x = String(s || "").trim(); if (b && x.toUpperCase().startsWith(b.toUpperCase())) x = x.slice(b.length).replace(/^\s*[-–:·]\s*/, ""); return x; };
    const dtBR = d => d && DATA_OK.test(String(d)) ? String(d).slice(8, 10) + "/" + String(d).slice(5, 7) : null;
    const linhas = MODO_CLIENTE ? [] : (DEC || []).filter(l => idOk(l.id)).map(l => ({
      id: /^(r\d|trade:)/.test(l.id) ? "dec:" + l.id : l.id, texto: limpa(l.texto), urgente: !!l.urgente, criado_em: DATA_OK.test(String(l.base_em)) ? String(l.base_em).slice(0, 10) : null, bloco: "",
      regra: l.regra, fonte: l.fonte, numero: l.numero, unidade: l.unidade, valor_rs: l.valor_rs, da_view: true }));
    const jaTem = new Set(linhas.map(l => l.id));
    const itens = (t.itens || []).filter(i => !i.feito_em && !i.feito && idOk(i.id) && !jaTem.has(i.id)).map(i => ({ id: i.id, texto: limpa(i.txt || i.texto), urgente: !!i.alerta, criado_em: i.criado_em || i.data || null, bloco: "", sub: i.sub || "", prazo: i.prazo || null, dono: i.dono || "" }));
    const decidir = linhas.concat(itens);
    const pri = linhas[0] ? { titulo: linhas[0].texto, detalhe: `${linhas[0].regra} · ${linhas[0].fonte}${dtBR(linhas[0].criado_em) ? " · base " + dtBR(linhas[0].criado_em) : ""}` }
             : MODO_CLIENTE ? undefined : { titulo: "Sem decisão apontada pelas regras do NÚCLEO", detalhe: "nada na carteira marcada, meta do mês, trade, ruptura ou TOPICS (R0–R5)" };
    // ação de trade em andamento (trade_acao_deck): meta · período · média/dia necessária · ritmo-base (3 meses antes) · apuração no dia seguinte ao fim
    const acoes = ((deck || {}).acoes || []).filter(a => a && (a.status === "em andamento")).map(a => {
      const ini = DATA_OK.test(String(a.periodo_ini)) ? a.periodo_ini : null, fim = DATA_OK.test(String(a.periodo_fim)) ? a.periodo_fim : null;
      const dias = ini && fim ? Math.round((new Date(fim) - new Date(ini)) / 864e5) + 1 : null, restam = fim ? Math.max(0, Math.round((new Date(fim) - new Date(hojeD)) / 864e5)) : null;
      const vm = (a.produtos || []).reduce((s, p) => s + (+p.vm || 0), 0), ritmo = (a.produtos || []).length ? vm / 30 : null;
      const apur = fim ? new Date(new Date(fim).getTime() + 864e5).toISOString().slice(0, 10) : null;
      return { id: a.id, titulo: a.titulo, mecanica: a.mecanica || a.titulo, periodo: a.periodo || "", periodo_ini: ini, periodo_fim: fim, meta_pares: a.meta_pares || null, dias, restam,
               precisa_dia: a.meta_pares && dias ? Math.ceil(a.meta_pares / dias) : null, ritmo_base: ritmo, n_produtos: (a.produtos || []).length, produtos: (a.produtos || []).map(p => ({ modelo: p.modelo, est: p.est, vm: p.vm })),
               mes_giro: (deck || {}).mes || null, apuracao: apur, vendido: null };   // vendido: só na apuração (giro do período ainda não recebido)
    });
    // agenda: as últimas atas (internas) + prazos com data do TOPICS (internos) + fim e apuração da ação de trade (vale para o cliente também)
    const agenda = [];
    if (!MODO_CLIENTE) {
      for (const a of (doc.atas || []).slice(0, 5)) if (DATA_OK.test(String(a.data))) agenda.push({ data: String(a.data).slice(0, 10), titulo: a.titulo, onde: a.assunto || "" });
      for (const ev of prazosTopics(t.itens || [], hojeD)) agenda.push(ev);
    }
    for (const a of acoes) { if (a.periodo_fim) agenda.push({ data: a.periodo_fim, titulo: "Fim da ação: " + a.titulo, onde: "trade" }); if (a.apuracao) agenda.push({ data: a.apuracao, titulo: "Apuração da ação de trade pelo sell-out", onde: "trade" }); }
    // janela sã da agenda: de jan/24 a 18 meses à frente (uma ata com data digitada errada, 2030, puxava o calendário para lá)
    const tetoAg = new Date(Date.now() + 548 * 864e5).toISOString().slice(0, 10);
    for (let i = agenda.length - 1; i >= 0; i--) if (!(agenda[i].data >= "2024-01-01" && agenda[i].data <= tetoAg)) agenda.splice(i, 1);
    // anos: sell-in × sell-out × meta × estoque, pelo filtro
    const anos = montarAnos(filtro, sellin, rx, MODO_CLIENTE ? [] : meta, MODO_CLIENTE ? [] : hist, g, BRUTO.cartFam || []);   // modo cliente: sem a meta rateada do Léo (BOSS)
    const temMeta = !MODO_CLIENTE && meta.some(r => r.meta_cliente != null);
    // cabeçalho: CDs e lojas pelo GTM (NÚCLEO/Léo 27/10); sem GTM, "praças na AG: N" — nunca "lojas ativas" pela AG
    const pracas = ((doc.raio_x || {}).base || {}).lojas_ativas;
    const recorte = gtm ? [gtm.n_cd ? `${gtm.n_cd} CD${gtm.n_cd > 1 ? "s" : ""}${gtm.cidades_cd ? " (" + gtm.cidades_cd + ")" : ""}` : null,
                           gtm.n_lojas != null ? `${gtm.n_lojas} lojas${gtm.lojas_por_uf ? " (" + gtm.lojas_por_uf + ")" : ""}` : null,
                           gtm.data_foto ? "GTM " + dtBR(gtm.data_foto) : "GTM"].filter(Boolean).join(" · ")
                  : (pracas != null ? `praças na AG: ${pracas}` : "");
    return {
      cliente: { nome: perfil.nome || cliente, codigo: perfil.cod_lider || "", lojas_ativas: null, recorte },
      agenda, decidir, prioridade: pri, trade: { mes: (deck || {}).mes || null, acoes },
      carteira: { meses: cart, a_faturar: cart.filter(x => x.mes >= hoje).reduce((s, x) => s + x.cart, 0), recorte: "tênis Olympikus", outras: Object.entries(outras).map(([f, n]) => `${f} ${Math.round(n).toLocaleString("pt-BR")}`).join(" · "), base_em: baseMax },
      giro, anos, filtro,
      etiquetas: { sellin: "sell-in = faturado (EBM até jun/26 · DETALHADA por data de NF depois); carteira a faturar à parte", sellout: "sell-out pela AG do cliente",
                   meta: MODO_CLIENTE ? "meta: não mostrada nesta visão" : temMeta ? "meta rateada por cliente · leitura nossa (a Vulcabras dá a meta ao preposto)" : "meta do vendedor responsável, não do Léo · sem número: o gráfico compara com o ano anterior",
                   estoque: "estoque na AG (tênis Olympikus)" },
      fontes: { sellout_ate: (() => { const sz = ((rx || {}).sazonal || {})["TÊNIS"]; const ms = sz ? Object.keys(sz.mensal || {}).filter(m => MES_OK.test(m)).sort() : []; return ms.length ? ms[ms.length - 1] : null; })(),
                sellin_ate: sellin.length ? String(sellin[sellin.length - 1].puxado_em).slice(0, 10) : null, meta_lida_em: meta.length ? String(meta[meta.length - 1].meta_lida_em).slice(0, 10) : null },
      sem_bloco_topics: !bloco, topics: decidir, modo_cliente: MODO_CLIENTE, sem_meta: !temMeta,
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
    for (const r of det) {
      const m = String(r.mes).slice(0, 7); if (!MES_OK.test(m) || m <= ultEBM || !ehTipo(r.marca) || !marcas.includes(marcaDe(r.marca))) continue;
      const fx = String(r.faixa || "").toUpperCase() === "VISUAL" ? "CONF_MASC" : String(r.faixa || "").toUpperCase();
      if (f.tipo === "tenis" && marcaDe(r.marca) === "OLY" && (!catOk(fx) || !genOk(fx))) continue;
      const [a, mi] = [m.slice(0, 4), +m.slice(5, 7) - 1]; if (!S[a]) continue;
      if (r.pares_fat) S[a][mi] = (S[a][mi] || 0) + (+r.pares_fat || 0);
      if (r.pares_cart) SC[a][mi] = (SC[a][mi] || 0) + (+r.pares_cart || 0);   // NÚCLEO, 27/10: sell-in é só FATURADO; a carteira vai à parte (sellin_carteira), nunca somada
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
  return { sb, sessao, entrar, sair, clientes, carregar, refiltrar: montar, MODO_CLIENTE, mesBR };
})();
