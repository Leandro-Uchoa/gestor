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
      (fat_pares), a coluna mostra os dois e não mistura. */
(function () {
  const ESTRELAS_VENDEDOR = false;     // ordem dele, 30/09: fora até segunda ordem (a regra ouro/prata está em estrelaVendedor)
  const TRAVA_15 = false;              // idem: o bloco da trava não entra na tela
  const TETO = 1.5;                    // o eixo vai até 150% da meta; a linha dos 100% fica a 2/3 da altura
  const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  // nome por extenso e ORDEM de exibição (regra 2 e 6); o que não estiver aqui segue a ordem da faixa_carta, com o nome da Carta
  const NOMES = { "CLASSICOS": "CLÁSSICOS", "CONF_FEM": "CONF. FEMININO", "CONF_MASC": "CONF. MASCULINO", "CORRIDA/TREINO": "CORRIDA TREINO", "INFANTIL": "INFANTIL", "CORRE": "CORRE",
                  "ACOLY": "ACESSÓRIO", "MEOLY": "MEIAS", "CHOLY": "CHINELO", "CFOLY": "CONFECÇÃO", "UA_AC": "ACESSÓRIO", "UA_ME": "MEIAS", "UA_CH": "CHINELO", "UA_CF": "CONFECÇÃO" };
  const ORDEM = { "CLASSICOS": 1, "CONF_FEM": 2, "CONF_MASC": 3, "CORRIDA/TREINO": 4, "INFANTIL": 5, "CORRE": 6, "ACOLY": 1, "MEOLY": 2, "CHOLY": 3, "CFOLY": 4, "UA_AC": 1, "UA_ME": 2, "UA_CH": 3, "UA_CF": 4 };
  const ESTRELA = '<svg viewBox="0 0 24 24"><path d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7z"/></svg>';

  const fmt = n => { n = Math.round(n); return (n < 0 ? "−" : "") + Math.abs(n).toLocaleString("pt-BR"); };
  const kk = v => { const a = Math.abs(v); if (a >= 1e6) return (a / 1e6).toFixed(2).replace(".", ",") + "M"; return a >= 1000 ? (a / 1000).toFixed(1).replace(".", ",") + "k" : String(Math.round(a)); };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const dm = iso => iso ? iso.slice(8,10)+"/"+iso.slice(5,7) : "";
  const dmh = iso => { if (!iso) return "—"; const d = new Date(iso); if (isNaN(d)) return dm(iso); return d.toLocaleDateString("pt-BR").slice(0, 5) + " " + d.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}); };
  const bateu = (real, meta) => meta != null && real != null && real >= meta;
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
    const [fx, vm, cf, cr, dec, pre, cg] = await Promise.all([
      tudo(sb.from("faixa_carta").select("faixa,ordem,total,unidade").eq("marca", marca).order("ordem")),
      tudo(sb.from("v_meta_real").select("preposto,faixa,total,unidade,meta_pares,valor_ref_rs,carta,lido_em").eq("marca", marca).eq("mes", mes01).in("preposto", [preposto, "TODOS"])),
      tudo(sb.from("v_carteira_faixa").select("faixa,pares_fat,pares_cart,base_em").eq("marca", marca).eq("mes", mes01).eq("preposto", preposto)),
      tudo(sb.from("carta_real").select("preposto,faixa,real_pares,real_rs,fat_pares,fat_rs,lido_em").eq("marca", marca).eq("mes", mes01).in("preposto", [preposto, "TODOS"])),
      tudo(sb.from("v_decisao_vigente").select("faixa,estado").eq("marca", marca).eq("preposto", preposto).eq("mes", mes01)),
      sb.from("preposto").select("nome").eq("preposto", preposto).maybeSingle(),
      sb.from("carga").select("carregado_em").eq("fonte", "DETALHADA").eq("status", "ok").order("id", { ascending: false }).limit(1),
    ]);
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
    return { mes, meses, hoje, futuro, marca, preposto, nome: (pre.data && pre.data.nome) || preposto, faixas, familias, total, semMeta, avisos, trava15: null,
             base_em: (faixas.find(f => f.base_em) || {}).base_em, calculado: cg.data && cg.data[0] ? cg.data[0].carregado_em : null,
             carta: totRow ? totRow.carta : "", lido_em: totRow ? totRow.lido_em : null,
             vend_lido: (faixas.find(f => f.vend_lido) || {}).vend_lido, cms_lido: (totRow && totRow.lido_c && totRow.lido_c.lido_em) || (faixas.find(f => f.cms_lido) || {}).cms_lido,
             fam_lido_c: (familias.find(f => f.cms_lido) || {}).cms_lido, fam_lido_v: (familias.find(f => f.vend_lido) || {}).vend_lido };
  }

  // ---------- as regras
  // ouro da CMS: só quando ela bateu o TOTAL — no total e em cada faixa que bateu (regra 5)
  function dourado(f, tot) {
    const cmsTotal = bateu(tot.real_c, tot.meta_c);
    return { cms: cmsTotal && bateu(f.real_c, f.meta_c), vend: estrelaVendedor(f, tot, null) === "ouro" };
  }
  // estrela do VENDEDOR (desligada, ESTRELAS_VENDEDOR): "ouro" = CMS bateu total e faixa, ele bateu a faixa e os 15%;
  // "prata" = CMS bateu total e faixa, ele NÃO bateu a faixa mas bateu os 15%; sem os 15% (trava15 !== true) nenhuma estrela.
  // O total do vendedor não é exigido (palavra dele, 17/09: "se a CMS fecha a meta e eu não, meu recebimento da faixa é 50%").
  function estrelaVendedor(f, tot, trava15) {
    if (trava15 !== true) return null;
    const cmsF = bateu(tot.real_c, tot.meta_c) && bateu(f.real_c, f.meta_c);
    if (!cmsF) return null;
    return bateu(f.real_v, f.meta_v) ? "ouro" : "prata";
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
  // faturado separado do potencial, quando a leitura trouxe (regra 9): "fat N + cart M"
  const fatCart = (fat, real, reais) => (fat == null || real == null) ? "" : (reais ? `fat R$ ${kk(fat)} + cart R$ ${kk(real - fat)}` : `fat ${fmt(fat)} + cart ${fmt(real - fat)}`);

  function desenhar(el, d) {
    if (d.erro) { el.innerHTML = `<div class="msg aviso">${esc(d.erro)}</div>`; return; }
    const tot = d.total, medida = d.futuro ? "carteira" : "real";
    const escala = d.semMeta ? Math.max(1, ...d.faixas.flatMap(f => [f.real_v || 0, f.real_c || 0])) : null;
    const escTot = d.semMeta ? Math.max(1, tot.real_v || 0, tot.real_c || 0) : null;
    const cmsTot = !d.semMeta && bateu(tot.real_c, tot.meta_c);
    const totV = ESTRELAS_VENDEDOR ? estrelaVendedor({ real_c: tot.real_c, meta_c: tot.meta_c, real_v: tot.real_v, meta_v: tot.meta_v }, tot, d.trava15) : null;
    let cards = "";
    d.faixas.forEach((f, i) => {
      const g = d.semMeta ? { cms: false, vend: false } : dourado(f, tot), est = f.estado === "sem_tratamento" ? "padrao" : f.estado;
      const tomV = ESTRELAS_VENDEDOR ? estrelaVendedor(f, tot, d.trava15) : null;
      const fe = f.meta_v || f.meta_c ? null : escala;
      cards += `<div class="fx ${esc(est)}">
        <div class="nm">${esc(f.nome)}</div>
        <div class="st">${estrela("c", g.cms)}${ESTRELAS_VENDEDOR ? estrela("v", !!tomV, tomV) : ""}</div>
        <div class="bars"><i class="l100"></i>${barra("c", f.real_c, f.meta_c, g.cms, i * .06, fe)}${barra("v", f.real_v, f.meta_v, tomV === "ouro", i * .06 + .05, fe)}</div>
        <div class="num">${celula("c", gapPares(f.real_c, f.meta_c), metaPares(f.meta_c), bateu(f.real_c, f.meta_c), fatCart(f.fat_c, f.real_c))}${celula("v", gapPares(f.real_v, f.meta_v), metaPares(f.meta_v), bateu(f.real_v, f.meta_v), d.futuro ? "" : fatCart(f.fat_v, f.real_v))}</div>
      </div>`;
    });
    let fams = "";
    d.familias.forEach((f, i) => {
      // família em R$ é meta própria em valor: o ouro da CMS acende quando ela bate a meta DAQUELA família, sem depender do total de
      // tênis (Léo via BOSS, 30/09). O ouro do vendedor na família segue desligado com as outras estrelas dele.
      const ouroC = bateu(f.real_c, f.meta_c);
      fams += `<div class="fm">
        <div class="nm">${esc(f.nome)}</div>
        <div class="st">${estrela("c", ouroC)}</div>
        <div class="bars"><i class="l100"></i>${barra("c", f.real_c, f.meta_c, ouroC, i * .06)}${barra("v", f.real_v, f.meta_v, false, i * .06 + .05)}</div>
        <div class="num">${celula("c", gapReais(f.real_c, f.meta_c), metaReais(f.meta_c), bateu(f.real_c, f.meta_c), fatCart(f.fat_c, f.real_c, true))}${celula("v", gapReais(f.real_v, f.meta_v), metaReais(f.meta_v), bateu(f.real_v, f.meta_v), fatCart(f.fat_v, f.real_v, true))}</div>
      </div>`;
    });
    // bloco da trava dos 15% (desligado, TRAVA_15): entra no cartão do total quando ele mandar
    const trava = (TRAVA_15 && d.trava15 != null) ? `<div class="trava"><div class="tl"><span>TRAVA 15%</span><b>${esc(d.trava15.pct)}</b></div><div class="tb"><i style="width:${Math.min(100, d.trava15.pct_meta || 0)}%"></i></div><span class="m">${esc(d.trava15.texto || "")}</span></div>` : "";
    // rodapé: hora da leitura por fonte (regra 9)
    const fonteC = d.cms_lido ? `${medida} CMS lido ${dmh(d.cms_lido)}` : `${medida} CMS: sem leitura`;
    const fonteV = d.vend_lido ? `${medida} ${esc(d.nome)} lido ${dmh(d.vend_lido)}` : (d.base_em ? `${medida} ${esc(d.nome)} pela base de ${dm(d.base_em)}${d.calculado ? " (" + dmh(d.calculado).slice(-5) + ")" : ""}` : `${medida} ${esc(d.nome)}: sem base`);
    const fonteM = d.lido_em ? `meta lida ${dm(d.lido_em)}` : "meta não cadastrada";
    const difere = (a, b) => a && b && Math.abs(new Date(a) - new Date(b)) > 60 * 1000;
    const fonteF = d.familias.length ? ((difere(d.fam_lido_c, d.cms_lido) || difere(d.fam_lido_v, d.vend_lido)) ? ` · famílias R$ lidas ${dmh(d.fam_lido_c || d.fam_lido_v)}` : "") : "";
    const potencial = d.futuro ? "" : " · potencial (faturado + carteira)";
    el.innerHTML = `<div class="mt${d.futuro ? " futuro" : ""}${d.semMeta ? " sem-meta" : ""}" style="--n:${d.faixas.length}">
      <div class="sec">
        <div class="rot">CALÇADOS · PARES${d.futuro ? " EM CARTEIRA" : ""}</div>
        <div class="rolo"><div class="fila">
          <div class="tot">
            <div class="nm">TOTAL</div>
            <div class="st">${estrela("c", cmsTot)}${ESTRELAS_VENDEDOR ? estrela("v", !!totV, totV) : ""}</div>
            <div class="bars"><i class="l100">${d.semMeta ? '<span class="rot100">meta não cadastrada</span>' : ""}</i>${barra("c", tot.real_c, tot.meta_c, cmsTot, 0, escTot)}${barra("v", tot.real_v, tot.meta_v, totV === "ouro", .05, escTot)}</div>
            <div class="num">${celula("c", gapPares(tot.real_c, tot.meta_c), metaPares(tot.meta_c), false)}${celula("v", gapPares(tot.real_v, tot.meta_v), metaPares(tot.meta_v), false)}</div>
            ${trava}
          </div>
          <div class="fxs">${cards}</div>
        </div></div>
      </div>
      ${d.familias.length ? `<div class="sec fam"><div class="rot">OUTRAS FAMÍLIAS · R$${d.futuro ? " EM CARTEIRA" : ""}</div><div class="fms">${fams}</div></div>` : ""}
      <div class="leg"><span><i class="q c"></i>CMS</span><span><i class="q v"></i>${esc(d.nome)}</span><span><i class="s on">${ESTRELA}</i>100%</span>${ESTRELAS_VENDEDOR ? `<span><i class="s on prata">${ESTRELA}</i>50%</span>` : ""}</div>
      <p class="pe">${fonteC} · ${fonteV}${potencial} · ${fonteM}${fonteF}${d.avisos.length ? " · " + esc(d.avisos.join(" · ")) : ""}</p>
    </div>`;
  }
  window.Metas = { carregar, desenhar, dourado, estrelaVendedor, altura, fmt, kk };
})();
