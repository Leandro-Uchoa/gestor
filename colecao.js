// COLEÇÃO — a VISÃO GERAL da coleção (1S27…) como aba do Gestor (ordem dele via BOSS, 14/10/2026), com o material do PICASSO DAS
// GALÁXIAS. Só desenho: os itens vêm do banco (tabela colecao, função colecao_consulta), numa chamada só, atrás do login.
// Filtros em botão, como ele pediu: marca (Olympikus · Under Armour) · tipo (abre em "Geral"; Footwear · Meias · Acessórios ·
// Confecção) · dentro do tipo, os grupos do PICASSO (faixas e Família Corre no tênis; feminino e masculino na confecção; Caps ·
// Bags · Mochilas nos acessórios). A ordem é a da planilha dele. Visual: o mesmo cartão do Catálogo (classe .cat), foto original
// sem recorte, nome do produto igual ao do cadastro, referência copiável (toque copia). Fotos: miniaturas em img/mini/.
// Regra da casa para este arquivo (publica_portal): nenhum número de 4+ dígitos no código — produto e preço moram no banco.
(function(){
const IMG = "img/mini/";
const TIPOS = [["", "Geral"], ["TENIS", "Footwear"], ["MEIAS", "Meias"], ["ACESSORIOS", "Acessórios"], ["CONFECCAO", "Confecção"]];
const NOME_TIPO = Object.fromEntries(TIPOS.filter(([v]) => v));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const semAcento = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const dinheiro = v => v == null ? "" : "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titulo = s => String(s || "").toLowerCase().replace(/(^|\s|\/)\S/g, c => c.toUpperCase());

let DADOS = null, EL = null, SB = null;
const S = { marca: "OLY", tipo: "", grupo: new Set(), selo: new Set(), busca: "" };

async function abrir(sb, el){
  SB = sb; EL = el;
  if (!DADOS) {
    el.innerHTML = `<div class="card">carregando a coleção…</div>`;
    const r = await sb.rpc("colecao_consulta", { p_colecao: null });
    if (r.error) { el.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    DADOS = r.data || { itens: [], n: 0 };
    if (!DADOS.itens.length) { el.innerHTML = `<div class="msg aviso">O banco ainda não tem coleção carregada.</div>`; return; }
  }
  desenhar();
}

const selo = it => (it.s || "").toLowerCase();
function itensFiltrados(){
  const t = semAcento(S.busca).split(/\s+/).filter(Boolean);
  return DADOS.itens.filter(it => it.m === S.marca
    && (!S.tipo || it.t === S.tipo)
    && (!S.grupo.size || S.grupo.has(it.g || ""))
    && (!S.selo.size || (S.selo.has("l") && selo(it).startsWith("lan")) || (S.selo.has("cn") && selo(it).startsWith("cor")))
    && (!t.length || t.every(x => semAcento([it.n, it.r, it.c, it.cd, it.g, it.ge, it.nu].join(" ")).includes(x))));
}

function chips(id, lista, sel, aoClicar){
  const el = EL.querySelector("#" + id);
  el.innerHTML = lista.map(([v, r, n]) => `<button type="button" data-v="${esc(v)}" class="${(v === "" ? !sel.size : sel.has(v)) ? "ativa" : ""}">${esc(r)}${n != null ? ` <small>${n}</small>` : ""}</button>`).join("");
  for (const b of el.querySelectorAll("button")) b.onclick = () => aoClicar(b.dataset.v);
}

function desenhar(){
  const el = EL;
  if (!el.querySelector(".cat")) {
    el.innerHTML = `<div class="cat colecao">
      <div class="card filtros">
        <div class="linha-topo"><div class="chips marcas" id="col-marca"></div>
          <input type="search" id="col-busca" placeholder="buscar: produto, referência, cor, grupo…" autocomplete="off" value="${esc(S.busca)}"></div>
        <label>tipo</label><div class="chips" id="col-tipo"></div>
        <div id="col-bloco-grupo"><label>grupo</label><div class="chips" id="col-grupo"></div></div>
        <div class="chips" id="col-selo" style="margin-top:6px"></div>
        <div class="acoes"><button type="button" id="col-pdf" class="sec">exportar PDF</button></div>
        <div class="mu" id="col-conta"></div>
      </div>
      <div class="grade" id="col-grade"></div>
      <div class="luz oculto" id="col-luz"></div>
    </div>`;
    el.querySelector("#col-busca").oninput = (ev) => { S.busca = ev.target.value; clearTimeout(desenhar._t); desenhar._t = setTimeout(desenharGrade, 120); };
    el.querySelector("#col-pdf").onclick = () => window.print();
    el.querySelector("#col-luz").onclick = (ev) => { if (ev.target.id === "col-luz" || ev.target.classList.contains("fecha")) fecharLuz(); };
  }
  const daMarca = DADOS.itens.filter(it => it.m === S.marca);
  chips("col-marca", [["OLY", "Olympikus"], ["UA", "Under Armour"]], new Set([S.marca]), v => { S.marca = v; S.tipo = ""; S.grupo.clear(); desenhar(); });
  const ct = new Map(); for (const it of daMarca) ct.set(it.t, (ct.get(it.t) || 0) + 1);
  chips("col-tipo", TIPOS.filter(([v]) => !v || ct.has(v)).map(([v, r]) => [v, r, v ? ct.get(v) : daMarca.length]), new Set(S.tipo ? [S.tipo] : []), v => { S.tipo = v; S.grupo.clear(); desenhar(); });
  // os grupos: dentro do tipo escolhido (no Geral, as seções já mostram tipo e grupo — o chip ficaria redundante)
  const doTipo = S.tipo ? daMarca.filter(it => it.t === S.tipo) : [];
  const cg = new Map(); for (const it of doTipo) if (it.g) cg.set(it.g, (cg.get(it.g) || 0) + 1);
  el.querySelector("#col-bloco-grupo").classList.toggle("oculto", !S.tipo || cg.size < 2);
  chips("col-grupo", [["", "todos"], ...[...cg.entries()].map(([v, n]) => [v, titulo(v), n])], S.grupo, v => { if (v === "") S.grupo.clear(); else if (S.grupo.has(v)) S.grupo.delete(v); else S.grupo.add(v); desenhar(); });
  const base = S.tipo ? doTipo : daMarca;
  const nl = base.filter(it => selo(it).startsWith("lan")).length, nn = base.filter(it => selo(it).startsWith("cor")).length;
  chips("col-selo", [["", "sem selo"], ["l", "lançamento", nl], ["cn", "cor nova", nn]], S.selo, v => { if (v === "") S.selo.clear(); else if (S.selo.has(v)) S.selo.delete(v); else S.selo.add(v); desenhar(); });
  desenharGrade();
}

function fotoHtml(it){
  const i = it.i || "";
  if (!i) return `<div class="foto" data-img=""><div class="sem">${esc((it.n || "?").slice(0, 2))}</div></div>`;
  return `<div class="foto" data-img="${esc(i)}"><img loading="lazy" src="${IMG}${esc(i)}.jpg" alt="" data-passo="jpg" onerror="Colecao.fotoFalhou(this)"><div class="sem oculto">${esc((it.n || "?").slice(0, 2))}</div></div>`;
}
function fotoFalhou(img){
  const i = img.parentElement.dataset.img;
  if (img.dataset.passo === "jpg") { img.dataset.passo = "png"; img.src = IMG + i + ".png"; return; }
  img.classList.add("oculto"); img.parentElement.querySelector(".sem").classList.remove("oculto");
}
function selos(it){
  const s = selo(it);
  return s.startsWith("lan") ? `<span class="selo lanc">lançamento</span>` : (s.startsWith("cor") ? `<span class="selo nova">cor nova</span>` : "");
}
const chave = it => it.m + "|" + it.t + "|" + it.o;

function cartao(it){
  return `<div class="item" data-k="${esc(chave(it))}">
    ${fotoHtml(it)}
    <div class="tx"><div class="nome">${esc(it.n)}</div>
      <div class="mu"><button type="button" class="ref" data-ref="${esc(it.r)}" title="toque para copiar a referência">${esc(it.r)}</button> · ${esc(it.c)}${it.cd && it.cd !== it.c ? " · " + esc(titulo(it.cd)) : ""}</div>
      <div class="mu">${esc(titulo(it.ge))}${it.nu ? " · " + esc(it.nu) : ""}</div>
      <div class="preco">${dinheiro(it.p)}${selos(it)}</div></div>
  </div>`;
}

function desenharGrade(){
  const lista = itensFiltrados();
  const g = EL.querySelector("#col-grade");
  // seções na ordem da planilha: tipo → grupo (no Geral, todos os tipos; no tipo, os grupos dele)
  let html = "", ultimo = null;
  for (const [tv] of TIPOS.filter(([v]) => v)) for (const it of lista) {
    if (it.t !== tv) continue;
    const sec = tv + "|" + (it.g || "");
    if (sec !== ultimo) { ultimo = sec; html += `<div class="sec-tit">${esc(NOME_TIPO[tv])}${it.g ? " · " + esc(it.g) : ""}</div>`; }
    html += cartao(it);
  }
  g.innerHTML = html || `<div class="card mu">Nenhum produto com esses filtros.</div>`;
  const refs = new Set(lista.map(it => it.r));
  EL.querySelector("#col-conta").textContent = `${refs.size} referência(s) · ${lista.length} cor(es) · coleção ${DADOS.colecao || "?"} · planilha de ${DADOS.base_em ? DADOS.base_em.split("-").reverse().join("/") : "?"}`;
  for (const b of g.querySelectorAll(".ref")) b.onclick = (ev) => { ev.stopPropagation(); copiar(b); };
  for (const f of g.querySelectorAll(".foto")) f.onclick = () => { if (f.dataset.img) abrirLuz(f.dataset.img, f.closest(".item").dataset.k); };
}

async function copiar(b){
  const ref = b.dataset.ref;
  try { await navigator.clipboard.writeText(ref); } catch (e) {
    const ta = document.createElement("textarea"); ta.value = ref; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e2) {} ta.remove();
  }
  b.classList.add("copiado"); b.textContent = "copiado ✓";
  setTimeout(() => { b.classList.remove("copiado"); b.textContent = ref; }, 900);
}

function abrirLuz(img, k){
  const it = DADOS.itens.find(x => chave(x) === k) || {};
  const luz = EL.querySelector("#col-luz");
  luz.innerHTML = `<div class="quadro"><button type="button" class="fecha">×</button>
    <div class="angulos">${["", "__02", "__03", "__04"].map((a, i) => `<img src="${IMG}${esc(img)}${a}.jpg" alt="" ${i ? 'onerror="this.remove()"' : 'onerror="Colecao.fotoFalhouGrande(this)"'}>`).join("")}</div>
    <div class="tx"><b>${esc(it.n)}</b><div class="mu"><button type="button" class="ref" data-ref="${esc(it.r)}">${esc(it.r)}</button> · ${esc(it.c)}${it.cd ? " · " + esc(titulo(it.cd)) : ""}</div><div class="preco">${dinheiro(it.p)}${selos(it)}</div></div></div>`;
  for (const b of luz.querySelectorAll(".ref")) b.onclick = (ev) => { ev.stopPropagation(); copiar(b); };
  luz.classList.remove("oculto");
}
function fotoFalhouGrande(img){ img.replaceWith(Object.assign(document.createElement("div"), { className: "mu", textContent: "sem foto na pasta" })); }
function fecharLuz(){ EL.querySelector("#col-luz").classList.add("oculto"); }

window.Colecao = { abrir, fotoFalhou, fotoFalhouGrande };
})();
