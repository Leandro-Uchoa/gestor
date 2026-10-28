// Gestor · BUSCAR A META (novo) — a COLA entre a casca (desenharMeta / onPreposto / onFaixa / onMarcar / onMarcarMinimo / onLimpar / onAcao) e a
// camada de dados do TI (meta_busca_dados.js). TI, 28/10/2026. Login do Supabase (o mesmo do Gestor), seletor de vendedor (preposto) vindo da
// view, vendedor pela URL (#preposto=X) ou o último escolhido neste aparelho; "Carregando…" na troca; ⛔ em ?modo=cliente a página não abre.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let PREPOSTO = null, DADOS = null, LISTA = [], FAIXA = null;
  const main = document.querySelector(".main"); if (main) main.style.visibility = "hidden";
  const desenhar = d => { if (typeof window.desenharMeta === "function") window.desenharMeta(d); else console.warn("casca sem desenharMeta"); };
  const vazio = (titulo, detalhe) => ({ preposto: { nome: titulo, codigo: "" }, aviso: { titulo, detalhe }, placar: [], blocos: [], previa: { n: 0 } });

  if (new URLSearchParams(location.search).get("modo") === "cliente") {   // tela interna: meta de vendedor é nome + dinheiro
    document.body.innerHTML = `<div style="padding:40px;font-family:Inter,Arial;max-width:520px"><h2 style="font:800 22px Barlow">Página interna</h2><p>Esta página não abre no modo cliente.</p></div>`; return;
  }
  function overlayLogin() {
    const div = document.createElement("div"); div.id = "ti-login";
    div.style.cssText = "position:fixed;inset:0;background:#F6F5F0;z-index:1000;display:flex;align-items:center;justify-content:center;font-family:Inter,Arial,sans-serif";
    div.innerHTML = `<form id="ti-form" style="background:#fff;border:1px solid #E6E7E8;border-radius:20px;padding:28px 26px;width:min(92vw,380px);box-shadow:0 10px 30px rgba(0,0,0,.08)">
      <div style="font:800 12px Barlow;letter-spacing:.18em;margin-bottom:6px">OLYMPIKUS</div><div style="font:800 24px Barlow;margin-bottom:18px">Gestor · Buscar a meta</div>
      <label style="font-size:12px;color:#787B86">E-mail</label><input id="ti-email" type="email" autocomplete="username" required style="width:100%;margin:4px 0 12px;padding:10px;border:1px solid #E6E7E8;border-radius:10px">
      <label style="font-size:12px;color:#787B86">Senha</label><input id="ti-senha" type="password" autocomplete="current-password" required style="width:100%;margin:4px 0 16px;padding:10px;border:1px solid #E6E7E8;border-radius:10px">
      <button type="submit" style="width:100%;background:#2E3EFC;color:#fff;border:0;border-radius:12px;padding:11px;font-weight:700;min-height:44px">Entrar</button><div id="ti-msg" style="color:#E3001B;font-size:12px;margin-top:8px"></div></form>`;
    document.body.appendChild(div);
    $("ti-form").onsubmit = async ev => { ev.preventDefault(); $("ti-msg").textContent = ""; const e = await DadosMeta.entrar($("ti-email").value.trim(), $("ti-senha").value); if (e) $("ti-msg").textContent = "não entrou: " + e; else location.reload(); };
  }
  function aviso(titulo, detalhe) { if (main) main.style.visibility = ""; try { desenhar(vazio(titulo, detalhe)); } catch (e) { document.body.insertAdjacentHTML("afterbegin", `<div style="padding:20px;font-family:Inter,Arial">${esc(titulo)} — ${esc(detalhe)}</div>`); } }
  function barra() {
    const div = document.createElement("div"); div.id = "ti-barra"; div.style.cssText = "display:flex;gap:8px;align-items:center;font-family:Inter,Arial,sans-serif";
    div.innerHTML = `<select id="ti-sel" aria-label="vendedor" style="border:1px solid #E6E7E8;border-radius:12px;padding:8px 10px;background:#fff;font-weight:600;font-size:13px;max-width:240px;min-height:44px"></select>
      <a href="cliente.html" id="ti-cli" style="background:#fff;border:1px solid #E6E7E8;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:700;color:#000;text-decoration:none;min-height:44px;display:inline-flex;align-items:center">aba Cliente</a>
      <a href="#" id="ti-sair" style="font-size:12px;color:#787B86;text-decoration:underline;min-height:44px;display:inline-flex;align-items:center;padding:0 12px;min-width:44px;justify-content:center">sair</a>`;
    (document.getElementById("slot_seletor") || document.body).appendChild(div);
    $("ti-sair").onclick = ev => { ev.preventDefault(); DadosMeta.sair(); };
    const sel = $("ti-sel"); sel.innerHTML = LISTA.map(p => `<option value="${esc(p.codigo)}">${esc(p.codigo === "TODOS" ? "CMS · todos" : p.nome)}</option>`).join(""); sel.value = PREPOSTO; sel.onchange = () => { PREPOSTO = sel.value; lembrar(); hashAtual(); abrir(); };
  }
  const hashAtual = () => { location.hash = "preposto=" + encodeURIComponent(PREPOSTO); };
  const lembrar = () => { try { localStorage.setItem("meta_busca:preposto", PREPOSTO); } catch (e) { /* sem armazenamento */ } };
  const lembrado = () => { try { return localStorage.getItem("meta_busca:preposto"); } catch (e) { return null; } };

  async function arranque() {
    try {
      const s = await DadosMeta.sessao(); if (!s) { overlayLogin(); return; }
      LISTA = await DadosMeta.prepostos();
      const h = new URLSearchParams(location.hash.slice(1)), pedido = h.get("preposto") || lembrado();
      PREPOSTO = LISTA.some(p => p.codigo === pedido) ? pedido : (LISTA[0] || {}).codigo || "TODOS";
      barra(); if (main) main.style.visibility = "";
      await abrir();
    } catch (e) { console.error(e); aviso("A página não conseguiu arrancar", "sem resposta do banco: " + (e && e.message || e)); }
  }
  let cargaAtual = 0;
  async function abrir() {
    const carga = ++cargaAtual, nomeSel = (LISTA.find(p => p.codigo === PREPOSTO) || {}).nome || PREPOSTO;
    try { desenhar(vazio("Carregando " + nomeSel + "…", "lendo o banco")); } catch (e) { /* casca sem dado desenha "—" */ }
    try {
      const dados = await DadosMeta.carregar(PREPOSTO);
      if (carga !== cargaAtual) return;
      FAIXA = null; DADOS = dados; desenhar(DADOS);
    } catch (e) { if (carga !== cargaAtual) return; console.error(e); desenhar(vazio("Não foi possível carregar os dados", "não consegui ler o banco: " + (e && e.message || e) + " — troque o vendedor no seletor ou recarregue a página"));
      const m = $("a_placar"); if (m && !$("ti-repetir")) { m.insertAdjacentHTML("afterend", `<button id="ti-repetir" type="button" class="mb-bt" style="margin-top:10px;background:#FFFF1A;color:#000;border-color:#FFFF1A">tentar de novo</button>`); $("ti-repetir").onclick = () => { $("ti-repetir").remove(); abrir(); }; } }
  }
  const refaz = () => { if (!DADOS) return; DADOS = DadosMeta.refiltrar(FAIXA); desenhar(DADOS); };
  // ---------- eventos da casca
  window.onPreposto = codigo => { if (!LISTA.some(p => p.codigo === codigo)) return; PREPOSTO = codigo; lembrar(); hashAtual(); const sel = $("ti-sel"); if (sel) sel.value = codigo; abrir(); };
  window.onFaixa = faixa => { FAIXA = FAIXA === faixa ? null : (faixa || null); refaz(); };
  window.onMarcar = (id, on) => { DadosMeta.marcar(id, on); refaz(); };
  window.onMarcarMinimo = faixa => { const r = DadosMeta.marcarMinimo(faixa) || {}; refaz(); const el = $("a_aviso");
    if (el && (r.faltam > 0 || !r.n)) { el.hidden = false; el.innerHTML = r.n ? `<b>Marquei ${r.n} linhas dentro da régua e ainda faltam ${Math.round(r.faltam).toLocaleString("pt-BR")}</b><small> · a régua (ruptura, ideal e repasse da CMS) não fecha esta faixa sozinha — o resto é decisão sua: linhas fora da régua (alta, sem giro) ou o pedido novo com antecipação</small>` : `<b>Nada a marcar dentro da régua</b><small> · a falta desta faixa não fecha só com ruptura, ideal e repasse da CMS — abra as linhas fora da régua ou o pedido novo</small>`; setTimeout(() => { el.hidden = true; }, 8000); } };
  window.onLimpar = faixa => { DadosMeta.limpar(faixa); refaz(); };
  window.onAcao = (nome, ctx) => {
    if (nome === "exportar_pdf") { window.print(); return true; }
    if (nome === "gerar_pedido") { alert("Baixar o arquivo (ANTECIPAR · TRANSFERIR · DIGITAR): sai pela tarefa das saídas da vitrine com o gera_pedido_ebm.py da Engenharia — contrato em fechamento. Por enquanto a prévia fica na tela."); return true; }
    return false;
  };
  arranque();
})();
