// Gestor · Cliente (novo) — a COLA entre a casca do PICASSO (desenhar/onFiltro/onBro/onTopico) e a camada de dados do TI
// (cliente_dados.js). TI, 27–28/10/2026. Login do Supabase, seletor de cliente (some em ?modo=cliente), TOPICS gravando em topics_item,
// bloco da ação de trade (em cima do bento, como o Léo pediu: "a gente deu dinheiro pro cliente"), "sem bloco no TOPICS", barra do celular.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("pt-BR");
  const dtBR = d => d && /^\d{4}-\d{2}-\d{2}/.test(String(d)) ? String(d).slice(8, 10) + "/" + String(d).slice(5, 7) : "—";
  const ESC = "lp-uchoa";
  let CLIENTE = null, DADOS = null, LISTA = [];
  const main = document.querySelector(".main");
  if (main) main.style.visibility = "hidden";                           // GAMER 27/10: a casca não aparece por trás do login antes de haver sessão

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
  function aviso(titulo, detalhe) {                                      // falha de rede/arranque: mensagem na tela, nunca a casca "—" calada
    if (main) main.style.visibility = "";
    try { window.desenhar({ cliente: { nome: titulo, codigo: "" }, prioridade: { titulo, detalhe }, sem_bloco_topics: true }); } catch (e) { document.body.insertAdjacentHTML("afterbegin", `<div style="padding:20px;font-family:Inter,Arial">${esc(titulo)} — ${esc(detalhe)}</div>`); }
  }
  function barra() {
    const div = document.createElement("div"); div.id = "ti-barra";
    div.style.cssText = "display:flex;gap:8px;align-items:center;font-family:Inter,Arial,sans-serif";   // no slot do topo da casca (PICASSO), ao lado do nome
    div.innerHTML = (Dados.MODO_CLIENTE ? "" : `<select id="ti-sel" style="border:1px solid #E6E7E8;border-radius:12px;padding:8px 10px;background:#fff;font-weight:600;font-size:13px;max-width:240px"></select>
      <a href="../" style="background:#fff;border:1px solid #E6E7E8;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:700;color:#000;text-decoration:none">Gestor completo</a>`)
      + `<a href="#" id="ti-sair" style="font-size:12px;color:#787B86;text-decoration:underline">sair</a>`;
    (document.getElementById("slot_seletor") || document.body).appendChild(div);
    $("ti-sair").onclick = ev => { ev.preventDefault(); Dados.sair(); };
    if (!Dados.MODO_CLIENTE) { const sel = $("ti-sel"); sel.innerHTML = LISTA.map(c => `<option value="${esc(c.cliente)}">${esc(c.nome || c.cliente)}</option>`).join(""); sel.value = CLIENTE; sel.onchange = () => { CLIENTE = sel.value; location.hash = "cliente=" + encodeURIComponent(CLIENTE); abrir(); }; }
  }
  // barra de baixo do celular / menu (ids da casca das 20:26): destinos no Gestor completo; em modo cliente o menu nem existe
  function navegacao() {
    const liga = (id, fn) => { const el = $(id); if (el) el.onclick = ev => { ev.preventDefault(); fn(); }; };
    liga("nav_inicio", () => location.href = "../");
    liga("nav_cliente", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    liga("nav_giro", () => window.open(`../#aba=cg&cliente=${encodeURIComponent(CLIENTE || "")}`, "_blank"));
    liga("nav_topics", () => { const b = ((DADOS || {}).decidir || []).length ? bloco() : null; window.open(`../#aba=topics${b ? "&bloco=" + encodeURIComponent(b) : ""}`, "_blank"); });
  }
  const bloco = () => (((DADOS || {}).cliente || {}).bloco_topics) || (BLOCO || null);
  let BLOCO = null;

  async function arranque() {
    try {
      const s = await Dados.sessao();
      if (!s) { overlayLogin(); return; }
      LISTA = await Dados.clientes();
      const h = new URLSearchParams(location.hash.slice(1)), q = new URLSearchParams(location.search), pedido = h.get("cliente") || q.get("cliente");   // ?cliente= ou #cliente=
      CLIENTE = LISTA.some(c => c.cliente === pedido) ? pedido : null;   // BOSS (segurança): sem cliente válido na URL, a página pede para escolher — não abre num cliente por conta própria
      if (Dados.MODO_CLIENTE) { for (const el of document.querySelectorAll(".bro-fab, .bro-m, #bro, .rail")) el.style.setProperty("display", "none", "important"); if (main) main.style.marginLeft = "16px"; }   // modo cliente: sem Bro, sem menu (escondidos, não removidos: a casca ainda escreve em #brctx)
      barra(); navegacao();
      if (main) main.style.visibility = "";
      if (!CLIENTE) {   // GAMER: nome que não casa NUNCA vira página zerada que parece verdadeira — diz que não achou, na manchete também
        const naoAchou = !!pedido, nome = naoAchou ? "cliente não encontrado" : (Dados.MODO_CLIENTE ? "link sem cliente" : "escolha um cliente");
        const av = naoAchou ? "Cliente não encontrado" + (Dados.MODO_CLIENTE ? "" : ": “" + pedido + "” não está na lista — escolha no seletor") : (Dados.MODO_CLIENTE ? "Este link não aponta para um cliente" : "Escolha um cliente no seletor, no topo da página");
        window.desenhar({ cliente: { nome, codigo: "" }, prioridade: { titulo: av, detalhe: "nenhum dado foi lido" }, sem_bloco_topics: true });
        return;
      }
      await abrir();
    } catch (e) { console.error(e); aviso("A página não conseguiu arrancar", Dados.MODO_CLIENTE ? "tente de novo em instantes" : "sem resposta do banco ou da lista de clientes: " + (e && e.message || e)); }
  }
  async function abrir() {
    try { DADOS = await Dados.carregar(CLIENTE); BLOCO = ((DADOS.decidir || [])[0] || {}).bloco || null; window.desenhar(DADOS); depois(); }
    catch (e) { console.error(e); window.desenhar({ cliente: { nome: CLIENTE }, prioridade: { titulo: "Não foi possível carregar os dados", detalhe: Dados.MODO_CLIENTE ? "tente de novo em instantes" : "não consegui ler o banco: " + (e && e.message || e) }, sem_bloco_topics: true }); }
  }
  // o que a casca ainda não desenha sozinha (combinado com o PICASSO para absorver): "sem bloco no TOPICS" e o bloco da ação de trade
  function depois() {
    const dec = document.querySelector(".bento>.dec");
    if (dec && !Dados.MODO_CLIENTE && DADOS.sem_bloco_topics) {        // BOSS: bloco sem dado diz que não tem, nunca some calado
      dec.style.display = ""; const tpl = $("tpl"); if (tpl) tpl.innerHTML = '<div class="it" style="border:0"><div style="opacity:.8">sem bloco no TOPICS para este cliente</div></div>';
      const nv = dec.querySelector(".novo"); if (nv) nv.style.display = "none"; const n = $("c_ntp"); if (n) n.textContent = "sem bloco";
    } else if (dec && !Dados.MODO_CLIENTE) { const nv = dec.querySelector(".novo"); if (nv) nv.style.display = ""; }
    trade();
  }
  function trade() {
    document.querySelectorAll(".bento>.ti-trd").forEach(el => el.remove());
    const bento = document.querySelector(".bento"), A = ((DADOS || {}).trade || {}).acoes || [];
    if (!bento) return;
    const manch = bento.querySelector(".manch");
    for (const a of A.slice().reverse()) {
      const div = document.createElement("div"); div.className = "vd trd ti-trd";
      const ritmo = a.ritmo_base != null ? `${fmt(a.ritmo_base)} pares/dia` : "sem giro no banco", bate = a.ritmo_base != null && a.dias ? (a.ritmo_base * a.dias >= (a.meta_pares || 0)) : null;
      div.innerHTML = `<div class="ic">✦</div>
        <div><b>${esc(a.mecanica)}</b><small>ação de trade em andamento · período ${a.periodo_ini ? dtBR(a.periodo_ini) + " a " + dtBR(a.periodo_fim) : esc(a.periodo)}${a.restam != null ? " · faltam " + a.restam + " dias" : ""}</small>
          ${a.produtos && a.produtos.length ? `<small>${a.produtos.map(p => esc(p.modelo) + " (est. " + fmt(p.est) + " · " + fmt(p.vm) + "/mês)").join(" · ")}${a.mes_giro ? " · giro de " + dtBR(a.mes_giro).slice(3) + "/" + String(a.mes_giro).slice(2, 4) : ""}</small>` : ""}</div>
        <div><span class="v">${fmt(a.meta_pares)}</span><small>meta · pares</small></div>
        <div><span class="v">${fmt(a.precisa_dia)}</span><small>média/dia necessária</small></div>
        <div><span class="v">${esc(ritmo)}</span><small>ritmo-base (3 meses antes)${bate === false ? " · abaixo da meta" : ""}</small></div>
        <div><span class="v">—</span><small>vendido · apuração em ${dtBR(a.apuracao)}</small></div>`;
      if (manch && manch.nextSibling) bento.insertBefore(div, manch.nextSibling); else bento.appendChild(div);
    }
  }

  // ---------- eventos da casca
  const TIPO = { acess: "acessorio", conf: "confeccao" };
  window.onFiltro = f => { const nf = Object.assign({}, f, { tipo: TIPO[f.tipo] || f.tipo }); DADOS = Dados.refiltrar(nf); DADOS.filtro = f; window.desenhar(DADOS); depois(); };
  window.onTratar = (ref, cor) => window.open(`../#aba=cg&cliente=${encodeURIComponent(CLIENTE)}&ref=${encodeURIComponent(ref)}${cor ? "&cor=" + encodeURIComponent(cor) : ""}`, "_blank");
  // o Bro: a gaveta local da casca ainda não fala com a gestor-ia (o porte liga); até lá, abre o painel IA que existe no Gestor
  window.onBro = () => { if (Dados.MODO_CLIENTE) return; window.open(`../#aba=cliente&cliente=${encodeURIComponent(CLIENTE)}`, "_blank"); };
  // TOPICS tratável: grava no topics_item pelo mesmo caminho da aba TOPICS (política do banco: só quem está em topics_leitor).
  // Linha vinda da v_decidir_cliente (id "dec:…") não é item do TOPICS: "orientar" e "feito" viram um item novo no bloco do cliente, com a linha como nota.
  window.onTopico = async (acao, id, texto) => {
    if (Dados.MODO_CLIENTE) return;                                      // modo cliente: o TOPICS é interno; nada se lê nem se grava
    const sb = Dados.sb, b = BLOCO || (((DADOS || {}).topics || [])[0] || {}).bloco || null;
    try {
      const { data: { user } } = await sb.auth.getUser(); const quem = (user && user.email) || null;
      if (acao === "abrir") { window.open(`../#aba=topics${b ? "&bloco=" + encodeURIComponent(b) : ""}`, "_blank"); return; }
      const ehView = String(id || "").startsWith("dec:"), item = (DADOS.decidir || []).find(i => i.id === id);
      if (!b && acao !== "abrir") throw new Error("este cliente não tem bloco no TOPICS");
      if (ehView) {
        const novoId = "cl" + Date.now().toString(36), txt = acao === "feito" ? "Decidido na aba Cliente: " + (item ? item.texto : id) : (texto || "");
        if (!txt) return;
        const r = await sb.from("topics_item").insert({ escritorio_id: ESC, id: novoId, bloco: b, sub: "aba Cliente · " + (item ? item.regra : "decidir"), txt, nota: item ? `${item.regra} · ${item.fonte}` : null, tipo: acao === "feito" ? "tarefa" : "decisao", dono: "LEO", quem, feito: acao === "feito", alerta: false, atualizado_por: quem }); if (r.error) throw r.error;
      }
      else if (acao === "feito") { const r = await sb.from("topics_item").update({ feito: true, atualizado_por: quem }).match({ escritorio_id: ESC, id }); if (r.error) throw r.error; if (item) item.feito = true; }
      else if (acao === "orientar") { const r = await sb.from("topics_item").update({ resposta: texto || null, atualizado_por: quem }).match({ escritorio_id: ESC, id }); if (r.error) throw r.error; }
      else if (acao === "novo") {
        const novoId = "cl" + Date.now().toString(36);
        const r = await sb.from("topics_item").insert({ escritorio_id: ESC, id: novoId, bloco: b, sub: "aba Cliente", txt: texto, tipo: "tarefa", dono: "LEO", quem, feito: false, alerta: false, atualizado_por: quem }); if (r.error) throw r.error;
      }
      abrir();                                                           // relê do banco: a tela mostra o que está gravado, não o que eu acho
    } catch (e) { alert("o TOPICS não gravou: " + (e.message || e)); abrir(); }
  };
  arranque();
})();
