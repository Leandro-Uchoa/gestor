// CATÁLOGO — a aba do Gestor "parecida com a do CMS PASS" (pedido dele via BOSS, 13/10/2026). Só desenho: os produtos vêm do
// banco (tabela produto, função catalogo_consulta — base CLAUDE + complemento do catálogo público da CMS), numa chamada só.
// O que vem do CMS PASS: cartões com foto e ângulos, selos (lançamento / cor nova), filtros, busca, favoritos (ficam no aparelho),
// exportar Excel (CSV) e PDF (impressão). O que NÃO vem (decisão do BOSS): sacola, pedidos, Worker da CMS, token, preço por prazo.
// FOTOS (13/10, decisão dele: "pode copiar as miniaturas"): as miniaturas do catálogo da CMS moram na pasta img/mini/ do próprio
// Gestor ({ref}_{cor sem barra}.jpg, ângulos __02..__04); as fotos grandes ficaram de fora — o zoom amplia a miniatura.
// Regra da casa para este arquivo (publica_portal): nenhum número de 4+ dígitos no código — produto, preço e código moram no banco.
(function(){
const IMG = "img/mini/";
const CHAVE_FAV = "gestor.catalogo.favoritos";
const GRUPOS = { OLY: [["CALCADOS", "Calçados"], ["VESTUARIO", "Vestuário"], ["MEIAS", "Meias"], ["ACESSORIOS", "Acessórios"], ["CHINELOS", "Chinelos"]],
                 UA:  [["FTW_UA", "Calçados"], ["APP_UA", "Vestuário"], ["MEIAS_UA", "Meias"], ["ACC_UA", "Acessórios"], ["CHI_UA", "Chinelos"]] };
const GEN = { MASCULINO: "Masc", FEMININO: "Fem", UNISSEX: "Unissex", INFANTIL: "Infantil", KIDS: "Kids", MENINO: "Menino", MENINA: "Menina" };
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const semAcento = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const dinheiro = v => v == null ? "" : "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titulo = s => String(s || "").toLowerCase().replace(/(^|\s|\/)\S/g, c => c.toUpperCase());
const marcaDe = it => (it.m || "").startsWith("UA") ? "UA" : "OLY";

let DADOS = null, EL = null, SB = null;
const S = { marca: "OLY", grupo: new Set(), cat: new Set(), gen: new Set(), col: new Set(), selo: new Set(), busca: "", agrupar: true, soFav: false, abertos: new Set() };
let FAV = new Set();
try { FAV = new Set(JSON.parse(localStorage.getItem(CHAVE_FAV) || "[]")); } catch (e) { FAV = new Set(); }
const guardarFav = () => { try { localStorage.setItem(CHAVE_FAV, JSON.stringify([...FAV])); } catch (e) {} };
const chaveItem = it => it.r + "|" + (it.c || "");

async function abrir(sb, el){
  SB = sb; EL = el;
  if (!DADOS) {
    el.innerHTML = `<div class="card">carregando o catálogo…</div>`;
    const r = await sb.rpc("catalogo_consulta");
    if (r.error) { el.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    DADOS = r.data || { itens: [], n: 0 };
    for (const it of DADOS.itens) it.mk = marcaDe(it);
  }
  desenhar();
}

function itensFiltrados(){
  const t = semAcento(S.busca).split(/\s+/).filter(Boolean);
  return DADOS.itens.filter(it => it.mk === S.marca
    && (!S.grupo.size || S.grupo.has(it.a || ""))
    && (!S.cat.size || S.cat.has(it.k || ""))
    && (!S.gen.size || S.gen.has(it.g || ""))
    && (!S.col.size || S.col.has(it.co || ""))
    && (!S.selo.size || (S.selo.has("l") && it.l) || (S.selo.has("cn") && it.cn))
    && (!S.soFav || FAV.has(chaveItem(it)))
    && (!t.length || t.every(x => semAcento(it.r + " " + it.n + " " + it.c + " " + it.cd + " " + it.k + " " + it.co).includes(x))));
}

function chips(id, lista, sel, rotulo){
  const el = EL.querySelector("#" + id);
  el.innerHTML = lista.map(([v, r, n]) => `<button type="button" data-v="${esc(v)}" class="${(v === "" ? !sel.size : sel.has(v)) ? "ativa" : ""}">${esc(r)}${n != null ? ` <small>${n}</small>` : ""}</button>`).join("");
  for (const b of el.querySelectorAll("button")) b.onclick = () => { const v = b.dataset.v; if (v === "") sel.clear(); else if (sel.has(v)) sel.delete(v); else sel.add(v); desenhar(); };
}

function desenhar(){
  const el = EL;
  if (!el.querySelector(".cat")) {
    el.innerHTML = `<div class="cat">
      <div class="card filtros">
        <div class="linha-topo"><div class="chips marcas" id="cat-marca"></div>
          <input type="search" id="cat-busca" placeholder="buscar: nome, referência, cor…" autocomplete="off" value="${esc(S.busca)}"></div>
        <label>família</label><div class="chips" id="cat-grupo"></div>
        <label>categoria</label><div class="chips" id="cat-cat"></div>
        <label>gênero · coleção · selos</label><div class="chips" id="cat-gen"></div>
        <div class="chips" id="cat-col" style="margin-top:6px"></div>
        <div class="chips" id="cat-selo" style="margin-top:6px"></div>
        <div class="acoes"><button type="button" id="cat-agrupar" class="sec">agrupar cores</button><button type="button" id="cat-fav" class="sec">♥ favoritos</button>
          <button type="button" id="cat-csv" class="sec">exportar Excel</button><button type="button" id="cat-pdf" class="sec">exportar PDF</button></div>
        <div class="mu" id="cat-conta"></div>
      </div>
      <div class="grade" id="cat-grade"></div>
      <div class="luz oculto" id="cat-luz"></div>
    </div>`;
    el.querySelector("#cat-busca").oninput = (ev) => { S.busca = ev.target.value; clearTimeout(desenhar._t); desenhar._t = setTimeout(desenharGrade, 120); };
    el.querySelector("#cat-agrupar").onclick = () => { S.agrupar = !S.agrupar; desenhar(); };
    el.querySelector("#cat-fav").onclick = () => { S.soFav = !S.soFav; desenhar(); };
    el.querySelector("#cat-csv").onclick = exportarCsv;
    el.querySelector("#cat-pdf").onclick = () => window.print();
    el.querySelector("#cat-luz").onclick = (ev) => { if (ev.target.id === "cat-luz" || ev.target.classList.contains("fecha")) fecharLuz(); };
  }
  const daMarca = DADOS.itens.filter(it => it.mk === S.marca);
  const conta = (campo) => { const c = new Map(); for (const it of daMarca) { const v = it[campo] || ""; if (v) c.set(v, (c.get(v) || 0) + 1); } return c; };
  chips("cat-marca", [["OLY", "Olympikus"], ["UA", "Under Armour"]], new Set([S.marca]));
  for (const b of el.querySelectorAll("#cat-marca button")) b.onclick = () => { S.marca = b.dataset.v; S.grupo.clear(); S.cat.clear(); S.col.clear(); desenhar(); };
  const cg = conta("a");
  chips("cat-grupo", [["", "todas"], ...GRUPOS[S.marca].filter(([v]) => cg.has(v)).map(([v, r]) => [v, r, cg.get(v)])], S.grupo);
  const base = S.grupo.size ? daMarca.filter(it => S.grupo.has(it.a || "")) : daMarca;
  const ck = new Map(); for (const it of base) if (it.k) ck.set(it.k, (ck.get(it.k) || 0) + 1);
  chips("cat-cat", [["", "todas"], ...[...ck.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => [v, titulo(v), n])], S.cat);
  const cgn = conta("g");
  chips("cat-gen", [["", "todos"], ...[...cgn.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => [v, GEN[v] || titulo(v), n])], S.gen);
  const cc = new Map(); for (const it of base) if (it.co) cc.set(it.co, (cc.get(it.co) || 0) + 1);
  chips("cat-col", [["", "todas as coleções"], ...[...cc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([v, n]) => [v, "col. " + v, n])], S.col);
  const nl = base.filter(it => it.l).length, nn = base.filter(it => it.cn).length;
  chips("cat-selo", [["", "sem selo"], ["l", "lançamento", nl], ["cn", "cor nova", nn]], S.selo);
  el.querySelector("#cat-agrupar").classList.toggle("ativa", S.agrupar);
  el.querySelector("#cat-fav").classList.toggle("ativa", S.soFav);
  desenharGrade();
}

function fotoHtml(it, cls){
  const i = it.i || "";
  return `<div class="foto ${cls || ""}" data-img="${esc(i)}"><img loading="lazy" src="${IMG}${esc(i)}.jpg" alt="" data-passo="jpg" onerror="Catalogo.fotoFalhou(this)"><div class="sem oculto">${esc((it.n || "?").slice(0, 2))}</div></div>`;
}
function fotoFalhou(img){
  const i = img.parentElement.dataset.img;
  if (img.dataset.passo === "jpg") { img.dataset.passo = "png"; img.src = IMG + i + ".png"; return; }     // umas poucas miniaturas são png
  img.classList.add("oculto"); img.parentElement.querySelector(".sem").classList.remove("oculto");
}

function selos(it){
  return (it.l ? `<span class="selo lanc">lançamento</span>` : "") + (it.cn ? `<span class="selo nova">cor nova</span>` : "");
}

function cartao(it, cores){
  const fav = FAV.has(chaveItem(it));
  const extra = cores && cores.length > 1 ? `<div class="cores">${cores.map(c => `<span class="cor ${c === it ? "esta" : ""}" data-k="${esc(chaveItem(c))}" title="${esc(c.cd || c.c)}">${esc(c.c)}</span>`).join("")}</div>` : "";
  return `<div class="item" data-k="${esc(chaveItem(it))}">
    ${fotoHtml(it)}
    <div class="tx"><div class="nome">${esc(it.n)}</div>
      <div class="mu">${esc(it.r)} · ${esc(it.c)}${it.cd && it.cd !== it.c ? " · " + esc(titulo(it.cd)) : ""}</div>
      <div class="mu">${esc(GEN[it.g] || titulo(it.g))}${it.t ? " · " + esc(it.t) : ""}${it.k ? " · " + esc(titulo(it.k)) : ""}</div>
      <div class="preco">${dinheiro(it.p)}${selos(it)}</div>${extra}</div>
    <button type="button" class="fav ${fav ? "on" : ""}" title="favorito">♥</button>
  </div>`;
}

function desenharGrade(){
  const lista = itensFiltrados();
  const g = EL.querySelector("#cat-grade");
  let html = "", n = lista.length;
  if (S.agrupar) {
    const porRef = new Map();
    for (const it of lista) { if (!porRef.has(it.r)) porRef.set(it.r, []); porRef.get(it.r).push(it); }
    for (const [ref, cores] of porRef) {
      const mostra = cores.find(c => S.abertos.has(ref + "|" + chaveItem(c))) || cores[0];
      html += cartao(mostra, cores);
    }
    n = porRef.size;
    EL.querySelector("#cat-conta").textContent = `${n} referência(s) · ${lista.length} cor(es) · base ${DADOS.base_em ? DADOS.base_em.split("-").reverse().join("/") : "?"}`;
  } else {
    html = lista.map(it => cartao(it)).join("");
    EL.querySelector("#cat-conta").textContent = `${lista.length} item(ns) · base ${DADOS.base_em ? DADOS.base_em.split("-").reverse().join("/") : "?"}`;
  }
  g.innerHTML = html || `<div class="card mu">Nenhum produto com esses filtros.</div>`;
  for (const b of g.querySelectorAll(".fav")) b.onclick = (ev) => { ev.stopPropagation(); const k = b.closest(".item").dataset.k; if (FAV.has(k)) FAV.delete(k); else FAV.add(k); guardarFav(); b.classList.toggle("on", FAV.has(k)); };
  for (const c of g.querySelectorAll(".cor")) c.onclick = (ev) => { ev.stopPropagation(); const k = c.dataset.k, ref = k.split("|")[0]; for (const x of [...S.abertos]) if (x.startsWith(ref + "|")) S.abertos.delete(x); S.abertos.add(ref + "|" + k); desenharGrade(); };
  for (const f of g.querySelectorAll(".foto")) f.onclick = () => abrirLuz(f.dataset.img, f.closest(".item").dataset.k);
}

function abrirLuz(img, k){
  const it = DADOS.itens.find(x => chaveItem(x) === k) || {};
  const luz = EL.querySelector("#cat-luz");
  luz.innerHTML = `<div class="quadro"><button type="button" class="fecha">×</button>
    <div class="angulos">${["", "__02", "__03", "__04"].map((a, i) => `<img src="${IMG}${esc(img)}${a}.jpg" alt="" ${i ? 'onerror="this.remove()"' : 'onerror="Catalogo.fotoFalhouGrande(this)"'}>`).join("")}</div>
    <div class="tx"><b>${esc(it.n)}</b><div class="mu">${esc(it.r)} · ${esc(it.c)}${it.cd ? " · " + esc(titulo(it.cd)) : ""}</div><div class="preco">${dinheiro(it.p)}${selos(it)}</div></div></div>`;
  luz.classList.remove("oculto");
}
function fotoFalhouGrande(img){ img.replaceWith(Object.assign(document.createElement("div"), { className: "mu", textContent: "sem foto no catálogo" })); }
function fecharLuz(){ EL.querySelector("#cat-luz").classList.add("oculto"); }

function exportarCsv(){
  const lista = itensFiltrados();
  const cab = ["referencia", "produto", "cor", "cor descricao", "genero", "tamanhos", "categoria", "colecao", "PDV", "lancamento", "cor nova"];
  const linhas = lista.map(it => [it.r, it.n, it.c, it.cd, it.g, it.t, it.k, it.co, it.p == null ? "" : String(it.p).replace(".", ","), it.l ? "SIM" : "", it.cn ? "SIM" : ""]);
  const txt = "﻿" + [cab, ...linhas].map(l => l.map(v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" })); a.download = "catalogo_" + S.marca.toLowerCase() + ".csv"; a.click();
}

window.Catalogo = { abrir, fotoFalhou, fotoFalhouGrande };
})();
