/* TRADE · a aba de trade do Gestor (TI, 19/10/2026). Ordem dele: "cria uma aba de Trade onde eu consiga ver o trade de todos os clientes,
   essas ações de trade". Fonte: a planilha de verbas dele (VERBAS TRADE CMS), carregada em trade_acao pelo carga_trade.py; as ações
   lançadas na aba Cliente ("+ ação") aparecem aqui também. Uma chamada (trade_consulta). Sem número de 4+ dígitos aqui. */
(function () {
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => n == null ? "—" : Math.round(Number(n)).toLocaleString("pt-BR");
const rs = n => n == null ? "—" : "R$ " + fmt(n);
const dmy = d => d ? String(d).slice(8, 10) + "/" + String(d).slice(5, 7) + "/" + String(d).slice(2, 4) : "—";
const ORD_ST = ["em andamento", "planejada", "feita", "não usada", "cancelada"];
let D = null, EL = null, SB = null, ESC = null, EMAIL = null;
const STATUS = ["planejada", "em andamento", "feita", "cancelada", "não usada"];
const S = { sem: null, vend: new Set(), st: new Set(), busca: "", aberta: new Set() };

async function abrir(sb, el){
  SB = sb; EL = el;
  if (!D) {
    el.innerHTML = `<div class="card">carregando o trade…</div>`;
    const r = await sb.rpc("trade_consulta");
    if (r.error) { el.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    D = r.data || { acoes: [], semestres: [], n: 0 };
    const e = await sb.from("escritorio").select("id").limit(1); ESC = (e.data && e.data[0] && e.data[0].id) || null;
    try { const s = await sb.auth.getSession(); EMAIL = (s.data && s.data.session && s.data.session.user && s.data.session.user.email) || null; } catch (x) { EMAIL = null; }
    const sems = (D.semestres || []).slice().sort().reverse();
    const h = new URLSearchParams(location.hash.slice(1)).get("semestre");
    S.sem = sems.includes(h) ? h : (sems[0] || null);
  }
  desenhar();
}
const chips = (id, lista, sel, aoClicar, unico) => {
  const el = EL.querySelector("#" + id);
  el.innerHTML = lista.map(([v, r, n]) => `<button type="button" data-v="${esc(v)}" class="${(unico ? v === sel : (v === "" ? !sel.size : sel.has(v))) ? "ativa" : ""}">${esc(r)}${n != null ? ` <small>${esc(n)}</small>` : ""}</button>`).join("");
  for (const b of el.querySelectorAll("button")) b.onclick = () => aoClicar(b.dataset.v);
};
const doSem = () => (D.acoes || []).filter(a => !S.sem || a.semestre === S.sem || (!a.semestre && S.sem === "outras"));
const filtradas = () => doSem().filter(a => (!S.vend.size || S.vend.has(a.vendedor || "—")) && (!S.st.size || S.st.has(a.status))
  && (!S.busca || (a.nome + " " + a.cliente + " " + a.titulo + " " + (a.nota || "") + " " + (a.vendedor || "")).toUpperCase().includes(S.busca.toUpperCase())));

function desenhar(){
  const el = EL;
  if (!el.querySelector(".tradeaba")) {
    el.innerHTML = `<div class="cliente tradeaba">
      <div class="card filtros">
        <div class="linha"><label>semestre</label><div class="chips" id="tr-sem"></div></div>
        <div class="linha"><label>vendedor</label><div class="chips" id="tr-vend"></div></div>
        <div class="linha"><label>status</label><div class="chips" id="tr-st"></div></div>
        <input type="search" id="tr-busca" placeholder="buscar cliente, estratégia, nota…" autocomplete="off" value="${esc(S.busca)}">
      </div>
      <div id="tr-placar"></div>
      <div id="tr-corpo"></div>
    </div>`;
    el.querySelector("#tr-busca").oninput = ev => { S.busca = ev.target.value; clearTimeout(desenhar._t); desenhar._t = setTimeout(desenharCorpo, 120); };
  }
  const sems = (D.semestres || []).slice().sort().reverse(), semOutras = (D.acoes || []).some(a => !a.semestre);
  chips("tr-sem", [...sems.map(s => [s, s, (D.acoes || []).filter(a => a.semestre === s).length]), ...(semOutras ? [["outras", "sem semestre", (D.acoes || []).filter(a => !a.semestre).length]] : [])], S.sem, v => { S.sem = v; S.vend.clear(); S.st.clear(); desenhar(); }, true);
  const base = doSem(), cv = new Map(), cs = new Map();
  for (const a of base) { const v = a.vendedor || "—"; cv.set(v, (cv.get(v) || 0) + 1); cs.set(a.status, (cs.get(a.status) || 0) + 1); }
  chips("tr-vend", [["", "todos"], ...[...cv.entries()].sort().map(([v, n]) => [v, v, n])], S.vend, v => { if (v === "") S.vend.clear(); else if (S.vend.has(v)) S.vend.delete(v); else S.vend.add(v); desenhar(); });
  chips("tr-st", [["", "todos"], ...ORD_ST.filter(s => cs.has(s)).map(s => [s, s, cs.get(s)])], S.st, v => { if (v === "") S.st.clear(); else if (S.st.has(v)) S.st.delete(v); else S.st.add(v); desenhar(); });
  desenharCorpo();
}

function desenharCorpo(){
  const lista = filtradas(), tot = k => lista.reduce((s, a) => s + (Number(a[k]) || 0), 0);
  // a verba (ele, 21/10 10:1x: "considere a verba consumida somente o que está feito ou em andamento; outra informação do que está
  // provisionado [planejada] e outra do que ainda está em aberto — a todo momento a gente muda a intenção da ação")
  const valor = a => Number(a.provisionado != null ? a.provisionado : a.verba) || 0;
  const vivas = lista.filter(a => a.status !== "cancelada"), total = vivas.reduce((s, a) => s + valor(a), 0);
  const consumida = lista.filter(a => a.status === "feita" || a.status === "em andamento").reduce((s, a) => s + (a.utilizada != null ? Number(a.utilizada) : valor(a)), 0);
  const provisionada = lista.filter(a => a.status === "planejada").reduce((s, a) => s + valor(a), 0);
  const aberto = total - consumida - provisionada, canceladas = lista.filter(a => a.status === "cancelada").reduce((s, a) => s + valor(a), 0);
  const portas = tot("portas"), carga = D.carga || {};
  EL.querySelector("#tr-placar").innerHTML = `<div class="card"><div class="num"><div><b>${rs(total)}</b><small>verba total (sem canceladas)</small></div><div><b>${rs(consumida)}</b><small>consumida · feita + em andamento</small></div><div><b>${rs(provisionada)}</b><small>provisionada · planejada</small></div><div class="${aberto > 0 ? "al" : ""}"><b>${rs(aberto)}</b><small>em aberto</small></div><div><b>${rs(canceladas)}</b><small>canceladas</small></div><div><b>${fmt(lista.length)}</b><small>ações</small></div><div><b>${fmt(portas)}</b><small>portas</small></div></div>
    <div class="fontes">${carga.arquivo ? `planilha ${esc(carga.arquivo)} · carga de ${dmy(carga.carregado_em)}` : "sem carga da planilha de verbas"} · as ações lançadas na aba Cliente entram aqui também</div></div>`;
  if (!lista.length) { EL.querySelector("#tr-corpo").innerHTML = `<div class="card vazio">nenhuma ação de trade com esses filtros.</div>`; return; }
  const max = Math.max(1, ...lista.map(a => Number(a.provisionado) || 0));
  EL.querySelector("#tr-corpo").innerHTML = `<div class="card"><table class="mini tr"><thead><tr><th>cliente</th><th>vend.</th><th class="n">portas</th><th>estratégia</th><th class="n">provisionado</th><th class="n">utilizada</th><th class="n">restante</th><th>status</th></tr></thead>
    <tbody>${lista.map(a => { const ab = S.aberta.has(a.id); return `<tr class="st-${esc(String(a.status).replace(/\\s/g, "-"))}${a.nota ? " tem-nota" : ""}" data-id="${a.id}">
      <td><button type="button" class="lnk cli" data-cli="${esc(a.cliente)}">${esc(a.nome || a.cliente)}</button>${a.cod_lider ? `<small class="mu">${esc(a.cod_lider)}</small>` : ""}</td>
      <td>${esc(a.vendedor || "—")}</td><td class="n">${a.portas != null ? fmt(a.portas) : "—"}</td>
      <td class="estr"><div class="barra" style="--w:${Math.round(100 * (Number(a.provisionado) || 0) / max)}%"></div>${esc(a.titulo)}${a.tipo && a.tipo !== "outro" ? ` <span class="chip">${esc(a.tipo)}</span>` : ""}${a.nota ? `<small class="nota${ab ? " aberta" : ""}">${esc(a.nota)}</small>` : ""}</td>
      <td class="n">${rs(a.provisionado != null ? a.provisionado : a.verba)}</td><td class="n">${a.utilizada != null ? rs(a.utilizada) : "—"}</td><td class="n c">${a.restante != null ? rs(a.restante) : "—"}</td>
      <td><select class="st" data-id="${a.id}">${STATUS.map(s => `<option ${s === a.status ? "selected" : ""}>${s}</option>`).join("")}</select><div class="atu" contenteditable="true" data-id="${a.id}" data-antes="${esc(a.atualizacao || "")}" title="sua atualização: escreva e aperte Enter">${esc(a.atualizacao || "")}</div></td></tr>`; }).join("")}</tbody>
    <tfoot><tr><td colspan="4">${lista.length} ações</td><td class="n">${rs(tot("provisionado"))}</td><td class="n">${rs(tot("utilizada"))}</td><td class="n c">${rs(aberto)}</td><td></td></tr></tfoot></table></div>`;
  for (const b of EL.querySelectorAll("#tr-corpo button.cli")) b.onclick = () => { if (window.irPara) window.irPara("cliente", { cliente: b.dataset.cli }); };
  // VIVO (ele, 19/10 19:5x: "que eu consiga selecionar o status e um campo para eu atualizar"): grava em trade_acao; o gatilho guarda o histórico
  const gravar = async (id, patch) => {
    const r = await SB.from("trade_acao").update(Object.assign({ atualizado_em: new Date().toISOString() }, patch)).match({ id: Number(id), escritorio_id: ESC });
    const msg = EL.querySelector("#tr-placar .fontes");
    if (r.error) { msg.innerHTML = `<span class="msg erro">O banco recusou: ${esc(r.error.message)}</span>`; return false; }
    const a = (D.acoes || []).find(x => x.id === Number(id)); if (a) Object.assign(a, patch);
    if (window.Cliente && Cliente.recarregar) Cliente.recarregar();
    return true;
  };
  for (const s of EL.querySelectorAll("#tr-corpo select.st")) s.onchange = async () => { if (await gravar(s.dataset.id, { status: s.value })) desenhar(); };
  for (const r of EL.querySelectorAll("#tr-corpo .atu")) {
    r.onkeydown = ev => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); r.blur(); } };
    r.onblur = async () => { const v = r.textContent.trim(); if (v !== (r.dataset.antes || "")) { const hoje = new Date().toLocaleDateString("pt-BR").slice(0, 5); const txt = v && !/^\d\d\/\d\d/.test(v) ? hoje + " " + v : v; if (await gravar(r.dataset.id, { atualizacao: txt || null })) desenharCorpo(); } };
  }
  for (const n of EL.querySelectorAll("#tr-corpo .nota")) n.onclick = () => { const id = Number(n.closest("tr").dataset.id); if (S.aberta.has(id)) S.aberta.delete(id); else S.aberta.add(id); n.classList.toggle("aberta"); };
}

window.Trade = { abrir, estado: () => ({ semestre: S.sem }), recarregar: () => { D = null; } };
})();
