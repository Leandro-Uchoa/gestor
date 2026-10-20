/* GESTOR · funções puras da página, com teste próprio (teste_gestor_lib.js, roda em node). TI, 06/10/2026 — achados 3 e 4 do Conselho
   (MSG-CONSELHEIRO-032/BOSS-033): texto do banco interpolado em HTML sem escape; texto do usuário montando o filtro .or() do PostgREST.
   Sem número de negócio aqui: vai ao repositório público. 19/10: o seletor da casa e o PDF no navegador (carregarPdfLib, pdfDePaginas).
   20/10: o autofiltro do Excel (autofiltro, filtroPassa) — o mesmo na Análise de giro e na Carteira detalhada. */
(function () {
  // todo texto que vem do banco (cliente, referência, descrição, cor) ou de erro passa por aqui antes de virar HTML
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // O termo do usuário dentro de um filtro ilike do PostgREST, entre aspas duplas: aí vírgula, parêntese e ponto deixam de ser
  // sintaxe do filtro. Busca LITERAL: % e _ (curingas do ILIKE) ganham \ ; o * digitado vira curinga de propósito (%).
  // Camadas, de dentro para fora: (1) padrão do ILIKE (escape \ do Postgres); (2) aspas do PostgREST (\ e " escapados).
  // Nenhum caractere é cortado em silêncio — o que o usuário digitou é o que se procura.
  function padraoIlike(texto) {
    return "%" + String(texto).replace(/\\/g, "\\\\").replace(/[%_]/g, c => "\\" + c).replace(/\*/g, "%") + "%";
  }
  function citarPostgrest(valor) {
    return '"' + String(valor).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }
  const termoIlike = texto => citarPostgrest(padraoIlike(texto));
  const filtroProduto = texto => { const t = termoIlike(texto); return "referencia.ilike." + t + ",descricao.ilike." + t; };

  // O SELETOR (19/10/2026): o mesmo "campinho" da aba Carteira e giro e das Atas em todas as abas. opcoes = [[valor, rótulo, n?], …];
  // sel = Set (múltiplo) ou {v: valor} (único); aoMudar() depois de cada toque. Tudo DOM: nada de HTML de fora passa sem esc.
  function seletor(el, rotulo, opcoes, sel, aoMudar, opts) {
    opts = opts || {}; const unico = !!opts.unico, nomeDe = opts.nomeDe || (v => String(v));
    const marcado = v => unico ? sel.v === v : sel.has(v);
    const resumo = () => { if (unico) { const o = opcoes.find(x => x[0] === sel.v); return o ? nomeDe(o[0]) : (opts.vazio || "escolha"); } if (!sel.size) return (opts.todos || "todos") + " <small>" + opcoes.length + "</small>"; const ns = [...sel].map(nomeDe); return ns.slice(0, 3).join(", ") + (ns.length > 3 ? " <small>+" + (ns.length - 3) + "</small>" : ""); };
    el.classList.add("seletor");
    el.innerHTML = '<button type="button" class="sel-bt"><span class="sel-rot">' + esc(rotulo) + '</span><span class="sel-val">' + resumo() + '</span><span class="sel-seta">▾</span></button>'
      + '<div class="sel-lista oculto"><input type="search" placeholder="procurar…" autocomplete="off"><div class="sel-itens">'
      + (unico ? "" : '<label class="sel-item todos"><input type="checkbox" data-v=""' + (!sel.size ? " checked" : "") + '>' + esc(opts.todos || "todos") + '</label>')
      + opcoes.map(o => '<label class="sel-item' + (marcado(o[0]) ? " ativa" : "") + '"><input type="' + (unico ? "radio" : "checkbox") + '" data-v="' + esc(o[0]) + '"' + (marcado(o[0]) ? " checked" : "") + '>' + esc(o[1] != null ? o[1] : nomeDe(o[0])) + (o[2] != null ? ' <small>' + esc(o[2]) + '</small>' : "") + '</label>').join("") + '</div></div>';
    const bt = el.querySelector(".sel-bt"), lista = el.querySelector(".sel-lista"), busca = lista.querySelector("input[type=search]");
    const fechar = () => lista.classList.add("oculto");
    bt.onclick = ev => { ev.stopPropagation(); const aberto = !lista.classList.contains("oculto"); for (const l of document.querySelectorAll(".sel-lista")) l.classList.add("oculto"); if (!aberto) { lista.classList.remove("oculto"); busca.value = ""; for (const it of lista.querySelectorAll(".sel-item")) it.classList.remove("oculto"); busca.focus(); } };
    lista.onclick = ev => ev.stopPropagation();
    busca.oninput = () => { const q = semAcento(busca.value); for (const it of lista.querySelectorAll(".sel-item:not(.todos)")) it.classList.toggle("oculto", !!q && !semAcento(it.textContent).includes(q)); };
    for (const cb of lista.querySelectorAll("input[type=checkbox],input[type=radio]")) cb.onchange = () => {
      const v = cb.dataset.v;
      if (unico) { sel.v = v; fechar(); } else if (v === "") sel.clear(); else if (cb.checked) sel.add(v); else sel.delete(v);
      aoMudar(v);
    };
    return el;
  }
  if (typeof document !== "undefined" && !document.__seletorFecha) { document.__seletorFecha = true; document.addEventListener("click", () => { for (const l of document.querySelectorAll(".sel-lista")) l.classList.add("oculto"); }); }

  // ---- PDF NO PRÓPRIO NAVEGADOR (TI, 19/10/2026 — o padrão nasceu na apresentação do Raio-X e aqui vira função da casa, para a
  // Vitrine e o que vier): html2canvas fotografa UMA página por vez (o documento inteiro num canvas só passa do limite de altura do
  // navegador e sai em branco — medido em 19/10) e o jsPDF monta o arquivo; versões FIXAS no cdnjs, carregadas só na hora do clique.
  const CDN_CANVAS = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", CDN_JSPDF = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  const carregaScript = src => new Promise((ok, falha) => { const sc = document.createElement("script"); sc.src = src; sc.onload = () => ok(); sc.onerror = () => falha(new Error("não carreguei " + src.split("/").slice(-2)[0] + " (sem internet?)")); document.head.appendChild(sc); });
  async function carregarPdfLib() { if (!window.html2canvas) await carregaScript(CDN_CANVAS); if (!(window.jspdf && window.jspdf.jsPDF)) await carregaScript(CDN_JSPDF); }
  // o nome de arquivo da casa: "MM,AA CLIENTE - SUFIXO" (mês e ano de hoje; maiúsculas; sem os caracteres que o Windows proíbe)
  const nomeArquivoCasa = (cliente, sufixo) => { const d = new Date(); return (String(d.getMonth() + 1).padStart(2, "0") + "," + String(d.getFullYear()).slice(2) + " " + String(cliente || "").toUpperCase() + " - " + String(sufixo || "").toUpperCase()).replace(/[\/\\:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim(); };
  // espera as fotos do palco carregarem (ou falharem) — html2canvas fotografa o que está na tela naquele instante; sem esperar, sai sem foto
  const esperarImagens = (raiz, ms) => new Promise(ok => { const t0 = Date.now(); const v = () => { const imgs = [...raiz.querySelectorAll("img")]; if (imgs.every(i => i.complete) || Date.now() - t0 > ms) ok(imgs.filter(i => !i.complete || !i.naturalWidth).length); else setTimeout(v, 150); }; v(); });
  // pdfDePaginas(paginasHtml, css, nomeArq, opcoes): cada item de paginasHtml é UMA página (um elemento com a classe .pg, do tamanho da
  // página); css é o estilo delas; nomeArq sem ".pdf". opcoes: formato [largura, altura] em mm (padrão A4 deitado), fundo (cor do papel),
  // classe (do palco, para o CSS da página valer), largura (CSS do palco), escala e qualidade da foto, esperar (ms pelas fotos; 0 = não espera),
  // teto (nº máximo de páginas), antes(palco) (mexe no palco já montado — repaginar, medir — antes de fotografar), avisa(texto).
  // Devolve { modo: "compartilhado" | "baixado" | "cancelado", nome, paginas, semFoto }. No celular abre o compartilhar; senão baixa já nomeado.
  async function pdfDePaginas(paginasHtml, css, nomeArq, opcoes) {
    const o = Object.assign({ formato: [297, 210], fundo: "#fff", classe: "", largura: "", escala: 1.3, qualidade: 0.8, esperar: 20e3, teto: 0, antes: null, avisa: () => {} }, opcoes || {});
    if (!paginasHtml || !paginasHtml.length) throw new Error("nenhuma página para o PDF");
    if (o.teto && paginasHtml.length > o.teto) throw new Error("passou do teto de " + o.teto + " páginas (" + paginasHtml.length + ")");
    await carregarPdfLib();
    // o palco: escondido atrás da página (z-index negativo, sem resposta ao toque), mas MONTADO — html2canvas só fotografa o que tem layout
    const q = document.createElement("div"); if (o.classe) q.className = o.classe;
    q.style.cssText = "position:absolute;left:0;top:0;z-index:-1;pointer-events:none;overflow:hidden;background:" + o.fundo + (o.largura ? ";width:" + o.largura : "");
    q.innerHTML = "<style>" + css + "</style>" + paginasHtml.join("");
    document.body.appendChild(q);
    let semFoto = 0;
    try {
      if (o.antes) await o.antes(q);
      if (o.esperar) semFoto = await esperarImagens(q, o.esperar);
      const pgs = [...q.querySelectorAll(".pg")];
      if (!pgs.length) throw new Error("as páginas não têm a classe .pg");
      const LW = o.formato[0], LH = o.formato[1], paisagem = LW >= LH;
      const pdf = new window.jspdf.jsPDF({ unit: "mm", format: [LW, LH], orientation: paisagem ? "landscape" : "portrait" });
      const rgb = (window.getComputedStyle(q).backgroundColor.match(/\d+/g) || [255, 255, 255]).slice(0, 3).map(Number);
      for (let k = 0; k < pgs.length; k++) {
        o.avisa((k + 1) + "/" + pgs.length);
        // ignoreElements: o html2canvas clona o DOCUMENTO INTEIRO para fotografar um pedaço — com a vitrine aberta (centenas de fotos) ele
        // travava na 1ª página (medido 19/10 no harness); clona-se só o palco e os seus ancestrais
        const cv = await window.html2canvas(pgs[k], { scale: o.escala, backgroundColor: o.fundo, useCORS: true, logging: false, windowWidth: Math.max(q.scrollWidth, window.innerWidth), windowHeight: Math.max(q.scrollHeight, window.innerHeight),
          ignoreElements: el => el !== q && !q.contains(el) && !el.contains(q) });
        let w = LW, h = LW * cv.height / cv.width; if (h > LH) { h = LH; w = LH * cv.width / cv.height; }
        if (k) pdf.addPage([LW, LH], paisagem ? "landscape" : "portrait");
        pdf.setFillColor(rgb[0], rgb[1], rgb[2]); pdf.rect(0, 0, LW, LH, "F");
        pdf.addImage(cv.toDataURL("image/jpeg", o.qualidade), "JPEG", (LW - w) / 2, (LH - h) / 2, w, h);
      }
      if (pdf.getNumberOfPages() !== pgs.length) throw new Error("o PDF saiu com " + pdf.getNumberOfPages() + " páginas e o documento tem " + pgs.length + " — não entrego página a mais");
      const blob = pdf.output("blob"), nome = String(nomeArq).replace(/[\/\\:*?"<>|]+/g, "-") + ".pdf", arquivo = new File([blob], nome, { type: "application/pdf" });
      // no celular: compartilhar (WhatsApp, Arquivos); cancelou = nada; sem compartilhar, baixa já nomeado
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        try { await navigator.share({ files: [arquivo], title: nomeArq }); return { modo: "compartilhado", nome, paginas: pgs.length, semFoto }; }
        catch (e) { if (e && e.name === "AbortError") return { modo: "cancelado", nome, paginas: pgs.length, semFoto }; }
      }
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30e3);
      return { modo: "baixado", nome, paginas: pgs.length, semFoto };
    } finally { q.remove(); }
  }

  // ---- AUTOFILTRO do Excel (TI, 20/10/2026 — ele: "igualzinho ao do Excel"). Nasceu preso à Análise de giro (v5.87) e aqui vira função
  // da casa: a Carteira detalhada usa o MESMO. Texto = lista de valores com caixas + busca + tudo/limpar; número = condição com valor.
  // Painel branco embaixo do ▾; OK/cancelar; Esc fecha; clicar fora fecha. O estado vive no Map que quem chama passa (memória, nada persiste).
  //   autofiltro({ filtros: Map col→{tipo:"txt", v:Set} | {tipo:"num", op, a, b}, nomeCol(col), ehNum(col), ehData?(col) (ISO yyyy-mm-dd por trás;
  //                a lista vem agrupada por mês), valores(col) → valores crus da coluna (quem chama decide de que linhas),
  //                rotulo?(col, chave) → texto mostrado na lista, aplicar() → redesenha })
  //   → { botao(col) HTML do ▾/funil · limpar() HTML do "limpar filtros (n)" · ligar(raiz) liga os botões · passa(col, v) · passaTodos(valorDe, x, exceto?) · abrir · fechar }
  const semAcento = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const FUNIL = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 0h10L6 5v4l-2 1V5z"/></svg>';
  const OPS_FILTRO = [["maior", "maior que"], ["menor", "menor que"], ["igual", "igual a"], ["entre", "entre"], ["vazio", "vazio"], ["naovazio", "não vazio"]];
  const chaveTxt = v => (v == null || v === "") ? "(vazio)" : String(v);
  function filtroPassa(f, v) {
    if (!f) return true;
    if (f.tipo !== "num") return f.v.has(chaveTxt(v));
    const vazio = v == null || v === "";
    switch (f.op) { case "vazio": return vazio; case "naovazio": return !vazio; case "maior": return !vazio && v > f.a; case "menor": return !vazio && v < f.a; case "igual": return !vazio && Math.abs(v - f.a) < 0.05; case "entre": return !vazio && v >= f.a && v <= f.b; }
    return true;
  }
  // DATAS agrupadas por mês (ele, 20/10 02:5x: "seleciono o mês e vêm todos os produtos daquele mês, do dia 1 ao 30; senão fico selecionando
  // data a data"). Entra o Map chave→contagem (chave ISO yyyy-mm-dd, ou "(vazio)"/outra); sai a árvore mês → dias, em ordem ISO.
  const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const mesCurto = m => MESES_CURTO[+String(m).slice(5, 7) - 1] + "/" + String(m).slice(2, 4);
  const ehIso = k => /^\d{4}-\d{2}-\d{2}/.test(String(k));
  function agruparDatas(vals) {
    const meses = new Map(), soltos = [];
    for (const [k, n] of vals) { if (!ehIso(k)) { soltos.push([k, n]); continue; } const m = String(k).slice(0, 7); const g = meses.get(m) || { m, n: 0, dias: [] }; g.n += n; g.dias.push([k, n]); meses.set(m, g); }
    const lista = [...meses.values()].sort((a, b) => a.m.localeCompare(b.m)); for (const g of lista) g.dias.sort((a, b) => a[0].localeCompare(b[0]));
    return { soltos: soltos.sort((a, b) => a[0].localeCompare(b[0], "pt-BR", { numeric: true })), meses: lista };
  }
  let PAINEL = null;                                                  // um painel aberto por vez, seja de que tabela for
  const PAINEL_FORA = ev => { if (PAINEL && !PAINEL.contains(ev.target)) fecharPainel(); };
  const PAINEL_TECLA = ev => { if (!PAINEL) return; if (ev.key === "Escape") fecharPainel(); else if (ev.key === "Enter" && ev.target.tagName !== "BUTTON") { ev.preventDefault(); PAINEL.querySelector(".fp-ok").click(); } };
  function fecharPainel() { if (PAINEL) PAINEL.remove(); PAINEL = null; document.removeEventListener("mousedown", PAINEL_FORA); document.removeEventListener("keydown", PAINEL_TECLA); }
  function autofiltro(o) {
    const F = o.filtros, nome = o.nomeCol || (c => c), rotulo = o.rotulo || ((c, k) => k), ehNum = o.ehNum || (() => false), ehData = o.ehData || (() => false);
    const botao = col => { const f = F.get(col); return '<button type="button" class="fl' + (f ? " on" : "") + '" data-col="' + esc(col) + '" title="' + (f ? "filtro ligado em " + esc(nome(col)) + " — toque para mudar" : "filtrar " + esc(nome(col))) + '">' + (f ? FUNIL : "▾") + "</button>"; };
    const limpar = () => F.size ? '<button type="button" class="sec limpa-filtros" title="' + esc([...F.keys()].map(nome).join(" · ")) + '">limpar filtros (' + F.size + ")</button>" : "";
    const passa = (col, v) => filtroPassa(F.get(col), v);
    const passaTodos = (valorDe, x, exceto) => { for (const [col, f] of F) { if (col === exceto) continue; if (!filtroPassa(f, valorDe(x, col))) return false; } return true; };
    function abrir(bt, col) {
      fecharPainel();
      const f = F.get(col), r = bt.getBoundingClientRect(), p = document.createElement("div"); p.className = "fpainel";
      p.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 262)) + "px"; p.style.top = Math.min(r.bottom + 4, window.innerHeight - 340) + "px";
      const aplica = () => { fecharPainel(); o.aplicar(); };
      if (ehNum(col)) {
        p.innerHTML = '<div class="fp-tit">' + esc(nome(col)) + '</div><select class="fp-op">' + OPS_FILTRO.map(([v, n]) => '<option value="' + v + '"' + (f && f.op === v ? " selected" : "") + ">" + n + "</option>").join("") + '</select><div class="fp-vals"><input type="number" step="any" class="fp-a" value="' + (f && f.a != null ? f.a : "") + '" placeholder="valor"><input type="number" step="any" class="fp-b" value="' + (f && f.b != null ? f.b : "") + '" placeholder="e"></div><div class="fp-acoes">' + (f ? '<button type="button" class="sec fp-limpa">limpar</button>' : "") + '<button type="button" class="fp-ok">OK</button><button type="button" class="sec fp-cancela">cancelar</button></div>';
        const op = p.querySelector(".fp-op"), mostra = () => { const v = op.value; p.querySelector(".fp-a").classList.toggle("oculto", v === "vazio" || v === "naovazio"); p.querySelector(".fp-b").classList.toggle("oculto", v !== "entre"); }; op.onchange = mostra; mostra();
        p.querySelector(".fp-ok").onclick = () => { const v = op.value, a = parseFloat(p.querySelector(".fp-a").value), b = parseFloat(p.querySelector(".fp-b").value); if (!["vazio", "naovazio"].includes(v) && isNaN(a)) { p.querySelector(".fp-a").focus(); return; } F.set(col, { tipo: "num", op: v, a, b: isNaN(b) ? a : b }); aplica(); };
      } else {
        const vals = new Map(); for (const v of o.valores(col)) { const k = chaveTxt(v); vals.set(k, (vals.get(k) || 0) + 1); }
        const marcado = k => !f || f.v.has(k), data = ehData(col);
        const folha = (k, n) => '<label class="fp-v"><input type="checkbox" value="' + esc(k) + '"' + (marcado(k) ? " checked" : "") + "> <span>" + esc(rotulo(col, k)) + "</span> <small>" + n + "</small></label>";
        let itens;
        if (data) {       // a árvore do Excel: mês (caixa que marca/desmarca os dias dele; ▸ abre os dias dd/mm/aa); o que não é data fica solto no alto
          const g = agruparDatas(vals);
          itens = g.soltos.map(([k, n]) => folha(k, n)).join("") + g.meses.map(m => '<div class="fp-mes" data-m="' + m.m + '"><button type="button" class="fp-exp" title="mostrar os dias">▸</button><label class="fp-m"><input type="checkbox"' + (m.dias.every(d => marcado(d[0])) ? " checked" : "") + "> <span>" + mesCurto(m.m) + "</span> <small>" + m.n + '</small></label><div class="fp-dias oculto">' + m.dias.map(([k, n]) => folha(k, n)).join("") + "</div></div>").join("");
        } else itens = [...vals.entries()].sort((x, y) => x[0].localeCompare(y[0], "pt-BR", { numeric: true })).map(([k, n]) => folha(k, n)).join("");
        p.innerHTML = '<div class="fp-tit">' + esc(nome(col)) + '</div><input type="search" class="fp-busca" placeholder="procurar…" autocomplete="off"><div class="fp-tudo"><button type="button" class="sec fp-todos">selecionar tudo</button><button type="button" class="sec fp-nenhum">limpar</button></div><div class="fp-lista' + (data ? " fp-arvore" : "") + '">' + itens
          + '</div><div class="fp-acoes">' + (f ? '<button type="button" class="sec fp-limpa">limpar filtro</button>' : "") + '<button type="button" class="fp-ok">OK</button><button type="button" class="sec fp-cancela">cancelar</button></div>';
        const caixas = () => [...p.querySelectorAll(".fp-lista label.fp-v")], meses = () => [...p.querySelectorAll(".fp-mes")];
        const visiveis = () => caixas().filter(l => !l.classList.contains("oculto") && !(l.closest(".fp-mes") && l.closest(".fp-mes").classList.contains("oculto")));
        // a caixa do mês reflete os dias visíveis dele: todos = marcada; parte = indeterminada; nenhum = vazia
        const estadoMes = m => { const ds = [...m.querySelectorAll("label.fp-v")].filter(l => !l.classList.contains("oculto")).map(l => l.querySelector("input")), cb = m.querySelector("label.fp-m input"), on = ds.filter(d => d.checked).length; cb.checked = ds.length > 0 && on === ds.length; cb.indeterminate = on > 0 && on < ds.length; };
        for (const m of meses()) {
          estadoMes(m);
          m.querySelector(".fp-exp").onclick = () => { const d = m.querySelector(".fp-dias"); d.classList.toggle("oculto"); m.querySelector(".fp-exp").textContent = d.classList.contains("oculto") ? "▸" : "▾"; };
          m.querySelector("label.fp-m input").onchange = ev => { for (const l of m.querySelectorAll("label.fp-v")) if (!l.classList.contains("oculto")) l.querySelector("input").checked = ev.target.checked; estadoMes(m); };
          for (const i of m.querySelectorAll("label.fp-v input")) i.onchange = () => estadoMes(m);
        }
        p.querySelector(".fp-busca").oninput = ev => {
          const t = semAcento(ev.target.value.trim());
          for (const l of caixas()) { const m = l.closest(".fp-mes"); l.classList.toggle("oculto", !!t && !semAcento(l.textContent).includes(t) && !(m && semAcento(m.querySelector("label.fp-m").textContent).includes(t))); }
          for (const m of meses()) { const algum = [...m.querySelectorAll("label.fp-v")].some(l => !l.classList.contains("oculto")); m.classList.toggle("oculto", !algum); if (t && algum) { m.querySelector(".fp-dias").classList.remove("oculto"); m.querySelector(".fp-exp").textContent = "▾"; } estadoMes(m); }
        };
        p.querySelector(".fp-todos").onclick = () => { for (const l of visiveis()) l.querySelector("input").checked = true; for (const m of meses()) estadoMes(m); };
        p.querySelector(".fp-nenhum").onclick = () => { for (const l of visiveis()) l.querySelector("input").checked = false; for (const m of meses()) estadoMes(m); };
        p.querySelector(".fp-ok").onclick = () => { const v = new Set(caixas().filter(l => l.querySelector("input").checked).map(l => l.querySelector("input").value)); if (v.size === vals.size) F.delete(col); else F.set(col, { tipo: "txt", v }); aplica(); };
      }
      p.querySelector(".fp-cancela").onclick = fecharPainel;
      const lim = p.querySelector(".fp-limpa"); if (lim) lim.onclick = () => { F.delete(col); aplica(); };
      document.body.appendChild(p); PAINEL = p;
      setTimeout(() => { if (PAINEL === p) { document.addEventListener("mousedown", PAINEL_FORA); document.addEventListener("keydown", PAINEL_TECLA); } }, 0);
      const foco = p.querySelector(".fp-busca, .fp-a"); if (foco) foco.focus();
    }
    function ligar(raiz) {
      for (const b of raiz.querySelectorAll("button.fl")) b.onclick = ev => { ev.stopPropagation(); abrir(b, b.dataset.col); };
      const lf = raiz.querySelector(".limpa-filtros"); if (lf) lf.onclick = () => { F.clear(); o.aplicar(); };
    }
    return { botao, limpar, abrir, fechar: fecharPainel, ligar, passa, passaTodos };
  }

  const lib = { esc, padraoIlike, citarPostgrest, termoIlike, filtroProduto, seletor, carregarPdfLib, pdfDePaginas, nomeArquivoCasa, autofiltro, filtroPassa, chaveTxt, semAcento, agruparDatas, mesCurto };
  if (typeof window !== "undefined") window.GestorLib = lib;
  if (typeof module !== "undefined" && module.exports) module.exports = lib;
})();
