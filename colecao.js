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
const VIT = { cliente: null, clientes: [], marcas: new Map(), grades: new Map(), pares: new Map(), pares6: new Map(), meses: new Map(), meses6: new Map(), gradesL: new Map(), cond: new Map(), gradeTx: new Map(), sug: new Map(), atual: null, vista: null, bloq: new Set(), esc: null, carregadoPara: null, erro: "" };
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
    const [r, a, sg, cd] = await Promise.all([tudo(sb.from("vitrine").select("colecao,marca,referencia,cor,estado,grade,pares,pares6,pares_mes,grade_texto,pares6_mes,grades").eq("cliente", VIT.cliente)), sb.rpc("vitrine_atual_consulta", { p_cliente: VIT.cliente, p_colecao: null }),
      tudo(sb.from("vitrine_sugestao").select("marca,referencia,cor,pares_mes,inicio_faturamento,motivo").eq("cliente", VIT.cliente)),
      tudo(sb.from("cliente_condicao").select("marca,tipo,prazo,markup").eq("cliente", VIT.cliente))]);
    if (r.error) { VIT.erro = "não consegui ler a vitrine: " + r.error.message; return; }
    VIT.marcas = new Map(); VIT.grades = new Map(); VIT.pares = new Map(); VIT.pares6 = new Map(); VIT.meses = new Map(); VIT.meses6 = new Map(); VIT.gradesL = new Map(); VIT.gradeTx = new Map(); VIT.sug = new Map();
    for (const x of r.data) { const k = x.marca + "|" + x.referencia + "|" + x.cor; marcas(x.colecao).set(k, x.estado || "escolhida"); if (x.grade) VIT.grades.set(k, x.grade); if (x.pares != null) VIT.pares.set(k, x.pares); if (x.pares6) VIT.pares6.set(k, x.pares6); if (x.pares_mes) VIT.meses.set(k, x.pares_mes); if (x.pares6_mes) VIT.meses6.set(k, x.pares6_mes); if (x.grade_texto) VIT.gradeTx.set(k, x.grade_texto); if (Array.isArray(x.grades) && x.grades.length) VIT.gradesL.set(k, x.grades); }
    for (const x of (sg && sg.data) || []) VIT.sug.set(x.marca + "|" + x.referencia + "|" + x.cor, { pm: x.pares_mes || {}, inicio: x.inicio_faturamento || "", motivo: x.motivo || "" });
    // a condição do cliente (ele, 19/10 16:1x: "clientes grandes que eu acompanho, você já tem o markup: abre automaticamente com o markup e o prazo dele")
    VIT.cond = new Map(); for (const x of (cd && cd.data) || []) VIT.cond.set(x.marca + "|" + x.tipo, { prazo: x.prazo, markup: +x.markup });
    VIT.atual = (!a.error && a.data && a.data.n > 0) ? a.data : null;
    VIT.carregadoPara = VIT.cliente; VIT.erro = a.error ? "não consegui ler a coleção atual: " + a.error.message : "";
    VIT.vista = VIT.vistaPedida === "montando" ? "montando" : (VIT.atual ? "atual" : "montando"); VIT.vistaPedida = null;
  }
}

