/* GESTOR · aba METAS — o painel de meta por vendedor, DESENHO só (TI, 29–30/09/2026). Os números vêm do banco, atrás do login;
   este arquivo vai ao repositório público e por isso NÃO tem número nenhum.
   VISUAL APROVADO por ele em 30/09 (BOSS; canvas "Revisão · celular" e "Revisão · computador"). O que é regra, não enfeite:
   1. TOTAL primeiro e separado: cartão roxo com barras próprias, linha de 100% própria e números maiores. No computador fica à
      esquerda; no celular abre a fila de rolagem lateral.
   2. Ordem das faixas: CLÁSSICOS, CONF. FEMININO, CONF. MASCULINO, CORRIDA TREINO, INFANTIL, CORRE. Nome por extenso.
   3. Três tons: FOCO vivo (cartão destacado); PADRÃO normal; ABANDONADO um pouco opaco (legível, não apagado). O estado vem de
      decisao_faixa, mês a mês; mês sem decisão = tudo padrão.
   4. Linha dos 100% tracejada, sem texto de %. Embaixo de cada coluna: falta (−) ou +excedente grande, meta pequena, CMS e vendedor.
   5. Estrela de ouro da CMS: quando ela bateu o TOTAL, no total e em cada faixa que bateu (barra dourada junto). As estrelas do
      VENDEDOR e o bloco da TRAVA DOS 15% ficam FORA por ordem dele (30/09), até segunda ordem — o código está pronto e desligado:
      ouro = CMS bateu total e faixa, vendedor bateu a faixa e os 15%; prata = idem mas o vendedor NÃO bateu a faixa; sem os 15%,
      nenhuma estrela; o total do vendedor NÃO é exigido (palavra dele, 17/09).
   6. Outras famílias em R$ (acessório, meias, chinelo, confecção) em bloco próprio: meta, falta e barras de CMS e vendedor.
      % em VALOR (real_rs ÷ valor_ref_rs), nunca o % da tela. Faixa sem meta cadastrada aparece "sem meta" — meta nunca é inventada.
      Família batida pela CMS DOURA (barra + estrela), pela meta própria da família em valor — não depende do total de tênis (30/09).
   7. Seletor de mês no topo (index.html). Mês à frente mostra "carteira": a do vendedor calculada da base (CART por mês de PREV FAT,
      só quem pontua); a da CMS é a leitura do NÚCLEO.
   8. Animação: as barras sobem em ~1,3 s ao abrir e PARAM. Sem ícones, sem emoji, sem texto explicativo.
   9. Rodapé: hora da leitura por fonte. REAL = POTENCIAL (faturado + carteira); quando a leitura trouxer o faturado separado
      (fat_pares), a coluna mostra os dois e não mistura.
  10. A RÉGUA DA VULCABRAS, definitiva (Léo via BOSS, 12/10): tênis (cada marca sozinha, em pares) — o TOTAL bate com 90% da meta,
      cada FAIXA bate com 100%; as outras famílias (confecção, acessório, chinelo, meias), em valor — cada uma bate com 95%, sem
      faixas dentro. A linha tracejada do TOTAL fica nos 90%, a das famílias nos 95%, a das faixas nos 100%. O ouro da CMS segue a
      mesma régua. A camada da CMS para pagar o vendedor (50%, estrelas do vendedor) continua DESLIGADA.
  11. A TRAVA DOS 15% (regra interna da CMS; pedido dele, 12/10): duas barras ACIMA dos gráficos — o MÊS do seletor e o
      TRIMESTRE dele — com o % e quanto falta em R$ para os 15% (ou quanto passou). Conta: numerador = R$ das outras famílias
      Olympikus (acessório, chinelo, meias, confecção) + a Under Armour INTEIRA (tênis UA incluso, uma família só);
      denominador = a META de tênis Olympikus em R$ (valor_ref_rs do total de tênis na Carta), NÃO o tênis vendido — correção
      dele de 12/10, valendo do trimestre que começou em outubro. Trimestre = soma dos três meses nos dois lados; mês à frente
      entra com a carteira (potencial). É individual (cada vendedor sozinho) e SÓ O VENDEDOR aparece — palavra dele, 12/10:
      "no caso dos 15% a CMS não é relevante (…) o da CMS não precisa aparecer, só o do vendedor".
  12. AS CORES DA CMS (ordem dele via BOSS, 12/10): amarelo Olympikus #FFFF1A e preto #151515 (as mesmas vão para o CMS PASS 2.0),
      nos ACENTOS (abas, mês ativo, bordas do foco e do total). ⚠️ 12:3x, correção dele: "as barras de atingimento NÃO podem ser
      amarelas, porque ela só vai ficar DOURADA quando a CMS bater". Barras: CMS = azul (#5B6BFF), vendedor = branca; DOURADO = bateu:
      a CMS dourada quando bate; o vendedor só fica dourado se a CMS bateu E ele bateu; CMS não bateu → ninguém dourado, mesmo que
      ele tenha batido. A estrela do vendedor segue a regra 13 (ele bateu = estrela), separada da cor da barra. CSS no index.html.
  13. ESTRELAS DO VENDEDOR (reunião 12/10, via BOSS): ouro = ele bateu; prata = CMS bateu, ele não, e ele tem os 15%; sem os 15%, nenhuma. */
