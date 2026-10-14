// COLEÇÃO — a VISÃO GERAL da coleção (1S27…) como aba do Gestor (ordem dele via BOSS, 14/10/2026), com o pacote do PICASSO DAS
// GALÁXIAS (visao_geral_1s27.json: blocos, ordem, URL da foto, silhueta). Só desenho: os itens vêm do banco (tabela colecao, função
// colecao_consulta), numa chamada só, atrás do login.
// Filtros em botão, como ele pediu: marca (Olympikus · Under Armour) · tipo (abre em "Geral"; Footwear · Meias · Acessórios ·
// Confecção) · dentro do tipo, os blocos do PICASSO. A ordem é a do pacote (bloco; dentro do bloco PDV crescente e nome; cada modelo
// com as suas cores juntas).
// VISUAL APROVADO POR ELE (LEIA-ME do PICASSO, 14/10): página cinza claro, foto ORIGINAL sem recorte num cartão branco; uma
// COLUNA por modelo com cabeçalho de altura fixa (nome exato do cadastro, referência em azul copiável, PDV, selo LANÇAMENTO) e as
// cores embaixo (foto + código + descrição; COR NOVA = triângulo azul no canto da foto); nenhuma palavra sozinha na quebra do nome;
// fonte Arial; silhueta (Turbo 2, Trilha 4, Vento 4) com o selo CONVENÇÃO. Paleta só a oficial Olympikus.
// Foto: miniatura local (img/mini/) quando existe; senão a URL pública do pacote; o zoom usa a URL (original) quando há.
// Regra da casa para este arquivo (publica_portal): nenhum número de 4+ dígitos no código — produto e preço moram no banco.
(function(){
const IMG = "img/mini/";
const TIPOS = [["", "Geral"], ["TENIS", "Footwear"], ["MEIAS", "Meias"], ["ACESSORIOS", "Acessórios"], ["CONFECCAO", "Confecção"]];
const NOME_TIPO = Object.fromEntries(TIPOS.filter(([v]) => v));
const NBSP = String.fromCharCode(160);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const semAcento = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const dinheiro = v => v == null ? "PDV a confirmar" : "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titulo = s => String(s || "").toLowerCase().replace(/(^|\s|\/)\S/g, c => c.toUpperCase());
// nenhuma palavra sozinha na linha de baixo (regra dele): um fim curto (F, M, 3, 33/38, 2.0) fica preso à palavra anterior
const semViuva = n => { const p = String(n || "").trim().split(/\s+/); if (p.length < 2) return p.join(" "); const u = p[p.length - 1]; if (u.length <= 5) { p[p.length - 2] += NBSP + u; p.pop(); } return p.join(" "); };

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

const sit = it => (it.s || "").toLowerCase();
const ehLanc = it => sit(it).startsWith("lan"), ehNova = it => sit(it).startsWith("cor");
function itensFiltrados(){
  const t = semAcento(S.busca).split(/\s+/).filter(Boolean);
  return DADOS.itens.filter(it => it.m === S.marca
    && (!S.tipo || it.t === S.tipo)
    && (!S.grupo.size || S.grupo.has(it.g || ""))
    && (!S.selo.size || (S.selo.has("l") && ehLanc(it)) || (S.selo.has("cn") && ehNova(it)))
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
          <input type="search" id="col-busca" placeholder="buscar: produto, referência, cor, bloco…" autocomplete="off" value="${esc(S.busca)}"></div>
        <label>tipo</label><div class="chips" id="col-tipo"></div>
        <div id="col-bloco-grupo"><label>bloco</label><div class="chips" id="col-grupo"></div></div>
        <div class="chips" id="col-selo" style="margin-top:6px"></div>
        <div class="acoes"><button type="button" id="col-pdf" class="sec">exportar PDF</button></div>
        <div class="mu" id="col-conta"></div>
      </div>
      <div class="pagina" id="col-pagina"></div>
      <div class="luz oculto" id="col-luz"></div>
    </div>`;
    el.querySelector("#col-busca").oninput = (ev) => { S.busca = ev.target.value; clearTimeout(desenhar._t); desenhar._t = setTimeout(desenharPagina, 120); };
    el.querySelector("#col-pdf").onclick = () => window.print();
    el.querySelector("#col-luz").onclick = (ev) => { if (ev.target.id === "col-luz" || ev.target.classList.contains("fecha")) fecharLuz(); };
  }
  const daMarca = DADOS.itens.filter(it => it.m === S.marca);
  chips("col-marca", [["OLY", "Olympikus"], ["UA", "Under Armour"]], new Set([S.marca]), v => { S.marca = v; S.tipo = ""; S.grupo.clear(); desenhar(); });
  const ct = new Map(); for (const it of daMarca) ct.set(it.t, (ct.get(it.t) || 0) + 1);
  chips("col-tipo", TIPOS.filter(([v]) => !v || ct.has(v)).map(([v, r]) => [v, r, v ? ct.get(v) : daMarca.length]), new Set(S.tipo ? [S.tipo] : []), v => { S.tipo = v; S.grupo.clear(); desenhar(); });
  const doTipo = S.tipo ? daMarca.filter(it => it.t === S.tipo) : [];
  const cg = new Map(); for (const it of doTipo) if (it.g) cg.set(it.g, (cg.get(it.g) || 0) + 1);
  el.querySelector("#col-bloco-grupo").classList.toggle("oculto", !S.tipo || cg.size < 2);
  chips("col-grupo", [["", "todos"], ...[...cg.entries()].map(([v, n]) => [v, titulo(v), n])], S.grupo, v => { if (v === "") S.grupo.clear(); else if (S.grupo.has(v)) S.grupo.delete(v); else S.grupo.add(v); desenhar(); });
  const base = S.tipo ? doTipo : daMarca;
  chips("col-selo", [["", "sem selo"], ["l", "lançamento", base.filter(ehLanc).length], ["cn", "cor nova", base.filter(ehNova).length]], S.selo, v => { if (v === "") S.selo.clear(); else if (S.selo.has(v)) S.selo.delete(v); else S.selo.add(v); desenhar(); });
  desenharPagina();
}

// a foto: miniatura local → URL pública → "sem foto"
const srcFoto = it => it.i ? IMG + it.i + ".jpg" : (it.u || "");
function fotoHtml(it){
  const src = srcFoto(it);
  const tri = ehNova(it) ? `<i class="tri" title="cor nova"></i>` : "";
  if (!src) return `<div class="foto ${it.t === "TENIS" ? "deitada" : "empe"}" data-k="${esc(chave(it))}"><div class="sem">sem foto</div>${tri}</div>`;
  return `<div class="foto ${it.t === "TENIS" ? "deitada" : "empe"}" data-k="${esc(chave(it))}"><img loading="lazy" src="${esc(src)}" alt="" data-passo="${it.i ? "jpg" : "url"}" data-url="${esc(it.u || "")}" onerror="Colecao.fotoFalhou(this)">${tri}<div class="sem oculto">sem foto</div></div>`;
}
function fotoFalhou(img){
  // miniatura jpg → png → a URL pública → "sem foto"
  const passo = img.dataset.passo;
  if (passo === "jpg") { img.dataset.passo = "png"; img.src = img.src.replace(/\.jpg$/, ".png"); return; }
  if (passo === "png" && img.dataset.url) { img.dataset.passo = "url"; img.src = img.dataset.url; return; }
  img.classList.add("oculto"); img.parentElement.querySelector(".sem").classList.remove("oculto");
}
const chave = it => it.m + "|" + it.t + "|" + it.o;
const chaveModelo = it => it.m + "|" + it.t + "|" + (it.g || "") + "|" + (it.n || "") + "|" + (it.r || "");

// uma coluna por modelo: cabeçalho fixo (nome, referência copiável, PDV, selo) e as cores embaixo
function coluna(cores){
  const m = cores[0], lanc = cores.some(ehLanc), sl = cores.some(it => it.sl);
  return `<div class="modelo">
    <div class="cab">
      <div class="nome">${esc(semViuva(m.n))}</div>
      <div class="linha"><button type="button" class="ref" data-ref="${esc(m.r)}" title="toque para copiar a referência">${esc(m.r)}</button><span class="pdv">${esc(dinheiro(m.p))}</span></div>
      <div class="selos">${lanc ? `<span class="selo lanc">lançamento</span>` : ""}${sl ? `<span class="selo conv">convenção</span>` : ""}${m.nu ? `<span class="mu">${esc(m.ge ? titulo(m.ge) + " · " : "")}${esc(m.nu)}</span>` : (m.ge ? `<span class="mu">${esc(titulo(m.ge))}</span>` : "")}</div>
    </div>
    <div class="cores">${cores.map(it => `<div class="cor">${fotoHtml(it)}<div class="cod">${esc(it.c)}</div>${it.cd && it.cd !== it.c ? `<div class="desc">${esc(titulo(it.cd))}</div>` : ""}</div>`).join("")}</div>
  </div>`;
}

function desenharPagina(){
  const lista = itensFiltrados();
  const pg = EL.querySelector("#col-pagina");
  // seções na ordem do pacote: tipo → bloco; dentro, uma coluna por modelo com as cores juntas
  let html = "", modelos = 0;
  for (const [tv] of TIPOS.filter(([v]) => v)) {
    const doTipo = lista.filter(it => it.t === tv);
    if (!doTipo.length) continue;
    let bloco = null, cols = "", porModelo = new Map();
    const fecha = () => { if (bloco == null) return; html += `<div class="bloco"><div class="sec-tit">${esc(NOME_TIPO[tv])}${bloco ? " · " + esc(bloco) : ""} <small>${porModelo.size} modelo(s)</small></div><div class="colunas">${[...porModelo.values()].map(coluna).join("")}</div></div>`; modelos += porModelo.size; porModelo = new Map(); };
    for (const it of doTipo) {
      if ((it.g || "") !== (bloco == null ? null : bloco)) { fecha(); bloco = it.g || ""; }
      const k = chaveModelo(it); if (!porModelo.has(k)) porModelo.set(k, []); porModelo.get(k).push(it);
    }
    fecha();
  }
  pg.innerHTML = html || `<div class="card mu">Nenhum produto com esses filtros.</div>`;
  EL.querySelector("#col-conta").textContent = `${modelos} modelo(s) · ${lista.length} cor(es) · coleção ${DADOS.colecao || "?"} · pacote de ${DADOS.base_em ? DADOS.base_em.split("-").reverse().join("/") : "?"}`;
  for (const b of pg.querySelectorAll(".ref")) b.onclick = (ev) => { ev.stopPropagation(); copiar(b); };
  for (const f of pg.querySelectorAll(".foto")) f.onclick = () => abrirLuz(f.dataset.k);
}

async function copiar(b){
  const ref = b.dataset.ref;
  try { await navigator.clipboard.writeText(ref); } catch (e) {
    const ta = document.createElement("textarea"); ta.value = ref; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e2) {} ta.remove();
  }
  b.classList.add("copiado"); b.textContent = "copiado ✓";
  setTimeout(() => { b.classList.remove("copiado"); b.textContent = ref; }, 900);
}

function abrirLuz(k){
  const it = DADOS.itens.find(x => chave(x) === k);
  if (!it) return;
  const grande = it.u || srcFoto(it);
  const luz = EL.querySelector("#col-luz");
  luz.innerHTML = `<div class="quadro"><button type="button" class="fecha">×</button>
    <div class="angulos">${grande ? `<img src="${esc(grande)}" alt="" onerror="Colecao.fotoFalhouGrande(this)">` : `<div class="mu">sem foto</div>`}</div>
    <div class="tx"><b>${esc(it.n)}</b><div class="mu"><button type="button" class="ref" data-ref="${esc(it.r)}">${esc(it.r)}</button> · ${esc(it.c)}${it.cd ? " · " + esc(titulo(it.cd)) : ""}</div><div class="preco">${esc(dinheiro(it.p))}${ehLanc(it) ? ` <span class="selo lanc">lançamento</span>` : ""}${ehNova(it) ? ` <span class="selo nova">cor nova</span>` : ""}</div></div></div>`;
  for (const b of luz.querySelectorAll(".ref")) b.onclick = (ev) => { ev.stopPropagation(); copiar(b); };
  luz.classList.remove("oculto");
}
function fotoFalhouGrande(img){ img.replaceWith(Object.assign(document.createElement("div"), { className: "mu", textContent: "sem foto" })); }
function fecharLuz(){ EL.querySelector("#col-luz").classList.add("oculto"); }

window.Colecao = { abrir, fotoFalhou, fotoFalhouGrande };
})();
