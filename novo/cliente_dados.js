// Gestor · Cliente (novo) — a CAMADA DE DADOS (TI, 27/10/2026). Tudo vem do banco com o login; nada embutido. Monta o objeto
// DADOS do contrato combinado com o PICASSO e chama desenhar(DADOS). Fontes: clientes_lista · cliente_consulta (perfil, carteira,
// giro só tênis OLY + recorte, TOPICS, atas, raio_x) · raio_x_consulta (sazonal: sell-out por família, categoria e gênero) ·
// v_sellin_mensal (sell-in pelo EBM, faixa pela referência) · v_meta_cliente + v_meta_cliente_hist (meta rateada por cliente).
// Regras: a API corta em 1.000 linhas (consultas com .range em laço); chinelo nunca entra no tênis; meia em packs.
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
  let BRUTO = null;                                                      // o que veio do banco para o cliente atual (o filtro recalcula em cima)

  async function tudo(q) {                                               // a API corta em 1.000 linhas: lê em páginas
    const out = []; for (let i = 0; ; i += 1000) { const { data, error } = await q.range(i, i + 999); if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) break; } return out;
  }
  async function sessao() { const { data: { session } } = await sb.auth.getSession(); return session; }
  async function entrar(email, senha) { const { error } = await sb.auth.signInWithPassword({ email, password: senha }); return error ? error.message : null; }
  async function sair() { await sb.auth.signOut(); location.reload(); }
  async function clientes() { const { data, error } = await sb.rpc("clientes_lista"); if (error) throw error; return (data || []).map(c => ({ cliente: c.cliente, nome: c.nome })); }

  async function carregar(cliente) {
    const [doc, rx, sellin, meta, hist] = await Promise.all([
      sb.rpc("cliente_consulta", { p_cliente: cliente }).then(r => { if (r.error) throw r.error; return r.data; }),
      sb.rpc("raio_x_consulta", { p_cliente: cliente }).then(r => r.error ? null : r.data),
      tudo(sb.from("v_sellin_mensal").select("mes,marca,faixa,pares,valor,unidade,puxado_em").eq("cliente", cliente).order("mes")),
      tudo(sb.from("v_meta_cliente").select("mes,chave,unidade,meta_cliente,faturado,carteira,potencial,etiqueta,base_em,meta_lida_em").eq("cliente", cliente).order("mes")),
      tudo(sb.from("v_meta_cliente_hist").select("mes,chave,unidade,meta_cliente,faturado,base").eq("cliente", cliente).order("mes")),
      tudo(sb.from("venda_mensal").select("mes,marca,pares_fat,pares_cart,base_em").eq("cliente", cliente).eq("fonte", "DETALHADA").gte("mes", new Date().toISOString().slice(0, 7) + "-01")),
    ]);
    BRUTO = { cliente, doc, rx, sellin, meta, hist, cartFam: [] };
    BRUTO.cartFam = (await tudo(sb.from("venda_mensal").select("mes,marca,faixa,pares_fat,pares_cart,base_em").eq("cliente", cliente).eq("fonte", "DETALHADA").gte("mes", "2026-07-01")));
    return montar({ marca: ["OLY"], tipo: "tenis", genero: [], categoria: [] });
  }

  // ---------- o objeto DADOS a partir do bruto + filtro
  function montar(filtro) {
    const { cliente, doc, rx, sellin, meta, hist } = BRUTO, perfil = doc.perfil || {}, reg = ((doc.raio_x || {}).escopo || {}).regulador || {};
    const hoje = new Date().toISOString().slice(0, 7);
    // carteira
    // carteira por família (venda_mensal, DETALHADA): tênis OLY é o número; as outras ao lado, na unidade delas (chinelo nunca no total do tênis)
    const FAM = m => /^OLY$/i.test(m) ? "tênis OLY" : /^UA_TN$/i.test(m) ? "tênis UA" : /^MEOLY$|^UA_ME$/i.test(m) ? "meias (packs)" : /^CHOLY$|^UA_CH$/i.test(m) ? "chinelo" : /^ACOLY$|^UA_AC$/i.test(m) ? "acessórios (peças)" : "confecção (peças)";
    const porMesFam = {}, outras = {};
    for (const r of (BRUTO.cartFam || [])) { const m = String(r.mes).slice(0, 7), f = FAM(r.marca); if (m < hoje) continue; porMesFam[m] = porMesFam[m] || {}; porMesFam[m][f] = (porMesFam[m][f] || 0) + (r.pares_cart || 0); if (f !== "tênis OLY") outras[f] = (outras[f] || 0) + (r.pares_cart || 0); }
    const cart = (doc.carteira || []).map(x => ({ mes: String(x.mes).slice(0, 7), fat: x.fat || 0, cart: (porMesFam[String(x.mes).slice(0, 7)] || {})["tênis OLY"] || 0, cart_todas: x.cart || 0, base_em: x.base_em }));
    // giro (já vem só tênis OLY do banco) + cobertura: último mês COM estoque ÷ média dos 3 meses fechados — "—" quando falta
    const g = (doc.giro || []).map(x => ({ mes: String(x.mes).slice(0, 7), v: x.v || 0, e: x.e, parcial: String(x.mes).slice(0, 7) >= hoje }));
    const fech = g.filter(x => !x.parcial), tres = fech.slice(-3), media = tres.length ? tres.reduce((s, x) => s + x.v, 0) / tres.length : 0;
    const comE = g.filter(x => x.e != null), ue = comE[comE.length - 1] || null;
    const giro = { recorte: doc.giro_recorte || "tênis Olympikus · AG consolidada", serie: g.slice(-12), estoque: ue ? ue.e : null, estoque_mes: ue ? ue.mes : null,
                   cobertura: ue && media ? ue.e / media : null, cobertura_base: ue ? `estoque de ${mesBR(ue.mes)} · média dos ${tres.length} meses fechados` : "sem estoque no banco" };
    // TOPICS → o que decidir
    const t = doc.topics || {}, limpa = s => { const b = String(t.bloco || "").trim(); let x = String(s || "").trim(); if (b && x.toUpperCase().startsWith(b.toUpperCase())) x = x.slice(b.length).replace(/^\s*[-–:·]\s*/, ""); return x; },
          decidir = (t.itens || []).filter(i => !i.feito_em && !i.feito).map(i => ({ id: i.id, texto: limpa(i.txt || i.texto), urgente: !!i.alerta, criado_em: i.criado_em || i.data || null, bloco: "", sub: i.sub || "", prazo: i.prazo || null, dono: i.dono || "" }));
    // agenda: as últimas atas (não há agenda futura no banco ainda)
    const agenda = (doc.atas || []).slice(0, 3).map(a => ({ data: a.data, titulo: a.titulo, onde: a.assunto || "" }));
    // anos: sell-in × sell-out × meta × estoque, pelo filtro
    const anos = montarAnos(filtro, sellin, rx, meta, hist, g, BRUTO.cartFam || []);
    return {
      cliente: { nome: perfil.nome || cliente, codigo: perfil.cod_lider || "", lojas_ativas: ((doc.raio_x || {}).base || {}).lojas_ativas || null, recorte: "" },
      agenda, decidir, carteira: { meses: cart, a_faturar: cart.filter(x => x.mes >= hoje).reduce((s, x) => s + x.cart, 0), recorte: "tênis Olympikus", outras: Object.entries(outras).map(([f, n]) => `${f} ${Math.round(n).toLocaleString("pt-BR")}`).join(" · "), base_em: cart.reduce((m, x) => (x.base_em && (!m || x.base_em > m)) ? x.base_em : m, null) },   // a base é a leitura mais nova entre os meses (GAMER: o rótulo dizia 29/09 com dado de 27/10)
      giro, anos, filtro,
      etiquetas: { sellin: "sell-in = faturado (EBM até jun/26 · DETALHADA por data de NF depois); carteira a faturar à parte", sellout: "sell-out pela AG do cliente", meta: "meta rateada por cliente · leitura nossa (a Vulcabras dá a meta ao preposto)", estoque: "estoque na AG (tênis Olympikus)" },
      fontes: { sellout_ate: (() => { const sz = ((rx || {}).sazonal || {})["TÊNIS"]; const ms = sz ? Object.keys(sz.mensal || {}).sort() : []; return ms.length ? ms[ms.length - 1] : null; })(),
                sellin_ate: sellin.length ? String(sellin[sellin.length - 1].puxado_em).slice(0, 10) : null, meta_lida_em: meta.length ? String(meta[meta.length - 1].meta_lida_em).slice(0, 10) : null },
      topics: decidir, modo_cliente: MODO_CLIENTE, atualizado: { carteira: cart.reduce((m, x) => (x.base_em && (!m || x.base_em > m)) ? x.base_em : m, null), sellin: sellin.length ? sellin[sellin.length - 1].puxado_em : null }
    };
  }

  function montarAnos(f, sellin, rx, meta, hist, g, det) {
    f = Object.assign({}, f, { tipo: ALIAS[f.tipo] || f.tipo || "tenis" });
    const anos = [...new Set([...sellin.map(s => s.mes.slice(0, 4)), ...Object.keys(((rx || {}).sazonal || {})["TÊNIS"] ? (rx.sazonal["TÊNIS"].mensal || {}) : {}).map(m => m.slice(0, 4))])].sort();
    const vazio = () => Object.fromEntries(anos.map(a => [a, Array(12).fill(null)]));
    const S = vazio(), O = vazio(), M = vazio(), E = vazio(), SC = vazio(), ehTipo = TIPO_MARCA[f.tipo] || TIPO_MARCA.tenis, marcas = f.marca && f.marca.length ? f.marca : ["OLY", "UA"];
    const cats = f.categoria || [], gens = f.genero || [];
    const catOk = faixa => !cats.length || cats.includes(faixa);
    const genOk = faixa => !gens.length || (gens.includes("MASCULINO") && faixa === "CONF_MASC") || (gens.includes("FEMININO") && faixa === "CONF_FEM") || (gens.includes("INFANTIL") && faixa === "INFANTIL") || !["CONF_MASC", "CONF_FEM", "INFANTIL"].includes(faixa);
    // sell-in (EBM): mês × marca × faixa; só tênis responde a categoria/gênero
    for (const s of sellin) {
      if (!ehTipo(s.marca) || !marcas.includes(marcaDe(s.marca))) continue;
      if (f.tipo === "tenis" && marcaDe(s.marca) === "OLY" && (!catOk(s.faixa) || !genOk(s.faixa))) continue;
      const [a, m] = [s.mes.slice(0, 4), +s.mes.slice(5, 7) - 1]; S[a][m] = (S[a][m] || 0) + (+s.pares || 0);
    }
    const ultEBM = sellin.length ? sellin[sellin.length - 1].mes.slice(0, 7) : "0000-00";
    for (const r of det) {
      const m = String(r.mes).slice(0, 7); if (m <= ultEBM || !ehTipo(r.marca) || !marcas.includes(marcaDe(r.marca))) continue;
      const fx = String(r.faixa || "").toUpperCase() === "VISUAL" ? "CONF_MASC" : String(r.faixa || "").toUpperCase();
      if (f.tipo === "tenis" && marcaDe(r.marca) === "OLY" && (!catOk(fx) || !genOk(fx))) continue;
      const [a, mi] = [m.slice(0, 4), +m.slice(5, 7) - 1]; if (!S[a]) continue;
      if (r.pares_fat) S[a][mi] = (S[a][mi] || 0) + (+r.pares_fat || 0);
      if (r.pares_cart) SC[a][mi] = (SC[a][mi] || 0) + (+r.pares_cart || 0);   // NÚCLEO, 27/10: sell-in é só FATURADO; a carteira vai à parte (sellin_carteira, trecho 'a faturar'), nunca somada
    }
    // sell-out (AG, raio-x): família do tipo; tênis por categoria (categorias) ou gênero (subs) quando pedido
    const SZ = (rx || {}).sazonal || {};
    for (const fam of Object.keys(SZ)) {
      const ehUA = /^UA/i.test(fam); if (!(TIPO_FAM[f.tipo] || TIPO_FAM.tenis).test(fam) || !marcas.includes(ehUA ? "UA" : "OLY")) continue;
      let serie = SZ[fam].mensal || {};
      if (f.tipo === "tenis" && !ehUA && cats.length && SZ[fam].categorias) { serie = {}; for (const c of cats) for (const [m, v] of Object.entries(SZ[fam].categorias[CAT_SAZ[c]] || {})) serie[m] = (serie[m] || 0) + v; }
      else if ((f.tipo === "tenis" || f.tipo === "meias") && !ehUA && gens.length && SZ[fam].subs) { serie = {}; for (const gn of gens) for (const [m, v] of Object.entries(SZ[fam].subs[gn] || {})) serie[m] = (serie[m] || 0) + v; }
      for (const [m, v] of Object.entries(serie)) { const a = m.slice(0, 4); if (O[a]) O[a][+m.slice(5, 7) - 1] = (O[a][+m.slice(5, 7) - 1] || 0) + v; }
    }
    // meta rateada: v_meta_cliente (out/26→, potencial) e v_meta_cliente_hist (antes, faturado); por chave do tipo
    const chaveOk = k => (TIPO_CHAVE[f.tipo] || TIPO_CHAVE.tenis)(k) && marcas.includes(/^UA|TT FTW_UA/.test(k) ? "UA" : "OLY") && (f.tipo !== "tenis" || /^UA|TT FTW_UA/.test(k) || (catOk(k) && genOk(k)));
    const hojeD = new Date(), corte = hojeD.getFullYear() + "-" + String(Math.floor(hojeD.getMonth() / 3) * 3 + 1).padStart(2, "0");   // 1º mês do trimestre corrente
    const temMeta = new Set(meta.filter(r => r.mes.slice(0, 7) >= corte && r.meta_cliente != null).map(r => r.mes.slice(0, 7)));
    for (const r of hist) { if (r.mes.slice(0, 7) >= corte || !chaveOk(r.chave) || r.meta_cliente == null) continue; const a = r.mes.slice(0, 4); if (M[a]) M[a][+r.mes.slice(5, 7) - 1] = (M[a][+r.mes.slice(5, 7) - 1] || 0) + (+r.meta_cliente); }
    for (const r of meta) { if (r.mes.slice(0, 7) < corte || !chaveOk(r.chave) || r.meta_cliente == null) continue; const a = r.mes.slice(0, 4); if (M[a]) M[a][+r.mes.slice(5, 7) - 1] = (M[a][+r.mes.slice(5, 7) - 1] || 0) + (+r.meta_cliente); }
    // estoque: só tênis Olympikus (é o que o banco tem por mês); fica nulo nos outros tipos para não mentir
    if (f.tipo === "tenis" && marcas.includes("OLY") && !cats.length && !gens.length) for (const x of g) { const a = x.mes.slice(0, 4); if (E[a] && x.e != null) E[a][+x.mes.slice(5, 7) - 1] = x.e; }
    return { lista: anos, sellin: S, sellin_carteira: SC, sellout: O, meta: M, estoque: E, unidade: f.tipo === "meias" ? "packs" : (f.tipo === "acessorio" || f.tipo === "confeccao") ? "peças" : "pares" };
  }

  const mesBR = m => ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][+String(m).slice(5, 7) - 1] + "/" + String(m).slice(2, 4);
  return { sb, sessao, entrar, sair, clientes, carregar, refiltrar: montar, MODO_CLIENTE, mesBR };
})();