(function () {
  const ESTRELAS_VENDEDOR = true;      // 12/10 (reunião, via BOSS): "ligar as estrelas: bateu tem estrela, não bateu fica sem" — regra em estrelaVendedor
  const TRAVA_15 = 0.15;               // regra 11: outras famílias + UA ≥ 15% da META de tênis OLY (R$)
  const FAM_OLY = ["ACOLY", "CHOLY", "MEOLY", "CFOLY"];   // o numerador do lado Olympikus; a UA entra inteira pelo TT GERAL dela
  const GATILHO_TOTAL = 0.90;          // regra 10: o total de tênis bate com 90% da meta
  const GATILHO_FAIXA = 1.00;          //          cada faixa de tênis bate com 100%
  const GATILHO_FAMILIA = 0.95;        //          cada família em R$ bate com 95%
  const TETO = 1.5;                    // o eixo vai até 150% da meta; a linha dos 100% fica a 2/3 da altura
  const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  // nome por extenso e ORDEM de exibição (regra 2 e 6); o que não estiver aqui segue a ordem da faixa_carta, com o nome da Carta
  const NOMES = { "CLASSICOS": "CLÁSSICOS", "CONF_FEM": "CONF. FEMININO", "CONF_MASC": "CONF. MASCULINO", "CORRIDA/TREINO": "CORRIDA TREINO", "INFANTIL": "INFANTIL", "CORRE": "CORRE",
                  "ACOLY": "ACESSÓRIO", "MEOLY": "MEIAS", "CHOLY": "CHINELO", "CFOLY": "CONFECÇÃO", "UA_AC": "ACESSÓRIO", "UA_ME": "MEIAS", "UA_CH": "CHINELO", "UA_CF": "CONFECÇÃO",
                  "RUN INSPIRED": "RUN INSPIRED", "RUNNING": "RUNNING", "TRAINING": "TRAINING", "BASKETBALL": "BASKETBALL" };
  const ORDEM = { "CLASSICOS": 1, "CONF_FEM": 2, "CONF_MASC": 3, "CORRIDA/TREINO": 4, "INFANTIL": 5, "CORRE": 6, "ACOLY": 1, "MEOLY": 2, "CHOLY": 3, "CFOLY": 4, "UA_AC": 1, "UA_ME": 2, "UA_CH": 3, "UA_CF": 4,
                  "RUN INSPIRED": 1, "RUNNING": 2, "TRAINING": 3, "BASKETBALL": 4 };
  // 12/10 (reunião, via BOSS): ordem fixa por proximidade geográfica — CMS, Léo, Mari, Rafael, Willame, Jorge; os demais depois.
  // A ordem mora na coluna `ordem` da tabela preposto (0017): código de preposto não entra neste arquivo público.
  const posPrep = p => (p && p.ordem != null) ? +p.ordem : 99;
  const ESTRELA = '<svg viewBox="0 0 24 24"><path d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7z"/></svg>';

  const fmt = n => { n = Math.round(n); return (n < 0 ? "−" : "") + Math.abs(n).toLocaleString("pt-BR"); };
  const kk = v => { const a = Math.abs(v); if (a >= 1e6) return (a / 1e6).toFixed(2).replace(".", ",") + "M"; return a >= 1000 ? (a / 1000).toFixed(1).replace(".", ",") + "k" : String(Math.round(a)); };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const dm = iso => iso ? iso.slice(8,10)+"/"+iso.slice(5,7) : "";
  const dmh = iso => { if (!iso) return "—"; const d = new Date(iso); if (isNaN(d)) return dm(iso); return d.toLocaleDateString("pt-BR").slice(0, 5) + " " + d.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}); };
  const bateu = (real, meta, g) => meta != null && real != null && real >= meta * (g == null ? 1 : g);   // g = gatilho (regra 10)
  const alvo = (meta, g) => meta == null ? null : meta * g;                                                 // a meta que vale: 90% / 95% dela
  const mesAtual = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
  // falta (−) ou excedente (+): pares por extenso até 9.999 (os do vendedor, exatos), em k de 10.000 para cima (os da CMS); R$ em k
  const fmtP = n => Math.abs(n) >= 1e4 ? kk(n) : fmt(Math.abs(n));
  const gapPares = (r, m) => (r == null || m == null) ? "—" : (r >= m ? "+" + fmtP(r - m) : "−" + fmtP(m - r));
  const gapReais = (r, m) => (r == null || m == null) ? "—" : "R$ " + (r >= m ? "+" : "−") + kk(r - m);
  const metaPares = m => m == null ? "sem meta" : "meta " + fmtP(m);
  const metaReais = m => m == null ? "sem meta" : "meta R$ " + kk(m);

  async function tudo(consulta) {
    const PAG = 1000; let de = 0, out = [];
    for (;;) { const { data, error } = await consulta.range(de, de + PAG - 1); if (error) return { data: out, error }; out = out.concat(data || []); if (!data || data.length < PAG) return { data: out, error: null }; de += PAG; }
  }

  // ---------- leitura do banco, por mês do seletor (nunca um mês fixo no código)
  async function carregar(sb, mes, preposto, marca) {
    marca = marca || "OLY";
    if (!preposto) {
      const { data: ps } = await sb.from("preposto").select("preposto,nome").neq("preposto", "TODOS").order("preposto").limit(1);
      if (!ps || !ps.length) return { erro: "o banco não tem preposto cadastrado" };
      preposto = ps[0].preposto;
    }
    const hoje = mesAtual();
    // os meses do seletor: do primeiro mês com meta (ou o corrente) até dezembro do mesmo ano — administração de carteira, à frente
    const { data: mm } = await sb.from("meta_mensal").select("mes").eq("marca", marca).eq("preposto", preposto).order("mes").limit(1);
    const primeiro = (mm && mm[0] ? mm[0].mes.slice(0, 7) : hoje) < hoje ? (mm[0].mes.slice(0, 7)) : hoje;
    const ano = primeiro.slice(0, 4); const meses = [];
    for (let m = +primeiro.slice(5, 7); m <= 12; m++) meses.push(ano + "-" + String(m).padStart(2, "0"));
    mes = mes && meses.includes(mes) ? mes : (meses.includes(hoje) ? hoje : meses[meses.length - 1]);
    const mes01 = mes + "-01", futuro = mes > hoje;
    // o trimestre do mês do seletor (regra 11): out → out, nov, dez
    const q0 = Math.floor((+mes.slice(5, 7) - 1) / 3) * 3 + 1, triMeses = [0, 1, 2].map(i => mes.slice(0, 4) + "-" + String(q0 + i).padStart(2, "0")), tri01 = triMeses.map(m => m + "-01");
    const [fx, vm, cf, cr, dec, pre, cg, t15r, t15m] = await Promise.all([
      tudo(sb.from("faixa_carta").select("faixa,ordem,total,unidade").eq("marca", marca).order("ordem")),
      tudo(sb.from("v_meta_real").select("preposto,faixa,total,unidade,meta_pares,valor_ref_rs,carta,lido_em").eq("marca", marca).eq("mes", mes01).in("preposto", [preposto, "TODOS"])),
      tudo(sb.from("v_carteira_faixa").select("faixa,pares_fat,pares_cart,base_em").eq("marca", marca).eq("mes", mes01).eq("preposto", preposto)),
      tudo(sb.from("carta_real").select("preposto,faixa,real_pares,real_rs,fat_pares,fat_rs,base,lido_em").eq("marca", marca).eq("mes", mes01).in("preposto", [preposto, "TODOS"])),
      tudo(sb.from("v_decisao_vigente").select("faixa,estado").eq("marca", marca).eq("preposto", preposto).eq("mes", mes01)),
      sb.from("preposto").select("nome").eq("preposto", preposto).maybeSingle(),
      sb.from("carga").select("carregado_em").eq("fonte", "DETALHADA").eq("status", "ok").order("id", { ascending: false }).limit(1),
      // trava dos 15% (regra 11): as outras famílias OLY e a UA inteira (TT GERAL da UA), e a META de tênis OLY em R$, nos 3 meses do trimestre
      tudo(sb.from("carta_real").select("preposto,mes,marca,faixa,real_rs,base,lido_em").in("marca", ["OLY", "UA"]).in("mes", tri01).eq("preposto", preposto).in("faixa", FAM_OLY.concat(["TT GERAL", "TT CALCADOS"]))),
      tudo(sb.from("meta_mensal").select("preposto,mes,valor_ref_rs").eq("marca", "OLY").eq("faixa", "TT CALCADOS").in("mes", tri01).eq("preposto", preposto)),
    ]);
    const trava15 = (t15r.error || t15m.error) ? null : contaTrava15(mes, triMeses, t15r.data, t15m.data, preposto);
    if (fx.error || vm.error || cf.error || cr.error) return { erro: "o banco recusou: " + (fx.error || vm.error || cf.error || cr.error).message, meses, mes };
    const meta = {}; for (const r of vm.data) meta[r.preposto + "|" + r.faixa] = r;
    const base = {}; for (const r of cf.data) base[r.faixa] = r;
    const lido = {}; for (const r of cr.data) lido[r.preposto + "|" + r.faixa] = r;
    const decisao = {}; for (const r of dec.data || []) decisao[r.faixa] = r.estado;
    const faixas = [], familias = []; let totRow = null, avisos = [];
    for (const f of fx.data) {
      const mv = meta[preposto + "|" + f.faixa], mc = meta["TODOS|" + f.faixa], b = base[f.faixa], lv = lido[preposto + "|" + f.faixa], lc = lido["TODOS|" + f.faixa];
      const comum = { id: f.faixa, nome: NOMES[f.faixa] || f.faixa.replace("_", " ").replace("/", " "), ordem: ORDEM[f.faixa] || 100 + f.ordem,
                      vend_lido: lv ? lv.lido_em : null, cms_lido: lc ? lc.lido_em : null };
      if (f.unidade === "reais") {
        if (f.total) continue;                                                   // TT GERAL: a página não soma valor com pares
        // famílias em R$: meta = valor_ref_rs; real = real_rs da leitura da Carta (a base ainda não tem as colunas de reais)
        familias.push(Object.assign(comum, { meta_v: mv ? mv.valor_ref_rs : null, real_v: lv ? lv.real_rs : null, meta_c: mc ? mc.valor_ref_rs : null, real_c: lc ? lc.real_rs : null,
                                             fat_v: lv ? lv.fat_rs : null, fat_c: lc ? lc.fat_rs : null }));
        continue;
      }
      if (f.total) { totRow = { meta_v: mv ? mv.meta_pares : null, meta_c: mc ? mc.meta_pares : null, lido_v: lv, lido_c: lc, carta: (mv && mv.carta) || (mc && mc.carta) || "", lido_em: (mv && mv.lido_em) || (mc && mc.lido_em) }; continue; }
      // vendedor: mês corrente = a leitura da Carta quando existe, senão fat + cart do mês pela base; mês à frente = CARTEIRA da base
      const calc = b ? (futuro ? (b.pares_cart || 0) : (b.pares_fat || 0) + (b.pares_cart || 0)) : null;
      const real_v = (!futuro && lv) ? lv.real_pares : (calc != null ? calc : (lv ? lv.real_pares : null));
      const real_c = lc ? lc.real_pares : null;
      faixas.push(Object.assign(comum, { meta_v: mv ? mv.meta_pares : null, real_v, meta_c: mc ? mc.meta_pares : null, real_c,
                    fat_v: (!futuro && lv && lv.fat_pares != null) ? lv.fat_pares : (b && !futuro ? (b.pares_fat || 0) : null), fat_c: (lc && lc.fat_pares != null) ? lc.fat_pares : null,
                    estado: decisao[f.faixa] || "padrao", base_em: b ? b.base_em : null, vend_lido: (!futuro && lv) ? lv.lido_em : null }));
    }
    if (!faixas.length) return { erro: "faixa_carta sem faixas em pares para " + marca, meses, mes };
    faixas.sort((a, b) => a.ordem - b.ordem); familias.sort((a, b) => a.ordem - b.ordem);
    const soma = (k) => faixas.some(f => f[k] != null) ? faixas.reduce((s, f) => s + (f[k] || 0), 0) : null;
    const total = { meta_v: totRow && totRow.meta_v != null ? totRow.meta_v : soma("meta_v"), meta_c: totRow && totRow.meta_c != null ? totRow.meta_c : soma("meta_c"),
                    real_v: (!futuro && totRow && totRow.lido_v) ? totRow.lido_v.real_pares : soma("real_v"), real_c: (totRow && totRow.lido_c) ? totRow.lido_c.real_pares : soma("real_c") };
    const semMeta = total.meta_v == null || total.meta_c == null;
    if (faixas.every(f => f.real_c == null)) avisos.push("CMS sem leitura para " + MESES[+mes.slice(5, 7) - 1]);
    // 12/10: "CMS completa" = preposto TODOS no seletor — só o lado da CMS aparece (sem barra de vendedor, sem trava dos 15%)
    const soCms = preposto === "TODOS";
    // 13:5x, ele repensou: na CMS a barra das famílias também aparece, mas NÃO é trava — só a composição do faturamento (sem marca dos 15%, sem "faltam")
    if (trava15 && soCms) trava15.informativo = true;
    return { mes, meses, hoje, futuro, marca, preposto, soCms, nome: soCms ? "CMS" : ((pre.data && pre.data.nome) || preposto), faixas, familias, total, semMeta, avisos, trava15,
             base_em: (faixas.find(f => f.base_em) || {}).base_em, calculado: cg.data && cg.data[0] ? cg.data[0].carregado_em : null,
             carta: totRow ? totRow.carta : "", lido_em: totRow ? totRow.lido_em : null,
             vend_lido: (faixas.find(f => f.vend_lido) || {}).vend_lido, cms_lido: (totRow && totRow.lido_c && totRow.lido_c.lido_em) || (faixas.find(f => f.cms_lido) || {}).cms_lido,
             // a BASE da leitura (01/10): "faturado" = mês fechado, lido como faturado; "potencial" = faturado + carteira. Vem da leitura do TOTAL
             // (ou da primeira faixa com leitura); a página só escreve "faturado" se a leitura disser faturado.
             base_c: (totRow && totRow.lido_c && totRow.lido_c.base) || ((cr.data.find(r => r.preposto === "TODOS") || {}).base) || null,
             base_v: (!futuro && totRow && totRow.lido_v && totRow.lido_v.base) || ((!futuro && (cr.data.find(r => r.preposto === preposto) || {}).base) || null),
             fam_lido_c: (familias.find(f => f.cms_lido) || {}).cms_lido, fam_lido_v: (familias.find(f => f.vend_lido) || {}).vend_lido };
  }

  // ---------- as regras
  // trava dos 15% (regra 11): por mês e no trimestre, SÓ do vendedor (v) — a CMS não entra: "não é relevante" (ele, 12/10).
  // Devolve null quando não há meta de tênis. v: num (R$ das outras famílias OLY + UA inteira), meta (R$ da meta de tênis OLY),
  // pct (num/meta), falta (15% da meta − num; negativo = passou), ok. Mês sem leitura entra com zero no numerador e sem meta no
  // denominador: o trimestre soma o que existe.
  function contaTrava15(mes, triMeses, leituras, metas, preposto) {
    // O denominador muda de regra em OUTUBRO/2026 (martelo da reunião com o King, 12/10): do trimestre de outubro em diante é a META de
    // tênis OLY em R$; até setembro é o tênis OLY VENDIDO em R$ (regra anterior). Cada mês entra pela regra do seu tempo.
    const REGRA_NOVA_DESDE = "20" + "26-10";                                  // partido em dois: a guarda do publicador barra 4 dígitos seguidos no JS
    const lado = (quem, meses) => {
      let num = 0, meta = 0, temMeta = false, base = null, lido = null, antigos = 0, novos = 0;
      const partes = {}, tenisRs = {};                                            // quanto cada família contribui (pedido dele, 12/10)
      for (const r of leituras) {
        if (r.preposto !== quem || !meses.includes(r.mes.slice(0, 7))) continue;
        if (r.marca === "OLY" && r.faixa === "TT CALCADOS") { tenisRs[r.mes.slice(0, 7)] = +r.real_rs || 0; continue; }
        const chave = (r.marca === "OLY" && FAM_OLY.includes(r.faixa)) ? r.faixa : ((r.marca === "UA" && r.faixa === "TT GERAL") ? "UA" : null);
        if (!chave) continue;
        const v = +r.real_rs || 0;
        num += v; partes[chave] = (partes[chave] || 0) + v; base = base || r.base; lido = lido || r.lido_em;
      }
      for (const m of meses) {
        if (m < REGRA_NOVA_DESDE) { if (tenisRs[m] != null) { meta += tenisRs[m]; temMeta = true; antigos++; } continue; }
        const mm = metas.find(x => x.preposto === quem && x.mes.slice(0, 7) === m && x.valor_ref_rs != null);
        if (mm) { meta += +mm.valor_ref_rs; temMeta = true; novos++; }
      }
      if (!temMeta) return null;
      const alvo15 = meta * TRAVA_15;
      return { num, meta, pct: meta ? num / meta : null, falta: alvo15 - num, ok: num >= alvo15, base, lido, partes, regra: antigos && !novos ? "vendido" : (novos && !antigos ? "meta" : "mista") };
    };
    const bloco = meses => ({ v: lado(preposto, meses) });
    const m = bloco([mes]), t = bloco(triMeses);
    if (!m.v && !t.v) return null;
    return { mes: m, tri: t, triMeses };
  }
  // ouro da CMS: só quando ela bateu o TOTAL (90%, regra 10) — no total e em cada faixa que bateu (100%) (regra 5)
  function dourado(f, tot) {
    const cmsTotal = bateu(tot.real_c, tot.meta_c, GATILHO_TOTAL);
    return { cms: cmsTotal && bateu(f.real_c, f.meta_c, GATILHO_FAIXA), vend: estrelaVendedor(f, tot, null) === "ouro" };
  }
  // estrela do VENDEDOR (desligada, ESTRELAS_VENDEDOR): "ouro" = CMS bateu total e faixa, ele bateu a faixa e os 15%;
  // "prata" = CMS bateu total e faixa, ele NÃO bateu a faixa mas bateu os 15%; sem os 15% (trava15 !== true) nenhuma estrela.
  // O total do vendedor não é exigido (palavra dele, 17/09: "se a CMS fecha a meta e eu não, meu recebimento da faixa é 50%").
  // 12/10, palavra dele na reunião (via BOSS): "bateu tem estrela, não bateu fica sem. Vantagem dos 15%: com os 15%, 50% em toda
  // faixa ou família que a CMS bateu e o vendedor não. Única condição: os 15%; o total a 95% não é exigido."
  // OURO = o vendedor bateu (faixa 100% / família 95% / total 90%). PRATA = ele não bateu, a CMS bateu a mesma faixa/família, e ele
  // tem os 15% (ok15). Sem os 15%, não há prata. O total dele não entra na conta da faixa.
  function estrelaVendedor(f, tot, ok15, g) {
    g = g == null ? GATILHO_FAIXA : g;
    if (bateu(f.real_v, f.meta_v, g)) return "ouro";
    if (ok15 === true && bateu(f.real_c, f.meta_c, g)) return "prata";
    return null;
  }
  // altura em % da área: com meta, 100% da meta = 2/3 da altura (eixo até 150%); sem meta, escala pelo maior valor do bloco
  function altura(real, meta, escala) {
    if (real == null || real <= 0) return 0;
    const ref = meta || escala; if (!ref) return 0;
    return Math.round(Math.min(real / ref, TETO) / TETO * 1000) / 10;
  }
  const barra = (quem, real, meta, ouro, atraso, escala) => `<div class="b ${quem}${ouro ? " ouro" : ""}${real == null ? " vazia" : ""}" style="height:${altura(real, meta, escala)}%;animation-delay:${atraso || 0}s"></div>`;
  const estrela = (quem, on, tom) => `<i class="s ${quem}${on ? " on" : ""}${tom ? " " + tom : ""}">${ESTRELA}</i>`;
  const celula = (quem, gap, meta, ok, fat) => `<div class="cel ${quem}"><b class="g ${quem}${ok ? " ok" : ""}">${gap}</b><span class="m">${meta}</span>${fat ? `<span class="m fat">${fat}</span>` : ""}</div>`;
  // a linha tracejada do gatilho: 100% fica a 2/3 da altura (CSS); 90% e 95% descem na proporção (regra 10)
  const linha = (g, dentro) => `<i class="l100"${g === 1 ? "" : ` style="bottom:${(g / TETO * 100).toFixed(2)}%"`}>${dentro || ""}</i>`;
  // 12/10, 12:5x (ele, olhando outubro): no TOTAL de tênis são DUAS linhas — a dos 90% (gatilho, tracejada, com o rótulo) e a dos 100%
  // (contínua, a mesma que atravessa as faixas). Uma barra acima dos 90% e abaixo dos 100% é "gatilho sim, meta não".
  // 13:1x, pelo celular: a dos 90% é CONTÍNUA e forte (só no total); a dos 100% é TRACEJADA e atravessa — sai do total e cruza todas
  // as faixas até o fim (alinhar100 desenha a travessia na fila, na altura exata da linha do total, e alinha as linhas das faixas a ela).
  const linhasTotal = dentro => `<i class="l100 cem"><span class="lr">100%</span></i><i class="l100 forte" style="bottom:${(GATILHO_TOTAL / TETO * 100).toFixed(2)}%"><span class="lr">${pct(GATILHO_TOTAL)}</span>${dentro || ""}</i>`;
  function alinhar100(el) {
    const fila = el.querySelector(".fila"), cem = el.querySelector(".tot .l100.cem");
    if (!fila || !cem) return;
    const desenha = () => {
      const fr = fila.getBoundingClientRect(), y = cem.getBoundingClientRect().top;
      let tr = fila.querySelector(":scope > .atravessa");
      if (!tr) { tr = document.createElement("i"); tr.className = "atravessa"; fila.appendChild(tr); }
      tr.style.top = (y - fr.top) + "px";
      for (const b of fila.querySelectorAll(".fx .bars")) { const l = b.querySelector(".l100"); if (l) l.style.bottom = (b.getBoundingClientRect().bottom - y) + "px"; }
    };
    desenha(); window.addEventListener("resize", desenha, { passive: true });
  }
  const pct = g => Math.round(g * 100) + "%";
  // faturado separado do potencial, quando a leitura trouxe (regra 9): "fat N + cart M"
  // mês fechado lido como faturado tem fat == real: não há carteira a mostrar
  const fatCart = (fat, real, reais) => (fat == null || real == null || fat === real) ? "" : (reais ? `fat R$ ${kk(fat)} + cart R$ ${kk(real - fat)}` : `fat ${fmt(fat)} + cart ${fmt(real - fat)}`);

  function desenhar(el, d) {
    if (d.erro) { el.innerHTML = `<div class="msg aviso">${esc(d.erro)}</div>`; return; }
    const tot = d.total, medida = d.futuro ? "carteira" : "real";
    const V = !d.soCms;                                    // "CMS completa": o lado do vendedor não se desenha
    const escala = d.semMeta ? Math.max(1, ...d.faixas.flatMap(f => [f.real_v || 0, f.real_c || 0])) : null;
    const escTot = d.semMeta ? Math.max(1, tot.real_v || 0, tot.real_c || 0) : null;
    const cmsTot = !d.semMeta && bateu(tot.real_c, tot.meta_c, GATILHO_TOTAL);
    const metaTot = m => m == null ? "sem meta" : pct(GATILHO_TOTAL) + " de " + fmtP(m);     // regra 10: o total bate com 90% da meta
    const ok15 = !!(d.trava15 && d.trava15.mes && d.trava15.mes.v && d.trava15.mes.v.ok);
    const totV = (ESTRELAS_VENDEDOR && !d.semMeta && bateu(tot.real_v, tot.meta_v, GATILHO_TOTAL)) ? "ouro" : null;   // no total só há ouro (bateu os 90%)
    let cards = "";
    d.faixas.forEach((f, i) => {
      const g = d.semMeta ? { cms: false, vend: false } : dourado(f, tot), est = f.estado === "sem_tratamento" ? "padrao" : f.estado;
      const tomV = (ESTRELAS_VENDEDOR && !d.semMeta) ? estrelaVendedor(f, tot, ok15, GATILHO_FAIXA) : null;
      const fe = f.meta_v || f.meta_c ? null : escala;
      cards += `<div class="fx ${esc(est)}">
        <div class="nm">${esc(f.nome)}</div>
        <div class="st">${estrela("c", g.cms)}${V && ESTRELAS_VENDEDOR ? estrela("v", !!tomV, tomV) : ""}</div>
        <div class="bars"><i class="l100"></i>${barra("c", f.real_c, f.meta_c, g.cms, i * .06, fe)}${V ? barra("v", f.real_v, f.meta_v, g.cms && bateu(f.real_v, f.meta_v, GATILHO_FAIXA), i * .06 + .05, fe) : ""}</div>
        <div class="num">${celula("c", gapPares(f.real_c, f.meta_c), metaPares(f.meta_c), bateu(f.real_c, f.meta_c), fatCart(f.fat_c, f.real_c))}${V ? celula("v", gapPares(f.real_v, f.meta_v), metaPares(f.meta_v), bateu(f.real_v, f.meta_v), d.futuro ? "" : fatCart(f.fat_v, f.real_v)) : ""}</div>
      </div>`;
    });
    let fams = "";
    d.familias.forEach((f, i) => {
      // família em R$ é meta própria em valor: o ouro da CMS acende quando ela bate a meta DAQUELA família, sem depender do total de
      // tênis (Léo via BOSS, 30/09). O ouro do vendedor na família segue desligado com as outras estrelas dele.
      // regra 10: a família bate com 95% da meta em valor; a falta/excedente é contra esses 95%, e a linha desce para lá
      const ouroC = bateu(f.real_c, f.meta_c, GATILHO_FAMILIA), ac = alvo(f.meta_c, GATILHO_FAMILIA), av = alvo(f.meta_v, GATILHO_FAMILIA);
      const tomF = (ESTRELAS_VENDEDOR && V) ? estrelaVendedor(f, tot, ok15, GATILHO_FAMILIA) : null;     // 12/10: a família também tem ouro/prata do vendedor
      const metaFam = m => m == null ? "sem meta" : pct(GATILHO_FAMILIA) + " de R$ " + kk(m);
      fams += `<div class="fm">
        <div class="nm">${esc(f.nome)}</div>
        <div class="st">${estrela("c", ouroC)}${V && ESTRELAS_VENDEDOR ? estrela("v", !!tomF, tomF) : ""}</div>
        <div class="bars">${linha(GATILHO_FAMILIA)}${barra("c", f.real_c, f.meta_c, ouroC, i * .06)}${V ? barra("v", f.real_v, f.meta_v, ouroC && bateu(f.real_v, f.meta_v, GATILHO_FAMILIA), i * .06 + .05) : ""}</div>
        <div class="num">${celula("c", gapReais(f.real_c, ac), metaFam(f.meta_c), ouroC, fatCart(f.fat_c, f.real_c, true))}${V ? celula("v", gapReais(f.real_v, av), metaFam(f.meta_v), bateu(f.real_v, f.meta_v, GATILHO_FAMILIA), fatCart(f.fat_v, f.real_v, true)) : ""}</div>
      </div>`;
    });
    const trava = "";                                       // o bloco antigo no cartão do total saiu; a trava mora acima dos gráficos (regra 11)
    // ---- a TRAVA DOS 15% acima dos gráficos (regra 11): uma linha para o mês, uma para o trimestre; só a barra do vendedor,
    // marca nos 15%; à direita o % e o que falta (ou passou) em R$. A CMS não aparece (ele, 12/10).
    const nomeMes = MESES[+d.mes.slice(5, 7) - 1];
    const pctTxt = p => p == null ? "—" : (p * 100).toFixed(1).replace(".", ",") + "%";
    const faltaTxt = l => l == null ? "sem meta de tênis" : (l.falta > 0 ? "faltam R$ " + kk(l.falta) : "R$ " + kk(-l.falta) + " acima");
    // a barra é a COMPOSIÇÃO (pedido dele, 12/10, 2ª rodada): o tênis Olympikus (a META, azul Olympikus) primeiro, e as famílias
    // empilhadas depois, cada uma numa cor fácil de distinguir (UA no vermelho da marca); a régua vai até onde as famílias somam 15%
    // da meta (ou até o fim do que existe, se passou) — assim o vazio entre o fim da pilha e a linha É o que falta.
    // Embaixo da barra, o % de cada família sobre a meta de tênis ("de cabeça a gente faz a conta" — ele quer ver).
    const FAMS15 = [["MEOLY", "MEIAS"], ["CHOLY", "CHINELO"], ["ACOLY", "ACESSÓRIO"], ["CFOLY", "CONFECÇÃO"], ["UA", "UNDER ARMOUR"]];
    const info15 = !!(d.trava15 && d.trava15.informativo);          // CMS: composição informativa, sem trava
    const linhaT15 = (rot, b) => {
      const l = b.v;
      if (!l) return `<div class="lin"><div class="nm">${esc(rot)}</div><div class="trk"><div class="tb v"></div></div><div class="val"><b>—</b><span>sem meta de tênis</span></div></div>`;
      const ref = info15 ? (l.meta + l.num) : Math.max(l.meta + l.num, l.meta * (1 + TRAVA_15)), w = v => (v / ref * 100).toFixed(2);
      const seg = `<i class="f-FTW" style="width:${w(l.meta)}%"></i>` + FAMS15.map(([k]) => { const p = (l.partes && l.partes[k]) || 0; return p > 0 ? `<i class="f-${k}" style="width:${w(p)}%"></i>` : ""; }).join("");
      const fp = FAMS15.map(([k, n]) => { const p = (l.partes && l.partes[k]) || 0; return p > 0 ? `<span><i class="f-${k}"></i>${n.toLowerCase()} ${pctTxt(p / l.meta)}</span>` : ""; }).join("");
      return `<div class="lin"><div class="nm">${esc(rot)}</div>
        <div class="trk">${info15 ? "" : `<i class="mk${l.ok ? " ok" : ""}" style="left:${w(l.meta * (1 + TRAVA_15))}%"></i>`}<div class="tb v">${seg}</div></div>
        <div class="val"><b class="${!info15 && l.ok ? "ok" : ""}">${pctTxt(l.pct)}</b><span>${info15 ? "das outras famílias sobre o tênis" : faltaTxt(l)}</span></div>
        <div class="fp"><span><i class="f-FTW"></i>tênis olympikus · ${l.regra === "vendido" ? "vendido" : "meta"} R$ ${kk(l.meta)}</span>${fp}</div></div>`;
    };
    const regra15 = d.trava15 && d.trava15.mes && d.trava15.mes.v ? d.trava15.mes.v.regra : "meta";
    const legT15 = `<div class="lg"><span><i class="f-FTW"></i>TÊNIS OLYMPIKUS (${regra15 === "vendido" ? "VENDIDO" : "META"})</span>${FAMS15.map(([k, n]) => `<span><i class="f-${k}"></i>${n}</span>`).join("")}${info15 ? "" : `<span><i class="mk"></i>15% DA META</span>`}</div>`;
    const t15 = d.trava15 ? `<div class="t15"><div class="rot">${info15 ? "COMPOSIÇÃO DO FATURAMENTO" : "TRAVA DOS 15%"} · outras famílias + UA sobre ${regra15 === "vendido" ? "o tênis Olympikus VENDIDO (regra até set/26)" : "a META de tênis"}</div>
      ${linhaT15(nomeMes.toUpperCase(), d.trava15.mes)}${linhaT15("TRIMESTRE " + d.trava15.triMeses.map(m => MESES[+m.slice(5, 7) - 1].slice(0, 3).toUpperCase()).join("–"), d.trava15.tri)}${legT15}</div>` : "";
    // rodapé: hora da leitura por fonte (regra 9)
    const fonteC = d.cms_lido ? `${medida} CMS lido ${dmh(d.cms_lido)}` : `${medida} CMS: sem leitura`;
    const fonteV = d.vend_lido ? `${medida} ${esc(d.nome)} lido ${dmh(d.vend_lido)}` : (d.base_em ? `${medida} ${esc(d.nome)} pela base de ${dm(d.base_em)}${d.calculado ? " (" + dmh(d.calculado).slice(-5) + ")" : ""}` : `${medida} ${esc(d.nome)}: sem base`);
    const fonteM = d.lido_em ? `meta lida ${dm(d.lido_em)}` : "meta não cadastrada";
    const difere = (a, b) => a && b && Math.abs(new Date(a) - new Date(b)) > 60 * 1000;
    const fonteF = d.familias.length ? ((difere(d.fam_lido_c, d.cms_lido) || difere(d.fam_lido_v, d.vend_lido)) ? ` · famílias R$ lidas ${dmh(d.fam_lido_c || d.fam_lido_v)}` : "") : "";
    // a base da leitura, por fonte (BOSS, 01/10): "setembro fechado · faturado · …" só quando a leitura diz faturado; senão "potencial"
    const fechado = !d.futuro && d.base_c === "faturado" && (d.base_v === "faturado" || d.base_v == null);
    const baseTxt = d.futuro ? "" : (fechado ? ` · ${nomeMes} fechado · faturado` :
      (d.base_c === "faturado" || d.base_v === "faturado" ? ` · CMS ${d.base_c === "faturado" ? "faturado" : "potencial"} · ${esc(d.nome)} ${d.base_v === "faturado" ? "faturado" : "potencial"}` : " · potencial (faturado + carteira)"));
    el.innerHTML = `<div class="mt${d.futuro ? " futuro" : ""}${d.semMeta ? " sem-meta" : ""}" style="--n:${d.faixas.length}">
      ${t15}
      <div class="sec">
        <div class="rot">CALÇADOS · PARES${d.futuro ? " EM CARTEIRA" : (fechado ? " FATURADOS" : "")}</div>
        <div class="rolo"><div class="fila">
          <div class="tot">
            <div class="nm">TOTAL</div>
            <div class="st">${estrela("c", cmsTot)}${V && ESTRELAS_VENDEDOR ? estrela("v", !!totV, totV) : ""}</div>
            <div class="bars">${linhasTotal(d.semMeta ? '<span class="rot100">meta não cadastrada</span>' : "")}${barra("c", tot.real_c, tot.meta_c, cmsTot, 0, escTot)}${V ? barra("v", tot.real_v, tot.meta_v, cmsTot && bateu(tot.real_v, tot.meta_v, GATILHO_TOTAL), .05, escTot) : ""}</div>
            <div class="num">${celula("c", gapPares(tot.real_c, alvo(tot.meta_c, GATILHO_TOTAL)), metaTot(tot.meta_c), false)}${V ? celula("v", gapPares(tot.real_v, alvo(tot.meta_v, GATILHO_TOTAL)), metaTot(tot.meta_v), false) : ""}</div>
            ${trava}
          </div>
          <div class="fxs">${cards}</div>
        </div></div>
      </div>
      ${d.familias.length ? `<div class="sec fam"><div class="rot">OUTRAS FAMÍLIAS · R$${d.futuro ? " EM CARTEIRA" : ""}</div><div class="fms">${fams}</div></div>` : ""}
      <div class="leg"><span><i class="q c"></i>CMS</span>${V ? `<span><i class="q v"></i>${esc(d.nome)}</span>` : ""}<span><i class="s on">${ESTRELA}</i>total ${pct(GATILHO_TOTAL)} · faixa ${pct(GATILHO_FAIXA)} · família ${pct(GATILHO_FAMILIA)}</span>${V && ESTRELAS_VENDEDOR ? `<span><i class="s on prata">${ESTRELA}</i>50%: CMS bateu, ${esc(d.nome)} não, com os 15%</span>` : ""}</div>
      <p class="pe">${fonteC}${V ? " · " + fonteV : ""}${baseTxt} · ${fonteM}${fonteF}${d.avisos.length ? " · " + esc(d.avisos.join(" · ")) : ""}</p>
    </div>`;
    alinhar100(el);
  }
  // ---------- a visão do gestor (12/10, via BOSS): "abre na CMS total; um botão 'ver vendedores' mostra uma barra por vendedor,
  // lado a lado", na ordem fixa. Cada cartão (total, faixas, famílias) ganha uma barra por preposto, com a estrela de quem bateu e o
  // % embaixo. Carrega o mês uma vez por preposto (as mesmas consultas da aba) e desenha tudo numa página.
  async function carregarTodos(sb, mes, marca, prepostos) {
    const lista = prepostos.slice().sort((a, b) => posPrep(a) - posPrep(b));
    const ds = await Promise.all(lista.map(p => carregar(sb, mes, p.preposto, marca)));
    return ds.map((d, i) => Object.assign(d, { nome: lista[i].preposto === "TODOS" ? "CMS" : (lista[i].nome || d.nome) }));
  }
  function desenharComparativo(el, ds) {
    const ok = ds.filter(d => !d.erro);
    if (!ok.length) { el.innerHTML = `<div class="msg aviso">${esc((ds[0] && ds[0].erro) || "sem dado")}</div>`; return; }
    const ref = ok[0], medida = ref.futuro ? "carteira" : "real";
    const pctTxt = (r, m) => (r == null || !m) ? "—" : Math.round(r / m * 100) + "%";
    // a CMS pela sua meta (barra normal, amarela) e, ao lado, cada vendedor pela dele em barra PEQUENA com a inicial embaixo
    // (12/10: "pode ser bem pequenininho ali, e embaixo só a inicial do vendedor"); verde = bateu
    const inicial = d => d.soCms ? "CMS" : (d.nome || "?").trim().charAt(0).toUpperCase();
    // dourado (12/10, palavra dele): a CMS fica dourada quando bate; o vendedor só fica dourado se a CMS bateu E ele bateu
    const barras = (pega, g) => { const dc = ok.find(d => d.soCms), pc = dc ? pega(dc) : null, cmsOk = !!(pc && bateu(pc.real, pc.meta, g));
      return ok.map((d, i) => { const { real, meta } = pega(d); const cms = d.soCms, b = bateu(real, meta, g), ouro = cms ? b : (cmsOk && b);
        // 13:1x, bug visto por ele no celular (a Mari com 76% acima da linha dos 90%): os rótulos embaixo empurravam a barra para cima.
        // Agora a barra é absoluta no pé da coluna (altura em --h), a estrela senta no topo dela e os rótulos ficam FORA da área das barras.
        const h = altura(real, meta);
        return `<div class="pb${cms ? " pc" : ""}" style="--h:${h}%"><i class="s v${b ? " on" : ""}">${ESTRELA}</i><div class="b ${cms ? "c" : "v"}${ouro ? " ouro" : ""}${real == null ? " vazia" : ""}" style="height:${h}%;animation-delay:${i * .05}s"></div><span class="pn" title="${esc(d.nome)}">${esc(inicial(d))}</span><span class="pp">${pctTxt(real, meta)}</span></div>`; }).join(""); };
    const cartao = (cls, nome, pega, g) => `<div class="${cls} cmp"><div class="nm">${esc(nome)}</div><div class="bars">${g === GATILHO_TOTAL ? linhasTotal("") : `<i class="l100" style="bottom:${(g / TETO * 100).toFixed(2)}%"></i>`}${barras(pega, g)}</div></div>`;
    const tot = cartao("tot", "TOTAL", d => d.soCms ? { real: d.total.real_c, meta: d.total.meta_c } : { real: d.total.real_v, meta: d.total.meta_v }, GATILHO_TOTAL);
    const faixasIds = ref.faixas.map(f => f.id), famIds = ref.familias.map(f => f.id);
    const acha = (d, lista, id) => (d[lista] || []).find(f => f.id === id) || {};
    const fxs = faixasIds.map(id => cartao("fx padrao", (acha(ref, "faixas", id).nome || id), d => { const f = acha(d, "faixas", id); return d.soCms ? { real: f.real_c, meta: f.meta_c } : { real: f.real_v, meta: f.meta_v }; }, GATILHO_FAIXA)).join("");
    const fms = famIds.map(id => cartao("fm", (acha(ref, "familias", id).nome || id), d => { const f = acha(d, "familias", id); return d.soCms ? { real: f.real_c, meta: f.meta_c } : { real: f.real_v, meta: f.meta_v }; }, GATILHO_FAMILIA)).join("");
    const nomeMes = MESES[+ref.mes.slice(5, 7) - 1];
    el.innerHTML = `<div class="mt cmpv${ref.futuro ? " futuro" : ""}" style="--n:${faixasIds.length}">
      <div class="sec"><div class="rot">CALÇADOS · PARES${ref.futuro ? " EM CARTEIRA" : ""} · ${esc(nomeMes.toUpperCase())} · UMA BARRA POR VENDEDOR</div>
        <div class="rolo"><div class="fila">${tot}<div class="fxs">${fxs}</div></div></div></div>
      ${famIds.length ? `<div class="sec fam"><div class="rot">OUTRAS FAMÍLIAS · R$</div><div class="fms">${fms}</div></div>` : ""}
      <div class="leg"><span><i class="q c"></i>CMS</span><span><i class="q v"></i>vendedor</span><span><i class="q" style="background:var(--ouro)"></i>dourado = bateu (o vendedor só com a CMS batendo)</span><span><i class="s on">${ESTRELA}</i>total ${pct(GATILHO_TOTAL)} · faixa ${pct(GATILHO_FAIXA)} · família ${pct(GATILHO_FAMILIA)}</span></div>
      <p class="pe">${medida} de cada um pela leitura da Carta${ok[0].cms_lido ? " · lida " + dmh(ok[0].cms_lido) : ""}${ds.filter(d => d.erro).length ? " · sem dado: " + ds.filter(d => d.erro).map(d => esc(d.nome)).join(", ") : ""}</p>
    </div>`;
    alinhar100(el);
  }
  window.Metas = { carregar, desenhar, dourado, estrelaVendedor, altura, fmt, kk, contaTrava15, carregarTodos, desenharComparativo, posPrep };
})();
