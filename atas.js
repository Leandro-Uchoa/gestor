// ATAS — a aba das atas da CMS no Gestor (ordem dele via BOSS, 14/10/2026). Só desenho: a lista vem de atas_lista() e o texto de
// uma ata de ata_texto(id), do banco, atrás do login. Nada de ata mora neste repositório (tem decisão, cliente e número).
// Uma linha por reunião (data, título, participantes, decisões); toque abre a ata inteira; filtros: mês, pasta (cliente) e assunto.
// Regra da casa para este arquivo (publica_portal): nenhum número de 4+ dígitos no código.
(function(){
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const semAcento = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dmy = d => d ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(2, 4) : "—";
const mesBR = m => m ? MESES[+m.slice(5, 7) - 1] + "/" + m.slice(2, 4) : "";
let DADOS = null, EL = null, SB = null;
const S = { pasta: new Set(), mes: new Set(), assunto: new Set(), busca: "" };

async function abrir(sb, el){
  SB = sb; EL = el;
  if (!DADOS) {
    el.innerHTML = `<div class="card">carregando as atas…</div>`;
    const r = await sb.rpc("atas_lista");
    if (r.error) { el.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    DADOS = r.data || { atas: [], n: 0 };
    for (const a of DADOS.atas) a.mes = a.data ? a.data.slice(0, 7) : "";
  }
  desenhar();
}

function filtradas(){
  const t = semAcento(S.busca).split(/\s+/).filter(Boolean);
  return DADOS.atas.filter(a => (!S.pasta.size || S.pasta.has(a.pasta)) && (!S.mes.size || S.mes.has(a.mes))
    && (!S.assunto.size || (a.assunto || []).some(x => S.assunto.has(x)))
    && (!t.length || t.every(x => semAcento(a.titulo + " " + a.pasta + " " + (a.participantes || "") + " " + (a.decisoes || "") + " " + (a.assunto || []).join(" ")).includes(x))));
}

function chips(id, lista, sel){
  const el = EL.querySelector("#" + id);
  el.innerHTML = lista.map(([v, r, n]) => `<button type="button" data-v="${esc(v)}" class="${(v === "" ? !sel.size : sel.has(v)) ? "ativa" : ""}">${esc(r)}${n != null ? ` <small>${n}</small>` : ""}</button>`).join("");
  for (const b of el.querySelectorAll("button")) b.onclick = () => { const v = b.dataset.v; if (v === "") sel.clear(); else if (sel.has(v)) sel.delete(v); else sel.add(v); desenhar(); };
}

function desenhar(){
  const el = EL;
  if (!el.querySelector(".atas")) {
    el.innerHTML = `<div class="atas">
      <div class="card filtros">
        <input type="search" id="atas-busca" placeholder="buscar: cliente, assunto, quem estava, o que foi decidido…" autocomplete="off" value="${esc(S.busca)}" style="padding:10px 12px">
        <label>cliente / pasta</label><div class="chips" id="atas-pasta"></div>
        <label>mês</label><div class="chips" id="atas-mes"></div>
        <label>assunto</label><div class="chips" id="atas-assunto"></div>
        <div class="mu" id="atas-conta"></div>
      </div>
      <div class="lista" id="atas-lista"></div>
      <div class="luz oculto" id="atas-luz"></div>
    </div>`;
    el.querySelector("#atas-busca").oninput = (ev) => { S.busca = ev.target.value; clearTimeout(desenhar._t); desenhar._t = setTimeout(desenharLista, 120); };
    el.querySelector("#atas-luz").onclick = (ev) => { if (ev.target.id === "atas-luz" || ev.target.classList.contains("fecha")) fecharLuz(); };
  }
  const conta = (f) => { const c = new Map(); for (const a of DADOS.atas) for (const v of f(a)) if (v) c.set(v, (c.get(v) || 0) + 1); return c; };
  const cp = conta(a => [a.pasta]);
  chips("atas-pasta", [["", "todas"], ...[...cp.entries()].sort((x, y) => y[1] - x[1]).map(([v, n]) => [v, v, n])], S.pasta);
  const cm = conta(a => [a.mes]);
  chips("atas-mes", [["", "todos"], ...[...cm.entries()].sort((x, y) => y[0].localeCompare(x[0])).slice(0, 14).map(([v, n]) => [v, mesBR(v), n])], S.mes);
  const ca = conta(a => (a.assunto || []).filter(x => x !== a.pasta));
  chips("atas-assunto", [["", "todos"], ...[...ca.entries()].sort((x, y) => y[1] - x[1]).map(([v, n]) => [v, v, n])], S.assunto);
  desenharLista();
}

function desenharLista(){
  const lista = filtradas();
  EL.querySelector("#atas-conta").textContent = `${lista.length} de ${DADOS.n} ata(s)`;
  const g = EL.querySelector("#atas-lista");
  g.innerHTML = lista.map(a => `<div class="ata" data-id="${esc(a.id)}">
      <div class="cab"><span class="data">${dmy(a.data)}</span><span class="pasta">${esc(a.pasta)}</span><span class="fmt mu">${esc(a.formato)}</span></div>
      <div class="titulo">${esc(a.titulo)}</div>
      ${a.participantes ? `<div class="mu part">${esc(a.participantes.replace(/\|/g, " · ").replace(/\s+/g, " ").slice(0, 160))}</div>` : ""}
      ${a.decisoes ? `<div class="dec">${esc(a.decisoes.replace(/[#*|_>`]/g, "").replace(/\s+/g, " ").slice(0, 260))}${a.decisoes.length > 260 ? "…" : ""}</div>` : ""}
    </div>`).join("") || `<div class="card mu">Nenhuma ata com esses filtros.</div>`;
  for (const d of g.querySelectorAll(".ata")) d.onclick = () => abrirAta(d.dataset.id);
}

async function abrirAta(id){
  const luz = EL.querySelector("#atas-luz");
  luz.innerHTML = `<div class="quadro"><button type="button" class="fecha">×</button><div class="mu">abrindo…</div></div>`;
  luz.classList.remove("oculto");
  const r = await SB.rpc("ata_texto", { p_id: id });
  if (r.error || !r.data) { luz.querySelector(".quadro").innerHTML = `<button type="button" class="fecha">×</button><div class="msg erro">O banco recusou: ${esc(r.error ? r.error.message : "ata não encontrada")}</div>`; return; }
  const a = r.data;
  luz.querySelector(".quadro").innerHTML = `<button type="button" class="fecha">×</button>
    <div class="cab"><span class="data">${dmy(a.data)}</span><span class="pasta">${esc(a.pasta)}</span><span class="mu">${esc(a.arquivo)}</span></div>
    <h2>${esc(a.titulo)}</h2>
    <div class="texto">${a.formato === "md" ? md2html(a.texto) : `<pre>${esc(a.texto)}</pre>`}</div>`;
}
function fecharLuz(){ EL.querySelector("#atas-luz").classList.add("oculto"); }

// markdown mínimo, só o que a ATA VIVA usa: títulos, negrito, itálico, listas, tabelas, citações, linhas
function md2html(src){
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/~~(.+?)~~/g, "<s>$1</s>");
  const linhas = src.replace(/\r/g, "").split("\n"); let out = "", i = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    if (/^\s*\|/.test(l)) {
      const tb = []; while (i < linhas.length && /^\s*\|/.test(linhas[i])) tb.push(linhas[i++]);
      const rows = tb.filter(r => !/^\s*\|?\s*:?-{2,}/.test(r)).map(r => r.replace(/^\s*\||\|\s*$/g, "").split("|").map(c => c.trim()));
      out += "<table>" + rows.map((r, k) => "<tr>" + r.map(c => `<${k ? "td" : "th"}>${inline(c)}</${k ? "td" : "th"}>`).join("") + "</tr>").join("") + "</table>"; continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(l);
    if (h) { out += `<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`; i++; continue; }
    if (/^\s*[-*]\s+/.test(l)) { let ul = ""; while (i < linhas.length && /^\s*[-*]\s+/.test(linhas[i])) ul += `<li>${inline(linhas[i++].replace(/^\s*[-*]\s+/, ""))}</li>`; out += `<ul>${ul}</ul>`; continue; }
    if (/^\s*\d+[.)]\s+/.test(l)) { let ol = ""; while (i < linhas.length && /^\s*\d+[.)]\s+/.test(linhas[i])) ol += `<li>${inline(linhas[i++].replace(/^\s*\d+[.)]\s+/, ""))}</li>`; out += `<ol>${ol}</ol>`; continue; }
    if (/^\s*>/.test(l)) { let q = ""; while (i < linhas.length && /^\s*>/.test(linhas[i])) q += inline(linhas[i++].replace(/^\s*>\s?/, "")) + " "; out += `<blockquote>${q}</blockquote>`; continue; }
    if (/^\s*-{3,}\s*$/.test(l)) { out += "<hr>"; i++; continue; }
    if (!l.trim()) { i++; continue; }
    let p = ""; while (i < linhas.length && linhas[i].trim() && !/^(#{1,4}\s|\s*[-*]\s|\s*\d+[.)]\s|\s*>|\s*\||\s*-{3,}\s*$)/.test(linhas[i])) p += inline(linhas[i++]) + " ";
    out += `<p>${p}</p>`;
  }
  return out;
}

window.Atas = { abrir };
})();
