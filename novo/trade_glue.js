// Gestor · TRADE (novo) — a COLA entre a casca (desenharTrade / onSemestre / onFiltro / onStatus / onAtualizacao / onDesfazer / onAcao) e a camada
// de dados do TI (trade_dados.js). TI, 28/10/2026. Login do Supabase (o mesmo do Gestor), seletor de semestre vindo do banco, semestre pela URL
// (#semestre=2S26) ou o último com verba; "Carregando…" na troca; ⛔ em ?modo=cliente a página não abre (verba, vendedor e todos os clientes).
// v2 (GAMER): gravação redesenha só a linha (so_linha); falha não apaga o digitado; "Desfazer" regrava o valor de antes; nenhum redesenho por relógio.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let SEMESTRE = null, DADOS = null, ULTIMO = null;
  const main = document.querySelector(".main"); if (main) main.style.visibility = "hidden";
  const desenhar = d => { if (typeof window.desenharTrade === "function") window.desenharTrade(d); else console.warn("casca sem desenharTrade"); };
  const vazio = (titulo, detalhe) => ({ semestre: SEMESTRE, aviso: { titulo, detalhe }, verba: { sem_verba: true, parcial: true }, filtros: {}, acoes: [], semestres: [] });

  if (new URLSearchParams(location.search).get("modo") === "cliente") {   // tela interna: verba e vendedor de todos os clientes na mesma tela
    document.body.innerHTML = `<div style="padding:40px;font-family:Inter,Arial;max-width:520px"><h2 style="font:800 22px Barlow">Página interna</h2><p>Esta página não abre no modo cliente.</p></div>`; return;
  }
  function overlayLogin() {
    const div = document.createElement("div"); div.id = "ti-login";
    div.style.cssText = "position:fixed;inset:0;background:#F6F5F0;z-index:1000;display:flex;align-items:center;justify-content:center;font-family:Inter,Arial,sans-serif";
    div.innerHTML = `<form id="ti-form" style="background:#fff;border:1px solid #E6E7E8;border-radius:20px;padding:28px 26px;width:min(92vw,380px);box-shadow:0 10px 30px rgba(0,0,0,.08)">
      <div style="font:800 12px Barlow;letter-spacing:.18em;margin-bottom:6px">OLYMPIKUS</div><div style="font:800 24px Barlow;margin-bottom:18px">Gestor · Trade</div>
      <label style="font-size:12px;color:#787B86">E-mail</label><input id="ti-email" type="email" autocomplete="username" required style="width:100%;margin:4px 0 12px;padding:10px;border:1px solid #E6E7E8;border-radius:10px;min-height:44px;box-sizing:border-box">
      <label style="font-size:12px;color:#787B86">Senha</label><input id="ti-senha" type="password" autocomplete="current-password" required style="width:100%;margin:4px 0 16px;padding:10px;border:1px solid #E6E7E8;border-radius:10px;min-height:44px;box-sizing:border-box">
      <button type="submit" style="width:100%;background:#2E3EFC;color:#fff;border:0;border-radius:12px;padding:11px;font-weight:700;min-height:44px">Entrar</button><div id="ti-msg" style="color:#E3001B;font-size:12px;margin-top:8px"></div></form>`;
    document.body.appendChild(div);
    $("ti-form").onsubmit = async ev => { ev.preventDefault(); $("ti-msg").textContent = ""; const e = await DadosTrade.entrar($("ti-email").value.trim(), $("ti-senha").value); if (e) $("ti-msg").textContent = "não entrou: " + e; else location.reload(); };
  }
  function aviso(titulo, detalhe) { if (main) main.style.visibility = ""; try { desenhar(vazio(titulo, detalhe)); } catch (e) { document.body.insertAdjacentHTML("afterbegin", `<div style="padding:20px;font-family:Inter,Arial">${esc(titulo)} — ${esc(detalhe)}</div>`); } }
  function barra() {
    if ($("ti-barra")) return;
    const div = document.createElement("div"); div.id = "ti-barra"; div.style.cssText = "display:flex;gap:8px;align-items:center;font-family:Inter,Arial,sans-serif";
    div.innerHTML = `<select id="ti-sel" aria-label="semestre" style="border:1px solid #E6E7E8;border-radius:12px;padding:8px 10px;background:#fff;font-weight:600;font-size:13px;max-width:200px;min-height:44px"></select>
      <a href="cliente.html" id="ti-cli" style="background:#fff;border:1px solid #E6E7E8;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:700;color:#000;text-decoration:none;min-height:44px;display:inline-flex;align-items:center">aba Cliente</a>
      <a href="#" id="ti-sair" style="font-size:12px;color:#787B86;text-decoration:underline;min-height:44px;display:inline-flex;align-items:center;padding:0 12px;min-width:44px;justify-content:center">sair</a>`;
    (document.getElementById("slot_seletor") || document.body).appendChild(div);
    $("ti-sair").onclick = ev => { ev.preventDefault(); DadosTrade.sair(); };
    $("ti-sel").onchange = () => { SEMESTRE = $("ti-sel").value; hashAtual(); abrir(); };
    const nav = $("nav_trade"); if (nav) nav.onclick = ev => { ev.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); };   // GAMER: href="#" apagava o #semestre
  }
  function seletor() {
    const sel = $("ti-sel"); if (!sel || !DADOS) return;
    const L = (DADOS.semestres || []).map(s => s.chave); if (SEMESTRE && !L.includes(SEMESTRE)) L.unshift(SEMESTRE);
    sel.innerHTML = L.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join(""); if (SEMESTRE) sel.value = SEMESTRE;
  }
  const hashAtual = () => { if (SEMESTRE) location.hash = "semestre=" + encodeURIComponent(SEMESTRE); };

  async function arranque() {
    try {
      const s = await DadosTrade.sessao(); if (!s) { overlayLogin(); return; }
      const h = new URLSearchParams(location.hash.slice(1)); SEMESTRE = h.get("semestre") || null;
      barra(); if (main) main.style.visibility = "";
      await abrir();
    } catch (e) { console.error(e); aviso("A página não conseguiu arrancar", "sem resposta do banco: " + (e && e.message || e)); }
  }
  let cargaAtual = 0;
  async function abrir() {
    const carga = ++cargaAtual; ULTIMO = null;
    try { desenhar(vazio("Carregando" + (SEMESTRE ? " " + SEMESTRE : "") + "…", "lendo o banco")); } catch (e) { /* casca sem dado desenha "—" */ }
    try {
      const dados = await DadosTrade.carregar(SEMESTRE, parcial => { if (carga === cargaAtual) { DADOS = parcial; SEMESTRE = parcial.semestre || SEMESTRE; seletor(); desenhar(parcial); } });
      if (carga !== cargaAtual) return;
      DADOS = dados; SEMESTRE = dados.semestre || SEMESTRE; hashAtual(); seletor(); desenhar(DADOS);
    } catch (e) { if (carga !== cargaAtual) return; console.error(e); desenhar(vazio("Não foi possível carregar os dados", "não consegui ler o banco: " + (e && e.message || e) + " — troque o semestre no seletor ou recarregue a página"));
      const m = $("a_placar"); if (m && !$("ti-repetir")) { m.insertAdjacentHTML("afterend", `<button id="ti-repetir" type="button" class="mb-bt" style="margin-top:10px;background:#FFFF1A;color:#000;border:0;min-height:44px;padding:0 14px;border-radius:12px;font:700 12px Inter">tentar de novo</button>`); $("ti-repetir").onclick = () => { $("ti-repetir").remove(); abrir(); }; } }
  }
  const refaz = f => { if (!DADOS) return; DADOS = DadosTrade.refiltrar(f || DadosTrade.filtro()); desenhar(DADOS); };
  // grava e redesenha SÓ a linha; guarda o valor de antes para o "Desfazer"
  async function gravar(id, patch, antes, texto) {
    const e = await DadosTrade.gravar(id, patch);
    if (e) { if (!DADOS) return; DADOS.gravado = { erro: e, id }; DADOS.so_linha = -1; desenhar(DADOS); return; }   // falha: nada redesenhado na linha (o digitado fica), aviso na linha e no toast
    ULTIMO = antes ? { id, patch: antes } : null;
    DADOS = DadosTrade.refiltrar(DadosTrade.filtro()); DADOS.gravado = { texto, id, desfazer: !!antes }; DADOS.so_linha = id; desenhar(DADOS);
  }
  // ---------- eventos da casca
  window.onSemestre = k => { if (!k || k === SEMESTRE) return; SEMESTRE = k; hashAtual(); abrir(); };
  window.onFiltro = f => refaz(f);
  window.onStatus = (id, status) => { const a = DadosTrade.acao(id) || {}; gravar(id, { status }, { status: a.status }, "status: " + (status === "arquivada" ? "arquivada" : status)); };
  window.onAtualizacao = (id, texto) => {
    const v = String(texto || "").trim(), hoje = new Date().toLocaleDateString("pt-BR").slice(0, 5);
    const txt = v && !/^\d\d\/\d\d/.test(v) ? hoje + " " + v : v;   // como no Gestor atual: a atualização ganha a data do dia
    const a = DadosTrade.acao(id) || {};
    gravar(id, { atualizacao: txt || null }, { atualizacao: a.atualizacao || null }, txt ? "atualização: " + txt : "atualização apagada");
  };
  window.onDesfazer = () => { if (!ULTIMO) return; const u = ULTIMO; ULTIMO = null; gravar(u.id, u.patch, null, "desfeito"); };
  window.onAcao = (nome, ctx) => {
    if (nome === "exportar_pdf") { window.print(); return true; }
    if (nome === "recarregar") { abrir(); return true; }
    if (nome === "cliente") { const c = (ctx || {}).cliente; if (c) window.open("cliente.html#cliente=" + encodeURIComponent(c), "_blank"); return true; }
    return false;
  };
  arranque();
})();
