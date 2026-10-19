// TOPICS — a aba do TO-DO LIST TOPICS dentro do Gestor (ordem dele, 19/10/2026: "o TOPICS tem que fazer parte do Gestor; vai para o
// banco de dados, parte do futuro SaaS com núcleos desmembrados"). Só desenho: tudo vem de topics_consulta(), do banco, atrás do login
// e da lista topics_leitor (hoje só ele). Marcar feito e responder gravam na tabela topics_item (gatilho guarda o histórico).
// Estrutura dele (19/10): CLIENTE → ASSUNTO (sub) → mini-demandas marcáveis; fechado, o cliente mostra só os pendentes.
// Regra da casa (publica_portal): nenhum número de 4+ dígitos; nada de item mora neste repositório.
(function(){
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const semAcento = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const dmy = d => d ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(2, 4) : "";
let D = null, EL = null, SB = null, ESC = null, EMAIL = null;
const S = { bloco: null, vista: "pendentes", busca: "", abertas: new Set(), agora: "mini" };   // agora: mini (5) | tudo | fechado (uma linha)
const AGORA_MINI = 5;
const hoje = () => new Date().toISOString().slice(0, 10);

async function abrir(sb, el){
  SB = sb; EL = el;
  if (!D) {
    el.innerHTML = `<div class="card">carregando o TOPICS…</div>`;
    const r = await sb.rpc("topics_consulta");
    if (r.error) { el.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    D = r.data || { blocos: [], n: 0, pendentes: 0 };
    if (!D.blocos.length) { el.innerHTML = `<div class="card mu">O TOPICS está vazio para este login — ou este login não está na lista de quem vê o TOPICS.</div>`; return; }
    const e = await sb.from("topics_leitor").select("escritorio_id").limit(1); ESC = (e.data && e.data[0] && e.data[0].escritorio_id) || null;
    try { const s = await sb.auth.getSession(); EMAIL = s.data && s.data.session && s.data.session.user ? s.data.session.user.email : null; } catch (x) { EMAIL = null; }
    const h = new URLSearchParams(location.hash.slice(1)).get("bloco");
    S.bloco = (h && D.blocos.some(b => b.nome === h)) ? h : (D.blocos[0] || {}).nome;
  }
  desenhar();
}
const pend = b => b.itens.filter(i => !i.feito).length;
const urgentes = () => D.blocos.flatMap(b => b.itens.filter(i => i.alerta && !i.feito).map(i => Object.assign({ _bloco: b.nome }, i)));

function desenhar(){
  const el = EL;
  if (!el.querySelector(".topics")) {
    el.innerHTML = `<div class="topics">
      <div class="card filtros">
        <div class="linha-topo"><div class="chips" id="tp-vista"></div><input type="search" id="tp-busca" placeholder="buscar em todos os blocos: cliente, produto, assunto, resposta…" autocomplete="off" value="${esc(S.busca)}"></div>
        <label>cliente / bloco</label><div class="chips blocos" id="tp-blocos"></div>
        <div class="mu" id="tp-conta"></div>
      </div>
      <div id="tp-agora"></div>
      <div id="tp-corpo"></div>
    </div>`;
    el.querySelector("#tp-busca").oninput = ev => { S.busca = ev.target.value; clearTimeout(desenhar._t); desenhar._t = setTimeout(desenharCorpo, 120); };
  }
  chips("tp-vista", [["pendentes", "pendentes", D.pendentes], ["feitos", "feitos", D.n - D.pendentes], ["todos", "todos", D.n]], S.vista, v => { S.vista = v; desenharCorpo(); });
  // PICASSO (19/10): o bloco que ele tocou vem primeiro — tocar num bloco recolhe o AGORA a uma linha; aberto, mostra 5 e o botão "ver os N"
  chips("tp-blocos", D.blocos.map(b => [b.nome, b.nome, pend(b)]), S.bloco, v => { S.bloco = v; S.agora = "fechado"; desenharAgora(); desenharCorpo(); }, b => D.blocos.find(x => x.nome === b).cliente ? "cli" : "");
  desenharAgora();
  desenharCorpo();
}
function desenharAgora(){
  const el = EL.querySelector("#tp-agora"), ag = urgentes();
  if (!ag.length) { el.innerHTML = ""; return; }
  if (S.agora === "fechado") el.innerHTML = `<button type="button" class="agora-linha" id="tp-agora-abre">AGORA · ${ag.length} urgente(s) ▸</button>`;
  else {
    const lista = S.agora === "tudo" ? ag : ag.slice(0, AGORA_MINI);
    el.innerHTML = `<div class="card agora"><div class="sec-tit">AGORA <small>${ag.length} urgente(s), de todos os blocos</small><button type="button" class="sec mini" id="tp-agora-fecha">recolher</button></div>${lista.map(i => linha(i, true)).join("")}
      ${ag.length > lista.length ? `<button type="button" class="sec ver-mais" id="tp-agora-tudo">ver os ${ag.length} urgentes</button>` : ""}</div>`;
  }
  const a = el.querySelector("#tp-agora-abre"); if (a) a.onclick = () => { S.agora = "mini"; desenharAgora(); };
  const f = el.querySelector("#tp-agora-fecha"); if (f) f.onclick = () => { S.agora = "fechado"; desenharAgora(); };
  const t = el.querySelector("#tp-agora-tudo"); if (t) t.onclick = () => { S.agora = "tudo"; desenharAgora(); };
  ligar(el);
}
function chips(id, lista, atual, aoClicar, classe){
  const el = EL.querySelector("#" + id);
  el.innerHTML = lista.map(([v, r, n]) => `<button type="button" data-v="${esc(v)}" class="${v === atual ? "ativa" : ""} ${classe ? classe(v) : ""}">${esc(r)}${n != null ? ` <small>${n}</small>` : ""}</button>`).join("");
  for (const b of el.querySelectorAll("button")) b.onclick = () => aoClicar(b.dataset.v);
}
function filtra(itens){
  const t = semAcento(S.busca).split(/\s+/).filter(Boolean);
  return itens.filter(i => (S.vista === "todos" || (S.vista === "feitos") === !!i.feito)
    && (!t.length || t.every(x => semAcento([i.txt, i.nota, i.resposta, i.sub, i.quem, i.agente, i.dono].join(" ")).includes(x))));
}
function desenharCorpo(){
  const corpo = EL.querySelector("#tp-corpo");
  const busca = S.busca.trim().length > 1;
  const blocos = busca ? D.blocos : D.blocos.filter(b => b.nome === S.bloco);
  let html = "", total = 0;
  for (const b of blocos) {
    const itens = filtra(b.itens); if (!itens.length) continue;
    total += itens.length;
    const subs = []; for (const i of itens) { const s = i.sub || "(sem assunto)"; if (!subs.includes(s)) subs.push(s); }
    html += `<div class="card bloco ${b.cliente ? "cli" : ""}"><div class="sec-tit">${esc(b.nome)} <small>${pend(b)} pendente(s) · ${b.itens.length} no total</small></div>
      ${subs.map(s => { const its = itens.filter(i => (i.sub || "(sem assunto)") === s), p = b.itens.filter(i => (i.sub || "(sem assunto)") === s && !i.feito).length;
        return `<div class="sub"><div class="sub-tit">${esc(s)} <small>${p} pendente(s)</small></div>${its.map(i => linha(Object.assign({ _bloco: b.nome }, i), false)).join("")}</div>`; }).join("")}
    </div>`;
  }
  corpo.innerHTML = html || `<div class="card mu">Nada ${S.vista === "pendentes" ? "pendente" : ""} aqui${busca ? " com essa busca" : ""}.</div>`;
  EL.querySelector("#tp-conta").textContent = `${total} item(ns) na tela · ${D.pendentes} pendente(s) no TOPICS inteiro`;
  ligar(corpo);
}
const chip = (c, t) => t ? `<span class="chip ${c}">${esc(t)}</span>` : "";
function linha(i, naFaixa){
  const venc = i.prazo && !i.feito && i.prazo < hoje();
  const aberta = S.abertas.has(i.id), nota = i.nota || "";
  return `<div class="ti ${i.feito ? "feito" : ""} ${i.alerta && !i.feito ? "urg" : ""} ${i.dono === "LEO" ? "dele" : ""}" data-id="${esc(i.id)}">
    <button type="button" class="marca" title="${i.feito ? "desfazer" : "marcar como feito"}">${i.feito ? "✓" : ""}</button>
    <div class="corpo">
      <div class="txt">${esc(i.txt)}</div>
      <div class="chips">${naFaixa ? chip("bl", i._bloco) : ""}${chip("tipo " + (i.tipo || ""), i.tipo)}${chip("dono " + (i.dono || ""), i.dono === "LEO" ? "você" : i.dono === "CLAUDE" ? "casa" : i.dono)}${chip("ag", i.agente)}${i.prazo ? `<span class="chip prazo ${venc ? "venc" : ""}">${esc(dmy(i.prazo))}</span>` : ""}${chip("dep", i.depende_de ? "depende: " + i.depende_de : "")}${chip("esp", i.espera_de ? "espera: " + i.espera_de : "")}${i.algumdia ? chip("alg", "algum dia") : ""}${i.sub && naFaixa ? chip("sub", i.sub) : ""}</div>
      ${nota ? `<div class="nota ${aberta ? "aberta" : ""}" title="${aberta ? "recolher" : "abrir a nota inteira"}">${esc(nota)}</div>` : ""}
      <div class="resposta" contenteditable="true" data-id="${esc(i.id)}" data-antes="${esc(i.resposta || "")}">${esc(i.resposta || "")}</div>
      <div class="mu rodape">${i.atualizado_por ? esc(i.atualizado_por) + " · " : ""}${esc(dmy(i.atualizado_em || ""))}</div>
    </div></div>`;
}
function ligar(raiz){
  for (const b of raiz.querySelectorAll(".ti .marca")) b.onclick = () => marcar(b.closest(".ti").dataset.id);
  for (const n of raiz.querySelectorAll(".ti .nota")) n.onclick = () => { const id = n.closest(".ti").dataset.id; if (S.abertas.has(id)) S.abertas.delete(id); else S.abertas.add(id); desenharAgora(); desenharCorpo(); };
  for (const r of raiz.querySelectorAll(".ti .resposta")) {
    r.onkeydown = ev => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); r.blur(); } };
    r.onblur = () => { const v = r.textContent.trim(); if (v !== (r.dataset.antes || "")) responder(r.dataset.id, v); };
  }
}
function acha(id){ for (const b of D.blocos) { const i = b.itens.find(x => x.id === id); if (i) return i; } return null; }
async function gravar(id, patch){
  const i = acha(id); if (!i || !ESC) return false;
  const r = await SB.from("topics_item").update(Object.assign({ atualizado_por: EMAIL || null }, patch)).match({ escritorio_id: ESC, id });
  if (r && r.error) { EL.querySelector("#tp-conta").innerHTML = `<span class="msg erro">O banco recusou: ${esc(r.error.message)}</span>`; return false; }
  Object.assign(i, patch, { atualizado_por: EMAIL || i.atualizado_por, atualizado_em: new Date().toISOString() });
  return true;
}
async function marcar(id){
  const i = acha(id); if (!i) return;
  const feito = !i.feito;
  if (await gravar(id, { feito })) { D.pendentes += feito ? -1 : 1; desenhar(); }
}
async function responder(id, resposta){
  if (await gravar(id, { resposta: resposta || null })) { desenharAgora(); desenharCorpo(); }
}
window.Topics = { abrir, estado: () => ({ bloco: S.bloco }) };
})();
