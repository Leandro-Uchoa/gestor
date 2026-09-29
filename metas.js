/* GESTOR · aba METAS — o painel de meta por vendedor, DESENHO só (TI, 29/09/2026). Os números vêm do banco, atrás do login;
   este arquivo vai ao repositório público e por isso NÃO tem número nenhum.
   O modelo é o que ele aprovou em 29/09 (BOSS, direto da ATA de 23/09, decisões 1–5, + regra 9 do briefing):
   • TOTAL primeiro, separado por uma linha vertical do resto
   • colunas verticais agrupadas lado a lado, sem blocos; em cada faixa CMS à esquerda, vendedor à direita (a CMS vem primeiro)
   • linha tracejada dos 100%; eixo até 150%; sem número de %
   • embaixo de cada faixa: meta CMS em pares e falta (−) ou excedente (+); meta do vendedor e falta ou excedente
   • estados por faixa (decisão dele, segunda-feira): FOCO = cor viva e nome em negrito; PADRÃO = tom claro; ABANDONADO = opaco
     cinza com os números; CONQUISTADO = dourado
   • o dourado só quando a regra comercial paga (palavra dele, 29/09): a CMS doura quando bate o TOTAL; o vendedor só doura se a
     CMS bateu o total E ele bateu o total dele. A barra da faixa doura quando o lado tem o total batido e a faixa também.
   • animação: as barras sobem em ~1,4 s ao abrir e PARAM (animação é evento; estado é repouso) */
