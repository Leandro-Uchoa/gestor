/* GESTOR · aba METAS — o painel de meta por vendedor, DESENHO só (TI, 29/09/2026). Os números vêm do banco, atrás do login;
   este arquivo vai ao repositório público e por isso NÃO tem número nenhum.
   O modelo é o que ele aprovou em 29/09 (BOSS, direto da ATA de 23/09, decisões 1–5, + regra 9 do briefing):
   • TOTAL primeiro, separado por uma linha vertical do resto
   • colunas verticais agrupadas lado a lado, sem blocos; em cada faixa CMS à esquerda, vendedor à direita (a CMS vem primeiro)
   • linha tracejada dos 100%; eixo até 150%; sem número de %
   • embaixo de cada faixa: falta (−) ou excedente (+); no computador também a meta; no celular a meta ao tocar
   • estados por faixa (decisão dele, segunda-feira): FOCO = cor viva e nome em negrito; PADRÃO = tom claro; ABANDONADO = opaco
     cinza com os números; CONQUISTADO = dourado
   • o dourado só quando a regra comercial paga (palavra dele, 29/09): a CMS doura quando bate o TOTAL; o vendedor só doura se a
     CMS bateu o total E ele bateu o total dele. A barra da faixa doura quando o lado tem o total batido e a faixa também.
   • animação: as barras sobem em ~1,4 s ao abrir e PARAM (animação é evento; estado é repouso)
   SELETOR DE MÊS (pedido dele, 29/09 à tarde): SET · OUT · NOV · DEZ, abrindo no mês corrente. Mês à frente = CARTEIRA (etiqueta
   "carteira", nunca "real"): a do vendedor sai calculada da base (CART por mês de PREV FAT, por faixa, só quem pontua); a da CMS é a
   leitura do NÚCLEO. Mês sem meta cadastrada: a barra aparece e a linha diz "meta não cadastrada" — meta nunca é inventada.
   O rodapé diz de onde veio cada número, com a hora. */
