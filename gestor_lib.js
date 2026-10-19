/* GESTOR · funções puras da página, com teste próprio (teste_gestor_lib.js, roda em node). TI, 06/10/2026 — achados 3 e 4 do Conselho
   (MSG-CONSELHEIRO-032/BOSS-033): texto do banco interpolado em HTML sem escape; texto do usuário montando o filtro .or() do PostgREST.
   Sem número de negócio aqui: vai ao repositório público. 19/10: o seletor da casa e o PDF no navegador (carregarPdfLib, pdfDePaginas). */
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
    const semAcento = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
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

  const lib = { esc, padraoIlike, citarPostgrest, termoIlike, filtroProduto, seletor, carregarPdfLib, pdfDePaginas, nomeArquivoCasa };
  if (typeof window !== "undefined") window.GestorLib = lib;
  if (typeof module !== "undefined" && module.exports) module.exports = lib;
})();
