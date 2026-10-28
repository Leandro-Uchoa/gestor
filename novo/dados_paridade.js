// Gestor · aba Cliente — DOIS MÓDULOS DE DADOS para a paridade com o v19 (27/10/2026, noite). Quem integra é o TI.
// ZERO dado aqui dentro: sem número, sem chave, sem nome de cliente. Tudo vem do banco pelo `sb` (supabase-js, já logado).
//
//  1. drillCobertura(sb, cliente, chave, opcoes?)  → a lista que abre ao clicar na barrinha da cobertura (v19: cobp).
//     Lê giro_mensal (AG do cliente, praca nula = consolidada, a mesma fonte do cartão de cobertura via cliente_consulta e da
//     Análise de giro via cg_consulta) e venda_mensal (DETALHADA, só para a coluna carteira).
//     Regra: cobertura = estoque do último mês COM estoque ÷ média de venda dos 3 meses FECHADOS (o mês corrente é parcial).
//     Sem venda nos 3 meses, venda média zero ou estoque ausente → cobertura: null ("sem base para estimar", nunca 0).
//     Ausência de linha num mês NÃO é venda zero: conta como mês sem base.
//
//  2. carteiraMesEstadoFamilia(sb, cliente, opcoes?) → matriz mês × estado × família (v19: "Carteira · por mês e estado" e
//     "por família"). Lê venda_mensal (DETALHADA: pares_fat/pares_cart, valor_fat/valor_cart) e carteira_estado (a cor que ele
//     pinta na AG, 0058). Faturado = FATURADA sempre (é fato). A carteira a faturar leva o estado da AG (CONFIRMADA · APORTE ·
//     SUGESTAO · ATENCAO · CANCELAR); sem cor na AG, ou com a AG dizendo FATURADA para o que ainda está aberto, entra como
//     CONFIRMADA pela regra de reserva da Análise de giro — e a quantidade vai contada à parte (`reserva`), para não esconder.
//
// Regras da casa respeitadas: a API corta em 1.000 linhas (todas as leituras paginadas, com ordem pela chave da tabela);
// chinelo nunca somado ao tênis (cada família é uma chave própria, com a unidade dela: pares · packs · peças);
// produto pelo NOME + cor, referência só de apoio.
(function (raiz) {
  "use strict";

  // ---------- famílias: o mesmo nome único da Análise de giro (index.html, familiaDe) — as grafias do giro e da carteira viram UMA
  const FAMILIAS = ["OLY FOOTWEAR", "OLY CHINELO", "OLY MEIAS", "OLY ACESSÓRIOS", "OLY CONFECÇÃO", "UA FOOTWEAR", "UA CHINELO", "UA MEIAS", "UA ACESSÓRIOS", "UA CONFECÇÃO"];
  function familiaDe(marca) {
    const t = String(marca || "").toUpperCase().replace(/[_\s]+/g, " ").trim();
    if (!t) return "";
    if (t === "OLY" || t === "FTW" || /OLY FTW/.test(t)) return "OLY FOOTWEAR";
    if (/CHOLY|OLY CHI/.test(t)) return "OLY CHINELO";
    if (/MEOLY|OLY MEI/.test(t)) return "OLY MEIAS";
    if (/ACOLY|OLY ACC|ACC OLY/.test(t)) return "OLY ACESSÓRIOS";
    if (/CFOLY|OLY VEST|OLY APP|OLY CONF/.test(t)) return "OLY CONFECÇÃO";
    if (/UA TN|UA FTW/.test(t)) return "UA FOOTWEAR";
    if (/UA CH/.test(t)) return "UA CHINELO";
    if (/UA ME/.test(t)) return "UA MEIAS";
    if (/UA AC/.test(t)) return "UA ACESSÓRIOS";
    if (/UA APP|UA CF|UA CONF/.test(t)) return "UA CONFECÇÃO";
    return t;
  }
  const NOME_FAM = { "OLY FOOTWEAR": "Tênis Olympikus", "OLY CHINELO": "Chinelos Olympikus", "OLY MEIAS": "Meias Olympikus", "OLY ACESSÓRIOS": "Acessórios Olympikus",
                     "OLY CONFECÇÃO": "Confecção Olympikus", "UA FOOTWEAR": "Tênis Under Armour", "UA CHINELO": "Chinelos Under Armour", "UA MEIAS": "Meias Under Armour",
                     "UA ACESSÓRIOS": "Acessórios Under Armour", "UA CONFECÇÃO": "Confecção Under Armour" };
  const unidadeDe = f => /MEIAS/.test(f) ? "packs" : /ACESS|CONFEC/.test(f) ? "peças" : "pares";
  // filtro no servidor (LIKE: "_" casa espaço ou sublinhado, as duas grafias da AG); a família é conferida de novo na página
  const LIKE_GIRO = { "OLY FOOTWEAR": ["OLY_FTW*"], "OLY CHINELO": ["OLY_CHI*"], "OLY MEIAS": ["OLY_MEI*"], "OLY ACESSÓRIOS": ["OLY_ACC*"],
                      "OLY CONFECÇÃO": ["OLY_VEST*", "OLY_APP*", "OLY_CONF*"], "UA FOOTWEAR": ["UA_FTW*", "UA_TN*"], "UA CHINELO": ["UA_CH*"],
                      "UA MEIAS": ["UA_ME*"], "UA ACESSÓRIOS": ["UA_AC*"], "UA CONFECÇÃO": ["UA_APP*", "UA_CF*", "UA_CONF*"] };

  // ---------- régua da casa (23/09, teto 5): <4 ruptura · 4–5 forçar a barra · ≥5 no teto
  const REGUA = { rup: "Ruptura", for: "Forçar a barra", teto: "No teto", sem_base: "Sem base para estimar" };
  const faixaRegua = c => c == null ? "sem_base" : c < 4 ? "rup" : c < 5 ? "for" : "teto";
  const ESTADOS = ["FATURADA", "CONFIRMADA", "APORTE", "SUGESTAO", "ATENCAO", "CANCELAR"];
  const PESO_CE = { CANCELAR: 1, ATENCAO: 2, SUGESTAO: 3, APORTE: 4, CONFIRMADA: 5, FATURADA: 6 };   // o que mais pede ação prevalece (= cg_consulta)

  const MS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const mesBR = m => MS[+String(m).slice(5, 7) - 1] + "/" + String(m).slice(2, 4);
  const mesDe = d => String(d || "").slice(0, 7);
  const MES_OK = /^\d{4}-\d{2}$/;
  const somaMes = (m, n) => { const [a, b] = m.split("-").map(Number), t = a * 12 + (b - 1) + n; return Math.floor(t / 12) + "-" + String(t % 12 + 1).padStart(2, "0"); };
  const mesAtual = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };   // hora LOCAL (UTC vira o mês 3h antes)

  async function tudo(q) {                                                     // a API corta em 1.000 linhas: lê em páginas
    const out = [];
    for (let i = 0; ; i += 1000) { const { data, error } = await q().range(i, i + 999); if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) break; }
    return out;
  }

  // chave: "rup" | "for" | "teto" | "sem_base" | "todos"  ·  ou uma família ("OLY FOOTWEAR", "OLY CHINELO"…)  ·  ou "FAMÍLIA|faixa"
  // (ex.: "OLY CHINELO|rup"). Sem família na chave, vale a do cartão de cobertura: tênis Olympikus.
  function lerChave(chave) {
    const partes = String(chave || "todos").split("|").map(s => s.trim()).filter(Boolean);
    let familia = "OLY FOOTWEAR", faixa = "todos";
    for (const p of partes) { const P = p.toUpperCase(); if (FAMILIAS.includes(P)) familia = P; else if (REGUA[p] || p === "todos") faixa = p; else throw new Error("drillCobertura: chave desconhecida: " + p); }
    return { familia, faixa };
  }

  // ============================================================================================================================
  // 1 · DRILL DA COBERTURA POR PRODUTO
  // devolve [{ produto, cor, estoque, venda_media, cobertura, base, referencia, familia, faixa, giro, carteira, meses_com_venda }]
  //   produto = NOME do giro (descrição da AG) · cor = cor da AG ('' quando a AG do cliente não abre cor: a tela escreve "todas as cores")
  //   cobertura = null quando não há base · base = texto curto do porquê, para a tela escrever ao lado
  // e, na própria lista, `.meta` = { familia, nome, unidade, estoque_mes, meses_media, base_em, total_estoque, total_venda_media, regua }
  // opcoes: { minVenda } — corte do v19 para as listas da régua: só modelo-cor que vende 20+ por mês (padrão 20 em rup/for/teto; 0 nas outras)
  // ============================================================================================================================
  async function drillCobertura(sb, cliente, chave, opcoes) {
    if (!sb || !cliente) throw new Error("drillCobertura: falta sb ou cliente");
    const { familia, faixa } = lerChave(chave), o = opcoes || {};
    const minVenda = o.minVenda != null ? +o.minVenda : (["rup", "for", "teto"].includes(faixa) ? 20 : 0);
    const hoje = mesAtual(), likes = LIKE_GIRO[familia];
    const filtroFam = q => likes.length === 1 ? q.like("marca", likes[0]) : q.or(likes.map(l => "marca.like." + l).join(","));
    // o último mês que a AG do cliente tem nesta família (1 linha) → a janela: 5 meses antes do último FECHADO até ele
    const ult = await filtroFam(sb.from("giro_mensal").select("mes").eq("cliente", cliente).is("praca", null)).order("mes", { ascending: false }).limit(1);
    if (ult.error) throw ult.error;
    const vazio = Object.assign([], { meta: { familia, nome: NOME_FAM[familia], unidade: unidadeDe(familia), estoque_mes: null, meses_media: [], base_em: null, total_estoque: null, total_venda_media: null, regua: null, motivo: "sem giro no banco para esta família" } });
    if (!ult.data || !ult.data.length) return vazio;
    const ultMes = mesDe(ult.data[0].mes), ultFechado = ultMes < hoje ? ultMes : somaMes(hoje, -1), desde = somaMes(ultFechado, -5) + "-01";
    const [giro, cart] = await Promise.all([
      tudo(() => filtroFam(sb.from("giro_mensal").select("mes,referencia,cor,descricao,marca,venda,estoque,base_em").eq("cliente", cliente).is("praca", null).gte("mes", desde))
                   .order("mes").order("fonte").order("referencia").order("cor")),
      tudo(() => sb.from("venda_mensal").select("mes,marca,referencia,cor,pares_cart").eq("cliente", cliente).eq("fonte", "DETALHADA").gte("mes", hoje + "-01")
                   .order("mes").order("porta").order("referencia").order("cor")),
    ]);
    const linhas = giro.filter(r => familiaDe(r.marca) === familia && MES_OK.test(mesDe(r.mes)));
    // meses da janela no nível do cliente: fechados = antes do mês corrente; a média usa os 3 últimos fechados; o estoque, o último mês COM estoque
    const meses = [...new Set(linhas.map(r => mesDe(r.mes)))].sort(), fechados = meses.filter(m => m < hoje), tres = fechados.slice(-3);
    const comEst = meses.filter(m => linhas.some(r => mesDe(r.mes) === m && r.estoque != null)), estMes = comEst.length ? comEst[comEst.length - 1] : null;
    const baseEm = linhas.reduce((b, r) => r.base_em && (!b || r.base_em > b) ? r.base_em : b, null);
    // carteira a faturar (mês corrente em diante), por referência+cor; AG sem cor ('') soma todas as cores da referência
    const cartRC = new Map(), cartR = new Map();
    for (const r of cart) { if (familiaDe(r.marca) !== familia) continue; const n = +r.pares_cart || 0; if (!n) continue;
      const k = r.referencia + "|" + (r.cor || ""); cartRC.set(k, (cartRC.get(k) || 0) + n); cartR.set(r.referencia, (cartR.get(r.referencia) || 0) + n); }
    // por produto (referência + cor da AG)
    const P = new Map();
    for (const r of linhas) {
      const k = r.referencia + "|" + (r.cor || ""), m = mesDe(r.mes);
      let p = P.get(k); if (!p) { p = { referencia: r.referencia, cor: r.cor || "", nome: "", nomeMes: "", vendas: {}, estoque: null }; P.set(k, p); }
      if (r.descricao && m >= p.nomeMes) { p.nome = String(r.descricao).trim(); p.nomeMes = m; }                     // o nome mais recente da AG
      if (tres.includes(m) && r.venda != null) p.vendas[m] = (p.vendas[m] || 0) + (+r.venda);
      if (m === estMes && r.estoque != null) p.estoque = (p.estoque || 0) + (+r.estoque);
    }
    const txtMedia = tres.length ? (tres.length > 1 ? mesBR(tres[0]) + "–" + mesBR(tres[tres.length - 1]) : mesBR(tres[0])) : "";
    let out = [...P.values()].map(p => {
      const ms = tres.filter(m => p.vendas[m] != null), soma = ms.reduce((s, m) => s + p.vendas[m], 0);
      const vm = ms.length ? soma / ms.length : null;
      const ok = tres.length === 3 && ms.length === 3 && vm > 0 && p.estoque != null;
      const cob = ok ? p.estoque / vm : null;
      const base = ok ? (p.estoque === 0 ? `estoque zerado em ${mesBR(estMes)} com venda média ${txtMedia}: ruptura` : `estoque ${mesBR(estMes)} ÷ venda média ${txtMedia}`)
                 : tres.length < 3 ? `sem base para estimar: o banco tem ${tres.length} de 3 meses fechados`
                 : ms.length < 3 ? `sem base para estimar: venda em ${ms.length} de 3 meses fechados (${txtMedia})`
                 : !(vm > 0) ? `sem base para estimar: sem venda em ${txtMedia}`
                 : `sem base para estimar: sem estoque em ${estMes ? mesBR(estMes) : "nenhum mês"}`;
      const est = p.estoque, giro = vm != null && est != null && (vm + est) > 0 ? Math.round(vm / (vm + est) * 100) : null;   // giro = venda ÷ (venda + estoque), igual à AG
      const carteira = p.cor ? (cartRC.get(p.referencia + "|" + p.cor) || 0) : (cartR.get(p.referencia) || 0);
      return { produto: p.nome || p.referencia, cor: p.cor, estoque: est, venda_media: vm, cobertura: cob, base, referencia: p.referencia, familia, faixa: faixaRegua(cob),
               giro, carteira, meses_com_venda: ms.length };
    });
    // o resumo da régua (as % de estoque das barrinhas) é de TODOS os produtos, antes do corte de venda e da faixa pedida
    const regua = resumoRegua(out);
    const totalEst = out.reduce((s, r) => s + (r.estoque || 0), 0), totalVm = out.reduce((s, r) => s + (r.venda_media || 0), 0);
    if (faixa !== "todos") out = out.filter(r => r.faixa === faixa);
    if (minVenda > 0) out = out.filter(r => (r.venda_media || 0) >= minVenda);
    out.sort((a, b) => (b.venda_media || 0) - (a.venda_media || 0) || (b.estoque || 0) - (a.estoque || 0) || String(a.produto).localeCompare(String(b.produto), "pt-BR"));
    out.meta = { familia, nome: NOME_FAM[familia], unidade: unidadeDe(familia), faixa, faixa_nome: REGUA[faixa] || "Todos", min_venda: minVenda,
                 estoque_mes: estMes, meses_media: tres, base_em: baseEm, total_estoque: totalEst, total_venda_media: totalVm, regua,
                 nota: `venda média ${txtMedia || "—"} · estoque ${estMes ? mesBR(estMes) : "—"} · régua teto 5${minVenda ? ` · só modelo-cor que vende ${minVenda}+ ${unidadeDe(familia)}/mês` : ""} · leitura é sinal, não veredito` };
    return out;
  }

  // as barrinhas da régua: quanto do estoque está em cada faixa (pares e %), e quantos modelos-cor — de uma lista do drill com chave "todos"
  function resumoRegua(linhas) {
    const r = {}; for (const k of Object.keys(REGUA)) r[k] = { nome: REGUA[k], n: 0, estoque: 0, pct: 0 };
    let tot = 0;
    for (const x of linhas || []) { const f = x.faixa || faixaRegua(x.cobertura); r[f].n++; r[f].estoque += x.estoque || 0; tot += x.estoque || 0; }
    for (const k of Object.keys(r)) r[k].pct = tot ? r[k].estoque / tot * 100 : 0;
    return r;
  }

  // ============================================================================================================================
  // 2 · CARTEIRA POR MÊS / ESTADO / FAMÍLIA
  // devolve {
  //   base_em, estado_lido_em, mes_corrente, estados:[6], familias:[{ familia, nome, unidade }], meses:[{ mes, aberto }],
  //   matriz: { 'AAAA-MM': { FAMÍLIA: { ESTADO: { qtd, valor, itens } } } }      ← qtd na unidade da família; itens = modelo-cor
  //   por_mes: [{ mes, aberto, valor, familias: { FAMÍLIA: { fat, cart, valor } } }]  ← chinelo nunca somado ao tênis: sem total de pares do mês
  //   por_familia: [{ familia, nome, unidade, meses:{ 'AAAA-MM': cart }, total, valor }] ← "por família" do v19: carteira a faturar, mês corrente em diante
  //   reserva: { qtd_por_familia:{…}, itens } ← carteira sem cor na AG lida como CONFIRMADA (regra de reserva)
  // } · opcoes: { desde:'AAAA-MM' } (padrão: tudo o que a DETALHADA tem)
  // ============================================================================================================================
  async function carteiraMesEstadoFamilia(sb, cliente, opcoes) {
    if (!sb || !cliente) throw new Error("carteiraMesEstadoFamilia: falta sb ou cliente");
    const o = opcoes || {}, hoje = mesAtual();
    const qv = () => { let q = sb.from("venda_mensal").select("mes,marca,referencia,cor,porta,pares_fat,pares_cart,valor_fat,valor_cart,base_em").eq("cliente", cliente).eq("fonte", "DETALHADA");
                       if (o.desde && MES_OK.test(o.desde)) q = q.gte("mes", o.desde + "-01"); return q.order("mes").order("porta").order("referencia").order("cor"); };
    const qe = () => { let q = sb.from("carteira_estado").select("referencia,cor,mes,estado,atualizado_em").eq("cliente", cliente);
                       if (o.desde && MES_OK.test(o.desde)) q = q.gte("mes", o.desde + "-01"); return q.order("mes").order("marca").order("referencia").order("cor"); };
    const [venda, est] = await Promise.all([tudo(qv), tudo(qe)]);
    // o estado pintado na AG: referência + cor + mês; cor '' na AG vale para todas as cores; duas marcas no mesmo SKU → o que mais pede ação
    const CE = new Map(); let lidoEm = null;
    for (const e of est) { if (!PESO_CE[e.estado]) continue; const k = e.referencia + "|" + (e.cor || "") + "|" + mesDe(e.mes), a = CE.get(k);
      if (!a || PESO_CE[e.estado] < PESO_CE[a]) CE.set(k, e.estado); if (e.atualizado_em && (!lidoEm || e.atualizado_em > lidoEm)) lidoEm = e.atualizado_em; }
    const estadoDe = (ref, cor, m) => CE.get(ref + "|" + (cor || "") + "|" + m) || (cor ? CE.get(ref + "||" + m) : null) || null;
    const matriz = {}, itens = {}, famSet = new Set(), reserva = { qtd_por_familia: {}, itens: 0 }, resItens = new Set(); let baseEm = null;
    const poe = (m, f, e, qtd, valor, item) => {
      const c = ((matriz[m] = matriz[m] || {})[f] = matriz[m][f] || {})[e] = matriz[m][f][e] || { qtd: 0, valor: 0, itens: 0 };
      c.qtd += qtd; c.valor += valor; const k = m + "|" + f + "|" + e; const s = itens[k] = itens[k] || new Set(); if (!s.has(item)) { s.add(item); c.itens++; }
    };
    for (const r of venda) {
      const m = mesDe(r.mes); if (!MES_OK.test(m)) continue;
      const f = familiaDe(r.marca), item = r.referencia + "|" + (r.cor || ""); famSet.add(f);
      if (r.base_em && (!baseEm || r.base_em > baseEm)) baseEm = r.base_em;
      const pf = +r.pares_fat || 0, pc = +r.pares_cart || 0;
      if (pf) poe(m, f, "FATURADA", pf, +r.valor_fat || 0, item);
      if (pc) {
        const ag = estadoDe(r.referencia, r.cor, m), e = ag && ag !== "FATURADA" ? ag : "CONFIRMADA";
        if (!ag || ag === "FATURADA") { reserva.qtd_por_familia[f] = (reserva.qtd_por_familia[f] || 0) + pc; if (!resItens.has(m + "|" + item)) { resItens.add(m + "|" + item); reserva.itens++; } }
        poe(m, f, e, pc, +r.valor_cart || 0, item);
      }
    }
    const familias = FAMILIAS.filter(f => famSet.has(f)).concat([...famSet].filter(f => !FAMILIAS.includes(f)).sort()).map(f => ({ familia: f, nome: NOME_FAM[f] || f, unidade: unidadeDe(f) }));
    const meses = Object.keys(matriz).sort().map(m => ({ mes: m, aberto: m >= hoje }));
    const por_mes = meses.map(({ mes, aberto }) => {
      const fams = {}; let valor = 0;
      for (const [f, es] of Object.entries(matriz[mes])) { const x = fams[f] = { fat: 0, cart: 0, valor: 0 };
        for (const [e, c] of Object.entries(es)) { if (e === "FATURADA") x.fat += c.qtd; else x.cart += c.qtd; x.valor += c.valor; valor += c.valor; } }
      return { mes, aberto, valor, familias: fams };
    });
    const por_familia = familias.map(({ familia, nome, unidade }) => {
      const ms = {}; let total = 0, valor = 0;
      for (const { mes, aberto } of meses) { if (!aberto) continue; const es = (matriz[mes] || {})[familia] || {};
        const q = Object.entries(es).filter(([e]) => e !== "FATURADA").reduce((s, [, c]) => s + c.qtd, 0), v = Object.entries(es).filter(([e]) => e !== "FATURADA").reduce((s, [, c]) => s + c.valor, 0);
        ms[mes] = q; total += q; valor += v; }
      return { familia, nome, unidade, meses: ms, total, valor };
    }).filter(x => x.total > 0);
    return { cliente, base_em: baseEm, estado_lido_em: lidoEm, mes_corrente: hoje, estados: ESTADOS.slice(), familias, meses, matriz, por_mes, por_familia, reserva,
             nota: "faturado = FATURADA; carteira pelo estado pintado na AG do cliente; sem cor na AG = CONFIRMADA (regra de reserva) · chinelo, meias, acessórios e confecção na unidade deles, nunca somados ao tênis" };
  }

  const API = { drillCobertura, carteiraMesEstadoFamilia, resumoRegua, familiaDe, FAMILIAS, ESTADOS, REGUA };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (raiz) { raiz.DadosParidade = API; raiz.drillCobertura = drillCobertura; raiz.carteiraMesEstadoFamilia = carteiraMesEstadoFamilia; }
})(typeof window !== "undefined" ? window : null);
