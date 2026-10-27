// Gestor · Cliente (novo) — a COLA entre a casca do PICASSO (desenhar/onFiltro/onBro/onTopico) e a camada de dados do TI
// (cliente_dados.js). TI, 27/10/2026. Login do Supabase, seletor de cliente (some em ?modo=cliente), TOPICS gravando em topics_item.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ESC = "lp-uchoa";
  let CLIENTE = null, DADOS = null, LISTA = [];

  // ---------- login (overlay) e a barra do TI (seletor + sair), por cima da casca, sem mexer nela
  function overlayLogin() {
    const div = document.createElement("div"); div.id = "ti-login";
    div.style.cssText = "position:fixed;inset:0;background:#F6F5F0;z-index:1000;display:flex;align-items:center;justify-content:center;font-family:Inter,Arial,sans-serif";
    div.innerHTML = `<form id="ti-form" style="background:#fff;border:1px solid #E6E7E8;border-radius:20px;padding:28px 26px;width:min(92vw,380px);box-shadow:0 10px 30px rgba(0,0,0,.08)">
      <div style="font:800 12px Barlow;letter-spacing:.18em;margin-bottom:6px">OLYMPIKUS</div><div style="font:800 24px Barlow;margin-bottom:18px">Gestor · Cliente</div>
      <label style="font-size:12px;color:#787B86">E-mail</label><input id="ti-email" type="email" autocomplete="username" required style="width:100%;margin:4px 0 12px;padding:10px;border:1px solid #E6E7E8;border-radius:10px">
      <label style="font-size:12px;color:#787B86">Senha</label><input id="ti-senha" type="password" autocomplete="current-password" required style="width:100%;margin:4px 0 16px;padding:10px;border:1px solid #E6E7E8;border-radius:10px">
      <button type="submit" style="width:100%;background:#2E3EFC;color:#fff;border:0;border-radius:12px;padding:11px;font-weight:700">Entrar</button><div id="ti-msg" style="color:#E3001B;font-size:12px;margin-top:8px"></div></form>`;
    document.body.appendChild(div);
    $("ti-form").onsubmit = async ev => { ev.preventDefault(); $("ti-msg").textContent = ""; const e = await Dados.entrar($("ti-email").value.trim(), $("ti-senha").value); if (e) $("ti-msg").textContent = "não entrou: " + e; else location.reload(); };
  }
  function barra() {
    const div = document.createElement("div"); div.id = "ti-barra";
    div.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:30;display:flex;gap:8px;align-items:center;font-family:Inter,Arial,sans-serif;background:rgba(246,245,240,.92);padding:6px;border-radius:14px";   // embaixo, para não cobrir o topo nem o nome do cliente
    div.innerHTML = (Dados.MODO_CLIENTE ? "" : `<select id="ti-sel" style="border:1px solid #E6E7E8;border-radius:12px;padding:8px 10px;background:#fff;font-weight:600;font-size:13px;max-width:240px"></select>
      <a href="../" style="background:#fff;border:1px solid #E6E7E8;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:700;color:#000;text-decoration:none">Gestor completo</a>`)
      + `<a href="#" id="ti-sair" style="font-size:12px;color:#787B86;text-decoration:underline">sair</a>`;
    document.body.appendChild(div);
    $("ti-sair").onclick = ev => { ev.preventDefault(); Dados.sair(); };
    if (!Dados.MODO_CLIENTE) { const sel = $("ti-sel"); sel.innerHTML = LISTA.map(c => `<option value="${esc(c.cliente)}">${esc(c.nome || c.cliente)}</option>`).join(""); sel.value = CLIENTE; sel.onchange = () => { CLIENTE = sel.value; location.hash = "cliente=" + encodeURIComponent(CLIENTE); abrir(); }; }
  }

  async function arranque() {
    const s = await Dados.sessao();
    if (!s) { overlayLogin(); return; }
    LISTA = await Dados.clientes();
    const h = new URLSearchParams(location.hash.slice(1)), q = new URLSearchParams(location.search), pedido = h.get("cliente") || q.get("cliente");   // ?cliente= ou #cliente=
    CLIENTE = LISTA.some(c => c.cliente === pedido) ? pedido : null;   // BOSS (segurança): sem cliente válido na URL, a página pede para escolher — não abre num cliente por conta própria
    if (Dados.MODO_CLIENTE) { for (const el of document.querySelectorAll(".bro-fab, .bro-m, #bro, .rail")) el.remove(); document.querySelector(".main").style.marginLeft = "16px"; }   // modo cliente: sem Bro, sem menu
    barra();
    if (!CLIENTE) { window.desenhar({ cliente: { nome: Dados.MODO_CLIENTE ? "link sem cliente" : "escolha um cliente" } }); return; }
    abrir();
  }
  async function abrir() {
    try { DADOS = await Dados.carregar(CLIENTE); window.desenhar(DADOS); }
    catch (e) { console.error(e); window.desenhar({ cliente: { nome: CLIENTE }, erro: String(e.message || e) }); alert(Dados.MODO_CLIENTE ? "não foi possível carregar os dados" : "não consegui ler o banco: " + (e.message || e)); }
  }

  // ---------- eventos da casca
  const TIPO = { acess: "acessorio", conf: "confeccao" };
  window.onFiltro = f => { const nf = Object.assign({}, f, { tipo: TIPO[f.tipo] || f.tipo }); DADOS = Dados.refiltrar(nf); DADOS.filtro = f; window.desenhar(DADOS); };
  window.onTratar = (ref, cor) => window.open(`../#aba=cg&cliente=${encodeURIComponent(CLIENTE)}&ref=${encodeURIComponent(ref)}${cor ? "&cor=" + encodeURIComponent(cor) : ""}`, "_blank");
  // o Bro: a gaveta local da casca ainda não fala com a gestor-ia (o porte liga); até lá, abre o painel IA que existe no Gestor
  window.onBro = () => { if (Dados.MODO_CLIENTE) return; window.open(`../#aba=cliente&cliente=${encodeURIComponent(CLIENTE)}`, "_blank"); };
  // TOPICS tratável: grava no topics_item pelo mesmo caminho da aba TOPICS (política do banco: só quem está em topics_leitor)
  window.onTopico = async (acao, id, texto) => {
    if (Dados.MODO_CLIENTE) return;                                      // modo cliente: o TOPICS é interno; nada se lê nem se grava
    const sb = Dados.sb, bloco = ((DADOS || {}).decidir || [])[0] ? DADOS.decidir[0].bloco : null;
    try {
      const { data: { user } } = await sb.auth.getUser(); const quem = (user && user.email) || null;
      if (acao === "abrir") { window.open(`../#aba=topics${bloco ? "&bloco=" + encodeURIComponent(bloco) : ""}`, "_blank"); return; }
      if (acao === "feito") { const item = (DADOS.decidir || []).find(i => i.id === id); const r = await sb.from("topics_item").update({ feito: true, atualizado_por: quem }).match({ escritorio_id: ESC, id }); if (r.error) throw r.error; if (item) item.feito = true; }
      else if (acao === "orientar") { const r = await sb.from("topics_item").update({ resposta: texto || null, atualizado_por: quem }).match({ escritorio_id: ESC, id }); if (r.error) throw r.error; }
      else if (acao === "novo") {
        if (!bloco) throw new Error("este cliente não tem bloco no TOPICS");
        const novoId = "cl" + Date.now().toString(36);
        const r = await sb.from("topics_item").insert({ escritorio_id: ESC, id: novoId, bloco, sub: "aba Cliente", txt: texto, tipo: "tarefa", dono: "LEO", quem: quem, feito: false, alerta: false, atualizado_por: quem }); if (r.error) throw r.error;
      }
      if (acao !== "abrir") abrir();                                   // relê do banco: a tela mostra o que está gravado, não o que eu acho
    } catch (e) { alert(Dados.MODO_CLIENTE ? "não foi possível gravar" : "o TOPICS não gravou: " + (e.message || e)); }
  };
  arranque();
})();