(function () {
  const H100 = 133, HMAX = 200, POCO = 24;
  const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const fmt = n => { n = Math.round(n); return (n < 0 ? "-" : "") + Math.abs(n).toLocaleString("pt-BR"); };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const dmy = iso => iso ? iso.slice(8,10)+"/"+iso.slice(5,7)+"/"+iso.slice(0,4) : "";
  const dmyh = iso => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? dmy(iso) : d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}); };
  const bateu = (real, meta) => meta != null && real != null && real >= meta;
  const altura = (real, meta) => (!meta || real == null || real <= 0) ? 0 : Math.round(Math.min(real / meta * H100, HMAX));
  const alturaNeg = (real, meta) => (!meta || real == null || real >= 0) ? 0 : Math.round(Math.min(-real / meta * H100, POCO));
  const extra = (real, meta) => { const d = meta - real; return d > 0 ? ["-" + fmt(d), "falta"] : ["+" + fmt(-d), "excedente"]; };

  // ---------- leitura do banco: tudo em páginas de 1.000 (a API corta em silêncio)
  async function tudo(consulta) {
    const PAG = 1000; let de = 0, out = [];
    for (;;) { const { data, error } = await consulta.range(de, de + PAG - 1); if (error) return { data: out, error }; out = out.concat(data || []); if (!data || data.length < PAG) return { data: out, error: null }; de += PAG; }
  }
  async function carregar(sb, mes, preposto, marca) {
    marca = marca || "OLY";
    if (!preposto) {                       // o código do preposto mora no banco (tabela preposto); a página não o carrega
      const { data: ps } = await sb.from("preposto").select("preposto,nome").neq("preposto", "TODOS").order("preposto").limit(1);
      if (!ps || !ps.length) return { erro: "o banco não tem preposto cadastrado" };
      preposto = ps[0].preposto;
    }
    const { data: vm, error } = await tudo(sb.from("v_meta_real").select("mes,marca,preposto,faixa,ordem,total,meta_pares,real_fat,real_cart,real_pares,base_em,carta,lido_em,real_carta,real_carta_lido_em")
      .eq("marca", marca).eq("unidade", "pares").in("preposto", [preposto, "TODOS"]).order("ordem"));
    if (error) return { erro: "o banco recusou: " + error.message };
    const meses = [...new Set(vm.map(r => r.mes.slice(0, 7)))].sort();
    if (!meses.length) return { erro: "o banco ainda não tem meta nenhuma", meses };
    mes = mes && meses.includes(mes) ? mes : meses[meses.length - 1];
    const rows = vm.filter(r => r.mes.slice(0, 7) === mes);
    const { data: dec } = await tudo(sb.from("v_decisao_vigente").select("faixa,estado,decidido_por,decidido_em").eq("marca", marca).eq("preposto", preposto).eq("mes", mes + "-01"));
    const decisao = {}; for (const d of dec || []) decisao[d.faixa] = d;
    const { data: pre } = await sb.from("preposto").select("nome").eq("preposto", preposto).maybeSingle();
    const { data: cg } = await sb.from("carga").select("carregado_em").eq("fonte", "DETALHADA").eq("status", "ok").order("id", { ascending: false }).limit(1);
    const cms = {}; for (const r of rows.filter(r => r.preposto === "TODOS")) cms[r.faixa] = r;
    const faixas = [], faltas = [];
    let totV = null, totC = null;
    for (const r of rows.filter(r => r.preposto === preposto)) {
      const c = cms[r.faixa];
      if (r.total) { totV = r; totC = c; continue; }
      if (r.meta_pares == null || r.real_pares == null || !c || c.meta_pares == null || c.real_carta == null) { faltas.push(r.faixa); continue; }
      faixas.push({ id: r.faixa, nome: r.faixa.replace("_", " ").replace("/", " / "), meta_v: r.meta_pares, real_v: r.real_pares, fat: r.real_fat || 0, cart: r.real_cart || 0,
                    meta_c: c.meta_pares, real_c: c.real_carta, estado: (decisao[r.faixa] || {}).estado || "sem_tratamento" });
    }
    if (!faixas.length) return { erro: "sem faixa com meta e real completos para " + mes + (faltas.length ? " (faltam: " + faltas.join(", ") + ")" : ""), meses };
    const total = { meta_v: totV ? totV.meta_pares : faixas.reduce((s, f) => s + f.meta_v, 0), real_v: faixas.reduce((s, f) => s + f.real_v, 0),
                    meta_c: totC ? totC.meta_pares : faixas.reduce((s, f) => s + f.meta_c, 0), real_c: (totC && totC.real_carta != null) ? totC.real_carta : faixas.reduce((s, f) => s + f.real_c, 0) };
    return { mes, meses, marca, preposto, nome: (pre && pre.nome) || preposto, faixas, total, faltas,
             base_em: faixas[0] && rows[0].base_em, calculado: cg && cg[0] ? cg[0].carregado_em : null, carta: rows[0].carta || "", lido_em: rows[0].lido_em,
             cms_lido: (totC && totC.real_carta_lido_em) || (cms[faixas[0].id] || {}).real_carta_lido_em };
  }

  // ---------- as regras do dourado (a conta) e o desenho
  function dourado(f, tot) {
    const cmsTotal = bateu(tot.real_c, tot.meta_c), vendTotal = bateu(tot.real_v, tot.meta_v);
    return { cms: cmsTotal && bateu(f.real_c, f.meta_c), vend: cmsTotal && vendTotal && bateu(f.real_v, f.meta_v) };
  }
  function barra(quem, real, meta, ouro, atraso) {
    if (real != null && real < 0) return `<div class="cb"><div class="b neg" style="height:${alturaNeg(real, meta)}px"></div></div>`;
    return `<div class="cb"><div class="b ${quem}${ouro ? " ouro" : ""}" style="height:${altura(real, meta)}px;animation-delay:${atraso || 0}s"></div></div>`;
  }
  // abreviação só no celular (ordem dele 29/09, 15:57: "muito poluído"): −3,6k · +2,3k; abaixo de mil fica inteiro
  const curto = n => { const a = Math.abs(n), s = n < 0 ? "-" : "+"; return a >= 1000 ? s + (a / 1000).toFixed(1).replace(".", ",").replace(",0", "") + "k" : s + a; };
  const CURTOS = { "CONF_MASC": "C. MASC", "CORRIDA/TREINO": "CORR. TR", "CONF_FEM": "C. FEM", "CLASSICOS": "CLÁSS", "INFANTIL": "INFANT", "CORRE": "CORRE", "RUNNING": "RUNN", "TRAINING": "TRAIN", "RUN INSPIRED": "RUN INSP", "BASKETBALL": "BASKET" };
  const dois = (n, longo) => `<span class="longo">${longo}</span><span class="cur">${curto(n)}</span>`;
  function desenhar(el, d) {
    if (d.erro) { el.innerHTML = `<div class="msg aviso">${esc(d.erro)}</div>`; return; }
    const per = MESES[+d.mes.slice(5, 7) - 1] + "/" + d.mes.slice(2, 4);
    const tot = d.total, n = d.faixas.length;
    const dt = { cms: bateu(tot.real_c, tot.meta_c), vend: bateu(tot.real_c, tot.meta_c) && bateu(tot.real_v, tot.meta_v) };
    let cols = "", r1 = "", r2 = "", r3 = "", r4 = "";
    d.faixas.forEach((f, i) => {
      const g = dourado(f, tot), est = f.estado === "sem_tratamento" ? "padrao" : f.estado;
      const neg = f.real_v < 0 || f.real_c < 0;
      const nome = f.nome.split(" / ").map(esc).join("<br>"), nomeCurto = esc(CURTOS[f.id] || f.nome.slice(0, 7));
      // o nome mora embaixo do PRÓPRIO par de barras; o toque na coluna mostra a meta (no celular a meta não fica na tela)
      cols += `<div class="col ${est}${neg ? " poco" : ""}" data-i="${i}"><div class="bars">${barra("cms", f.real_c, f.meta_c, g.cms, i * .06)}${barra("vend", f.real_v, f.meta_v, g.vend, i * .06 + .05)}</div>` +
              `<div class="nome"><span class="longo">${nome}</span><span class="cur">${nomeCurto}</span></div>` +
              `<div class="pop"><span class="cms">meta ${fmt(f.meta_c)}</span><span class="vend">meta ${fmt(f.meta_v)}</span></div></div>`;
      const [ec, cc] = extra(f.real_c, f.meta_c), [ev, cv] = extra(f.real_v, f.meta_v);
      r1 += `<div class="c met cms ${est}">${fmt(f.meta_c)}</div>`; r2 += `<div class="c fal cms ${cc} ${est}">${dois(f.real_c - f.meta_c, ec)}</div>`;
      r3 += `<div class="c met vend ${est}">${fmt(f.meta_v)}</div>`; r4 += `<div class="c fal vend ${cv} ${est}">${dois(f.real_v - f.meta_v, ev)}</div>`;
    });
    const [etc, ctc] = extra(tot.real_c, tot.meta_c), [etv, ctv] = extra(tot.real_v, tot.meta_v);
    const marcaNome = d.marca === "OLY" ? "Olympikus calçados" : (d.marca === "UA" ? "Under Armour calçados" : d.marca);
    el.innerHTML = `<div class="metas" style="--n:${n}">
      <div class="cab"><h2>${esc(marcaNome)} · ${esc(d.nome)}</h2><span class="per">${per} · pares</span>
        <div class="leg"><span><i class="lc"></i>CMS</span><span><i class="lv"></i>${esc(d.nome)}</span></div></div>
      <div class="grade">
        <div class="tot col" data-i="t"><div class="bars">${barra("cms", tot.real_c, tot.meta_c, dt.cms, 0)}${barra("vend", tot.real_v, tot.meta_v, dt.vend, .05)}</div><div class="nome"><b>TOTAL</b></div>
          <div class="pop"><span class="cms">meta ${fmt(tot.meta_c)}</span><span class="vend">meta ${fmt(tot.meta_v)}</span></div></div>
        <div class="area"><div class="gr" style="bottom:200px"></div><div class="gr cem" style="bottom:${H100}px"></div><div class="gr" style="bottom:${Math.round(H100 / 2)}px"></div><div class="gr" style="bottom:0"></div><div class="cols">${cols}</div></div>
      </div>
      <div class="faixa">
        <div class="r meta"><div class="tc met cms">${fmt(tot.meta_c)}</div><div class="lin">${r1}</div></div>
        <div class="r"><div class="tc fal cms ${ctc}">${dois(tot.real_c - tot.meta_c, etc)}</div><div class="lin">${r2}</div></div>
        <div class="r meta"><div class="tc met vend">${fmt(tot.meta_v)}</div><div class="lin">${r3}</div></div>
        <div class="r"><div class="tc fal vend ${ctv}">${dois(tot.real_v - tot.meta_v, etv)}</div><div class="lin">${r4}</div></div>
      </div>
      <p class="pe">base de ${dmy(d.base_em).slice(0, 5)} · meta lida ${dmy(d.lido_em).slice(0, 5)}</p>
    </div>`;
    for (const c of el.querySelectorAll(".metas .col")) c.onclick = () => { const on = c.classList.contains("aberta"); for (const x of el.querySelectorAll(".metas .col.aberta")) x.classList.remove("aberta"); if (!on) c.classList.add("aberta"); };
  }
  window.Metas = { carregar, desenhar, dourado, altura, extra, fmt };
})();
