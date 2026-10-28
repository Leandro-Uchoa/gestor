// Gestor · AÇÃO DE PREÇO (novo) — a COLA entre a casca do PICASSO (desenharAcao / onPeriodo / onFamilia / onBusca / onAcao / onTratar) e a camada
// de dados do TI (acao_dados.js). TI, 28/10/2026. Login do Supabase (o mesmo do Gestor), seletor de cliente (some em ?modo=cliente), período pela URL
// (#cliente=X&periodo=bf), "Carregando…" na troca e na 1ª carga, nunca a casca vazia. Contrato: TI\CONTRATO_ACAO_PRECO_DADOS.md.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let CLIENTE = null, PERIODO = "bf", DADOS = null, LISTA = [], FAMILIA = null, BUSCA = "";
  const main = document.querySelector(".main"); if (main) main.style.visibility = "hidden";
  const desenhar = d => { if (typeof window.desenharAcao === "function") window.desenharAcao(d); else console.warn("casca sem desenharAcao"); };

  function overlayLogin() {
    const div = document.createElement("div"); div.id = "ti-login";
    div.style.cssText = "position:fixed;inset:0;background:#F6F5F0;z-index:1000;display:flex;align-items:center;justify-content:center;font-family:Inter,Arial,sans-serif";
    div.innerHTML = `<form id="ti-form" style="background:#fff;border:1px solid #E6E7E8;border-radius:20px;padding:28px 26px;width:min(92vw,380px);box-shadow:0 10px 30px rgba(0,0,0,.08)">
      <div style="font:800 12px Barlow;letter-spacing:.18em;margin-bottom:6px">OLYMPIKUS</div><div style="font:800 24px Barlow;margin-bottom:18px">Gestor · Ação de preço</div>
      <label style="font-size:12px;color:#787B86">E-mail</label><input id="ti-email" type="email" autocomplete="username" required style="width:100%;margin:4px 0 12px;padding:10px;border:1px solid #E6E7E8;border-radius:10px">
      <label style="font-size:12px;color:#787B86">Senha</label><input id="ti-senha" type="password" autocomplete="current-password" required style="width:100%;margin:4px 0 16px;padding:10px;border:1px solid #E6E7E8;border-radius:10px">
      <button type="submit" style="width:100%;background:#2E3EFC;color:#fff;border:0;border-radius:12px;padding:11px;font-weight:700">Entrar</button><div id="ti-msg" style="color:#E3001B;font-size:12px;margin-top:8px"></div></form>`;
    document.body.appendChild(div);
    $("ti-form").onsubmit = async ev => { ev.preventDefault(); $("ti-msg").textContent = ""; const e = await DadosAcao.entrar($("ti-email").value.trim(), $("ti-senha").value); if (e) $("ti-msg").textContent = "não entrou: " + e; else location.reload(); };
  }
  function aviso(titulo, detalhe) { if (main) main.style.visibility = ""; try { desenhar({ cliente: { nome: titulo, codigo: "" }, aviso: { titulo, detalhe }, tipos: [], familias: [], periodo: { chave: PERIODO, rotulo: DadosAcao.PERIODOS[PERIODO] } }); } catch (e) { document.body.insertAdjacentHTML("afterbegin", `<div style="padding:20px;font-family:Inter,Arial">${esc(titulo)} — ${esc(detalhe)}</div>`); } }
  function barra() {
    const div = document.createElement("div"); div.id = "ti-barra"; div.style.cssText = "display:flex;gap:8px;align-items:center;font-family:Inter,Arial,sans-serif";
    div.innerHTML = (DadosAcao.MODO_CLIENTE ? "" : `<select id="ti-sel" style="border:1px solid #E6E7E8;border-radius:12px;padding:8px 10px;background:#fff;font-weight:600;font-size:13px;max-width:240px;min-height:44px"></select>
      <a href="cliente.html#cliente=" id="ti-cli" style="background:#fff;border:1px solid #E6E7E8;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:700;color:#000;text-decoration:none;min-height:44px;display:inline-flex;align-items:center">aba Cliente</a>`)
      + (DadosAcao.MODO_CLIENTE ? "" : `<a href="#" id="ti-sair" style="font-size:12px;color:#787B86;text-decoration:underline;min-height:44px;display:inline-flex;align-items:center;padding:0 12px;min-width:44px;justify-content:center">sair</a>`);   // GAMER 28/10: "sair" não aparece ao cliente; porteiro: alvo ≥ 44 px
    (document.getElementById("slot_seletor") || document.body).appendChild(div);
    if ($("ti-sair")) $("ti-sair").onclick = ev => { ev.preventDefault(); DadosAcao.sair(); };
    if (!DadosAcao.MODO_CLIENTE) { const sel = $("ti-sel"); sel.innerHTML = LISTA.map(c => `<option value="${esc(c.cliente)}">${esc(c.nome || c.cliente)}</option>`).join(""); sel.value = CLIENTE; sel.onchange = () => { CLIENTE = sel.value; hashAtual(); abrir(); }; }
  }
  const hashAtual = () => { location.hash = "cliente=" + encodeURIComponent(CLIENTE) + "&periodo=" + encodeURIComponent(PERIODO); const a = $("ti-cli"); if (a) a.href = "cliente.html#cliente=" + encodeURIComponent(CLIENTE); };

  async function arranque() {
    try {
      const s = await DadosAcao.sessao(); if (!s) { overlayLogin(); return; }
      LISTA = await DadosAcao.clientes();
      const h = new URLSearchParams(location.hash.slice(1)), q = new URLSearchParams(location.search), pedido = h.get("cliente") || q.get("cliente");
      CLIENTE = LISTA.some(c => c.cliente === pedido) ? pedido : null; PERIODO = DadosAcao.PERIODOS[h.get("periodo") || q.get("periodo")] ? (h.get("periodo") || q.get("periodo")) : "bf";
      if (DadosAcao.MODO_CLIENTE) { for (const el of document.querySelectorAll(".rail, .busca, .bts, .interno")) el.style.setProperty("display", "none", "important"); if (main) main.style.marginLeft = "16px"; }
      barra(); if (main) main.style.visibility = "";
      if (!CLIENTE) { aviso(pedido ? "Cliente não encontrado" : "Escolha um cliente", pedido ? `“${pedido}” não está na lista — escolha no seletor` : "no seletor, no topo da página"); return; }
      await abrir();
    } catch (e) { console.error(e); aviso("A página não conseguiu arrancar", DadosAcao.MODO_CLIENTE ? "tente de novo em instantes" : "sem resposta do banco: " + (e && e.message || e)); }
  }
  let cargaAtual = 0;
  async function abrir() {
    const carga = ++cargaAtual, cliente = CLIENTE, nomeSel = (LISTA.find(c => c.cliente === cliente) || {}).nome || cliente;
    try { desenhar({ cliente: { nome: nomeSel, codigo: "" }, aviso: { titulo: "Carregando " + nomeSel + "…", detalhe: "lendo o banco" }, tipos: [], familias: [], periodo: { chave: PERIODO, rotulo: DadosAcao.PERIODOS[PERIODO] } }); } catch (e) { /* casca sem dado desenha "—" */ }
    try {
      const dados = await DadosAcao.carregar(cliente, PERIODO);
      if (carga !== cargaAtual) return;
      FAMILIA = null; BUSCA = ""; DADOS = dados; desenhar(DADOS);
    } catch (e) { if (carga !== cargaAtual) return; console.error(e); desenhar({ cliente: { nome: nomeSel, codigo: "" }, aviso: { titulo: "Não foi possível carregar os dados", detalhe: DadosAcao.MODO_CLIENTE ? "tente de novo em instantes" : "não consegui ler o banco: " + (e && e.message || e) }, tipos: [], familias: [], periodo: { chave: PERIODO, rotulo: DadosAcao.PERIODOS[PERIODO] } }); }
  }
  const refaz = () => { if (!DADOS) return; DADOS = DadosAcao.refiltrar(PERIODO, FAMILIA, BUSCA); desenhar(DADOS); };
  // ---------- eventos da casca
  window.onPeriodo = chave => { if (!DadosAcao.PERIODOS[chave]) return; PERIODO = chave; hashAtual(); refaz(); };
  window.onFamilia = chave => { FAMILIA = chave || null; refaz(); };
  window.onBusca = texto => { BUSCA = String(texto || ""); refaz(); };
  window.onTratar = (ref, cor) => { if (DadosAcao.MODO_CLIENTE) return; window.open(`../#aba=cg&cliente=${encodeURIComponent(CLIENTE || "")}&ref=${encodeURIComponent(ref || "")}&cor=${encodeURIComponent(cor || "")}`, "_blank"); };
  window.onAcao = (nome, ctx) => {
    if (nome === "exportar_pdf") { window.print(); return true; }
    if (nome === "exportar_xlsx") { alert("Exportar para Excel: sai pelas saídas da vitrine (em preparação)."); return true; }     // aprendizado do CMS Space — contrato próprio
    if (nome === "material") { alert("Material por cliente: é o deck do PICASSO; o disparo ao cliente só com a palavra do Léo."); return true; }
    return false;
  };
  arranque();
})();
