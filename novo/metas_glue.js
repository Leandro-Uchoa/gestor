// Gestor · Metas por cliente (novo) — a COLA entre a casca do PICASSO (desenharMetas) e a camada de dados do TI (metas_dados.js). TI, 28/10/2026.
// Login do Supabase (o mesmo do Gestor), "sair" com escopo local, e nada se desenha antes da sessão. Em ?modo=cliente a página não abre:
// as metas são leitura interna (a Vulcabras dá a meta ao preposto; a divisão por cliente é leitura nossa).
(() => {
  const $ = id => document.getElementById(id), main = document.querySelector(".main");
  if (main) main.style.visibility = "hidden";
  function overlayLogin() {
    const div = document.createElement("div"); div.id = "ti-login";
    div.style.cssText = "position:fixed;inset:0;background:#F6F5F0;z-index:1000;display:flex;align-items:center;justify-content:center;font-family:Inter,Arial,sans-serif";
    div.innerHTML = `<form id="ti-form" style="background:#fff;border:1px solid #E6E7E8;border-radius:20px;padding:28px 26px;width:min(92vw,380px);box-shadow:0 10px 30px rgba(0,0,0,.08)">
      <div style="font:800 12px Barlow;letter-spacing:.18em;margin-bottom:6px">OLYMPIKUS</div><div style="font:800 24px Barlow;margin-bottom:18px">Gestor · Metas</div>
      <label style="font-size:12px;color:#787B86">E-mail</label><input id="ti-email" type="email" autocomplete="username" required style="width:100%;margin:4px 0 12px;padding:10px;border:1px solid #E6E7E8;border-radius:10px">
      <label style="font-size:12px;color:#787B86">Senha</label><input id="ti-senha" type="password" autocomplete="current-password" required style="width:100%;margin:4px 0 16px;padding:10px;border:1px solid #E6E7E8;border-radius:10px">
      <button type="submit" style="width:100%;background:#2E3EFC;color:#fff;border:0;border-radius:12px;padding:11px;font-weight:700">Entrar</button><div id="ti-msg" style="color:#E3001B;font-size:12px;margin-top:8px"></div></form>`;
    document.body.appendChild(div);
    $("ti-form").onsubmit = async ev => { ev.preventDefault(); $("ti-msg").textContent = ""; const e = await DadosMetas.entrar($("ti-email").value.trim(), $("ti-senha").value); if (e) $("ti-msg").textContent = "não entrou: " + e; else location.reload(); };
  }
  function aviso(txt) { if (main) main.style.visibility = ""; const a = $("m_aviso"); if (a) a.textContent = txt; const g = $("geral"); if (g) g.innerHTML = ""; }
  function barra() {
    const topo = document.querySelector(".topo .d-flex"); if (!topo) return;
    const a = document.createElement("div"); a.style.cssText = "display:flex;gap:10px;align-items:center;font-family:Inter,Arial;font-size:12px;margin-left:8px";
    a.innerHTML = `<a href="cliente.html" style="background:#fff;border:1px solid #E6E7E8;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:700;color:#000;text-decoration:none">Cliente</a><a href="../" style="background:#fff;border:1px solid #E6E7E8;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:700;color:#000;text-decoration:none">Gestor completo</a><a href="#" id="ti-sair" style="color:#787B86;text-decoration:underline">sair</a>`;
    topo.appendChild(a); $("ti-sair").onclick = ev => { ev.preventDefault(); DadosMetas.sair(); };
  }
  async function arranque() {
    try {
      if (DadosMetas.MODO_CLIENTE) { aviso("As metas não abrem nesta visão."); return; }
      const s = await DadosMetas.sessao();
      if (!s) { overlayLogin(); return; }
      barra();
      const dados = await DadosMetas.carregar();
      if (main) main.style.visibility = "";
      window.desenharMetas(dados);
      if (!(dados.linhas || []).length) aviso("Sem linhas de meta no banco para os períodos da tela.");
    } catch (e) { console.error(e); aviso("Não foi possível carregar as metas: " + (e && e.message || e)); }
  }
  arranque();
})();