(function () {
  const H100 = 133, HMAX = 200, POCO = 24;
  const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const fmt = n => { n = Math.round(n); return (n < 0 ? "-" : "") + Math.abs(n).toLocaleString("pt-BR"); };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const dmy = iso => iso ? iso.slice(8,10)+"/"+iso.slice(5,7)+"/"+iso.slice(0,4) : "";
  const dm = iso => iso ? iso.slice(8,10)+"/"+iso.slice(5,7) : "";
  const dmh = iso => { if (!iso) return "—"; const d = new Date(iso); if (isNaN(d)) return dm(iso); return d.toLocaleDateString("pt-BR").slice(0, 5) + " " + d.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}); };
  const bateu = (real, meta) => meta != null && real != null && real >= meta;
  const extra = (real, meta) => { const d = meta - real; return d > 0 ? ["-" + fmt(d), "falta"] : ["+" + fmt(-d), "excedente"]; };
  const curto = n => { const a = Math.abs(n), s = n < 0 ? "-" : "+"; return a >= 1000 ? s + (a / 1000).toFixed(1).replace(".", ",").replace(",0", "") + "k" : s + a; };
  const CURTOS = { "CONF_MASC": "C. MASC", "CORRIDA/TREINO": "CORR. TR", "CONF_FEM": "C. FEM", "CLASSICOS": "CLÁSS", "INFANTIL": "INFANT", "CORRE": "CORRE", "RUNNING": "RUNN", "TRAINING": "TRAIN", "RUN INSPIRED": "RUN INSP", "BASKETBALL": "BASKET" };
  const dois = (n, longo) => `<span class="longo">${longo}</span><span class="cur">${curto(n)}</span>`;
  const mesAtual = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };

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
      tudo(sb.from("faixa_carta").select("faixa,ordem,total,unidade").eq("marca", marca).eq("unidade", "pares").order("ordem")),
      tudo(sb.from("v_meta_real").select("preposto,faixa,total,meta_pares,carta,lido_em").eq("marca", marca).eq("mes", mes01).in("preposto", [preposto, "TODOS"])),
      tudo(sb.from("v_carteira_faixa").select("faixa,pares_fat,pares_cart,base_em").eq("marca", marca).eq("mes", mes01).eq("preposto", preposto)),
      tudo(sb.from("carta_real").select("preposto,faixa,real_pares,lido_em").eq("marca", marca).eq("mes", mes01).in("preposto", [preposto, "TODOS"])),
      tudo(sb.from("v_decisao_vigente").select("faixa,estado").eq("marca", marca).eq("preposto", preposto).eq("mes", mes01)),
      sb.from("preposto").select("nome").eq("preposto", preposto).maybeSingle(),
      sb.from("carga").select("carregado_em").eq("fonte", "DETALHADA").eq("status", "ok").order("id", { ascending: false }).limit(1),
    ]);
    if (fx.error || vm.error || cf.error || cr.error) return { erro: "o banco recusou: " + (fx.error || vm.error || cf.error || cr.error).message, meses, mes };
    const meta = {}; for (const r of vm.data) meta[r.preposto + "|" + r.faixa] = r;
    const base = {}; for (const r of cf.data) base[r.faixa] = r;
    const lido = {}; for (const r of cr.data) lido[r.preposto + "|" + r.faixa] = r;
    const decisao = {}; for (const r of dec.data || []) decisao[r.faixa] = r.estado;
    const faixas = []; let totRow = null, avisos = [];
    for (const f of fx.data) {
      const mv = meta[preposto + "|" + f.faixa], mc = meta["TODOS|" + f.faixa], b = base[f.faixa], lv = lido[preposto + "|" + f.faixa], lc = lido["TODOS|" + f.faixa];
      if (f.total) { totRow = { meta_v: mv ? mv.meta_pares : null, meta_c: mc ? mc.meta_pares : null, lido_v: lv, lido_c: lc, carta: (mv && mv.carta) || (mc && mc.carta) || "", lido_em: (mv && mv.lido_em) || (mc && mc.lido_em) }; continue; }
      // vendedor: mês corrente = real (fat + cart do mês) ou a leitura da Carta quando existe; mês à frente = CARTEIRA calculada da base
      const calc = b ? (futuro ? (b.pares_cart || 0) : (b.pares_fat || 0) + (b.pares_cart || 0)) : null;
      const real_v = (!futuro && lv) ? lv.real_pares : calc;
      const real_c = lc ? lc.real_pares : null;
      faixas.push({ id: f.faixa, nome: f.faixa.replace("_", " ").replace("/", " / "), meta_v: mv ? mv.meta_pares : null, real_v, meta_c: mc ? mc.meta_pares : null, real_c,
                    estado: decisao[f.faixa] || "sem_tratamento", base_em: b ? b.base_em : null, vend_lido: (!futuro && lv) ? lv.lido_em : null, cms_lido: lc ? lc.lido_em : null });
    }
    if (!faixas.length) return { erro: "faixa_carta sem faixas em pares para " + marca, meses, mes };
    const soma = (k) => faixas.some(f => f[k] != null) ? faixas.reduce((s, f) => s + (f[k] || 0), 0) : null;
    const total = { meta_v: totRow && totRow.meta_v != null ? totRow.meta_v : soma("meta_v"), meta_c: totRow && totRow.meta_c != null ? totRow.meta_c : soma("meta_c"),
                    real_v: (!futuro && totRow && totRow.lido_v) ? totRow.lido_v.real_pares : soma("real_v"), real_c: (totRow && totRow.lido_c) ? totRow.lido_c.real_pares : soma("real_c") };
    const semMeta = total.meta_v == null || total.meta_c == null;
    if (faixas.every(f => f.real_c == null)) avisos.push("CMS sem leitura para " + MESES[+mes.slice(5, 7) - 1]);
    return { mes, meses, hoje, futuro, marca, preposto, nome: (pre.data && pre.data.nome) || preposto, faixas, total, semMeta, avisos,
             base_em: (faixas.find(f => f.base_em) || {}).base_em, calculado: cg.data && cg.data[0] ? cg.data[0].carregado_em : null,
             carta: totRow ? totRow.carta : "", lido_em: totRow ? totRow.lido_em : null,
             vend_lido: (faixas.find(f => f.vend_lido) || {}).vend_lido, cms_lido: (totRow && totRow.lido_c && totRow.lido_c.lido_em) || (faixas.find(f => f.cms_lido) || {}).cms_lido };
  }

  // ---------- a regra do dourado e o desenho
  function dourado(f, tot) {
    const cmsTotal = bateu(tot.real_c, tot.meta_c), vendTotal = bateu(tot.real_v, tot.meta_v);
    return { cms: cmsTotal && bateu(f.real_c, f.meta_c), vend: cmsTotal && vendTotal && bateu(f.real_v, f.meta_v) };
  }
  // altura: com meta, 100% = H100; sem meta, o maior valor do bloco encosta na linha (que então diz "meta não cadastrada")
  function altura(real, meta, escala) {
    if (real == null || real <= 0) return 0;
    const at = meta ? real / meta : (escala ? real / escala : 0);
    return Math.round(Math.min(at * H100, HMAX));
  }
  const alturaNeg = (real, meta, escala) => { const ref = meta || escala; return (!ref || real == null || real >= 0) ? 0 : Math.round(Math.min(-real / ref * H100, POCO)); };
  function barra(quem, real, meta, ouro, atraso, escala) {
    if (real == null) return `<div class="cb"><div class="b ${quem} vazia"></div></div>`;
    if (real < 0) return `<div class="cb"><div class="b neg" style="height:${alturaNeg(real, meta, escala)}px"></div></div>`;
    return `<div class="cb"><div class="b ${quem}${ouro ? " ouro" : ""}" style="height:${altura(real, meta, escala)}px;animation-delay:${atraso || 0}s"></div></div>`;
  }
  const celFal = (real, meta, cls) => { if (real == null || meta == null) return `<div class="c fal ${cls}">—</div>`; const [t, k] = extra(real, meta); return `<div class="c fal ${cls} ${k}">${dois(real - meta, t)}</div>`; };
  const celMet = (meta, cls) => `<div class="c met ${cls}">${meta == null ? "—" : fmt(meta)}</div>`;

  function desenhar(el, d) {
    if (d.erro) { el.innerHTML = `<div class="msg aviso">${esc(d.erro)}</div>`; return; }
    const per = MESES[+d.mes.slice(5, 7) - 1] + "/" + d.mes.slice(2, 4);
    const tot = d.total, n = d.faixas.length, medida = d.futuro ? "carteira" : "real";
    const escala = d.semMeta ? Math.max(1, ...d.faixas.flatMap(f => [f.real_v || 0, f.real_c || 0]), (tot.real_v || 0) / 4, (tot.real_c || 0) / 4) : null;
    const dt = d.semMeta ? { cms: false, vend: false } : { cms: bateu(tot.real_c, tot.meta_c), vend: bateu(tot.real_c, tot.meta_c) && bateu(tot.real_v, tot.meta_v) };
    let cols = "", r1 = "", r2 = "", r3 = "", r4 = "";
    d.faixas.forEach((f, i) => {
      const g = d.semMeta ? { cms: false, vend: false } : dourado(f, tot), est = f.estado === "sem_tratamento" ? "padrao" : f.estado;
      const neg = (f.real_v != null && f.real_v < 0) || (f.real_c != null && f.real_c < 0);
      const nome = f.nome.split(" / ").map(esc).join("<br>"), nomeCurto = esc(CURTOS[f.id] || f.nome.slice(0, 7));
      const fe = f.meta_v || f.meta_c ? null : escala;
      cols += `<div class="col ${est}${neg ? " poco" : ""}" data-i="${i}"><div class="bars">${barra("cms", f.real_c, f.meta_c, g.cms, i * .06, fe)}${barra("vend", f.real_v, f.meta_v, g.vend, i * .06 + .05, fe)}</div>` +
              `<div class="nome"><span class="longo">${nome}</span><span class="cur">${nomeCurto}</span></div>` +
              `<div class="pop"><span class="cms">meta ${f.meta_c == null ? "não cadastrada" : fmt(f.meta_c)}</span><span class="vend">meta ${f.meta_v == null ? "não cadastrada" : fmt(f.meta_v)}</span></div></div>`;
      r1 += celMet(f.meta_c, "cms " + est); r2 += celFal(f.real_c, f.meta_c, "cms " + est);
      r3 += celMet(f.meta_v, "vend " + est); r4 += celFal(f.real_v, f.meta_v, "vend " + est);
    });
    const marcaNome = d.marca === "OLY" ? "Olympikus calçados" : (d.marca === "UA" ? "Under Armour calçados" : d.marca);
    const escTot = d.semMeta ? Math.max(1, tot.real_v || 0, tot.real_c || 0) : null;
    const linha100 = d.semMeta ? `<span class="rot100">meta não cadastrada</span>` : "";
    // rodapé: de onde veio cada número, com a hora — carteira/real do vendedor (base ou leitura), CMS (leitura do NÚCLEO), meta
    const fonteV = d.vend_lido ? `${medida} ${esc(d.nome)} lido ${dmh(d.vend_lido)}` : (d.base_em ? `${medida} ${esc(d.nome)} pela base de ${dm(d.base_em)}${d.calculado ? " (" + dmh(d.calculado).slice(-5) + ")" : ""}` : `${medida} ${esc(d.nome)}: sem base`);
    const fonteC = d.cms_lido ? `${medida} CMS lido ${dmh(d.cms_lido)}` : `${medida} CMS: sem leitura`;
    const fonteM = d.lido_em ? `meta lida ${dm(d.lido_em)}` : "meta não cadastrada";
    el.innerHTML = `<div class="metas${d.futuro ? " futuro" : ""}${d.semMeta ? " sem-meta" : ""}" style="--n:${n}">
      <div class="cab"><h2>${esc(marcaNome)} · ${esc(d.nome)}</h2><span class="per">${per} · pares · <b class="medida">${medida}</b></span>
        <div class="leg"><span><i class="lc"></i>CMS</span><span><i class="lv"></i>${esc(d.nome)}</span></div></div>
      <div class="grade">
        <div class="tot col" data-i="t"><div class="bars">${barra("cms", tot.real_c, tot.meta_c, dt.cms, 0, escTot)}${barra("vend", tot.real_v, tot.meta_v, dt.vend, .05, escTot)}</div><div class="nome"><b>TOTAL</b></div>
          <div class="pop"><span class="cms">meta ${tot.meta_c == null ? "não cadastrada" : fmt(tot.meta_c)}</span><span class="vend">meta ${tot.meta_v == null ? "não cadastrada" : fmt(tot.meta_v)}</span></div></div>
        <div class="area"><div class="gr"></div><div class="gr cem">${linha100}</div><div class="gr"></div><div class="gr"></div><div class="cols">${cols}</div></div>
      </div>
      <div class="faixa">
        <div class="r meta">${celMet(tot.meta_c, "cms").replace('class="c ', 'class="tc ')}<div class="lin">${r1}</div></div>
        <div class="r">${celFal(tot.real_c, tot.meta_c, "cms").replace('class="c ', 'class="tc ')}<div class="lin">${r2}</div></div>
        <div class="r meta">${celMet(tot.meta_v, "vend").replace('class="c ', 'class="tc ')}<div class="lin">${r3}</div></div>
        <div class="r">${celFal(tot.real_v, tot.meta_v, "vend").replace('class="c ', 'class="tc ')}<div class="lin">${r4}</div></div>
      </div>
      <p class="pe">${fonteC} · ${fonteV} · ${fonteM}${d.avisos.length ? " · " + esc(d.avisos.join(" · ")) : ""}</p>
    </div>`;
    for (const c of el.querySelectorAll(".metas .col")) c.onclick = () => { const on = c.classList.contains("aberta"); for (const x of el.querySelectorAll(".metas .col.aberta")) x.classList.remove("aberta"); if (!on) c.classList.add("aberta"); };
  }
  window.Metas = { carregar, desenhar, dourado, altura, extra, fmt };
})();
