// COLEÇÃO — a VISÃO GERAL da coleção (1S27…) como aba do Gestor (ordem dele via BOSS, 14/10/2026), com o pacote do PICASSO DAS
// GALÁXIAS (visao_geral_1s27.json: blocos, ordem, URL da foto, silhueta). Só desenho: os itens vêm do banco (tabela colecao, função
// colecao_consulta), numa chamada só, atrás do login.
// Filtros em botão, como ele pediu: marca (Olympikus · Under Armour) · tipo (abre em "Geral"; Footwear · Meias · Acessórios ·
// Confecção) · dentro do tipo, os blocos do PICASSO. A ordem é a do pacote (bloco; dentro do bloco PDV crescente e nome; cada modelo
// com as suas cores juntas).
// VISUAL APROVADO POR ELE (LEIA-ME do PICASSO, 14/10): página cinza claro, foto ORIGINAL sem recorte num cartão branco; uma
// COLUNA por modelo com cabeçalho de altura fixa (nome exato do cadastro, referência em azul copiável, PDV, selo LANÇAMENTO) e as
// cores embaixo (foto + código + descrição EXATAMENTE como no cadastro, sem mudar caixa; COR NOVA = triângulo azul no canto da
// foto); nenhuma palavra sozinha na quebra do nome; fonte Arial; silhueta (Turbo 2, Trilha 4, Vento 4) com o selo CONVENÇÃO.
// Conferência do PICASSO (v5.1): a coluna fica sobre o cinza e cada FOTO é o cartão branco com sombra; nome com três linhas.
// Paleta só a oficial Olympikus.
// VITRINE DO CLIENTE (15/10, palavra dele via PICASSO: "seleciona lá, pum, automaticamente sobe para outra parte que vai ter a
// vitrine da Polyélle… precisa da imagem, a referência e a cor"): cada COR ganha um "+" no cartão; tocou, entra na vitrine do
// cliente escolhido (gravada no banco, tabela vitrine, atrás do login); tocou de novo, sai. Selecionada = contorno azul e "✓".
// A aba Vitrine tem DUAS coleções lado a lado (ordem dele, 15/10): a ATUAL ("como ela está hoje": o que o cliente comprou, carteira +
// faturado, tabela vitrine_atual, carregada do pacote do PICASSO) e a que ele MONTA clicando. Na atual, item em carteira ganha
// RETIRAR ("a gente decida que ele não vai receber, possa retirar ali na hora"): foto a 40%, cor riscada, "retirar da carteira";
// reversível ("voltar"); só faturado não tem botão. ⛔ Nada disso escreve na DETALHADA nem no EBM: a vitrine REGISTRA a decisão.
// Cada marcação guarda quem, quando e o estado anterior (histórico pelo gatilho do banco — BOSS; a ATA VIVA lê).
// Fora da vitrine que ele monta: PDV nulo/zero (DTC/marketplace, NÚCLEO) e a lista por cliente (vitrine_bloqueio: CARDIO na Poly).
// Exportar PDF = imprimir: página cinza, cartão branco, cada bloco numa página, item retirado sai riscado (registro da conversa).
// Regra da casa para este arquivo (publica_portal): nenhum número de 4+ dígitos no código — produto, preço, bloqueio moram no banco.
(function(){
const IMG = "img/mini/";
// 19/10: CHINELOS é tipo próprio (regra dele: chinelo nunca junto do tênis — outro dinheiro, outra cota, outro departamento)
// 19/10 (PICASSO): rótulo "Tênis", não "Footwear" — ele não fala inglês; o valor interno segue TENIS
const TIPOS = [["", "Geral"], ["TENIS", "Tênis"], ["CHINELOS", "Chinelos"], ["MEIAS", "Meias"], ["ACESSORIOS", "Acessórios"], ["CONFECCAO", "Confecção"]];
const NOME_TIPO = Object.fromEntries(TIPOS.filter(([v]) => v));
const NBSP = String.fromCharCode(160);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const semAcento = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const dinheiro = v => v == null ? "PDV a confirmar" : "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titulo = s => String(s || "").toLowerCase().replace(/(^|\s|\/)\S/g, c => c.toUpperCase());
const semViuva = n => { const p = String(n || "").trim().split(/\s+/); if (p.length < 2) return p.join(" "); const u = p[p.length - 1]; if (u.length <= 5) { p[p.length - 2] += NBSP + u; p.pop(); } return p.join(" "); };
// 19/10 (urgente, ele via NÚCLEO): GTM DISTRIBUIÇÃO = pseudo-cliente por mês de faturamento ("GTM 1S27 JAN"…): ele seleciona o que vai
// digitar; a escolha grava na tabela vitrine como a de um cliente. A lista da esquerda passa a ser só as cores do GTM (gtm_consulta),
// com estrela da Vulcabras, mix dos vendedores e pares sugeridos do mês. Material interno da CMS.
const gtmPref = () => "GTM " + (DADOS ? DADOS.colecao : "") + " ";
const ehGtm = () => !!(VIT.cliente && DADOS && VIT.cliente.startsWith(gtmPref()));
const gtmMes = () => ehGtm() ? VIT.cliente.slice(gtmPref().length) : null;
const gtmDe = it => (VIT.gtm && VIT.gtm.mapa.get(chaveCor(it))) || null;
const nomeCli = c => (c && DADOS && c.startsWith(gtmPref())) ? "GTM " + c.slice(gtmPref().length) + "/" + String(DADOS.colecao).slice(-2) : ((typeof NOME_CLI !== "undefined" && NOME_CLI[c]) || titulo(c));
async function tudo(consulta) {
  const PAG = 1000; let de = 0, out = [];
  for (;;) { const { data, error } = await consulta.range(de, de + PAG - 1); if (error) return { data: out, error }; out = out.concat(data || []); if (!data || data.length < PAG) return { data: out, error: null }; de += PAG; }
}

let DADOS = null, EL = null, ELV = null, SB = null;
const S = { marca: "OLY", tipo: "", grupo: new Set(), selo: new Set(), busca: "" };
// a vitrine: cliente escolhido; marcas dele por coleção (chave marca|ref|cor → estado); a coleção ATUAL do cliente (vitrine_atual);
// bloqueios por cliente (cliente|marca|ref); qual vista está aberta (atual | montando); id do escritório
const VIT = { cliente: null, clientes: [], marcas: new Map(), atual: null, vista: null, bloq: new Set(), esc: null, carregadoPara: null, erro: "" };
const chaveCor = it => it.m + "|" + it.r + "|" + it.c;
const chave = it => it.m + "|" + it.t + "|" + it.o;
const chaveModelo = it => it.m + "|" + it.t + "|" + (it.g || "") + "|" + (it.n || "") + "|" + (it.r || "");
const sit = it => (it.s || "").toLowerCase();
const ehLanc = it => sit(it).startsWith("lan"), ehNova = it => sit(it).startsWith("cor");
// 16/10, pedido dele via NÚCLEO: no tênis Olympikus a família é a CLASSIFICAÇÃO OFICIAL 1S27 (coluna FAIXA do DNA, por artigo + cor;
// campo `fo`), exibida como CAMINHADA P1 · CAMINHADA P2 · CORRIDA · CORRIDA LEVE · TREINO · CLÁSSICOS · INFANTIL · CHINELOS; o que não
// está na circular (Família Corre, circular própria por vir) vira "sem família na circular". Nos outros tipos e na UA, os blocos do PICASSO.
const SEM_FAM = "sem família na circular";
const FAM_ORDEM = ["CAMINHADA P1", "CAMINHADA P2", "CORRIDA", "CORRIDA LEVE", "TREINO", "CLÁSSICOS", "INFANTIL", "CHINELOS", SEM_FAM];
// só vale onde a consulta traz o campo `fo` (colecao_consulta, 0027): a vitrine ATUAL (2S26, vitrine_atual_consulta) não o traz e segue nos blocos
const oficial = it => it.m === "OLY" && it.t === "TENIS" && it.fo !== undefined;
const familiaDe = it => oficial(it) ? (it.fo || SEM_FAM) : (it.g || "");
const famOrd = f => { const i = FAM_ORDEM.indexOf(f); return i < 0 ? 50 : i; };
// a ordem de exibição (a mesma da consulta: marca → tipo → ordem do pacote), com a família oficial entre o tipo e a ordem no tênis OLY.
// `o` repete entre tipos, por isso o tipo entra na chave — senão a lista "Geral" do montador embaralha (visto no harness, 16/10)
const tipoIdx = t => { const i = TIPOS.findIndex(([v]) => v === t); return i < 0 ? 9 : i; };
const ordenar = lista => lista.slice().sort((a, b) => (a.m < b.m ? -1 : a.m > b.m ? 1 : 0) || (tipoIdx(a.t) - tipoIdx(b.t))
  || ((oficial(a) ? famOrd(familiaDe(a)) : 0) - (oficial(b) ? famOrd(familiaDe(b)) : 0)) || (a.o - b.o));
const marcas = col => { if (!VIT.marcas.has(col)) VIT.marcas.set(col, new Map()); return VIT.marcas.get(col); };
const emCarteira = it => /carteira/i.test(it.st || "");
// por que a cor NÃO vai para a vitrine deste cliente (null = pode)
const foraDaVitrine = it => (it.p == null || +it.p === 0) ? "fora da vitrine (sem PDV)" : (VIT.cliente && VIT.bloq.has(VIT.cliente + "|" + it.m + "|" + it.r) ? "não vai para " + nomeCli(VIT.cliente) : null);

async function carregarDados(sb, el){
  if (DADOS) return true;
  el.innerHTML = `<div class="card">carregando a coleção…</div>`;
  const r = await sb.rpc("colecao_consulta", { p_colecao: null });
  if (r.error) { el.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return false; }
  DADOS = r.data || { itens: [], n: 0 };
  if (!DADOS.itens.length) { el.innerHTML = `<div class="msg aviso">O banco ainda não tem coleção carregada.</div>`; return false; }
  return true;
}
async function carregarVitrine(sb){
  if (VIT.esc == null) {
    const e = await sb.from("escritorio").select("id").limit(1);
    VIT.esc = (e.data && e.data[0] && e.data[0].id) || null;
    // os clientes: carteira + giro (15/10, ele: "faltou Noroeste" — o Noroeste só tem giro) + quem já tem vitrine
    const [cob, cg, vc, bl] = await Promise.all([tudo(sb.from("v_cobertura").select("cliente")), tudo(sb.from("v_cobertura_giro").select("cliente")), tudo(sb.from("vitrine").select("cliente")), tudo(sb.from("vitrine_bloqueio").select("cliente,marca,referencia"))]);
    const nomes = new Set([...(cob.data || []).map(r => r.cliente), ...(cg.data || []).map(r => r.cliente), ...(vc.data || []).map(r => r.cliente)].filter(Boolean));
    VIT.clientes = [...nomes].sort();
    // o GTM DISTRIBUIÇÃO da coleção (se carregado): um pseudo-cliente por mês, no fim da lista
    const g = await sb.rpc("gtm_consulta", { p_colecao: DADOS.colecao });
    if (!g.error && g.data && g.data.itens) { VIT.gtm = g.data; VIT.gtm.mapa = new Map(g.data.itens.map(i => [i.m + "|" + i.r + "|" + i.c, i])); VIT.clientes = VIT.clientes.filter(c => !c.startsWith(gtmPref())).concat(VIT.gtm.meses.map(m => gtmPref() + m)); }
    else VIT.gtm = null;
    VIT.bloq = new Set((bl.data || []).map(r => r.cliente + "|" + r.marca + "|" + r.referencia));
    const h = new URLSearchParams(location.hash.slice(1));            // 19/10: #cliente=…&vista=montando abre a vitrine certa de cara
    if (!VIT.cliente && h.get("cliente") && VIT.clientes.includes(h.get("cliente"))) { VIT.cliente = h.get("cliente"); VIT.vistaPedida = h.get("vista") || null; }
    if (!VIT.cliente) VIT.cliente = VIT.clientes.includes("POLYELLE") ? "POLYELLE" : (VIT.clientes[0] || null);
  }
  if (VIT.cliente && VIT.carregadoPara !== VIT.cliente) {
    const [r, a] = await Promise.all([tudo(sb.from("vitrine").select("colecao,marca,referencia,cor,estado").eq("cliente", VIT.cliente)), sb.rpc("vitrine_atual_consulta", { p_cliente: VIT.cliente, p_colecao: null })]);
    if (r.error) { VIT.erro = "não consegui ler a vitrine: " + r.error.message; return; }
    VIT.marcas = new Map();
    for (const x of r.data) marcas(x.colecao).set(x.marca + "|" + x.referencia + "|" + x.cor, x.estado || "escolhida");
    VIT.atual = (!a.error && a.data && a.data.n > 0) ? a.data : null;
    VIT.carregadoPara = VIT.cliente; VIT.erro = a.error ? "não consegui ler a coleção atual: " + a.error.message : "";
    VIT.vista = VIT.vistaPedida === "montando" ? "montando" : (VIT.atual ? "atual" : "montando"); VIT.vistaPedida = null;
  }
}

async function abrir(sb, el){
  SB = sb; EL = el;
  if (!(await carregarDados(sb, el))) return;
  await carregarVitrine(sb);
  desenhar();
}
async function abrirVitrine(sb, el){
  SB = sb; ELV = el;
  if (!(await carregarDados(sb, el))) return;
  await carregarVitrine(sb);
  desenharVitrine();
}

function itensFiltrados(){
  const t = semAcento(S.busca).split(/\s+/).filter(Boolean);
  return DADOS.itens.filter(it => it.m === S.marca
    && (!S.tipo || it.t === S.tipo)
    && (!S.grupo.size || S.grupo.has(familiaDe(it)))
    && (!S.selo.size || (S.selo.has("l") && ehLanc(it)) || (S.selo.has("cn") && ehNova(it)))
    && (!t.length || t.every(x => semAcento([it.n, it.r, it.c, it.cd, familiaDe(it), it.ge, it.nu].join(" ")).includes(x))));
}

function chips(raiz, id, lista, sel, aoClicar){
  const el = raiz.querySelector("#" + id);
  el.innerHTML = lista.map(([v, r, n]) => `<button type="button" data-v="${esc(v)}" class="${(v === "" ? !sel.size : sel.has(v)) ? "ativa" : ""}">${esc(r)}${n != null ? ` <small>${n}</small>` : ""}</button>`).join("");
  for (const b of el.querySelectorAll("button")) b.onclick = () => aoClicar(b.dataset.v);
}
const chipsClientes = (raiz, id) => chips(raiz, id, VIT.clientes.map(c => [c, nomeCli(c)]), new Set(VIT.cliente ? [VIT.cliente] : []), async v => { VIT.cliente = v; MF.tipo = ""; MF.bloco.clear(); await carregarVitrine(SB); if (EL && EL.querySelector(".cat")) desenhar(); if (ELV && ELV.querySelector(".cat")) desenharVitrine(); });

function desenhar(){
  const el = EL;
  if (!el.querySelector(".cat")) {
    el.innerHTML = `<div class="cat colecao">
      <div class="card filtros">
        <div class="linha-topo"><div class="chips marcas" id="col-marca"></div>
          <input type="search" id="col-busca" placeholder="buscar: produto, referência, cor, bloco…" autocomplete="off" value="${esc(S.busca)}"></div>
        <label>tipo</label><div class="chips" id="col-tipo"></div>
        <div id="col-bloco-grupo"><label>família</label><div class="chips" id="col-grupo"></div></div>
        <div class="chips" id="col-selo" style="margin-top:6px"></div>
        <label>vitrine de (o "+" no cartão leva a cor para a vitrine deste cliente)</label><div class="chips" id="col-cliente"></div>
        <div class="acoes"><button type="button" id="col-pdf" class="sec">exportar PDF</button></div>
        <div class="mu" id="col-conta"></div><div class="msg erro oculto" id="col-erro"></div>
      </div>
      <div class="pagina" id="col-pagina"></div>
      <div class="luz oculto" id="col-luz"></div>
    </div>`;
    el.querySelector("#col-busca").oninput = (ev) => { S.busca = ev.target.value; clearTimeout(desenhar._t); desenhar._t = setTimeout(desenharPagina, 120); };
    el.querySelector("#col-pdf").onclick = () => window.print();
    el.querySelector("#col-luz").onclick = (ev) => { if (ev.target.id === "col-luz" || ev.target.classList.contains("fecha")) fecharLuz(el); };
  }
  const daMarca = DADOS.itens.filter(it => it.m === S.marca);
  chips(el, "col-marca", [["OLY", "Olympikus"], ["UA", "Under Armour"]], new Set([S.marca]), v => { S.marca = v; S.tipo = ""; S.grupo.clear(); desenhar(); });
  const ct = new Map(); for (const it of daMarca) ct.set(it.t, (ct.get(it.t) || 0) + 1);
  chips(el, "col-tipo", TIPOS.filter(([v]) => !v || ct.has(v)).map(([v, r]) => [v, r, v ? ct.get(v) : daMarca.length]), new Set(S.tipo ? [S.tipo] : []), v => { S.tipo = v; S.grupo.clear(); desenhar(); });
  const doTipo = S.tipo ? daMarca.filter(it => it.t === S.tipo) : [];
  const cg = new Map(); for (const it of ordenar(doTipo)) { const f = familiaDe(it); if (f) cg.set(f, (cg.get(f) || 0) + 1); }
  el.querySelector("#col-bloco-grupo").classList.toggle("oculto", !S.tipo || cg.size < 2);
  chips(el, "col-grupo", [["", "todas"], ...[...cg.entries()].map(([v, n]) => [v, titulo(v), n])], S.grupo, v => { if (v === "") S.grupo.clear(); else if (S.grupo.has(v)) S.grupo.delete(v); else S.grupo.add(v); desenhar(); });
  const base = S.tipo ? doTipo : daMarca;
  chips(el, "col-selo", [["", "sem selo"], ["l", "lançamento", base.filter(ehLanc).length], ["cn", "cor nova", base.filter(ehNova).length]], S.selo, v => { if (v === "") S.selo.clear(); else if (S.selo.has(v)) S.selo.delete(v); else S.selo.add(v); desenhar(); });
  chipsClientes(el, "col-cliente");
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
  const passo = img.dataset.passo;
  if (passo === "jpg") { img.dataset.passo = "png"; img.src = img.src.replace(/\.jpg$/, ".png"); return; }
  if (passo === "png" && img.dataset.url) { img.dataset.passo = "url"; img.src = img.dataset.url; return; }
  img.classList.add("oculto");
  const sem = img.parentElement.querySelector(".sem");
  if (sem) sem.classList.remove("oculto"); else img.insertAdjacentHTML("afterend", `<div class="sem">sem foto</div>`);
}

// o cartão da cor, por modo: "colecao" (o "+" / "✓"), "montando" (a vitrine que ele monta: "×"), "atual" (a coleção atual: "retirar" / "voltar")
function corHtml(it, modo){
  const k = chaveCor(it);
  let botao = "", classes = "", extra = "";
  if (modo === "atual") {
    const retirada = VIT.atual && marcas(VIT.atual.colecao).get(k) === "retirar";
    if (retirada) classes += " retirada";
    extra = `<div class="st">${esc(it.st || "")}</div>${retirada ? `<div class="fora-txt">retirar da carteira</div>` : ""}`;
    if (emCarteira(it)) botao = `<button type="button" class="mais txt${retirada ? " on" : ""}" data-kc="${esc(k)}" title="${retirada ? "voltar para a carteira" : "retirar da carteira"}">${retirada ? "voltar" : "retirar"}</button>`;
  } else {
    const fora = foraDaVitrine(it), sel = VIT.cliente && marcas(DADOS.colecao).get(k) === "escolhida";
    if (sel && modo === "colecao") classes += " sel";
    if (fora) { classes += " fora"; extra = `<div class="fora-txt">${esc(fora)}</div>`; }
    if (VIT.cliente && !fora) botao = modo === "montando" ? `<button type="button" class="mais tira" data-kc="${esc(k)}" title="tirar da vitrine">×</button>`
                                                          : `<button type="button" class="mais${sel ? " on" : ""}" data-kc="${esc(k)}" title="${sel ? "tirar da vitrine" : "pôr na vitrine"}">${sel ? "✓" : "+"}</button>`;
  }
  // 15/10, circular OLY Nº 01: início de faturamento como selo preto sobre cinza claro (regra do NÚCLEO: nada de volume antes da data;
  // vazio = continuidade); "fora da circular" em cinza, sem esconder (decisão dele pendente)
  const circ = (it.if ? `<span class="selo inicio" title="início de faturamento">${esc(it.if)}</span>` : "") + (it.ci ? `<div class="circ">fora da circular${/FDL/i.test(it.ci) ? " · tabela FDL" : ""}</div>` : "");
  return `<div class="cor${classes}" data-kc="${esc(k)}">${botao}${fotoHtml(it)}<div class="cod">${esc(it.c)}</div>${it.cd && it.cd !== it.c ? `<div class="desc">${esc(it.cd)}</div>` : ""}${circ}${extra}</div>`;
}
// uma coluna por modelo: cabeçalho fixo (nome, referência copiável, PDV, selo) e as cores embaixo
function coluna(cores, modo){
  const m = cores[0], lanc = cores.some(ehLanc), sl = cores.some(it => it.sl);
  return `<div class="modelo">
    <div class="cab">
      <div class="nome">${esc(semViuva(m.n))}</div>
      <div class="linha"><button type="button" class="ref" data-ref="${esc(m.r)}" title="toque para copiar a referência">${esc(m.r)}</button><span class="pdv">${esc(dinheiro(m.p))}</span></div>${m.pj != null && +m.pj !== +(m.p || 0) ? `<div class="st">a partir de jan/27: ${esc(dinheiro(m.pj))}</div>` : ""}
      <div class="selos">${lanc ? `<span class="selo lanc">lançamento</span>` : ""}${sl ? `<span class="selo conv">convenção</span>` : ""}${m.nu ? `<span class="mu">${esc(m.ge ? m.ge + " · " : "")}${esc(m.nu)}</span>` : (m.ge ? `<span class="mu">${esc(m.ge)}</span>` : "")}</div>
    </div>
    <div class="cores">${cores.map(it => corHtml(it, modo)).join("")}</div>
  </div>`;
}
// a página: seções na ordem do pacote (tipo → bloco), uma coluna por modelo; devolve {html, modelos}
function montarPagina(lista, modo){
  let html = "", modelos = 0;
  for (const [tv] of TIPOS.filter(([v]) => v)) {
    const doTipo = ordenar(lista.filter(it => it.t === tv));
    if (!doTipo.length) continue;
    let bloco = null, porModelo = new Map();
    const faixa = () => { const ps = [...porModelo.values()].flat().map(it => it.p).filter(p => p != null); if (!ps.length) return ""; const a = Math.min(...ps), b = Math.max(...ps); return " · " + esc(a === b ? dinheiro(a) : dinheiro(a) + " a " + dinheiro(b)); };
    const fecha = () => { if (bloco == null) return; html += `<div class="bloco"><div class="sec-tit">${esc(NOME_TIPO[tv])}${bloco ? " · " + esc(bloco) : ""} <small>${porModelo.size} modelo(s)${faixa()}</small></div><div class="colunas">${[...porModelo.values()].map(c => coluna(c, modo)).join("")}</div></div>`; modelos += porModelo.size; porModelo = new Map(); };
    for (const it of doTipo) {
      if (familiaDe(it) !== (bloco == null ? null : bloco)) { fecha(); bloco = familiaDe(it); }
      const k = chaveModelo(it); if (!porModelo.has(k)) porModelo.set(k, []); porModelo.get(k).push(it);
    }
    fecha();
  }
  return { html, modelos };
}
function ligarPagina(raiz, pg, modo){
  for (const b of pg.querySelectorAll(".ref")) b.onclick = (ev) => { ev.stopPropagation(); copiar(b); };
  for (const f of pg.querySelectorAll(".foto")) f.onclick = () => abrirLuz(raiz, f.dataset.k, modo);
  for (const b of pg.querySelectorAll(".mais")) b.onclick = (ev) => { ev.stopPropagation(); alternar(b.dataset.kc, modo); };
}

function desenharPagina(){
  const lista = itensFiltrados();
  const pg = EL.querySelector("#col-pagina");
  const { html, modelos } = montarPagina(lista, "colecao");
  pg.innerHTML = html || `<div class="card mu">Nenhum produto com esses filtros.</div>`;
  EL.querySelector("#col-conta").textContent = `${modelos} modelo(s) · ${lista.length} cor(es) · coleção ${DADOS.colecao || "?"} · pacote de ${DADOS.base_em ? DADOS.base_em.split("-").reverse().join("/") : "?"}` + (VIT.cliente ? ` · vitrine ${nomeCli(VIT.cliente)}: ${contaEscolhidas()} cor(es)` : "");
  ligarPagina(EL, pg, "colecao");
}
const contaEscolhidas = () => [...marcas(DADOS.colecao).values()].filter(v => v === "escolhida").length;
const contaRetiradas = () => VIT.atual ? [...marcas(VIT.atual.colecao).values()].filter(v => v === "retirar").length : 0;

function desenharVitrine(){
  const el = ELV;
  if (!el.querySelector(".cat")) {
    el.innerHTML = `<div class="cat colecao vitrine">
      <div class="card filtros">
        <label>cliente</label><div class="chips" id="vit-cliente"></div>
        <label>coleção</label><div class="chips" id="vit-colecao"></div>
        <div class="vit-topo"><div class="vit-conta" id="vit-conta"></div><div class="acoes"><button type="button" id="vit-pdf" class="sec">exportar PDF</button></div></div>
        <div class="mu" id="vit-nota"></div>
        <div class="msg erro oculto" id="vit-erro"></div>
      </div>
      <div class="pagina" id="vit-pagina"></div>
      <div class="luz oculto" id="vit-luz"></div>
    </div>`;
    el.querySelector("#vit-pdf").onclick = () => window.print();
    el.querySelector("#vit-luz").onclick = (ev) => { if (ev.target.id === "vit-luz" || ev.target.classList.contains("fecha")) fecharLuz(el); };
  }
  chipsClientes(el, "vit-cliente");
  const vistas = [];
  if (VIT.atual) vistas.push(["atual", VIT.atual.colecao + " (atual)"]);
  vistas.push(["montando", (DADOS.colecao || "?") + " (montando)"]);
  if (!vistas.some(([v]) => v === VIT.vista)) VIT.vista = vistas[0][0];
  chips(el, "vit-colecao", vistas, new Set([VIT.vista]), v => { VIT.vista = v; desenharVitrine(); });
  const pg = el.querySelector("#vit-pagina"), nota = el.querySelector("#vit-nota");
  if (VIT.vista === "atual" && VIT.atual) {
    const lista = VIT.atual.itens, { html, modelos } = montarPagina(lista, "atual");
    pg.innerHTML = html || `<div class="card mu">Sem itens na coleção atual.</div>`;
    el.querySelector("#vit-conta").textContent = `${nomeCli(VIT.cliente)} · ${VIT.atual.colecao} · ${lista.length} cor(es) · ${modelos} modelo(s) · ${contaRetiradas()} para retirar`;
    nota.textContent = `como ${nomeCli(VIT.cliente)} está hoje: carteira + faturado, da base de ${VIT.atual.base_em ? VIT.atual.base_em.split("-").reverse().join("/") : "?"}. "retirar" registra a decisão aqui; a carteira mesmo muda pela AÇÃO, na DETALHADA.`;
    ligarPagina(el, pg, "atual");
  } else {
    el.querySelector("#vit-conta").textContent = VIT.cliente ? `Vitrine ${nomeCli(VIT.cliente)} · ${DADOS.colecao || ""}` : "";
    nota.textContent = "esquerda: a coleção, com filtros e busca — toque numa cor e ela sobe para a vitrine; direita: a vitrine do cliente, dos mais caros aos mais baratos.";
    desenharMontador(pg);
  }
  const er = el.querySelector("#vit-erro"); er.textContent = VIT.erro; er.classList.toggle("oculto", !VIT.erro);
}

// ---------- o MONTADOR (15/10, orientação dele, ao vivo): "parta a tela no meio: do lado esquerdo os produtos da 1S27 com filtros
// (marca, tipo, família, gênero) e um campo para digitar o nome; clicou no produto, abre do lado como fica a vitrine do cliente,
// de cima para baixo em ordem decrescente de valor — em cima os mais caros — com filtro de feminino / masculino / infantil / família,
// e com o PDV. Mais bonito, mais visual, gamificar." Regras da casa que valem aqui: animação é evento (sobe, brilha, PARA);
// estado é repouso; paleta só a oficial.
const MF = { busca: "", marca: "OLY", tipo: "", bloco: new Set(), gen: new Set() };   // filtros da esquerda (a coleção)
const VF = { gen: new Set(), bloco: new Set(), tipo: new Set() };                      // filtros da direita (a vitrine)
let PAINEL = "esq";                                                                    // no celular: qual metade está na tela
const GEN_ORDEM = ["Feminino", "Masculino", "Unissex", "Infantil"];
const genOrd = g => { const i = GEN_ORDEM.indexOf(g); return i < 0 ? 9 : i; };
const escolhidas = () => VIT.cliente ? DADOS.itens.filter(it => marcas(DADOS.colecao).get(chaveCor(it)) === "escolhida") : [];

function desenharMontador(pg){
  if (!pg.querySelector(".montador")) {
    pg.innerHTML = `<div class="montador">
      <div class="mont-troca"><button type="button" data-p="esq" class="ativa">Coleção</button><button type="button" data-p="dir">Vitrine <b id="mont-n"></b></button></div>
      <div class="mont-esq">
        <div class="mont-filtros">
          <input type="search" id="mf-busca" placeholder="digite o nome do produto, a referência ou a cor" autocomplete="off" value="${esc(MF.busca)}">
          <div class="frow"><span class="fl">marca</span><div class="chips" id="mf-marca"></div></div>
          <div class="frow"><span class="fl">tipo</span><div class="chips" id="mf-tipo"></div></div>
          <div class="frow"><span class="fl">família</span><div class="chips" id="mf-bloco"></div></div>
          <div class="frow"><span class="fl">gênero</span><div class="chips" id="mf-gen"></div></div>
          <div class="mu" id="mf-conta"></div>
        </div>
        <div class="mont-lista" id="mf-lista"></div>
      </div>
      <div class="mont-dir">
        <div class="mont-cab">
          <div class="mont-tit" id="vf-tit"></div>
          <div class="mont-placar" id="vf-placar"></div>
          <div class="frow"><span class="fl">tipo</span><div class="chips" id="vf-tipo"></div></div>
          <div class="frow"><span class="fl">gênero</span><div class="chips" id="vf-gen"></div></div>
          <div class="frow"><span class="fl">família</span><div class="chips" id="vf-bloco"></div></div>
        </div>
        <div class="mont-vitrine" id="vf-lista"></div>
      </div>
    </div>`;
    pg.querySelector("#mf-busca").oninput = (ev) => { MF.busca = ev.target.value; clearTimeout(desenharMontador._t); desenharMontador._t = setTimeout(() => desenharEsquerda(pg), 120); };
    for (const b of pg.querySelectorAll(".mont-troca button")) b.onclick = () => { PAINEL = b.dataset.p; pg.querySelector(".montador").dataset.painel = PAINEL; for (const x of pg.querySelectorAll(".mont-troca button")) x.classList.toggle("ativa", x === b); };
  }
  pg.querySelector(".montador").dataset.painel = PAINEL;
  desenharEsquerda(pg);
  desenharDireita(pg);
}

function desenharEsquerda(pg){
  const gtm = ehGtm(), mes = gtmMes();
  if (!gtm && MF.tipo === "estrela") MF.tipo = "";
  const daMarca = DADOS.itens.filter(it => it.m === MF.marca && (!gtm || gtmDe(it)));
  chips(pg, "mf-marca", [["OLY", "Olympikus"], ["UA", "Under Armour"]], new Set([MF.marca]), v => { MF.marca = v; MF.tipo = ""; MF.bloco.clear(); MF.gen.clear(); desenharEsquerda(pg); });
  const ct = new Map(); for (const it of daMarca) ct.set(it.t, (ct.get(it.t) || 0) + 1);
  if (gtm) chips(pg, "mf-tipo", [["", "todas", daMarca.length], ["estrela", "★ estrela Vulcabras", daMarca.filter(it => gtmDe(it).e).length]], new Set(MF.tipo ? [MF.tipo] : []), v => { MF.tipo = v; desenharEsquerda(pg); });
  else chips(pg, "mf-tipo", TIPOS.filter(([v]) => !v || ct.has(v)).map(([v, r]) => [v, r, v ? ct.get(v) : daMarca.length]), new Set(MF.tipo ? [MF.tipo] : []), v => { MF.tipo = v; MF.bloco.clear(); desenharEsquerda(pg); });
  const base = gtm ? (MF.tipo === "estrela" ? daMarca.filter(it => gtmDe(it).e) : daMarca) : (MF.tipo ? daMarca.filter(it => it.t === MF.tipo) : daMarca);
  const cb = new Map(); for (const it of ordenar(base)) { const f = familiaDe(it); if (f) cb.set(f, (cb.get(f) || 0) + 1); }
  chips(pg, "mf-bloco", [["", "todas as famílias"], ...[...cb.entries()].map(([v, n]) => [v, titulo(v), n])], MF.bloco, v => { if (v === "") MF.bloco.clear(); else if (MF.bloco.has(v)) MF.bloco.delete(v); else MF.bloco.add(v); desenharEsquerda(pg); });
  const cgn = new Map(); for (const it of base) if (it.ge) cgn.set(it.ge, (cgn.get(it.ge) || 0) + 1);
  chips(pg, "mf-gen", [["", "todos"], ...[...cgn.entries()].sort((a, b) => genOrd(a[0]) - genOrd(b[0])).map(([v, n]) => [v, v, n])], MF.gen, v => { if (v === "") MF.gen.clear(); else if (MF.gen.has(v)) MF.gen.delete(v); else MF.gen.add(v); desenharEsquerda(pg); });
  const t = semAcento(MF.busca).split(/\s+/).filter(Boolean);
  const lista = ordenar(base.filter(it => (!MF.bloco.size || MF.bloco.has(familiaDe(it))) && (!MF.gen.size || MF.gen.has(it.ge || ""))
    && (!t.length || t.every(x => semAcento([it.n, it.r, it.c, it.cd, familiaDe(it)].join(" ")).includes(x)))));
  // uma linha por modelo (família oficial → ordem do pacote), as cores como miniaturas clicáveis; o mesmo modelo pode cair em duas famílias conforme a cor
  const M = marcas(DADOS.colecao); let html = "", bloco = null, modelos = 0;
  const porModelo = new Map();
  for (const it of lista) { const k = chaveModelo(it) + "|" + familiaDe(it); if (!porModelo.has(k)) porModelo.set(k, []); porModelo.get(k).push(it); }
  for (const cores of porModelo.values()) {
    const m = cores[0];
    if (familiaDe(m) !== bloco) { bloco = familiaDe(m); html += `<div class="mont-sec">${esc(NOME_TIPO[m.t] || m.t)}${bloco ? " · " + esc(bloco) : ""}</div>`; }
    modelos++;
    const gm = gtm ? gtmDe(m) : null;
    html += `<div class="mcard"><div class="mcab"><div class="mnome">${esc(m.n)}</div><div class="mref"><button type="button" class="ref" data-ref="${esc(m.r)}">${esc(m.r)}</button> <span class="mpdv">${esc(dinheiro(m.p))}</span>${m.ge ? `<span class="mu"> · ${esc(m.ge)}</span>` : ""}${m.if ? `<span class="selo inicio">${esc(m.if)}</span>` : ""}${gm ? `<span class="mgtm-mod">modelo ${esc(mes)}: <b>${(gm.vm[mes] || 0).toLocaleString("pt-BR")}</b> pares</span>` : ""}</div></div>
      <div class="mthumbs">${cores.map(it => { const k = chaveCor(it), fora = foraDaVitrine(it), sel = M.get(k) === "escolhida", g = gtm ? gtmDe(it) : null; return `<div class="mthumb${sel ? " sel" : ""}${fora ? " fora" : ""}" data-kc="${esc(k)}" title="${esc(fora || (sel ? "tirar da vitrine" : "pôr na vitrine"))}">${fotoMini(it)}<div class="mcod">${esc(it.c)}</div>${g ? `<div class="mgtm${g.e ? " estrela" : ""}">${g.e ? "★ " : ""}${g.mx ? Math.round(g.mx) + "%" : "—"} · <b>${g.ps[mes] || 0}</b></div>` : ""}${sel ? `<i class="ok">✓</i>` : ""}</div>`; }).join("")}</div>
    </div>`;
  }
  const L = pg.querySelector("#mf-lista"); L.innerHTML = html || `<div class="card mu">Nenhum produto com esses filtros.</div>`;
  pg.querySelector("#mf-conta").textContent = `${modelos} modelo(s) · ${lista.length} cor(es) — toque na cor para pôr na vitrine`;
  for (const b of L.querySelectorAll(".ref")) b.onclick = (ev) => { ev.stopPropagation(); copiar(b); };
  for (const th of L.querySelectorAll(".mthumb:not(.fora)")) th.onclick = () => { th.classList.add("pulso"); setTimeout(() => th.classList.remove("pulso"), 500); alternar(th.dataset.kc, "montador"); };
}
const fotoMini = it => { const src = srcFoto(it); return src ? `<img loading="lazy" src="${esc(src)}" alt="" data-passo="${it.i ? "jpg" : "url"}" data-url="${esc(it.u || "")}" onerror="Colecao.fotoFalhou(this)">` : `<div class="sem">sem foto</div>`; };

function desenharDireita(pg){
  const todas = escolhidas();
  const ct = new Map(), cgn = new Map(), cb = new Map();
  for (const it of ordenar(todas)) { ct.set(it.t, (ct.get(it.t) || 0) + 1); if (it.ge) cgn.set(it.ge, (cgn.get(it.ge) || 0) + 1); const f = familiaDe(it); if (f) cb.set(f, (cb.get(f) || 0) + 1); }
  chips(pg, "vf-tipo", [["", "tudo"], ...TIPOS.filter(([v]) => v && ct.has(v)).map(([v, r]) => [v, r, ct.get(v)])], VF.tipo, v => { if (v === "") VF.tipo.clear(); else if (VF.tipo.has(v)) VF.tipo.delete(v); else VF.tipo.add(v); desenharDireita(pg); });
  chips(pg, "vf-gen", [["", "todos"], ...[...cgn.entries()].sort((a, b) => genOrd(a[0]) - genOrd(b[0])).map(([v, n]) => [v, v, n])], VF.gen, v => { if (v === "") VF.gen.clear(); else if (VF.gen.has(v)) VF.gen.delete(v); else VF.gen.add(v); desenharDireita(pg); });
  chips(pg, "vf-bloco", [["", "todas as famílias"], ...[...cb.entries()].map(([v, n]) => [v, titulo(v), n])], VF.bloco, v => { if (v === "") VF.bloco.clear(); else if (VF.bloco.has(v)) VF.bloco.delete(v); else VF.bloco.add(v); desenharDireita(pg); });
  // 19/10: por TIPO (tênis, chinelos, meias…) e dentro do tipo do mais caro ao mais barato — o chinelo nunca se mistura ao tênis
  const lista = todas.filter(it => (!VF.tipo.size || VF.tipo.has(it.t)) && (!VF.gen.size || VF.gen.has(it.ge || "")) && (!VF.bloco.size || VF.bloco.has(familiaDe(it))))
    .sort((a, b) => (tipoIdx(a.t) - tipoIdx(b.t)) || ((b.p == null ? -1 : +b.p) - (a.p == null ? -1 : +a.p)) || String(a.n).localeCompare(String(b.n)) || String(a.c).localeCompare(String(b.c)));
  pg.querySelector("#vf-tit").textContent = `Vitrine ${nomeCli(VIT.cliente || "")} · ${DADOS.colecao || ""}`;
  // 19/10 (regra dele, chinelo-separado-do-tenis; PICASSO na conferência da v5.18): UM PLACAR POR TIPO, sem total geral — o chinelo
  // nunca soma com o tênis. O valor em PDV: inteiro no computador, "R$ 3,6 mil" no celular (PICASSO, 15/10: cortava em 390 px)
  const dinheiroCheio = s => s ? "R$ " + Number(s).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
  const dinheiroCurto = s => !s ? "—" : (s >= 1e6 ? "R$ " + (s / 1e6).toFixed(2).replace(".", ",") + " mi" : (s >= 1e3 ? "R$ " + (s / 1e3).toFixed(1).replace(".", ",") + " mil" : "R$ " + Math.round(s)));
  const gtm = ehGtm(), mes = gtmMes();
  const placar = TIPOS.filter(([v]) => v && ct.has(v)).map(([v, r]) => { const its = todas.filter(it => it.t === v), soma = its.reduce((s, it) => s + (+it.p || 0), 0);
    const pares = gtm ? its.reduce((s, it) => s + (((gtmDe(it) || { ps: {} }).ps[mes]) || 0), 0) : null;
    return `<div class="pl-tipo${gtm ? " gtm" : ""}"><em>${esc(r.toUpperCase())}</em><span><b>${its.length}</b><small>cor(es)</small></span><span><b>${new Set(its.map(it => it.m + "|" + it.r)).size}</b><small>modelo(s)</small></span><span><b class="cheio">${esc(dinheiroCheio(soma))}</b><b class="curto">${esc(dinheiroCurto(soma))}</b><small>em PDV</small></span>${gtm ? `<span><b>${pares.toLocaleString("pt-BR")}</b><small>pares ${esc(mes)}</small></span>` : ""}</div>`; });
  pg.querySelector("#vf-placar").innerHTML = placar.join("") || `<div class="pl-tipo"><em>—</em><span><b>0</b><small>cor(es)</small></span><span><b>0</b><small>modelo(s)</small></span><span><b>—</b><small>em PDV</small></span></div>`;
  const n = pg.querySelector("#mont-n"); if (n) n.textContent = todas.length ? String(todas.length) : "";
  const V = pg.querySelector("#vf-lista");
  // cartão PEQUENO (19/10, ele: "está muito grande, um formato ruim; preciso ver a composição da vitrine") e um título por tipo
  let tipoAtual = null, html = "";
  for (const it of lista) {
    if (it.t !== tipoAtual) { tipoAtual = it.t; const its = lista.filter(x => x.t === it.t); html += `<div class="vsec">${esc(NOME_TIPO[it.t] || it.t)} <small>${new Set(its.map(x => x.m + "|" + x.r)).size} modelo(s) · ${its.length} cor(es)</small></div>`; }
    html += `<div class="vcard${chaveCor(it) === NOVA ? " nova" : ""}" data-kc="${esc(chaveCor(it))}">
      <button type="button" class="mais tira" data-kc="${esc(chaveCor(it))}" title="tirar da vitrine">×</button>
      <div class="vfoto ${it.t === "TENIS" ? "deitada" : "empe"}" data-k="${esc(chave(it))}">${fotoMini(it)}${ehNova(it) ? `<i class="tri" title="cor nova"></i>` : ""}</div>
      <div class="vtx"><div class="vnome">${esc(it.n)}</div>
        <div class="vlinha"><button type="button" class="ref" data-ref="${esc(it.r)}">${esc(it.r)}</button><span class="vcor">${esc(it.c)}</span></div>
        <div class="vlinha"><span class="vpdv">${esc(dinheiro(it.p))}</span>${ehLanc(it) ? `<span class="selo lanc">lanç.</span>` : ""}${it.if ? `<span class="selo inicio">${esc(it.if)}</span>` : ""}</div>
        ${gtm && gtmDe(it) ? `<div class="vgtm${gtmDe(it).e ? " estrela" : ""}">${gtmDe(it).e ? "★ " : ""}mix ${Math.round(gtmDe(it).mx)}% · <b>${(gtmDe(it).ps[mes] || 0).toLocaleString("pt-BR")}</b> pares ${esc(mes)}</div>` : ""}
        <div class="mu">${familiaDe(it) ? esc(titulo(familiaDe(it))) : ""}${it.ge ? " · " + esc(it.ge) : ""}</div></div>
    </div>`;
  }
  V.innerHTML = lista.length ? html : `<div class="vvazia">${VIT.cliente ? `A vitrine ${esc(nomeCli(VIT.cliente))} está vazia.<br><small>Toque numa cor da coleção, à esquerda, e ela sobe para cá.</small>` : "Escolha o cliente."}</div>`;
  for (const b of V.querySelectorAll(".ref")) b.onclick = (ev) => { ev.stopPropagation(); copiar(b); };
  for (const b of V.querySelectorAll(".mais")) b.onclick = (ev) => { ev.stopPropagation(); alternar(b.dataset.kc, "montador"); };
  for (const f of V.querySelectorAll(".vfoto")) f.onclick = () => abrirLuz(ELV, f.dataset.k, "montando");
  const nova = V.querySelector(".vcard.nova"); if (nova) { nova.scrollIntoView({ block: "nearest", behavior: "smooth" }); setTimeout(() => nova.classList.remove("nova"), 5_000); }   // 5 s (escrito assim por causa do guarda de números do publicador)
}
let NOVA = null;   // a cor que acabou de subir: brilha 5 s e para (animação é evento; estado é repouso)

// pôr / tirar (escolhida) e retirar / voltar (atual): grava no banco na hora, com o login dele; a tela muda antes e volta se o banco recusar
async function alternar(kc, modo){
  if (!VIT.cliente || !VIT.esc || !DADOS) return;
  const atual = modo === "atual";
  if (atual && !VIT.atual) return;
  const fonte = atual ? VIT.atual.itens : DADOS.itens, it = fonte.find(x => chaveCor(x) === kc);
  if (!it || (!atual && foraDaVitrine(it)) || (atual && !emCarteira(it))) return;
  const col = atual ? VIT.atual.colecao : DADOS.colecao, estado = atual ? "retirar" : "escolhida", M = marcas(col);
  const tinha = M.get(kc) === estado;
  if (tinha) M.delete(kc); else M.set(kc, estado);
  NOVA = (!tinha && !atual) ? kc : null;
  refrescar();
  const linha = { escritorio_id: VIT.esc, cliente: VIT.cliente, colecao: col, marca: it.m, referencia: it.r, cor: it.c };
  const r = tinha ? await SB.from("vitrine").delete().match(linha) : await SB.from("vitrine").insert(Object.assign({ estado, estado_anterior: atual ? (it.st || null) : null }, linha));
  if (r.error) {
    if (tinha) M.set(kc, estado); else M.delete(kc);
    VIT.erro = "O banco recusou a vitrine: " + r.error.message; refrescar();
    const raiz = modo === "colecao" ? EL : ELV, e = raiz && raiz.querySelector(modo === "colecao" ? "#col-erro" : "#vit-erro"); if (e) { e.textContent = VIT.erro; e.classList.remove("oculto"); }
    return;
  }
  VIT.erro = "";
}
function refrescar(){
  if (EL && EL.querySelector(".cat")) {
    const M = marcas(DADOS.colecao);
    for (const c of EL.querySelectorAll("#col-pagina .cor")) { const k = c.dataset.kc, sel = M.get(k) === "escolhida", b = c.querySelector(".mais"); c.classList.toggle("sel", sel); if (b) { b.classList.toggle("on", sel); b.textContent = sel ? "✓" : "+"; b.title = sel ? "tirar da vitrine" : "pôr na vitrine"; } }
    const conta = EL.querySelector("#col-conta"); if (conta) conta.textContent = conta.textContent.replace(/vitrine [^:]+: \d+ cor\(es\)/, `vitrine ${nomeCli(VIT.cliente)}: ${contaEscolhidas()} cor(es)`);
  }
  if (ELV && ELV.querySelector(".cat")) {
    const pg = ELV.querySelector("#vit-pagina");
    if (VIT.vista !== "atual" && pg && pg.querySelector(".montador")) {   // o montador só redesenha as duas metades (sem perder filtro nem rolagem)
      const M = marcas(DADOS.colecao);
      for (const th of pg.querySelectorAll(".mthumb")) { const sel = M.get(th.dataset.kc) === "escolhida"; th.classList.toggle("sel", sel); const ok = th.querySelector(".ok"); if (sel && !ok) th.insertAdjacentHTML("beforeend", `<i class="ok">✓</i>`); if (!sel && ok) ok.remove(); }
      desenharDireita(pg);
    } else desenharVitrine();
  }
}

async function copiar(b){
  const ref = b.dataset.ref;
  try { await navigator.clipboard.writeText(ref); } catch (e) {
    const ta = document.createElement("textarea"); ta.value = ref; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e2) {} ta.remove();
  }
  b.classList.add("copiado"); b.textContent = "copiado ✓";
  setTimeout(() => { b.classList.remove("copiado"); b.textContent = ref; }, 900);
}

function abrirLuz(raiz, k, modo){
  const fonte = (modo === "atual" && VIT.atual) ? VIT.atual.itens : DADOS.itens, it = fonte.find(x => chave(x) === k);
  if (!it) return;
  const grande = it.u || srcFoto(it);
  const luz = raiz.querySelector(".luz"); if (!luz) return;
  luz.innerHTML = `<div class="quadro"><button type="button" class="fecha">×</button>
    <div class="angulos">${grande ? `<img src="${esc(grande)}" alt="" onerror="Colecao.fotoFalhouGrande(this)">` : `<div class="mu">sem foto</div>`}</div>
    <div class="tx"><b>${esc(it.n)}</b><div class="mu"><button type="button" class="ref" data-ref="${esc(it.r)}">${esc(it.r)}</button> · ${esc(it.c)}${it.cd ? " · " + esc(it.cd) : ""}${it.st ? " · " + esc(it.st) : ""}</div><div class="preco">${esc(dinheiro(it.p))}${ehLanc(it) ? ` <span class="selo lanc">lançamento</span>` : ""}${ehNova(it) ? ` <span class="selo nova">cor nova</span>` : ""}</div></div></div>`;
  for (const b of luz.querySelectorAll(".ref")) b.onclick = (ev) => { ev.stopPropagation(); copiar(b); };
  luz.classList.remove("oculto");
}
function fotoFalhouGrande(img){ img.replaceWith(Object.assign(document.createElement("div"), { className: "mu", textContent: "sem foto" })); }
function fecharLuz(raiz){ raiz.querySelector(".luz").classList.add("oculto"); }

const estadoVitrine = () => ({ cliente: VIT.cliente, vista: VIT.vista });   // 19/10: para "abrir em outra janela" levar o cliente e a vista
window.Colecao = { abrir, abrirVitrine, fotoFalhou, fotoFalhouGrande, estadoVitrine };
})();