// reler a vitrine do cliente no banco (duas abas / dois aparelhos mexendo na mesma vitrine): a cada volta ao foco e quando o banco diz "duplicada"
async function relerVitrine(){
  if (!SB || !VIT.cliente) return;
  VIT.carregadoPara = null; VIT.vistaPedida = VIT.vista;            // mantém a vista em que ele está (montando / atual)
  await carregarVitrine(SB);
  VIT.erro = "";
  if (ELV && ELV.querySelector(".cat")) desenharVitrine();
  else refrescar();
}
let RELENDO = 0;
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && VIT.cliente && Date.now() - RELENDO > 3_000) { RELENDO = Date.now(); relerVitrine(); } });
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
// os clientes: os comuns + UM chip "GTM CMS Distribuição" (ele, 19/10 17:0x: "ficou muito botão; agrupa, e lá dentro um filtro de mês")
// — com o GTM escolhido abre a linha dos meses (JAN…JUN), que é o que escolhe o cliente de verdade ("GTM 1S27 JAN")
const GTM_GRUPO = "__GTM";
const chipsClientes = (raiz, id) => {
  const gp = gtmPref(), comuns = VIT.clientes.filter(c => !c.startsWith(gp)), meses = VIT.clientes.filter(c => c.startsWith(gp)), noGtm = !!(VIT.cliente && VIT.cliente.startsWith(gp));
  const escolher = async v => { VIT.cliente = v; MF.tipo = ""; MF.bloco.clear(); if (v.startsWith(gp)) PREF.gravar("gtm.mes", meses.indexOf(v)); await carregarVitrine(SB); if (EL && EL.querySelector(".cat")) desenhar(); if (ELV && ELV.querySelector(".cat")) desenharVitrine(); };
  chips(raiz, id, [...comuns.map(c => [c, nomeCli(c)]), ...(meses.length ? [[GTM_GRUPO, "GTM CMS Distribuição"]] : [])], new Set(VIT.cliente ? [noGtm ? GTM_GRUPO : VIT.cliente] : []),
    v => escolher(v === GTM_GRUPO ? (noGtm ? VIT.cliente : (meses[PREF.ler("gtm.mes", 0)] || meses[0])) : v));
  let linha = raiz.querySelector("#" + id + "-mes");
  if (!linha) { linha = document.createElement("div"); linha.id = id + "-mes"; linha.className = "chips gtm-meses"; raiz.querySelector("#" + id).insertAdjacentElement("afterend", linha); }
  linha.classList.toggle("oculto", !noGtm);
  if (noGtm) chips(raiz, id + "-mes", meses.map(c => [c, c.slice(gp.length) + "/" + String(DADOS.colecao || "").slice(-2)]), new Set([VIT.cliente]), escolher);
};

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
// o PDF da vitrine (19/10, ele testou duas vezes: "ainda não funcionou baixar o PDF"): imprimir a página inteira dependia de um emaranhado de
// regras @media print e saía em branco; agora abre uma JANELA PRÓPRIA só com a vitrine (A4 deitado, 6 cartões por linha, título por seção,
// placar por tipo), espera as fotos e manda imprimir — Chrome: "Salvar como PDF"
async function imprimirVitrine(){
  if (!VIT.cliente || !DADOS) return;
  const atual = VIT.vista === "atual" && VIT.atual, gtm = ehGtm(), mes = gtmMes();
  const f = (!atual && !gtm) ? filtroDaTela() : null;
  const lista = atual ? VIT.atual.itens.slice() : (f ? cartoesFiltrados() : escolhidas());
  if (!lista.length) { alert(f ? "Com esse filtro não sobra nenhuma cor para o PDF." : "A vitrine está vazia: nada para imprimir."); return; }
  if (f && !(await confirmar("PDF com o filtro da tela", `Deseja realmente imprimir apenas ${f.texto} — ${lista.length} cor(es) de ${escolhidas().length}?`))) return;
  const col = atual ? VIT.atual.colecao : DADOS.colecao, M = marcas(col);
  lista.sort((a, b) => (secOrd(secaoDe(a)) - secOrd(secaoDe(b))) || ((b.p == null ? -1 : +b.p) - (a.p == null ? -1 : +a.p)) || String(a.n).localeCompare(String(b.n)) || String(a.c).localeCompare(String(b.c)));
  const abs = src => { try { return new URL(src, location.href).href; } catch (e) { return src; } };
  const hoje = new Date().toLocaleDateString("pt-BR"), T = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#000";
  const placar = TIPOS.filter(([v]) => v && lista.some(it => it.t === v)).map(([v, r]) => { const its = lista.filter(it => it.t === v), soma = its.reduce((s, it) => s + (+it.p || 0), 0);
    const pares = gtm ? its.reduce((s, it) => s + (VIT.pares.get(chaveCor(it)) || 0), 0) : null;
    const pmT = {}; if (!gtm) for (const it of its) { const m = VIT.meses.get(chaveCor(it)); if (m) for (const kk of MESES_V) if (m[kk]) pmT[kk] = (pmT[kk] || 0) + m[kk]; }
    return `<div class="pl"><em>${esc(r.toUpperCase())}</em><span><b>${its.length}</b> cor(es)</span><span><b>${new Set(its.map(it => it.m + "|" + it.r)).size}</b> modelo(s)</span>${gtm || atual ? `<span><b>${esc(dinheiro(soma))}</b> em PDV</span>` : ""}${gtm ? `<span><b>${pares.toLocaleString("pt-BR")}</b> pares ${esc(mes)}</span>` : ""}${!gtm && !atual ? MESES_V.filter(kk => pmT[kk]).map(kk => `<span><b>${pmT[kk].toLocaleString("pt-BR")}</b> ${kk}</span>`).join("") + (Object.keys(pmT).length ? `<span><b>${Object.values(pmT).reduce((a, b) => a + b, 0).toLocaleString("pt-BR")}</b> pares</span>` : "") : ""}</div>`; }).join("");
  let html = "", sec = null;
  for (const it of lista) {
    const s = secaoDe(it);
    if (s !== sec) { sec = s; const its = lista.filter(x => secaoDe(x) === s); html += `<h2>${esc(s)} <small>${new Set(its.map(x => x.m + "|" + x.r)).size} modelo(s) · ${its.length} cor(es)</small></h2>`; }
    const src = srcFoto(it), k = chaveCor(it), retirada = atual && M.get(k) === "retirar", g = gtm ? gtmDe(it) : null, gr = VIT.grades.get(k); let p = VIT.pares.get(k);
    const pm0 = VIT.meses.get(k), pm = (pm0 && f && f.mes) ? Object.fromEntries(f.mes.filter(m => m in pm0).map(m => [m, pm0[m] || 0])) : pm0, sg = VIT.sug.get(k), inicio = it.if || (sg && sg.inicio) || "";
    if (pm && f && f.mes) p = Object.values(pm).reduce((x, y) => x + y, 0);
    if (!gtm && !atual) {   // vitrine de CLIENTE = apresentação ao cliente (NÚCLEO, 19/10): só foto, modelo, cor, data de início e pares por mês — nada interno
      html += `<div class="c"><div class="f">${src ? `<img src="${esc(abs(src))}" alt="">` : `<span class="sem">sem foto</span>`}</div>
        <div class="n">${esc(it.n)}</div><div class="r">${esc(it.r)} · ${esc(it.c)}</div><div class="p">${inicio ? `<i>início ${esc(inicio)}</i>` : (ehLanc(it) ? `<i>lanç. · sem data</i>` : "")}</div>
        ${pm ? `<div class="g">${p ? `<b>${p.toLocaleString("pt-BR")}</b> pares · ` : ""}${MESES_V.filter(m => m in pm).map(m => pm[m] ? `${m} ${pm[m]}` : m).join(" · ")}${!p ? " · pares a definir" : ""}</div>` : `<div class="m">meses a definir</div>`}</div>`;
      continue;
    }
    html += `<div class="c${retirada ? " ret" : ""}"><div class="f">${src ? `<img src="${esc(abs(src))}" alt="">` : `<span class="sem">sem foto</span>`}</div>
      <div class="n">${esc(it.n)}</div><div class="r">${esc(it.r)} · ${esc(it.c)}</div><div class="p">${esc(dinheiro(it.p))}${ehLanc(it) ? ` <i>lanç.</i>` : ""}${it.if ? ` <i>${esc(it.if)}</i>` : ""}</div>
      ${gr ? `<div class="g">${esc(ROTULO_GRADE[gr] || gr)}</div>` : ""}${g && p != null ? `<div class="g"><b>${p.toLocaleString("pt-BR")}</b> pares${g.vm[mes] ? ` · ${Math.round(p * 100 / g.vm[mes])}% de ${g.vm[mes].toLocaleString("pt-BR")}` : ""}</div>` : ""}
      <div class="m">${familiaDe(it) ? esc(titulo(familiaDe(it))) : ""}${it.ge ? " · " + esc(it.ge) : ""}${retirada ? " · RETIRAR" : ""}</div></div>`;
  }
  const doc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Vitrine ${esc(nomeCli(VIT.cliente))} ${esc(col)}</title>
<style>@page{size:A4 landscape;margin:0}html,body{margin:0;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{padding:8mm}h1{font-size:15pt;font-weight:900;margin:0 0 2px}.sub{font-size:8pt;color:${T("--cinza-escuro")};margin:0 0 6px}
.placar{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0 0 8px}.pl{display:flex;gap:6px;align-items:center;font-size:8pt}.pl em{font-style:normal;font-weight:900;border-left:3px solid ${T("--amarelo")};padding-left:5px;margin-right:4px}.pl span{background:${T("--off-white")};padding:3px 8px;border-radius:6px}.pl b{font-size:10pt}
.g6{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px}h2{grid-column:1/-1;font-size:8.5pt;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin:6px 0 0;padding-top:5px;border-top:2px solid ${T("--azul")};break-after:avoid}h2:first-child{border-top:0;margin-top:0;padding-top:0}h2 small{font-weight:600;color:${T("--cinza-escuro")};text-transform:none;letter-spacing:0}
.c{border:1px solid ${T("--cinza-claro")};border-radius:6px;padding:4px;break-inside:avoid;min-width:0}.f{aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;background:#fff;overflow:hidden;border-radius:5px}.f img{width:100%;height:100%;object-fit:contain}.sem{font-size:6pt;color:${T("--cinza-escuro")}}
.n{font-weight:800;font-size:7.5pt;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.r{font-size:6.5pt;color:${T("--cinza-escuro")};font-family:Consolas,monospace}.p{font-size:8.5pt;font-weight:800}.p i{font-style:normal;font-size:5.5pt;background:#000;color:#fff;padding:1px 4px;border-radius:3px;vertical-align:middle}
.g{font-size:6.5pt;font-weight:800;color:${T("--azul")}}.m{font-size:6pt;color:${T("--cinza-escuro")}}.c.ret .f img{opacity:.35}.c.ret .n,.c.ret .r{text-decoration:line-through}.c.ret .m{color:${T("--vermelho-ua")};font-weight:800}</style></head>
<body><h1>Vitrine ${esc(nomeCli(VIT.cliente))} · ${esc(col)}${atual ? " (atual)" : ""}</h1><div class="sub">${lista.length} cor(es) · ${new Set(lista.map(it => it.m + "|" + it.r)).size} modelo(s) · ${esc(hoje)} · Gestor</div>
<div class="placar">${placar}</div><div class="g6">${html}</div>
<script>(function(){var imgs=[].slice.call(document.images),n=imgs.length,done=false;function go(){if(done)return;done=true;setTimeout(function(){window.focus();window.print();},150);}
if(!n){go();return;}imgs.forEach(function(i){if(i.complete){if(--n<=0)go();}else{i.onload=i.onerror=function(){if(--n<=0)go();};}});setTimeout(go,6_000);})();<\/script></body></html>`;
  const w = JANELA_PDF || window.open("", "_blank"); JANELA_PDF = null;
  if (!w) { alert("O navegador bloqueou a janela do PDF. Libere pop-ups para o Gestor e tente de novo."); return; }
  w.document.open(); w.document.write(doc); w.document.close();
}
let JANELA_PDF = null;   // aberta no clique (antes da pergunta), senão o navegador bloqueia o pop-up
const contaEscolhidas = () => [...marcas(DADOS.colecao).values()].filter(v => v === "escolhida").length;
const contaRetiradas = () => VIT.atual ? [...marcas(VIT.atual.colecao).values()].filter(v => v === "retirar").length : 0;

function desenharVitrine(){
  const el = ELV;
  if (!el.querySelector(".cat")) {
    el.innerHTML = `<div class="cat colecao vitrine">
      <div class="card filtros">
        <label>cliente</label><div class="chips" id="vit-cliente"></div>
        <label>coleção</label><div class="chips" id="vit-colecao"></div>
        <div class="vit-topo"><div class="vit-conta" id="vit-conta"></div></div>
        <div class="saidas"><span class="fl">gerar</span><button type="button" class="sec sai" data-t="giro">alimentar análise de giro</button><button type="button" class="sec sai" data-t="imagem">pedido com imagem</button><button type="button" class="sec sai" data-t="ebm">Excel pedido EBM</button><button type="button" id="vit-pdf" class="sec sai">exportar PDF</button><button type="button" class="sec sai todos" data-t="giro,imagem,ebm" title="os três arquivos e o PDF">todos</button><div class="mu" id="vit-saidas"></div></div>
        <div class="mu" id="vit-nota"></div>
        <div class="msg erro oculto" id="vit-erro"></div>
      </div>
      <div class="pagina" id="vit-pagina"></div>
      <div class="luz oculto" id="vit-luz"></div>
    </div>`;
    el.querySelector("#vit-pdf").onclick = () => { if (!ehGtm() && VIT.vista !== "atual" && filtroDaTela()) { JANELA_PDF = window.open("", "_blank"); if (JANELA_PDF) JANELA_PDF.document.write("<p style=\"font-family:Arial;padding:20px\">Confirme na outra janela…</p>"); } imprimirVitrine().then(() => { if (JANELA_PDF) { JANELA_PDF.close(); JANELA_PDF = null; } }); };
    // "todos" = os três arquivos + o PDF (ele, 19/10 15:3x: "bota exportar PDF junto, e todos — tudo pertinho, senão fica dessincronizado")
    for (const b of el.querySelectorAll(".saidas .sai[data-t]")) b.onclick = async () => { await pedirSaida(b.dataset.t.split(",")); if (b.classList.contains("todos")) el.querySelector("#vit-pdf").onclick(); };
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
  mostrarSaidas(el);
}
// as SAÍDAS da vitrine (19/10, ordem dele): a página não escreve no OneDrive — o botão anota o pedido no banco (vitrine_saida) e o TI,
// na máquina dele, gera o arquivo e devolve o caminho; a lista abaixo dos botões mostra o que está na fila e o que ficou pronto
const ROTULO_SAIDA = { giro: "análise de giro", imagem: "pedido com imagem", ebm: "Excel pedido EBM" };
// o FILTRO da tela (ele, 19/10 16:5x: "o Excel e o PDF do cliente saem de acordo com o que estou filtrando — e você pergunta antes:
// deseja subir apenas tênis Olympikus de janeiro?"). Vazio = a vitrine inteira. O GTM não pergunta (é uma vez por semestre).
const filtroDaTela = () => { if (ehGtm()) return null; const f = {}; if (VF_MES.v.size) f.mes = MESES_V.filter(m => VF_MES.v.has(m)); if (VF.marca.size) f.marca = [...VF.marca]; if (VF.tipo.size) f.tipo = [...VF.tipo]; if (VF.gen.size) f.gen = [...VF.gen]; if (VF.bloco.size) f.familia = [...VF.bloco];
  const partes = []; if (f.tipo) partes.push(f.tipo.map(t => (NOME_TIPO[t] || t).toLowerCase()).join(" e ")); if (f.gen) partes.push(f.gen.map(g => g.toLowerCase()).join(" e ")); if (f.marca) partes.push(f.marca.map(m => m === "OLY" ? "Olympikus" : "Under Armour").join(" e ")); if (f.familia) partes.push(f.familia.map(titulo).join(" e ")); if (f.mes) partes.push("de " + f.mes.join(" e "));
  f.texto = partes.length ? partes.join(" · ") : ""; return Object.keys(f).length > 1 || f.texto ? f : null; };
const cartoesFiltrados = () => { const f = filtroDaTela(); return escolhidas().filter(it => !f || ((!f.marca || f.marca.includes(it.m)) && (!f.tipo || f.tipo.includes(it.t)) && (!f.gen || f.gen.includes(it.ge || "")) && (!f.familia || f.familia.includes(familiaDe(it))) && (!f.mes || entradasDe(chaveCor(it)).some(e => f.mes.some(m => m in (e.pm || {})))))); };
function confirmar(titulo, texto){
  return new Promise(resolve => {
    const luz = document.createElement("div"); luz.className = "luz grade-luz";
    luz.innerHTML = `<div class="quadro grade-quadro"><div class="gq-nome">${esc(titulo)}</div><div class="gq-perg">${esc(texto)}</div><div class="gq-acoes"><button type="button" class="gq-sobe">sim, só isso</button><button type="button" class="sec gq-deixa">não, deixa</button></div></div>`;
    const fecha = v => { luz.remove(); document.removeEventListener("keydown", tecla); resolve(v); };
    const tecla = ev => { if (ev.key === "Escape") fecha(false); if (ev.key === "Enter") fecha(true); };
    document.addEventListener("keydown", tecla); luz.onclick = ev => { if (ev.target === luz) fecha(false); };
    luz.querySelector(".gq-sobe").onclick = () => fecha(true); luz.querySelector(".gq-deixa").onclick = () => fecha(false);
    document.body.appendChild(luz); luz.querySelector(".gq-sobe").focus();
  });
}
async function pedirSaida(tipos){
  if (!VIT.cliente || !VIT.esc || !DADOS) return;
  const col = VIT.vista === "atual" && VIT.atual ? VIT.atual.colecao : DADOS.colecao;
  if (!escolhidas().length && VIT.vista !== "atual") { alert("A vitrine está vazia: ponha as cores antes de gerar."); return; }
  const f = filtroDaTela();
  if (f) { const n = cartoesFiltrados().length; if (!n) { alert("Com esse filtro não sobra nenhuma cor. Mude o filtro ou volte para 'total'."); return; }
    if (!(await confirmar("Gerar com o filtro da tela", `Deseja realmente subir apenas ${f.texto} — ${n} cor(es) de ${escolhidas().length}? O resto da vitrine fica de fora deste arquivo.`))) return; }
  const r = await SB.from("vitrine_saida").insert(tipos.map(t => ({ escritorio_id: VIT.esc, cliente: VIT.cliente, colecao: col, tipo: t, filtro: f })));
  if (r.error) { VIT.erro = "O banco recusou o pedido: " + r.error.message; } else VIT.erro = "";
  const er = ELV.querySelector("#vit-erro"); if (er) { er.textContent = VIT.erro; er.classList.toggle("oculto", !VIT.erro); }
  mostrarSaidas(ELV);
}
async function mostrarSaidas(el){
  const o = el.querySelector("#vit-saidas"); if (!o || !VIT.cliente) { if (o) o.innerHTML = ""; return; }
  const r = await SB.from("vitrine_saida").select("id,tipo,pedido_em,atendido_em,arquivo,erro,nota").eq("escritorio_id", VIT.esc).eq("cliente", VIT.cliente).order("pedido_em", { ascending: false }).limit(6);
  if (r.error || !r.data) { o.innerHTML = ""; return; }
  const hora = s => s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  // enquanto houver pedido na fila, a lista se relê sozinha a cada 20 s (ele, 19/10 15:0x: "só apareceu uma informação" — o pronto não chegava sem F5)
  // e a linha SOME depois (ele, 15:5x: "aparece e depois some, senão ocupa espaço"): pronto fica 10 min na tela, erro 30 min, na fila até sair
  // e um × em cada linha para ele tirar na hora (ele, 16:0x: "não deixar só por tempo"): fica guardado no aparelho
  const ocultas = new Set((() => { try { return JSON.parse(localStorage.getItem("gestor.saidas.ocultas") || "[]"); } catch (e) { return []; } })());
  const agora = Date.now(), vivo = x => !ocultas.has(x.id) && (!x.atendido_em || (agora - new Date(x.atendido_em).getTime()) < (x.erro ? 30 : 10) * 60_000);
  const lista = r.data.filter(vivo);
  clearTimeout(mostrarSaidas._t); if (lista.length) mostrarSaidas._t = setTimeout(() => mostrarSaidas(el), lista.some(x => !x.atendido_em) ? 20_000 : 60_000);
  o.innerHTML = lista.map(x => `<div class="sai-item ${x.erro ? "erro" : (x.atendido_em ? "pronto" : "fila")}" data-id="${x.id}"><button type="button" class="sai-x" title="tirar esta linha">×</button><b>${esc(ROTULO_SAIDA[x.tipo] || x.tipo)}</b> · pedido ${esc(hora(x.pedido_em))} · ${x.erro ? "não saiu: " + esc(x.erro) : (x.atendido_em ? `pronto ${esc(hora(x.atendido_em))} → <code>${esc(x.arquivo || "")}</code>${x.nota ? " · " + esc(x.nota) : ""}` : "na fila — sai em até 2 min, na pasta do cliente (esta lista se atualiza sozinha)")}</div>`).join("");
  for (const b of o.querySelectorAll(".sai-x")) b.onclick = () => { const id = +b.parentElement.dataset.id; ocultas.add(id); try { localStorage.setItem("gestor.saidas.ocultas", JSON.stringify([...ocultas].slice(-200))); } catch (e) {} b.parentElement.remove(); };
}

// ---------- o MONTADOR (15/10, orientação dele, ao vivo): "parta a tela no meio: do lado esquerdo os produtos da 1S27 com filtros
// (marca, tipo, família, gênero) e um campo para digitar o nome; clicou no produto, abre do lado como fica a vitrine do cliente,
// de cima para baixo em ordem decrescente de valor — em cima os mais caros — com filtro de feminino / masculino / infantil / família,
// e com o PDV. Mais bonito, mais visual, gamificar." Regras da casa que valem aqui: animação é evento (sobe, brilha, PARA);
// estado é repouso; paleta só a oficial.
const MF = { busca: "", marca: "OLY", tipo: "", bloco: new Set(), gen: new Set(), esp: false, passo: "" };   // filtros da esquerda (a coleção); esp = só os que chegam ao 48; passo = o roteiro
const VF = { gen: new Set(), bloco: new Set(), tipo: new Set(), marca: new Set() };
// custo para a CMS (ele, 19/10 16:0x): "markup 2,0, padrão para o prazo médio de 63 dias" → custo = PDV ÷ 2; no GTM o placar mostra custo × pares, não PDV
const MARKUP_CMS = 2;
const condDe = it => ehGtm() ? { markup: MARKUP_CMS, prazo: 63 } : (VIT.cond.get(it.m + "|" + it.t) || VIT.cond.get(it.m + "|TENIS") || null);
const VF_MES = { v: new Set() };   // meses marcados na linha "mês / pares" do placar (ele, 17:1x): vazio = tudo; vários ao mesmo tempo
const mesCasa = kc => !VF_MES.v.size || entradasDe(kc).some(e => [...VF_MES.v].some(m => m in (e.pm || {})));                      // filtros da direita (a vitrine)
let PAINEL = "esq";                                                                    // no celular: qual metade está na tela
const GEN_ORDEM = ["Feminino", "Masculino", "Unissex", "Infantil"];
const genOrd = g => { const i = GEN_ORDEM.indexOf(g); return i < 0 ? 9 : i; };
const escolhidas = () => VIT.cliente ? DADOS.itens.filter(it => marcas(DADOS.colecao).get(chaveCor(it)) === "escolhida") : [];

// zoom por bloco e a barra de arrastar entre coleção e vitrine (ele, 19/10 15:1x: "botãozinho meio opaco de zoom em cada bloco — maior nos
// produtos, menor na vitrine — e aquela barrinha que eu arrasto para aumentar um lado e diminuir o outro, como no Excel"). Fica guardado no aparelho.
const PREF = { ler: (k, d) => { try { const v = localStorage.getItem("gestor.vitrine." + k); return v == null ? d : +v; } catch (e) { return d; } }, gravar: (k, v) => { try { localStorage.setItem("gestor.vitrine." + k, String(v)); } catch (e) {} } };
function ligarZoomEDivisor(pg){
  const mont = pg.querySelector(".montador");
  const aplicar = () => {
    // na VITRINE o zoom muda o NÚMERO DE COLUNAS (ele, 19/10 15:4x: "só os textos aumentavam, a imagem não; quero a imagem menor para caber na
    // tela") — zoom menor = mais cartões por linha = imagem menor. Padrão 80% = 5 por linha. Na coleção (miniaturas de tamanho fixo) o zoom é zoom.
    const ze = PREF.ler("zoom.esq", 1), zd = PREF.ler("zoom.dir", 0.8), fr = PREF.ler("divisor", 0.465);
    mont.style.setProperty("--z-esq", ze); mont.style.setProperty("--vcols", Math.min(8, Math.max(2, Math.round(4 / zd))));
    mont.style.setProperty("--esq", fr + "fr"); mont.style.setProperty("--dir", (1 - fr) + "fr");
    for (const z of mont.querySelectorAll(".mont-zoom")) z.querySelector("b").textContent = z.dataset.lado === "esq" ? Math.round(ze * 100) + "%" : mont.style.getPropertyValue("--vcols") + " por linha";
  };
  for (const z of mont.querySelectorAll(".mont-zoom")) for (const b of z.querySelectorAll("button")) b.onclick = () => {
    const k = "zoom." + z.dataset.lado, v = Math.min(2, Math.max(0.5, Math.round((PREF.ler(k, z.dataset.lado === "dir" ? 0.8 : 1) + 0.1 * +b.dataset.d) * 10) / 10)); PREF.gravar(k, v); aplicar(); };
  const div = mont.querySelector(".mont-divisor");
  div.onpointerdown = ev => {
    ev.preventDefault(); div.setPointerCapture(ev.pointerId); div.classList.add("pegando");
    const r = mont.getBoundingClientRect(), larg = r.width - div.offsetWidth - 24;   // menos a barra e os dois gaps
    const move = e => { const fr = Math.min(0.8, Math.max(0.2, (e.clientX - r.left - 12) / larg)); PREF.gravar("divisor", Math.round(fr * 1000) / 1000); aplicar(); };
    const solta = () => { div.classList.remove("pegando"); div.removeEventListener("pointermove", move); div.removeEventListener("pointerup", solta); div.removeEventListener("pointercancel", solta); };
    div.addEventListener("pointermove", move); div.addEventListener("pointerup", solta); div.addEventListener("pointercancel", solta);
  };
  div.ondblclick = () => { PREF.gravar("divisor", 0.465); aplicar(); };
  aplicar();
}
function desenharMontador(pg){
  if (!pg.querySelector(".montador")) {
    pg.innerHTML = `<div class="montador">
      <div class="mont-troca"><button type="button" data-p="esq" class="ativa">Coleção</button><button type="button" data-p="dir">Vitrine <b id="mont-n"></b></button></div>
      <div class="mont-esq"><div class="mont-zoom" data-lado="esq" title="zoom da coleção"><button type="button" data-d="-1">−</button><b></b><button type="button" data-d="1">+</button></div>
        <div class="mont-filtros">
          <input type="search" id="mf-busca" placeholder="digite o nome do produto, a referência ou a cor" autocomplete="off" value="${esc(MF.busca)}">
          <div class="frow"><span class="fl">roteiro</span><div class="chips roteiro" id="mf-roteiro"></div></div>
          <div class="frow"><span class="fl">marca</span><div class="chips" id="mf-marca"></div></div>
          <div class="frow"><span class="fl">tipo</span><div class="chips" id="mf-tipo"></div></div>
          <div class="frow"><span class="fl">família</span><div class="chips" id="mf-bloco"></div></div>
          <div class="frow"><span class="fl">gênero</span><div class="chips" id="mf-gen"></div></div>
          <div class="mu" id="mf-conta"></div>
        </div>
        <div class="mont-lista" id="mf-lista"></div>
      </div>
      <div class="mont-divisor" title="arraste para mudar a largura dos dois lados"></div>
      <div class="mont-dir"><div class="mont-zoom" data-lado="dir" title="zoom da vitrine"><button type="button" data-d="-1">−</button><b></b><button type="button" data-d="1">+</button></div>
        <div class="mont-cab">
          <div class="mont-tit" id="vf-tit"></div><div class="vf-confere"><button type="button" class="sec" id="vf-reler" title="relê o que está gravado no banco">↻ conferir no banco</button><span class="mu" id="vf-lido"></span></div>
          <div class="mont-placar" id="vf-placar"></div>
          <div class="frow"><span class="fl">marca</span><div class="chips" id="vf-marca"></div></div>
          <div class="frow"><span class="fl">tipo</span><div class="chips" id="vf-tipo"></div></div>
          <div class="frow"><span class="fl">gênero</span><div class="chips" id="vf-gen"></div></div>
          <div class="frow"><span class="fl">família</span><div class="chips" id="vf-bloco"></div></div>
        </div>
        <div class="mont-vitrine" id="vf-lista"></div>
      </div>
    </div>`;
    pg.querySelector("#mf-busca").oninput = (ev) => { MF.busca = ev.target.value; clearTimeout(desenharMontador._t); desenharMontador._t = setTimeout(() => desenharEsquerda(pg), 120); };
    ligarZoomEDivisor(pg);
    // "um botão para eu conferir que você está salvando o que eu oriento" (ele, 19/10 15:5x): relê o banco e diz o que achou
    pg.querySelector("#vf-reler").onclick = async () => { const o = pg.querySelector("#vf-lido"); o.textContent = "lendo…"; await relerVitrine(); const its = escolhidas(), p = its.reduce((a, it) => a + (VIT.pares.get(chaveCor(it)) || 0), 0); const o2 = ELV.querySelector("#vf-lido"); if (o2) o2.textContent = `lido do banco às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}: ${its.length} cor(es) · ${p.toLocaleString("pt-BR")} pares`; };
    for (const b of pg.querySelectorAll(".mont-troca button")) b.onclick = () => { PAINEL = b.dataset.p; pg.querySelector(".montador").dataset.painel = PAINEL; for (const x of pg.querySelectorAll(".mont-troca button")) x.classList.toggle("ativa", x === b); };
  }
  pg.querySelector(".montador").dataset.painel = PAINEL;
  desenharEsquerda(pg);
  desenharDireita(pg);
}

function desenharEsquerda(pg){
  const gtm = ehGtm(), mes = gtmMes();
  if (!gtm && MF.tipo === "estrela") MF.tipo = "";
  // o roteiro: cada passo liga os filtros do passo e mostra quantas cores já estão na vitrine naquela seção
  const esc_ = escolhidas();
  chips(pg, "mf-roteiro", [["", "livre"], ...ROTEIRO.map(([v, r, sec, mk]) => [v, r, esc_.filter(it => it.m === mk && secaoDe(it) === sec).length])], new Set(MF.passo ? [MF.passo] : []), v => {
    MF.passo = v; MF.esp = false; MF.gen.clear(); MF.bloco.clear(); if (!gtm) MF.tipo = "";
    const rot = ROTEIRO.find(x => x[0] === v); if (rot) MF.marca = rot[3];   // o passo liga a marca dele
    const passo = v.replace("ua-", "");
    if (passo === "fem") { if (!gtm) MF.tipo = "TENIS"; MF.gen.add("Feminino"); }
    else if (passo === "masc") { if (!gtm) MF.tipo = "TENIS"; MF.gen.add("Masculino"); }
    else if (passo === "esp") { if (!gtm) MF.tipo = "TENIS"; MF.esp = true; }
    else if (passo === "inf") { if (!gtm) MF.tipo = "TENIS"; MF.gen.add("Infantil"); }
    else if (passo === "chin") { MF.tipo = "CHINELOS"; }
    desenharEsquerda(pg); });
  // na DISTRIBUIÇÃO não há roteiro nem gênero (ele, 19/10 11:2x: "tira tudo, se é masculino ou feminino"): a grade se pergunta a cada clique
  for (const id of ["mf-roteiro", "mf-gen"]) { const f = pg.querySelector("#" + id).closest(".frow"); if (f) f.classList.toggle("oculto", gtm); }
  if (gtm) { MF.passo = ""; MF.gen.clear(); }
  // GTM (ele, 19/10 10:5x): "quando eu clicar janeiro, extraia só os de janeiro… e deixa todas as opções de cores" — no mês, só os modelos
  // com volume naquele mês (volume_modelo_mes > 0); dentro deles, todas as cores, com ou sem estrela, de qualquer classe
  const daMarca = DADOS.itens.filter(it => it.m === MF.marca && (!gtm || (gtmDe(it) && (gtmDe(it).vm[mes] || 0) > 0)));
  chips(pg, "mf-marca", [["OLY", "Olympikus"], ["UA", "Under Armour"]], new Set([MF.marca]), v => { MF.marca = v; MF.tipo = ""; MF.bloco.clear(); MF.gen.clear(); const rot = ROTEIRO.find(x => x[0] === MF.passo); if (rot && rot[3] !== v) { MF.passo = ""; MF.esp = false; } desenharEsquerda(pg); });
  const ct = new Map(); for (const it of daMarca) ct.set(it.t, (ct.get(it.t) || 0) + 1);
  if (gtm) chips(pg, "mf-tipo", [["", "todas", daMarca.length], ["estrela", "★ estrela Vulcabras", daMarca.filter(it => gtmDe(it).e).length]], new Set(MF.tipo ? [MF.tipo] : []), v => { MF.tipo = v; desenharEsquerda(pg); });
  else chips(pg, "mf-tipo", TIPOS.filter(([v]) => !v || ct.has(v)).map(([v, r]) => [v, r, v ? ct.get(v) : daMarca.length]), new Set(MF.tipo ? [MF.tipo] : []), v => { MF.tipo = v; MF.bloco.clear(); desenharEsquerda(pg); });
  const base = gtm ? (MF.tipo === "estrela" ? daMarca.filter(it => gtmDe(it).e) : daMarca) : (MF.tipo ? daMarca.filter(it => it.t === MF.tipo) : daMarca);
  const cb = new Map(); for (const it of ordenar(base)) { const f = familiaDe(it); if (f) cb.set(f, (cb.get(f) || 0) + 1); }
  chips(pg, "mf-bloco", [["", "todas as famílias"], ...[...cb.entries()].map(([v, n]) => [v, titulo(v), n])], MF.bloco, v => { if (v === "") MF.bloco.clear(); else if (MF.bloco.has(v)) MF.bloco.delete(v); else MF.bloco.add(v); desenharEsquerda(pg); });
  const cgn = new Map(); for (const it of base) if (it.ge) cgn.set(it.ge, (cgn.get(it.ge) || 0) + 1);
  chips(pg, "mf-gen", [["", "todos"], ...[...cgn.entries()].sort((a, b) => genOrd(a[0]) - genOrd(b[0])).map(([v, n]) => [v, v, n])], MF.gen, v => { if (v === "") MF.gen.clear(); else if (MF.gen.has(v)) MF.gen.delete(v); else MF.gen.add(v); desenharEsquerda(pg); });
  const t = semAcento(MF.busca).split(/\s+/).filter(Boolean);
  // 19/10, ele: "os unissex você traz dentro também — no feminino e no masculino"; o filtro de gênero Feminino/Masculino inclui o unissex
  const casaGen = it => !MF.gen.size || MF.gen.has(it.ge || "") || (ehUnissex(it) && (MF.gen.has("Feminino") || MF.gen.has("Masculino")));
  const lista = ordenar(base.filter(it => (!MF.bloco.size || MF.bloco.has(familiaDe(it))) && casaGen(it) && (!MF.esp || (grandeEspecial(it) && !ehInf(it)))
    && (!t.length || t.every(x => semAcento([it.n, it.r, it.c, it.cd, familiaDe(it)].join(" ")).includes(x)))));
  // uma linha por modelo (família oficial → ordem do pacote), as cores como miniaturas clicáveis; o mesmo modelo pode cair em duas famílias conforme a cor
  const M = marcas(DADOS.colecao); let html = "", bloco = null, modelos = 0;
  const porModelo = new Map();
  // na DISTRIBUIÇÃO (ele, 19/10 11:2x: "quando vier a ESFERA, vem tudo bloco junto") o modelo é UM bloco só, todas as cores, sem família nem gênero
  for (const it of lista) { const k = gtm ? it.m + "|" + it.r : chaveModelo(it) + "|" + familiaDe(it); if (!porModelo.has(k)) porModelo.set(k, []); porModelo.get(k).push(it); }
  for (const cores of porModelo.values()) {
    const m = cores[0];
    const sec = gtm ? "" : familiaDe(m);
    if (sec !== bloco || bloco === null) { bloco = sec; html += `<div class="mont-sec">${esc(NOME_TIPO[m.t] || m.t)}${bloco ? " · " + esc(bloco) : ""}</div>`; }
    modelos++;
    html += `<div class="mcard" data-kc="${esc(chaveCor(m))}"><div class="mcab"><div class="mnome">${esc(m.n)}</div><div class="mref"><button type="button" class="ref" data-ref="${esc(m.r)}">${esc(m.r)}</button> <span class="mpdv">${esc(dinheiro(m.p))}</span>${m.ge ? `<span class="mu"> · ${esc(m.ge)}${m.nu ? " " + esc(m.nu) : ""}</span>` : ""}${grandeEspecial(m) && !ehInf(m) ? `<span class="selo ate48" title="numeração até o ${numMax(m)}: cabe grade especial">até ${numMax(m)}</span>` : ""}${m.if ? `<span class="selo inicio">${esc(m.if)}</span>` : ""}</div>${gtm ? tetoDoModelo(m) : ""}</div>
      <div class="mthumbs">${cores.map(it => { const k = chaveCor(it), fora = foraDaVitrine(it), sel = M.get(k) === "escolhida", g = gtm ? gtmDe(it) : null; const mix = g ? (g.mf != null ? g.mf : g.mx) : 0;
        return `${gtm ? `<div class="mcol">` : ""}<div class="mthumb${sel ? " sel" : ""}${fora ? " fora" : ""}" data-kc="${esc(k)}" title="${esc(fora || (g && g.mot ? g.mot : (sel ? "tirar da vitrine" : "pôr na vitrine")))}">${fotoMini(it)}${g && g.e ? `<i class="estrela-v" title="estrela da Vulcabras">★</i>` : ""}<div class="mcod">${esc(it.c)}</div>${g ? `<div class="mgtm${g.e ? " estrela" : ""}">${g.e ? "★ " : ""}${mix ? Math.round(mix) + "%" : "—"} · <b>${g.ps[mes] || 0}</b></div>` : ""}${sel ? `<i class="ok">✓</i>` : ""}</div>${gtm ? distDaCor(it) + `</div>` : ""}`; }).join("")}</div>
    </div>`;
  }
  const L = pg.querySelector("#mf-lista"); L.innerHTML = html || `<div class="card mu">Nenhum produto com esses filtros.</div>`;
  // no GTM o contador diz a MARCA (ele, 19/10 13:1x: "14 modelos e 58 cores à esquerda, 17 e 51 na vitrine — não bate": a esquerda é só a marca do chip; a vitrine soma as duas)
  const outra = gtm ? (() => { const om = MF.marca === "OLY" ? "UA" : "OLY", oi = DADOS.itens.filter(it => it.m === om && gtmDe(it) && (gtmDe(it).vm[mes] || 0) > 0); return ` · ${om === "OLY" ? "Olympikus" : "Under Armour"}: ${new Set(oi.map(it => it.r)).size} modelo(s) · ${oi.length} cor(es) (toque no chip)`; })() : "";
  pg.querySelector("#mf-conta").textContent = `${gtm ? (MF.marca === "OLY" ? "Olympikus" : "Under Armour") + ": " : ""}${modelos} modelo(s) · ${lista.length} cor(es)${outra} — toque na cor para pôr na vitrine`;
  for (const b of L.querySelectorAll(".ref")) b.onclick = (ev) => { ev.stopPropagation(); copiar(b); };
  for (const th of L.querySelectorAll(".mthumb:not(.fora)")) th.onclick = () => { th.classList.add("pulso"); setTimeout(() => th.classList.remove("pulso"), 500); alternar(th.dataset.kc, "montador"); };
  ligarCaixas(L);
}
// a CAIXA (ele, 19/10 11:4x): "diminuir caixa em caixa, de 12 pares" — o − e o + mexem 12 de cada vez, direto embaixo da cor, no bloco do modelo
const CAIXA = 12;
// grade de 6 (ele, 19/10 13:2x: "na Under Armour vai aparecer; dois campos — grade de 12 em cima, grade de 6 embaixo"): pares = total da cor;
// pares6 = a parte em grades de 6; a linha das 6 aparece na UA ou quando a cor já tem grade de 6
const CAIXA6 = 6;
const temGrade6 = it => it.m === "UA" || (VIT.pares6.get(chaveCor(it)) || 0) > 0;
// o teto DIGITÁVEL (ele, 13:3x: "371 não é múltiplo de nada; diminui para ficar múltiplo de 6"): arredonda para baixo à menor grade da marca
const tetoDigitavel = (m, teto) => { const cx = temGrade6(m) ? CAIXA6 : CAIXA; return Math.floor(teto / cx) * cx; };
const distDaCor = it => { const k = chaveCor(it), sel = marcas(DADOS.colecao).get(k) === "escolhida", p = VIT.pares.get(k) || 0, p6 = VIT.pares6.get(k) || 0, g = gtmDe(it), teto = g ? (g.vm[gtmMes()] || 0) : 0;
  if (!sel) return `<div class="mdist vazia" data-kc="${esc(k)}"></div>`;
  const linha = (cx, n, rot) => `<div class="mrow"><button type="button" class="cx cx-menos" data-kc="${esc(k)}" data-cx="${cx}" title="tira uma grade de ${cx}">−</button><span><b>${n}</b><small>${rot}</small></span><button type="button" class="cx cx-mais" data-kc="${esc(k)}" data-cx="${cx}" title="põe uma grade de ${cx}">+</button></div>`;
  return `<div class="mdist${temGrade6(it) ? " duas" : ""}" data-kc="${esc(k)}">${linha(CAIXA, Math.floor((p - p6) / CAIXA), "gr. 12")}${temGrade6(it) ? linha(CAIXA6, Math.floor(p6 / CAIXA6), "gr. 6") : ""}<div class="mtot"><b>${p.toLocaleString("pt-BR")}</b> pares · ${teto ? Math.round(p * 100 / teto) + "%" : "—"}</div></div>`; };
function ligarCaixas(raiz){
  for (const b of raiz.querySelectorAll(".mdist .cx")) b.onclick = ev => { ev.stopPropagation(); const cx = +b.dataset.cx || CAIXA; mexerCaixa(b.dataset.kc, b.classList.contains("cx-mais") ? cx : -cx, cx); };
}
const GRAVA_PARES = new Map();   // kc → timer: a tela muda na hora; o banco recebe 600 ms depois do último toque
function mexerCaixa(kc, delta, cx){
  if (marcas(DADOS.colecao).get(kc) !== "escolhida") return;
  const p6 = VIT.pares6.get(kc) || 0, p12 = Math.max(0, (VIT.pares.get(kc) || 0) - p6);
  const n12 = cx === CAIXA6 ? p12 : Math.max(0, p12 + delta), n6 = cx === CAIXA6 ? Math.max(0, p6 + delta) : p6;
  VIT.pares.set(kc, n12 + n6); VIT.pares6.set(kc, n6); refrescar();
  clearTimeout(GRAVA_PARES.get(kc)); GRAVA_PARES.set(kc, setTimeout(() => gravarPares(kc), 600));
}
async function gravarPares(kc){
  const it = DADOS.itens.find(x => chaveCor(x) === kc); if (!it || !VIT.cliente || marcas(DADOS.colecao).get(kc) !== "escolhida") return;
  const linha = { escritorio_id: VIT.esc, cliente: VIT.cliente, colecao: DADOS.colecao, marca: it.m, referencia: it.r, cor: it.c }, pares = VIT.pares.get(kc) || 0, pares6 = VIT.pares6.get(kc) || 0, grade = VIT.grades.get(kc) || null;
  const d = await SB.from("vitrine").delete().match(linha); if (d.error) { VIT.erro = "O banco recusou: " + d.error.message; refrescar(); return; }
  const r = await SB.from("vitrine").insert(Object.assign({ estado: "escolhida", estado_anterior: null, grade, pares, pares6: pares6 || null }, linha));
  if (r.error) { marcas(DADOS.colecao).delete(kc); VIT.grades.delete(kc); VIT.pares.delete(kc); VIT.pares6.delete(kc); VIT.erro = "O banco recusou: " + r.error.message; refrescar(); } else VIT.erro = "";
}
// o teto do modelo no mês (o que se digita no GTM) e o que já foi distribuído nas cores — a faixa azul vira amarela quando fecha, vermelha quando passa
function tetoDoModelo(m){
  const gm = gtmDe(m), mes = gtmMes(), teto0 = gm ? (gm.vm[mes] || 0) : 0, teto = tetoDigitavel(m, teto0), dist = paresDoModelo(m);
  if (!gm) return "";
  const cxm = temGrade6(m) ? CAIXA6 : CAIXA, aberto = teto - dist, cx = Math.floor(Math.abs(aberto) / cxm);
  return `<div class="mteto${dist > teto ? " passou" : (dist === teto && teto ? " cheio" : "")}">digitar no GTM em ${esc(mes)}: <b>${teto.toLocaleString("pt-BR")}</b> pares${teto !== teto0 ? ` <small>(previsto ${teto0.toLocaleString("pt-BR")}, arredondado a múltiplo de ${cxm})</small>` : ""}${dist ? ` · distribuídos <b>${dist.toLocaleString("pt-BR")}</b> · ${aberto < 0 ? `<em>passou ${(-aberto).toLocaleString("pt-BR")} (${cx} cx)</em>` : (aberto ? `em aberto <b>${aberto.toLocaleString("pt-BR")}</b> pares · ${cx} cx` : "<b>fechou</b>")}` : ""}</div>`;
}
const fotoMini = it => { const src = srcFoto(it); return src ? `<img loading="lazy" src="${esc(src)}" alt="" data-passo="${it.i ? "jpg" : "url"}" data-url="${esc(it.u || "")}" onerror="Colecao.fotoFalhou(this)">` : `<div class="sem">sem foto</div>`; };

function desenharDireita(pg){
  const todas = escolhidas();
  const ct = new Map(), cgn = new Map(), cb = new Map();
  for (const it of ordenar(todas)) { ct.set(it.t, (ct.get(it.t) || 0) + 1); if (it.ge) cgn.set(it.ge, (cgn.get(it.ge) || 0) + 1); const f = familiaDe(it); if (f) cb.set(f, (cb.get(f) || 0) + 1); }
  // filtro de MARCA na vitrine (ele, 19/10 16:0x: "deixa o filtro de Under Armour e de Olympikus, já me confundi uma vez")
  const cm = new Map(); for (const it of todas) cm.set(it.m, (cm.get(it.m) || 0) + 1);
  if (ehGtm()) VF_MES.v.clear();
  chips(pg, "vf-marca", [["", "as duas"], ...[["OLY", "Olympikus"], ["UA", "Under Armour"]].filter(([v]) => cm.has(v)).map(([v, r]) => [v, r, cm.get(v)])], VF.marca, v => { if (v === "") VF.marca.clear(); else if (VF.marca.has(v)) VF.marca.delete(v); else VF.marca.add(v); desenharDireita(pg); });
  chips(pg, "vf-tipo", [["", "tudo"], ...TIPOS.filter(([v]) => v && ct.has(v)).map(([v, r]) => [v, r, ct.get(v)])], VF.tipo, v => { if (v === "") VF.tipo.clear(); else if (VF.tipo.has(v)) VF.tipo.delete(v); else VF.tipo.add(v); desenharDireita(pg); });
  chips(pg, "vf-gen", [["", "todos"], ...[...cgn.entries()].sort((a, b) => genOrd(a[0]) - genOrd(b[0])).map(([v, n]) => [v, v, n])], VF.gen, v => { if (v === "") VF.gen.clear(); else if (VF.gen.has(v)) VF.gen.delete(v); else VF.gen.add(v); desenharDireita(pg); });
  { const f = pg.querySelector("#vf-gen").closest(".frow"); if (f) f.classList.toggle("oculto", ehGtm()); if (ehGtm()) VF.gen.clear(); }
  chips(pg, "vf-bloco", [["", "todas as famílias"], ...[...cb.entries()].map(([v, n]) => [v, titulo(v), n])], VF.bloco, v => { if (v === "") VF.bloco.clear(); else if (VF.bloco.has(v)) VF.bloco.delete(v); else VF.bloco.add(v); desenharDireita(pg); });
  // 19/10: por SEÇÃO (tênis feminino · masculino · grade especial · infantil · grade unissex; depois chinelos, meias…) e dentro da seção
  // do mais caro ao mais barato — o chinelo nunca se mistura ao tênis
  const gtm = ehGtm(), mes = gtmMes();
  // na DISTRIBUIÇÃO: por tipo, dentro do tipo o modelo junto (todas as cores), a cor com mais pares primeiro
  const lista = todas.filter(it => mesCasa(chaveCor(it)) && (!VF.marca.size || VF.marca.has(it.m)) && (!VF.tipo.size || VF.tipo.has(it.t)) && (!VF.gen.size || VF.gen.has(it.ge || "")) && (!VF.bloco.size || VF.bloco.has(familiaDe(it))))
    .sort((a, b) => (secOrd(secaoDe(a)) - secOrd(secaoDe(b))) || (gtm ? (String(a.n).localeCompare(String(b.n)) || ((VIT.pares.get(chaveCor(b)) || 0) - (VIT.pares.get(chaveCor(a)) || 0))) : 0)
      || ((b.p == null ? -1 : +b.p) - (a.p == null ? -1 : +a.p)) || String(a.n).localeCompare(String(b.n)) || String(a.c).localeCompare(String(b.c)));
  pg.querySelector("#vf-tit").textContent = `Vitrine ${nomeCli(VIT.cliente || "")} · ${DADOS.colecao || ""}`;
  // 19/10 (regra dele, chinelo-separado-do-tenis; PICASSO na conferência da v5.18): UM PLACAR POR TIPO, sem total geral — o chinelo
  // nunca soma com o tênis. O valor em PDV: inteiro no computador, "R$ 3,6 mil" no celular (PICASSO, 15/10: cortava em 390 px)
  const dinheiroCheio = s => s ? "R$ " + Number(s).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
  const dinheiroCurto = s => !s ? "—" : (s >= 1e6 ? "R$ " + (s / 1e6).toFixed(2).replace(".", ",") + " mi" : (s >= 1e3 ? "R$ " + (s / 1e3).toFixed(1).replace(".", ",") + " mil" : "R$ " + Math.round(s)));
  // no GTM o placar é a digitação: pares DISTRIBUÍDOS (o que ele respondeu) contra o TETO (soma do volume do mês dos modelos que já têm cor)
  // o placar segue TODOS os filtros (ele, 16:2x: "quando eu selecionar por mês, só o que ele vai faturar naquele mês; só feminino, só masculino — todos os
  // filtros têm que atualizar"); com mês marcado, os pares e o custo são os daquele mês
  const base = lista, paresDe = it => VF_MES.v.size ? [...VF_MES.v].reduce((s, m) => s + (((VIT.meses.get(chaveCor(it)) || {})[m]) || 0), 0) : (VIT.pares.get(chaveCor(it)) || 0);
  // a linha "mês / pares": os meses de TODAS as cores do tipo que passam nos outros filtros (para o mês não sumir quando é desmarcado)
  const semMes = todas.filter(it => (!VF.marca.size || VF.marca.has(it.m)) && (!VF.tipo.size || VF.tipo.has(it.t)) && (!VF.gen.size || VF.gen.has(it.ge || "")) && (!VF.bloco.size || VF.bloco.has(familiaDe(it))));
  const placar = TIPOS.filter(([v]) => v && ct.has(v)).map(([v, r]) => { const its = base.filter(it => it.t === v); if (!its.length) return "";
    const temCond = gtm || its.some(it => condDe(it));
    const soma = temCond ? its.reduce((s, it) => { const c = condDe(it); return s + (c ? paresDe(it) * ((+it.p || 0) / c.markup) : 0); }, 0) : its.reduce((s, it) => s + (+it.p || 0), 0);
    const c0 = its.map(condDe).find(Boolean), rotCusto = temCond ? (gtm ? "custo · markup 2,0 · 63 d" : `custo · markup ${c0 ? c0.markup.toFixed(2).replace(".", ",") : "?"}${c0 && c0.prazo ? ` · ${c0.prazo} d` : ""}`) : "em PDV";
    const pares = gtm ? its.reduce((s, it) => s + (VIT.pares.get(chaveCor(it)) || 0), 0) : null;
    const teto = gtm ? [...new Map(its.map(it => [it.m + "|" + it.r, it])).values()].reduce((s, it) => s + (((gtmDe(it) || { vm: {} }).vm[mes]) || 0), 0) : null;
    const pm = {}; if (!gtm) for (const it of semMes.filter(x => x.t === v)) { const m = VIT.meses.get(chaveCor(it)); if (m) for (const k of MESES_V) if (k in m) pm[k] = (pm[k] || 0) + (m[k] || 0); }
    const totMes = MESES_V.filter(k => k in pm && (!VF_MES.v.size || VF_MES.v.has(k))).reduce((a, k) => a + pm[k], 0);
    return `<div class="pl-tipo${gtm ? " gtm" : ""}"><em>${esc(r.toUpperCase())}</em><span><b>${its.length}</b><small>cor(es)</small></span><span><b>${new Set(its.map(it => it.m + "|" + it.r)).size}</b><small>modelo(s)</small></span><span><b class="cheio">${esc(dinheiroCheio(soma))}</b><b class="curto">${esc(dinheiroCurto(soma))}</b><small>${esc(rotCusto)}</small></span>${gtm ? `<span class="${pares > teto ? "passou" : ""}"><b>${pares.toLocaleString("pt-BR")}</b><small>de ${teto.toLocaleString("pt-BR")} pares ${esc(mes)}</small></span>` : ""}</div>${!gtm && Object.keys(pm).length ? `<div class="pl-meses"><em>mês / pares</em>${MESES_V.filter(k => k in pm).map(k => `<button type="button" class="pl-mes${VF_MES.v.has(k) ? " ativa" : ""}" data-m="${k}" title="aperta para filtrar; de novo para tirar"><b>${pm[k].toLocaleString("pt-BR")}</b><small>${k}</small></button>`).join("")}<span class="tot"><b>${totMes.toLocaleString("pt-BR")}</b><small>${VF_MES.v.size ? "nos meses marcados" : "total"}</small></span></div>` : ""}`; });
  pg.querySelector("#vf-placar").innerHTML = placar.join("") || `<div class="pl-tipo"><em>—</em><span><b>0</b><small>cor(es)</small></span><span><b>0</b><small>modelo(s)</small></span><span><b>—</b><small>em PDV</small></span></div>`;
  for (const b of pg.querySelectorAll("#vf-placar .pl-mes")) b.onclick = () => { const m = b.dataset.m; if (VF_MES.v.has(m)) VF_MES.v.delete(m); else VF_MES.v.add(m); desenharDireita(pg); };
  const n = pg.querySelector("#mont-n"); if (n) n.textContent = todas.length ? String(todas.length) : "";
  const V = pg.querySelector("#vf-lista");
  // cartão PEQUENO (19/10, ele: "está muito grande, um formato ruim; preciso ver a composição da vitrine") e um título por tipo
  let secAtual = null, html = "";
  // um CARTÃO POR GRADE (ele, 16:2x): cor com grade feminina e masculina aparece duas vezes, cada uma na sua seção, com os seus meses
  const cartoes = gtm ? lista.map(it => ({ it, e: null, i: 0, n: 1 })) : lista.flatMap(it => { const L = entradasDe(chaveCor(it)); return L.length ? L.map((e, i) => ({ it, e, i, n: L.length })) : [{ it, e: null, i: 0, n: 1 }]; })
    .filter(c => !VF_MES.v.size || !c.e || [...VF_MES.v].some(m => m in (c.e.pm || {})))
    .sort((a, b) => (secOrd(secaoDe(a.it, a.e ? a.e.grade : undefined)) - secOrd(secaoDe(b.it, b.e ? b.e.grade : undefined))) || ((b.it.p == null ? -1 : +b.it.p) - (a.it.p == null ? -1 : +a.it.p)) || String(a.it.n).localeCompare(String(b.it.n)) || String(a.it.c).localeCompare(String(b.it.c)) || (a.i - b.i));
  for (const { it, e, i, n } of cartoes) {
    const sec = secaoDe(it, e ? e.grade : undefined);
    if (sec !== secAtual) { secAtual = sec; const its = cartoes.filter(x => secaoDe(x.it, x.e ? x.e.grade : undefined) === sec); html += `<div class="vsec${/grade\?/.test(sec) ? " falta" : ""}">${esc(sec)} <small>${new Set(its.map(x => x.it.m + "|" + x.it.r)).size} modelo(s) · ${its.length} cor(es)</small></div>`; }
    const pmE = e ? e.pm : VIT.meses.get(chaveCor(it)), p6E = e ? Object.values(e.pm6 || {}).reduce((x, y) => x + y, 0) : (VIT.pares6.get(chaveCor(it)) || 0), totE = pmE ? Object.values(pmE).reduce((x, y) => x + y, 0) : VIT.pares.get(chaveCor(it));
    const gE = e ? e.grade : VIT.grades.get(chaveCor(it)), txE = e ? e.tx : VIT.gradeTx.get(chaveCor(it));
    html += `<div class="vcard${chaveCor(it) === NOVA ? " nova" : ""}${n > 1 ? " dupla" : ""}" data-kc="${esc(chaveCor(it))}" data-gi="${i}">
      <button type="button" class="mais tira" data-kc="${esc(chaveCor(it))}" data-gi="${i}" title="${n > 1 ? "tirar esta grade da vitrine" : "tirar da vitrine"}">×</button>${n > 1 ? `<i class="vdup" title="esta cor está em ${n} grades">${i + 1}/${n}</i>` : ""}
      <div class="vfoto ${it.t === "TENIS" ? "deitada" : "empe"}" data-k="${esc(chave(it))}">${fotoMini(it)}${ehNova(it) ? `<i class="tri" title="cor nova"></i>` : ""}${gtm && gtmDe(it) && gtmDe(it).e ? `<i class="estrela-v" title="estrela da Vulcabras">★</i>` : ""}</div>
      <div class="vtx"><div class="vnome">${esc(it.n)}</div>
        <div class="vlinha"><button type="button" class="ref" data-ref="${esc(it.r)}">${esc(it.r)}</button><span class="vcor">${esc(it.c)}</span></div>
        <div class="vlinha"><span class="vpdv">${esc(dinheiro(it.p))}</span>${it.p != null && condDe(it) ? `<span class="vcusto" title="custo: PDV ÷ markup ${condDe(it).markup.toFixed(2)}${condDe(it).prazo ? " · prazo " + condDe(it).prazo + " d" : ""}">custo ${esc(dinheiro(+it.p / condDe(it).markup))}</span>` : ""}${ehLanc(it) ? `<span class="selo lanc">lanç.</span>` : ""}${it.if ? `<span class="selo inicio">${esc(it.if)}</span>` : (!gtm && VIT.sug.get(chaveCor(it)) && VIT.sug.get(chaveCor(it)).inicio ? `<span class="selo inicio">${esc(VIT.sug.get(chaveCor(it)).inicio)}</span>` : (ehLanc(it) ? `<span class="selo inicio">sem data</span>` : ""))}</div>
        ${gtm && gtmDe(it) ? (g => `<div class="vgtm${g.e ? " estrela" : ""}">mix ${Math.round(g.mf != null ? g.mf : g.mx)}% · sugerido <b>${(g.ps[mes] || 0).toLocaleString("pt-BR")}</b></div>${g.gr && !VIT.grades.get(chaveCor(it)) ? `<div class="vgrade">sugestão: ${esc(g.gg ? g.gg + " · " : "")}${esc(g.gr)}</div>` : ""}${!(g.vm[mes] || 0) ? `<div class="selo falta vsem">modelo sem volume em ${esc(mes)}</div>` : ""}`)(gtmDe(it)) : (gtm ? `<div class="selo falta vsem">fora do pacote do GTM</div>` : "")}
        ${gtm ? (() => { const p = VIT.pares.get(chaveCor(it)), g = gtmDe(it), teto = g ? (g.vm[mes] || 0) : 0, pct = (p != null && teto) ? Math.round(p * 100 / teto) : null;
          const p6 = VIT.pares6.get(chaveCor(it)) || 0;
          return `<button type="button" class="selo pares${p == null ? " falta" : ""}" data-kc="${esc(chaveCor(it))}" title="mudar os pares desta cor">${p == null ? "pares?" : `<b>${p.toLocaleString("pt-BR")}</b> pares${p6 ? ` (${Math.floor((p - p6) / CAIXA)}×12 + ${Math.floor(p6 / CAIXA6)}×6)` : ""}${pct != null ? ` · ${pct}% de ${teto.toLocaleString("pt-BR")}` : ""}`}</button>`; })() : ""}
        ${!gtm ? (() => { const pm = pmE, tot = totE; const ms = pm ? MESES_V.filter(m => m in pm) : [];
          return `<button type="button" class="selo pares${!pm ? " falta" : ""}" data-kc="${esc(chaveCor(it))}" title="meses e pares desta cor">${pm ? `${tot ? `<b>${tot.toLocaleString("pt-BR")}</b> pares · ` : ""}${ms.map(m => pm[m] ? `${m} ${pm[m]}` : m).join(" · ") || "sem mês"}${!tot ? " · pares a definir" : ""}${p6E ? ` · ${p6E} em gr. 6` : ""}` : "meses?"}</button>`; })() : ""}
        ${gE ? `<button type="button" class="selo grade" data-kc="${esc(chaveCor(it))}" title="trocar a grade">${esc(txE && gE !== "aberta" ? ((ROTULO_GRADE[gE] || "grade") + " · " + txE) : (ROTULO_GRADE[gE] || "grade " + gE))}</button>` : `<button type="button" class="selo grade falta" data-kc="${esc(chaveCor(it))}" title="definir a grade">grade?</button>`}
        <div class="mu">${familiaDe(it) ? esc(titulo(familiaDe(it))) : ""}${it.ge ? " · " + esc(it.ge) : ""}</div></div>
    </div>`;
  }
  V.innerHTML = lista.length ? html : `<div class="vvazia">${VIT.cliente ? `A vitrine ${esc(nomeCli(VIT.cliente))} está vazia.<br><small>Toque numa cor da coleção, à esquerda, e ela sobe para cá.</small>` : "Escolha o cliente."}</div>`;
  for (const b of V.querySelectorAll(".ref")) b.onclick = (ev) => { ev.stopPropagation(); copiar(b); };
  for (const b of V.querySelectorAll(".mais")) b.onclick = (ev) => { ev.stopPropagation(); if (!gtm && entradasDe(b.dataset.kc).length > 1) tirarGrade(b.dataset.kc, +b.dataset.gi); else alternar(b.dataset.kc, "montador"); };
  for (const b of V.querySelectorAll(".selo.grade, .selo.pares")) b.onclick = (ev) => { ev.stopPropagation(); trocarGrade(b.dataset.kc); };
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
  // 19/10, ordem dele: produto UNISSEX, ao subir para a vitrine, pergunta a GRADE (feminina · masculina · estendida) — "eu tenho que
  // entender para qual gênero estou digitando". Produto com gênero definido não pergunta. A resposta vai na linha da vitrine.
  // dentro do roteiro a grade é automática: subiu no passo feminino → feminina; masculino → masculina; grade especial → especial
  // ("se eu coloquei ele dentro do bloco feminino, ele vira um produto feminino"); fora do roteiro (livre), pergunta
  // na DISTRIBUIÇÃO (GTM), ordem dele 19/10 11:1x: TODO clique pergunta a grade (sem separar por gênero) e a quantidade de pares da cor,
  // com o teto do modelo no mês à vista — a resposta grava na linha da vitrine e é a lista de digitação
  // na vitrine de CLIENTE (ele via NÚCLEO, 19/10 à tarde: "ATMOS PRETO: para quais meses? janeiro…junho. Uso grade padrão ou quero modificar.
  // É esse o roteiro"): TODO clique pergunta os meses, os pares de cada mês (pré-preenchidos pela sugestão do NÚCLEO) e a grade
  let grade = null, pares = null, pares6 = 0, campos = {};
  if (!tinha && !atual && ehGtm() && modo !== "atual") {
    const resp = await perguntarGtm(it); if (!resp) return; grade = resp.grade; pares = resp.pares; pares6 = resp.pares6;
    campos = { grade, pares, pares6: pares6 || null };
  } else if (!tinha && !atual) {
    const resp = await perguntarMeses(it); if (!resp) return; campos = linhaDeEntradas(resp.grades);
  }
  if (tinha) { M.delete(kc); limparEntradas(kc); }
  else { M.set(kc, estado); if (campos.grades) guardarEntradas(kc, campos.grades); else { if (grade) VIT.grades.set(kc, grade); if (pares != null) VIT.pares.set(kc, pares); if (pares6) VIT.pares6.set(kc, pares6); } }
  NOVA = (!tinha && !atual) ? kc : null;
  refrescar();
  const linha = { escritorio_id: VIT.esc, cliente: VIT.cliente, colecao: col, marca: it.m, referencia: it.r, cor: it.c };
  const r = tinha ? await SB.from("vitrine").delete().match(linha) : await SB.from("vitrine").insert(Object.assign({ estado, estado_anterior: atual ? (it.st || null) : null }, campos, linha));
  if (r.error) {
    if (tinha) M.set(kc, estado); else { M.delete(kc); limparEntradas(kc); }
    // 19/10 (ele, com duas abas abertas: "a ALGDNA não sobe"): a cor já estava no banco, posta pela outra aba — "chave duplicada". Não é
    // recusa: esta aba estava desatualizada. Relê a vitrine do banco e redesenha, sem erro na tela.
    if (/duplicate key|vitrine_pkey/i.test(r.error.message || "")) { await relerVitrine(); return; }
    VIT.erro = "O banco recusou a vitrine: " + r.error.message; refrescar();
    const raiz = modo === "colecao" ? EL : ELV, e = raiz && raiz.querySelector(modo === "colecao" ? "#col-erro" : "#vit-erro"); if (e) { e.textContent = VIT.erro; e.classList.remove("oculto"); }
    return;
  }
  VIT.erro = "";
}
// a lista de grades de uma cor (ele, 19/10 16:2x: "posso escolher mais de uma grade — parte feminina, parte masculina; aí ele aparece duas vezes").
// As colunas antigas ficam como o TOTAL e a primeira grade; `grades` guarda cada uma com os seus meses.
const entradasDe = kc => { const L = VIT.gradesL.get(kc); if (L && L.length) return L; const g = VIT.grades.get(kc), pm = VIT.meses.get(kc); return (g || pm) ? [{ grade: g || null, tx: VIT.gradeTx.get(kc) || null, pm: pm || {}, pm6: VIT.meses6.get(kc) || {} }] : []; };
const somaMeses = L => { const pm = {}, pm6 = {}; for (const e of L) { for (const k of MESES_V) { if (k in (e.pm || {})) pm[k] = (pm[k] || 0) + (e.pm[k] || 0); if ((e.pm6 || {})[k]) pm6[k] = (pm6[k] || 0) + e.pm6[k]; } } return { pm, pm6, pares: Object.values(pm).reduce((x, y) => x + y, 0), pares6: Object.values(pm6).reduce((x, y) => x + y, 0) }; };
const guardarEntradas = (kc, L) => { const t = somaMeses(L); VIT.gradesL.set(kc, L); if (L[0] && L[0].grade) VIT.grades.set(kc, L[0].grade); else VIT.grades.delete(kc); if (L[0] && L[0].tx) VIT.gradeTx.set(kc, L[0].tx); else VIT.gradeTx.delete(kc); VIT.pares.set(kc, t.pares); VIT.pares6.set(kc, t.pares6); VIT.meses.set(kc, t.pm); if (Object.keys(t.pm6).length) VIT.meses6.set(kc, t.pm6); else VIT.meses6.delete(kc); };
const limparEntradas = kc => { for (const m of [VIT.gradesL, VIT.grades, VIT.gradeTx, VIT.pares, VIT.pares6, VIT.meses, VIT.meses6]) m.delete(kc); };
const linhaDeEntradas = L => { const t = somaMeses(L); return { grade: (L[0] && L[0].grade) || null, grade_texto: (L[0] && L[0].tx) || null, pares: t.pares, pares6: t.pares6 || null, pares_mes: t.pm, pares6_mes: Object.keys(t.pm6).length ? t.pm6 : null, grades: L }; };
const ehUnissex = it => /unissex|unisex/i.test(it.ge || "");
const ehMasc = it => /^masc/i.test(it.ge || ""), ehFem = it => /^fem/i.test(it.ge || ""), ehInf = it => /^inf/i.test(it.ge || "");
// numeração "34/44", "38/48" → o maior número; grade ESPECIAL = tênis que digita até o 48 (ordem dele, 19/10: "produtos que têm digitação até o 48")
const numMax = it => { const m = String(it.nu || "").match(/(\d{2})\s*$/); return m ? +m[1] : null; };
const grandeEspecial = it => it.t === "TENIS" && (numMax(it) || 0) >= 47;
const ROTULO_GRADE = { feminina: "grade FEMININA", masculina: "grade MASCULINA", estendida: "grade ESTENDIDA (unissex)", especial: "grade ESPECIAL (até o 48)", infantil: "grade INFANTIL", propria: "grade MODIFICADA", aberta: "grade ABERTA" };
// o que se pergunta ao subir: unissex → feminina / masculina / estendida (+ especial se chega ao 48); masculino que chega ao 48 → masculina / especial
const opcoesGrade = it => ehUnissex(it) ? ["feminina", "masculina", "estendida"].concat(grandeEspecial(it) ? ["especial"] : []) : (ehMasc(it) && grandeEspecial(it) ? ["masculina", "especial"] : []);
// a SEÇÃO da vitrine (ordem dele, 19/10): "Tênis feminino · Tênis masculino · Tênis grade especial · Tênis infantil · e, se houver grade
// mais expansiva que pegue unissex, Tênis grade unissex" — depois os outros tipos. O que decide é a grade gravada; sem grade, o gênero.
const SECOES = ["Tênis feminino", "Tênis masculino", "Tênis grade especial", "Tênis infantil", "Tênis grade unissex", "Tênis unissex (grade?)"];
const secaoDe = (it, gr) => {
  if (it.t !== "TENIS" || ehGtm()) return NOME_TIPO[it.t] || it.t;   // na DISTRIBUIÇÃO não se separa por gênero (ele, 19/10: "tira tudo, se é masculino ou feminino")
  const g = gr !== undefined ? gr : VIT.grades.get(chaveCor(it));
  if (g === "especial") return "Tênis grade especial";
  if (g === "estendida") return "Tênis grade unissex";
  if (g === "feminina" || (!g && ehFem(it))) return "Tênis feminino";
  if (g === "masculina" || (!g && ehMasc(it))) return "Tênis masculino";
  if (ehInf(it)) return "Tênis infantil";
  return ehUnissex(it) ? "Tênis unissex (grade?)" : "Tênis";
};
const secOrd = s => { const i = SECOES.indexOf(s); return i < 0 ? 10 + tipoIdx(Object.keys(NOME_TIPO).find(k => NOME_TIPO[k] === s) || "") : i; };
// o ROTEIRO da montagem (ordem dele): feminino → masculino → grade especial (os que chegam ao 48) → infantil → chinelos
// dois roteiros (ele, 19/10 16:1x): Olympikus = feminino · masculino · grade especial · infantil · chinelos; Under Armour = feminino · masculino · chinelos
const ROTEIRO = [["fem", "OLY 1 · feminino", "Tênis feminino", "OLY"], ["masc", "OLY 2 · masculino", "Tênis masculino", "OLY"], ["esp", "OLY 3 · grade especial (até 48)", "Tênis grade especial", "OLY"], ["inf", "OLY 4 · infantil", "Tênis infantil", "OLY"], ["chin", "OLY 5 · chinelos", "Chinelos", "OLY"],
  ["ua-fem", "UA 1 · feminino", "Tênis feminino", "UA"], ["ua-masc", "UA 2 · masculino", "Tênis masculino", "UA"], ["ua-chin", "UA 3 · chinelos", "Chinelos", "UA"]];
// a perguntinha: um quadro sobre a tela, os botões das grades possíveis; Esc ou "deixa" cancela (a cor não sobe)
function perguntarGrade(it, atualGrade){
  return new Promise(resolve => {
    const luz = document.createElement("div"); luz.className = "luz grade-luz";
    luz.innerHTML = `<div class="quadro grade-quadro"><div class="gq-nome">${esc(it.n)} <span class="mu">${esc(it.r)} · ${esc(it.c)}${it.nu ? " · " + esc(it.nu) : ""}</span></div>
      <div class="gq-perg">${ehUnissex(it) ? "Unissex: em que grade vai digitar?" : "Vai até o 48: grade masculina ou especial?"}</div>
      <div class="gq-botoes">${opcoesGrade(it).map(v => `<button type="button" data-g="${v}" class="${v === atualGrade ? "ativa" : ""}">${esc(ROTULO_GRADE[v])}</button>`).join("")}</div>
      <button type="button" class="sec gq-deixa">deixa</button></div>`;
    const fecha = v => { luz.remove(); document.removeEventListener("keydown", tecla); resolve(v); };
    const tecla = ev => { if (ev.key === "Escape") fecha(null); };
    document.addEventListener("keydown", tecla);
    luz.onclick = ev => { if (ev.target === luz) fecha(null); };
    luz.querySelector(".gq-deixa").onclick = () => fecha(null);
    for (const b of luz.querySelectorAll("button[data-g]")) b.onclick = () => fecha(b.dataset.g);
    document.body.appendChild(luz);
  });
}
// a DISTRIBUIÇÃO (GTM, ordem dele 19/10 11:1x): todo clique pergunta a grade (qualquer produto: feminina · masculina · estendida; especial se
// chega ao 48) E a quantidade de pares da cor, com o teto do modelo no mês e o que já foi distribuído nas outras cores à vista
// as grades que a COR permite, pela numeração fabricada (ele, 19/10 12:0x: "se só for fabricada na grade feminina, só abre o feminino; se começa
// do 37, só abre o masculino"): feminina pede 34–39; masculina pede 38–43 (na UA, 38–41); unissex (estendida) só quando as duas cabem;
// infantil quando é infantil ou para no 36; especial quando chega ao 47/48
const numMin = it => { const m = String(it.nu || "").match(/^\s*(\d{2})/); return m ? +m[1] : null; };
const GRADES_GTM = it => {
  const mi = numMin(it), ma = numMax(it);
  if (mi == null || ma == null) return ["feminina", "masculina", "estendida"].concat(grandeEspecial(it) ? ["especial"] : []);
  const fem = mi <= 34 && ma >= 39, masc = mi <= 38 && (ma >= 43 || (it.m === "UA" && ma >= 41)), inf = ehInf(it) || ma <= 36;
  const o = [];
  if (inf) o.push("infantil");
  if (fem) o.push("feminina");
  if (masc) o.push("masculina");
  if (fem && masc) o.push("estendida");
  if (grandeEspecial(it)) o.push("especial");
  return o.length ? o : ["feminina", "masculina", "estendida"];
};
const paresDoModelo = (m, menos) => DADOS.itens.filter(it => it.m === m.m && it.r === m.r && chaveCor(it) !== menos).reduce((s, it) => s + (VIT.pares.get(chaveCor(it)) || 0), 0);
function perguntarGtm(it, atualGrade, atualPares, atualPares6){
  const g = gtmDe(it), mes = gtmMes(), teto = g ? (g.vm[mes] || 0) : 0, dig = tetoDigitavel(it, teto), outras = paresDoModelo(it, chaveCor(it)), ficam = Math.max(0, dig - outras);
  const opc = GRADES_GTM(it), seis = temGrade6(it);
  const p6 = atualPares6 || 0, p12 = atualPares != null ? Math.max(0, atualPares - p6) : Math.floor(Math.min(ficam, (g && g.ps[mes]) || ficam) / CAIXA) * CAIXA;   // em grades fechadas
  const n12 = Math.floor(p12 / CAIXA), n6 = Math.floor(p6 / CAIXA6);
  return new Promise(resolve => {
    const luz = document.createElement("div"); luz.className = "luz grade-luz";
    luz.innerHTML = `<div class="quadro grade-quadro gtm"><div class="gq-nome">${esc(it.n)} <span class="mu">${esc(it.r)} · ${esc(it.c)}${it.nu ? " · " + esc(it.nu) : ""}</span></div>
      <div class="gq-teto">digitar no GTM em ${esc(mes)}: <b>${teto.toLocaleString("pt-BR")}</b> pares no modelo${dig !== teto ? ` (digitável <b>${dig.toLocaleString("pt-BR")}</b>, múltiplo de ${temGrade6(it) ? CAIXA6 : CAIXA})` : ""}${outras ? ` · já distribuídos nas outras cores <b>${outras.toLocaleString("pt-BR")}</b> · ficam <b>${ficam.toLocaleString("pt-BR")}</b>` : ""}</div>
      <div class="gq-perg">${opc.length === 1 ? `Grade: só a <b>${esc(ROTULO_GRADE[opc[0]])}</b> cabe na numeração ${esc(it.nu || "")}` : `Em que grade? <span class="mu">numeração ${esc(it.nu || "?")}</span>`}</div>
      <div class="gq-botoes">${opc.map(v => `<button type="button" data-g="${v}" class="${v === (atualGrade || (opc.length === 1 ? opc[0] : null)) ? "ativa" : ""}">${esc(ROTULO_GRADE[v])}</button>`).join("")}</div>
      <div class="gq-perg">Quantas grades desta cor?</div>
      <div class="gq-pares" data-cx="${CAIXA}"><span class="gq-rot">grade de ${CAIXA} pares</span><button type="button" class="cx cx-menos" title="tira uma grade de ${CAIXA}">−</button><input type="number" min="0" step="1" inputmode="numeric" value="${n12}"><button type="button" class="cx cx-mais" title="põe uma grade de ${CAIXA}">+</button><span class="gq-sub"></span></div>
      ${seis ? `<div class="gq-pares" data-cx="${CAIXA6}"><span class="gq-rot">grade de ${CAIXA6} pares</span><button type="button" class="cx cx-menos" title="tira uma grade de ${CAIXA6}">−</button><input type="number" min="0" step="1" inputmode="numeric" value="${n6}"><button type="button" class="cx cx-mais" title="põe uma grade de ${CAIXA6}">+</button><span class="gq-sub"></span></div>` : ""}
      <div class="gq-pct"></div>
      <div class="gq-acoes"><button type="button" class="gq-sobe">sobe para a vitrine</button><button type="button" class="sec gq-deixa">deixa</button></div></div>`;
    let grade = atualGrade || (opc.length === 1 ? opc[0] : null);
    const campos = [...luz.querySelectorAll(".gq-pares")], inp = campos[0].querySelector("input"), pct = luz.querySelector(".gq-pct"), sobe = luz.querySelector(".gq-sobe");
    const conta = () => { let t = 0, t6 = 0; for (const c of campos) { const cx = +c.dataset.cx, n = Math.max(0, Math.round(+c.querySelector("input").value || 0)), p = n * cx; c.querySelector(".gq-sub").textContent = `= ${p} pares`; t += p; if (cx === CAIXA6) t6 = p; } return { pares: t, pares6: t6 }; };
    const mostra = () => { const { pares: p } = conta(); pct.textContent = teto ? `${p.toLocaleString("pt-BR")} pares · ${Math.round(p * 100 / teto)}% do modelo${p > ficam ? " · passa do teto" : ""}` : `${p} pares`; pct.classList.toggle("passou", p > ficam); sobe.disabled = !grade; };
    for (const b of luz.querySelectorAll(".gq-pares .cx")) b.onclick = () => { const i = b.parentElement.querySelector("input"); i.value = Math.max(0, (+i.value || 0) + (b.classList.contains("cx-mais") ? 1 : -1)); mostra(); };
    for (const c of campos) c.querySelector("input").oninput = mostra;
    const fecha = v => { luz.remove(); document.removeEventListener("keydown", tecla); resolve(v); };
    const confirma = () => { if (!grade) return; const { pares, pares6 } = conta(); fecha({ grade, pares, pares6 }); };
    const tecla = ev => { if (ev.key === "Escape") fecha(null); if (ev.key === "Enter") confirma(); };
    document.addEventListener("keydown", tecla);
    luz.onclick = ev => { if (ev.target === luz) fecha(null); };
    luz.querySelector(".gq-deixa").onclick = () => fecha(null);
    for (const b of luz.querySelectorAll("button[data-g]")) b.onclick = () => { grade = b.dataset.g; for (const x of luz.querySelectorAll("button[data-g]")) x.classList.toggle("ativa", x === b); mostra(); inp.focus(); inp.select(); };
    sobe.onclick = confirma; mostra();
    document.body.appendChild(luz);
    if (grade) { inp.focus(); inp.select(); }
  });
}
// a VITRINE DE CLIENTE por mês (ele via NÚCLEO, 19/10): quais meses, quantos pares em cada um (sugestão do NÚCLEO pré-preenchida), e a grade:
// padrão da casa (pelo gênero/numeração da cor), modificada (ele digita) ou aberta. A grade pode ficar para depois (selo "grade?" no cartão).
const MESES_V = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN"];
const GRADE_PADRAO = { feminina: "34–39 · 1-2-3-3-2-1", masculina: "38–43 · 1-2-3-3-2-1", infantil: "30–36 · 1-1-1-2-2-2-3", estendida: "unissex 34–44 (numeração por tamanho a combinar)", especial: "até o 48 (numeração por tamanho a combinar)" };
const GRADES_OPC = { feminina: ["34–39 · 1-2-3-3-2-1"], masculina: ["38–43 · 1-2-3-3-2-1", "37–43 · 1-2-2-3-2-1-1", "38–44 · 1-2-3-2-2-1-1"], infantil: ["30–36 · 1-1-1-2-2-2-3"] };
const gradePadraoDe = it => { const o = GRADES_GTM(it); if (ehInf(it)) return "infantil"; if (o.length === 1) return o[0]; if (ehFem(it) && o.includes("feminina")) return "feminina"; if (ehMasc(it) && o.includes("masculina")) return "masculina"; const auto = ({ fem: "feminina", masc: "masculina", inf: "infantil" })[(MF.passo || "").replace("ua-", "")]; return auto && o.includes(auto) ? auto : null; };
function perguntarMeses(it, atual){
  atual = atual || {};
  const k = chaveCor(it), sug = VIT.sug.get(k), opc = GRADES_GTM(it);   // todas as que a numeração permite — inclusive estendida (unissex) e especial (ele, 16:3x: "BEATS PRETO nos três blocos")
  // regra dele (19/10 14:2x): tudo múltiplo de 12; produto até R$ 300 só grade de 12; acima de 300 abre também a grade de 6
  const abre6 = (+it.p || 0) > 300;
  const redondo = (v, cx) => Math.max(0, Math.round((+v || 0) / cx) * cx);
  // as OPÇÕES de grade: as padrão que a numeração permite (a masculina com as 3), mais "modificar" e "aberta"; cada uma marcada vira um bloco de meses
  const opcoes = opc.flatMap(g => (GRADES_OPC[g] || [GRADE_PADRAO[g]]).map(tx => ({ gid: g + "|" + tx, grade: g, tx, rot: ROTULO_GRADE[g] + " · " + tx })));
  opcoes.push({ gid: "propria|", grade: "propria", tx: "", rot: "modificar a grade (eu digito)" }, { gid: "aberta|", grade: "aberta", tx: "grade aberta", rot: "grade aberta" }, { gid: "depois|", grade: null, tx: null, rot: "deixo a grade para depois" });
  const gidDe = e => e.grade === "propria" ? "propria|" : (e.grade === "aberta" ? "aberta|" : (e.grade ? (e.grade + "|" + (e.tx || GRADE_PADRAO[e.grade] || "")) : "depois|"));
  // o que já está: a lista dele; se nada, a padrão pelo gênero/numeração com a sugestão do NÚCLEO
  let entradas = (atual.grades && atual.grades.length) ? atual.grades.map(e => ({ gid: gidDe(e), grade: e.grade, tx: e.tx || "", pm: Object.assign({}, e.pm || {}), pm6: Object.assign({}, e.pm6 || {}) })) : [];
  if (!entradas.length) { const g = gradePadraoDe(it); entradas = [{ gid: g ? g + "|" + GRADE_PADRAO[g] : "depois|", grade: g, tx: g ? GRADE_PADRAO[g] : null, pm: sug ? Object.assign({}, sug.pm) : {}, pm6: {} }]; }
  for (const e of entradas) if (!opcoes.some(o => o.gid === e.gid)) opcoes.splice(opcoes.length - 3, 0, { gid: e.gid, grade: e.grade, tx: e.tx, rot: (ROTULO_GRADE[e.grade] || "grade") + " · " + e.tx });
  return new Promise(resolve => {
    const luz = document.createElement("div"); luz.className = "luz grade-luz";
    const blocoHtml = e => `<div class="gq-bloco" data-gid="${esc(e.gid)}"><div class="gq-btit">${esc(e.grade ? (e.grade === "propria" ? "grade MODIFICADA" : (ROTULO_GRADE[e.grade] || e.grade)) : "sem grade (defino depois)")}${e.grade === "propria" ? ` <input type="text" class="gq-texto" placeholder="ex.: 35–40 · 1-2-2-2-2-1" value="${esc(e.tx || "")}">` : (e.tx && e.grade !== "aberta" ? ` <span class="mu">${esc(e.tx)}</span>` : "")}</div>
      <div class="gq-meses${abre6 ? " seis" : ""}"><div class="gq-cab"><span></span><span>grade de 12</span>${abre6 ? `<span>grade de 6</span>` : ""}<span>total</span></div>${MESES_V.map(m => { const on = m in e.pm, p6 = e.pm6[m] || 0, p12 = Math.max(0, (e.pm[m] || 0) - p6);
        const campo = (cx, v) => `<span class="gq-campo"><button type="button" class="cx cx-menos" data-cx="${cx}" title="−${cx} pares">−</button><input type="number" min="0" step="${cx}" inputmode="numeric" data-cx="${cx}" value="${on && v > 0 ? v : ""}" ${on ? "" : "disabled"} placeholder="0"><button type="button" class="cx cx-mais" data-cx="${cx}" title="+${cx} pares">+</button></span>`;
        return `<div class="gq-mes${on ? " on" : ""}" data-m="${m}"><label class="gm-rot"><input type="checkbox" data-m="${m}" ${on ? "checked" : ""}>${m}</label>${campo(CAIXA, p12)}${abre6 ? campo(CAIXA6, p6) : ""}<b class="gm-tot">${on ? ((p12 + p6) || "—") : ""}</b></div>`; }).join("")}</div></div>`;
    luz.innerHTML = `<div class="quadro grade-quadro gtm meses"><div class="gq-nome">${esc(it.n)} <span class="mu">${esc(it.r)} · ${esc(it.c)}${it.nu ? " · " + esc(it.nu) : ""}${it.ge ? " · " + esc(it.ge) : ""}</span></div>
      ${sug && (sug.inicio || sug.motivo) ? `<div class="gq-teto">${sug.inicio ? `início de faturamento <b>${esc(sug.inicio)}</b>` : ""}${sug.inicio && sug.motivo ? " · " : ""}${esc(sug.motivo || "")}</div>` : (it.if ? `<div class="gq-teto">início de faturamento <b>${esc(it.if)}</b></div>` : "")}
      <div class="gq-perg">Em que grade(s)? <span class="mu">marque mais de uma para dividir: cada grade tem os seus meses e vira um cartão na vitrine</span></div>
      <div class="gq-opcs">${opcoes.map(o => `<label class="gq-opt"><input type="checkbox" data-gid="${esc(o.gid)}" ${entradas.some(e => e.gid === o.gid) ? "checked" : ""}> ${esc(o.rot)}</label>`).join("")}</div>
      <div class="gq-perg">Para quais meses? <span class="mu">${sug ? (Object.values(sug.pm).some(v => v > 0) ? "sugestão do NÚCLEO pelo sellout, já preenchida na primeira grade — aceita ou muda" : (sug.inicio ? "lançamento: sem sugestão de pares; a data de início está acima" : "lançamento sem circular: sem data de início e sem sugestão de pares")) : "sem sugestão para esta cor"}</span></div>
      <div class="gq-blocos">${entradas.map(blocoHtml).join("")}</div>
      <div class="gq-pct"></div>
      <div class="gq-acoes"><button type="button" class="gq-sobe">sobe para a vitrine</button><button type="button" class="sec gq-deixa">deixa</button></div></div>`;
    const pct = luz.querySelector(".gq-pct"), sobe = luz.querySelector(".gq-sobe"), blocos = luz.querySelector(".gq-blocos");
    const lerMes = l => { let t = 0, t6 = 0; for (const i of l.querySelectorAll("input[type=number]")) { const cx = +i.dataset.cx, v = redondo(i.value, cx); if (cx === CAIXA6) t6 += v; t += v; } return { t, t6 }; };
    const lerBloco = bl => { const o = opcoes.find(x => x.gid === bl.dataset.gid), pm = {}, pm6 = {}; for (const l of bl.querySelectorAll(".gq-mes")) { const on = l.querySelector("input[type=checkbox]").checked, { t, t6 } = lerMes(l); l.querySelector(".gm-tot").textContent = on ? (t || "—") : ""; if (on) { pm[l.dataset.m] = t; if (t6) pm6[l.dataset.m] = t6; } }
      const txt = bl.querySelector(".gq-texto"); return { grade: o.grade, tx: o.grade === "propria" ? (txt ? txt.value.trim() : "") : o.tx, pm, pm6 }; };
    const ler = () => [...blocos.querySelectorAll(".gq-bloco")].map(lerBloco);
    const mostra = () => { const L = ler(); const t = somaMeses(L); const nm = new Set(L.flatMap(e => Object.keys(e.pm))).size;
      pct.textContent = L.length ? `${L.length > 1 ? L.length + " grades · " : ""}${nm ? nm + " mês(es) · " : ""}${t.pares ? t.pares.toLocaleString("pt-BR") + " pares" : "pares a definir depois"}${t.pares6 ? ` · ${t.pares6} em grades de 6` : ""}${abre6 ? "" : " · até R$ 300: só grade de 12"}` : "marque pelo menos uma grade";
      sobe.disabled = !L.length || L.some(e => !Object.keys(e.pm).length) || L.some(e => e.grade === "propria" && !e.tx); };
    const ligarBloco = bl => { for (const l of bl.querySelectorAll(".gq-mes")) { const cb = l.querySelector("input[type=checkbox]"), nps = [...l.querySelectorAll("input[type=number]")], np = nps[0];
        cb.onchange = () => { for (const i of nps) i.disabled = !cb.checked; l.classList.toggle("on", cb.checked); if (cb.checked && !(+np.value) && bl === blocos.firstElementChild) { np.value = redondo((sug && sug.pm[cb.dataset.m]) || 0, CAIXA) || ""; } if (cb.checked) { np.focus(); np.select(); } mostra(); };
        for (const i of nps) { i.oninput = mostra; i.onchange = () => { const cx = +i.dataset.cx, v = redondo(i.value, cx); i.value = v || ""; mostra(); }; }
        for (const b of l.querySelectorAll(".cx")) b.onclick = ev => { ev.preventDefault(); if (!cb.checked) { cb.checked = true; cb.onchange(); } const i = b.parentElement.querySelector("input"), cx = +b.dataset.cx; i.value = Math.max(0, redondo(i.value, cx) + (b.classList.contains("cx-mais") ? cx : -cx)) || ""; mostra(); }; }
      const txt = bl.querySelector(".gq-texto"); if (txt) txt.oninput = mostra; };
    for (const bl of blocos.querySelectorAll(".gq-bloco")) ligarBloco(bl);
    for (const cb of luz.querySelectorAll(".gq-opcs input[type=checkbox]")) cb.onchange = () => {
      const gid = cb.dataset.gid, o = opcoes.find(x => x.gid === gid), ja = blocos.querySelector(`.gq-bloco[data-gid="${CSS.escape(gid)}"]`);
      if (cb.checked && !ja) { const e = { gid, grade: o.grade, tx: o.tx, pm: {}, pm6: {} }; blocos.insertAdjacentHTML("beforeend", blocoHtml(e)); ligarBloco(blocos.lastElementChild); }
      if (!cb.checked && ja) ja.remove();
      mostra(); };
    const fecha = v => { luz.remove(); document.removeEventListener("keydown", tecla); resolve(v); };
    const confirma = () => { if (sobe.disabled) return; const L = ler().map(e => ({ grade: e.grade, tx: e.grade === "aberta" ? "grade aberta" : (e.tx || null), pm: e.pm, pm6: Object.keys(e.pm6).length ? e.pm6 : {} })); fecha({ grades: L }); };
    const tecla = ev => { if (ev.key === "Escape") fecha(null); if (ev.key === "Enter" && ev.target.tagName !== "BUTTON") { if (ev.target.tagName === "INPUT" && ev.target.type === "number") ev.target.onchange(); confirma(); } };
    document.addEventListener("keydown", tecla);
    luz.onclick = ev => { if (ev.target === luz) fecha(null); };
    luz.querySelector(".gq-deixa").onclick = () => fecha(null); sobe.onclick = confirma; mostra();
    document.body.appendChild(luz);
    const primeiro = luz.querySelector(".gq-mes.on input[type=number]"); if (primeiro) { primeiro.focus(); primeiro.select(); }
  });
}
// trocar a grade (e, no GTM, os pares) de uma cor que já está na vitrine: a página só pode inserir e apagar, então apaga e insere de novo (o histórico guarda os dois)
async function regravar(kc, campos){
  const it = DADOS.itens.find(x => chaveCor(x) === kc); if (!it) return false;
  const linha = { escritorio_id: VIT.esc, cliente: VIT.cliente, colecao: DADOS.colecao, marca: it.m, referencia: it.r, cor: it.c };
  const d = await SB.from("vitrine").delete().match(linha); if (d.error) { VIT.erro = "O banco recusou: " + d.error.message; refrescar(); return false; }
  const r = await SB.from("vitrine").insert(Object.assign({ estado: "escolhida", estado_anterior: null }, campos, linha));
  if (r.error) { marcas(DADOS.colecao).delete(kc); limparEntradas(kc); VIT.erro = "O banco recusou: " + r.error.message; refrescar(); return false; }
  VIT.erro = ""; return true;
}
async function trocarGrade(kc){
  const it = DADOS.itens.find(x => chaveCor(x) === kc); if (!it || !VIT.cliente) return;
  if (ehGtm()) {
    const resp = await perguntarGtm(it, VIT.grades.get(kc), VIT.pares.get(kc), VIT.pares6.get(kc)); if (!resp) return;
    if (resp.grade === VIT.grades.get(kc) && resp.pares === VIT.pares.get(kc) && resp.pares6 === (VIT.pares6.get(kc) || 0)) return;
    if (await regravar(kc, { grade: resp.grade, pares: resp.pares, pares6: resp.pares6 || null })) { VIT.grades.set(kc, resp.grade); VIT.pares.set(kc, resp.pares); VIT.pares6.set(kc, resp.pares6 || 0); }
  } else {
    const resp = await perguntarMeses(it, { grades: entradasDe(kc) }); if (!resp) return;
    if (await regravar(kc, linhaDeEntradas(resp.grades))) guardarEntradas(kc, resp.grades);
  }
  refrescar();
}
// tirar UMA grade de uma cor que tem várias (o × do cartão daquela grade); a última tira a cor inteira
async function tirarGrade(kc, i){
  const L = entradasDe(kc); if (L.length <= 1) return alternar(kc, "montador");
  const nova = L.filter((_, j) => j !== i);
  if (await regravar(kc, linhaDeEntradas(nova))) guardarEntradas(kc, nova);
  refrescar();
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
      if (ehGtm()) {
        for (const c of pg.querySelectorAll(".mcard[data-kc]")) { const m = DADOS.itens.find(x => chaveCor(x) === c.dataset.kc), v = c.querySelector(".mteto"); if (m && v) v.outerHTML = tetoDoModelo(m); }
        for (const d of pg.querySelectorAll(".mdist")) { const it = DADOS.itens.find(x => chaveCor(x) === d.dataset.kc); if (it) d.outerHTML = distDaCor(it); }
        ligarCaixas(pg);
      }
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
