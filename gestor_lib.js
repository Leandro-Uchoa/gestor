/* GESTOR · funções puras da página, com teste próprio (teste_gestor_lib.js, roda em node). TI, 06/10/2026 — achados 3 e 4 do Conselho
   (MSG-CONSELHEIRO-032/BOSS-033): texto do banco interpolado em HTML sem escape; texto do usuário montando o filtro .or() do PostgREST.
   Sem número nenhum aqui: vai ao repositório público. */
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

  const lib = { esc, padraoIlike, citarPostgrest, termoIlike, filtroProduto, seletor };
  if (typeof window !== "undefined") window.GestorLib = lib;
  if (typeof module !== "undefined" && module.exports) module.exports = lib;
})();
