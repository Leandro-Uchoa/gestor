// RAIO-X CLIENTES — a aba de conhecimento do cliente no Gestor (ordem dele via NÚCLEO, 16/10/2026): "como se fosse um GTM, mas com
// mais informação". Só desenho: a lista vem de raio_x_lista() e o documento de um cliente de raio_x_consulta(cliente), do banco,
// atrás do login. Nada de cliente, loja ou número mora neste repositório. Regras dele: uma linha por porta, sem agrupar; paleta
// oficial; Under Armour fora até ter histórico. Quatro vistas: lojas (cluster e regulador) · categorias (índice 100 = proporção da
// loja) · sazonalidade (picos e vales, semestres, gênero) · pirâmide de PDV. Regra da casa (publica_portal): nenhum número de 4+ dígitos.
(function(){
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmt = n => n == null ? "—" : Math.round(n).toLocaleString("pt-BR");
const pct = x => x == null ? "—" : (x * 100).toFixed(0) + "%";
const dec = x => x == null ? "—" : x.toFixed(1).replace(".", ",");
const mesBR = m => MESES[+m.slice(5, 7) - 1] + "/" + m.slice(2, 4);
const dmy = d => d ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(2, 4) : "";
const VISTAS = [["lojas", "lojas"], ["cat", "categorias"], ["saz", "sazonalidade"], ["pir", "pirâmide de PDV"], ["ponta", "ponta de estoque"]];
// 19/10, ordem dele: PONTA DE ESTOQUE = produtos antigos (último faturamento há 6 meses ou mais, com estoque); fora de linha → rebaixa,
// em linha → não rebaixa. Vem de raio_x.ponta (carga_ponta.py, da AG do cliente). As vistas de lojas só existem quando o documento as tem.
const vistasDe = d => VISTAS.filter(([v]) => v === "ponta" ? !!(d && d.ponta) : !!(d && d.lojas));
const PF = { sit: "fora de linha", marca: "", busca: "" };
// o jsonb do banco devolve as chaves de um objeto em ordem própria (tamanho, depois alfabética) — a ordem de exibição é esta
const ORD_FAM = ["TÊNIS", "CHINELOS", "ACESSÓRIOS", "MEIAS"], ORD_SUB = ["FEMININO", "MASCULINO", "INFANTIL", "UNISSEX", "BASE", "MEIO", "TOPO"];
const ordenar = (chaves, ordem) => chaves.slice().sort((a, b) => { const i = ordem.findIndex(o => a.toUpperCase().startsWith(o)), j = ordem.findIndex(o => b.toUpperCase().startsWith(o)); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || a.localeCompare(b); });
let LISTA = null, DOCS = {}, EL = null, SB = null, RAIZ = null;   // RAIZ: o palco escondido da apresentação, quando está montando
const S = { cliente: null, vista: "lojas", cat: null, fam: null, sub: "" };

async function abrir(sb, el){
  SB = sb; EL = el;
  if (!LISTA) {
    el.innerHTML = `<div class="card">carregando o raio-x…</div>`;
    const r = await sb.rpc("raio_x_lista");
    if (r.error) { el.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    LISTA = r.data || [];
    if (!LISTA.length) { el.innerHTML = `<div class="card mu">Nenhum cliente com raio-x ainda. O NÚCLEO calcula (AG PORTA) e o TI carrega.</div>`; return; }
    const h = new URLSearchParams(location.hash.slice(1));            // 19/10: #aba=raiox&cliente=…&vista=… (outra janela) abre onde ele estava
    if (!S.cliente && h.get("cliente") && LISTA.some(c => c.cliente === h.get("cliente"))) { S.cliente = h.get("cliente"); if (h.get("vista")) S.vista = h.get("vista"); }
  }
  if (!S.cliente || !LISTA.some(c => c.cliente === S.cliente)) S.cliente = LISTA[0].cliente;   // 19/10: a aba Cliente pede um cliente antes de a lista existir
  await desenhar();
}

async function doc(cliente){
  if (DOCS[cliente]) return DOCS[cliente];
  const r = await SB.rpc("raio_x_consulta", { p_cliente: cliente });
  if (r.error) throw new Error(r.error.message);
  DOCS[cliente] = r.data; return r.data;
}

function chips(id, lista, atual, aoClicar){
  const el = (RAIZ || EL).querySelector("#" + id);
  el.innerHTML = lista.map(([v, r, n]) => `<button type="button" data-v="${esc(v)}" class="${v === atual ? "ativa" : ""}">${esc(r)}${n != null ? ` <small>${esc(n)}</small>` : ""}</button>`).join("");
  for (const b of el.querySelectorAll("button")) b.onclick = () => aoClicar(b.dataset.v);
}

const badge = c => `<span class="cl cl-${esc(c)}">${esc(c)}</span>`;

async function desenhar(){
  const el = EL;
  if (!el.querySelector(".raiox")) {
    el.innerHTML = `<div class="raiox">
      <div class="card filtros">
        <div class="linha-sel"><div id="rx-cli"></div><button type="button" class="sec" id="rx-apres-portas" title="PDF com a rede e os slides por loja (portas, mapa de calor, índice e cobertura por categoria, venda e cobertura por loja); no celular abre o compartilhar">apresentação por portas ⎙</button><button type="button" class="sec" id="rx-apres-cons" title="PDF só da rede como um todo, sem slide por loja; no celular abre o compartilhar">apresentação consolidada ⎙</button></div>
        <label>vista</label><div class="chips" id="rx-vista"></div>
        <div class="mu" id="rx-base"></div>
      </div>
      <div id="rx-corpo"></div>
    </div>`;
  }
  window.GestorLib.seletor(el.querySelector("#rx-cli"), "cliente", LISTA.map(c => [c.cliente, c.nome]), { v: S.cliente }, v => { S.cliente = v; S.cat = null; S.fam = null; S.sub = ""; desenhar(); }, { unico: true, nomeDe: c => (LISTA.find(x => x.cliente === c) || {}).nome || c });
  el.querySelector("#rx-apres-portas").onclick = () => apresentacao("portas"); el.querySelector("#rx-apres-cons").onclick = () => apresentacao("consolidada");
  const corpo = el.querySelector("#rx-corpo");
  let d;
  try { d = await doc(S.cliente); } catch (e) { corpo.innerHTML = `<div class="msg erro">O banco recusou: ${esc(e.message)}</div>`; return; }
  // os botões da apresentação: por portas só com o raio-x de lojas (AG PORTA); consolidada com o da rede
  el.querySelector("#rx-apres-portas").hidden = !(d && d.lojas && d.lojas.length > 1); el.querySelector("#rx-apres-cons").hidden = !(d && (d.sazonal || d.escopo));
  if (!d) { corpo.innerHTML = `<div class="card mu">Sem raio-x para este cliente.</div>`; return; }
  const vistas = vistasDe(d); if (!vistas.some(([v]) => v === S.vista)) S.vista = (vistas[0] || [""])[0];
  chips("rx-vista", vistas, S.vista, v => { S.vista = v; desenhar(); });
  el.querySelector("#rx-base").innerHTML = d.lojas
    ? `<b>${esc(d.nome)}</b> · ${d.base.lojas_ativas} lojas ativas · fonte: ${esc(d.base.fonte)} · lojas e categorias: ${esc(d.base.lojas)} · sazonalidade e pirâmide: ${esc(d.base.serie)} · carregado em ${esc(dmy(d.atualizado_em))}`
    : `<b>${esc(d.nome)}</b> · só ponta de estoque por enquanto (o raio-x de lojas vem quando o NÚCLEO calcular)`;
  if (S.vista === "lojas") corpo.innerHTML = vistaLojas(d);
  else if (S.vista === "cat") vistaCat(d, corpo);
  else if (S.vista === "saz") vistaSaz(d, corpo);
  else if (S.vista === "ponta") vistaPonta(d, corpo);
  else corpo.innerHTML = vistaPir(d);
}

// ---- PONTA DE ESTOQUE: uma linha por referência + cor; fora de linha primeiro; a marca dele (OBS da AG) ao lado da sugestão
function vistaPonta(d, corpo){
  const P = d.ponta, T = P.totais, its = P.itens;
  const sits = ["fora de linha", "em linha", "status a conferir"].filter(s => T[s] && T[s].cores);
  const marcas = [...new Set(its.map(i => i.marca).filter(Boolean))].sort();
  corpo.innerHTML = `<div class="card filtros">
      <div class="placar">${sits.map(s => `<span class="${s === PF.sit ? "ativa" : ""}" data-s="${esc(s)}"><b>${fmt(T[s].pares)}</b><small>${esc(s)} · ${T[s].modelos} modelo(s) · ${T[s].cores} cor(es) · ${esc(dinheiroCurto(T[s].valor_pdv))} em PDV</small></span>`).join("")}</div>
      <label>situação</label><div class="chips" id="rx-pf-sit"></div>
      ${marcas.length > 1 ? `<label>marca · família</label><div class="chips" id="rx-pf-marca"></div>` : ""}
      <input type="search" id="rx-pf-busca" placeholder="buscar: modelo, referência, cor, sua marca (PONTA, QUEIMAR…)" autocomplete="off" value="${esc(PF.busca)}" style="padding:9px 12px;margin-top:8px">
      <div class="mu" id="rx-pf-conta"></div>
    </div>
    <div class="card"><div class="sec-tit">PONTA DE ESTOQUE <small>${esc(P.base.regra)} · giro até ${esc(mesBR(P.base.giro_ate + "-01"))} · lido em ${esc(dmy(P.base.lido_em))}</small></div>
      <div class="rolagem"><table class="rx ponta"><thead><tr><th>situação</th><th>modelo</th><th>ref.</th><th>cor</th><th>marca</th><th class="n">PDV</th><th class="n">estoque</th><th class="n">venda/mês</th><th class="n">cobertura</th><th>último fat.</th><th class="n">parado</th><th>sua marca (AG)</th><th>sugestão</th></tr></thead><tbody id="rx-pf-linhas"></tbody></table></div>
      <div class="legenda mu">último fat. = último mês com entrada (carteira + faturado por previsão) na AG; "nunca" = sem entrada desde ${esc(mesBR(P.base.carteira_desde + "-01"))} · em linha / fora de linha = a coluna STATUS da AG (LINHA · FDL) · sua marca = a coluna OBS do último mês</div>
    </div>`;
  for (const sp of corpo.querySelectorAll(".placar span")) sp.onclick = () => { PF.sit = sp.dataset.s; vistaPonta(d, corpo); };
  chips("rx-pf-sit", [["", "todas"], ...sits.map(s => [s, s, T[s].cores])], PF.sit, v => { PF.sit = v; vistaPonta(d, corpo); });
  if (marcas.length > 1) chips("rx-pf-marca", [["", "todas"], ...marcas.map(m => [m, m, its.filter(i => i.marca === m).length])], PF.marca, v => { PF.marca = v; vistaPonta(d, corpo); });
  corpo.querySelector("#rx-pf-busca").oninput = ev => { PF.busca = ev.target.value; clearTimeout(vistaPonta._t); vistaPonta._t = setTimeout(() => linhasPonta(d, corpo), 120); };
  linhasPonta(d, corpo);
}
function linhasPonta(d, corpo){
  const semAcento = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const t = semAcento(PF.busca).split(/\s+/).filter(Boolean);
  const lista = d.ponta.itens.filter(i => (!PF.sit || i.situacao === PF.sit) && (!PF.marca || i.marca === PF.marca)
    && (!t.length || t.every(x => semAcento([i.desc, i.ref, i.cor, i.obs, i.grupo, i.genero].join(" ")).includes(x))));
  const pares = lista.reduce((s, i) => s + (i.estoque || 0), 0), valor = lista.reduce((s, i) => s + (i.valor_pdv || 0), 0);
  corpo.querySelector("#rx-pf-conta").innerHTML = `<b>${lista.length}</b> cor(es) · <b>${new Set(lista.map(i => i.ref)).size}</b> modelo(s) · <b>${fmt(pares)}</b> pares · <b>${esc(dinheiroCurto(valor))}</b> em PDV`;
  corpo.querySelector("#rx-pf-linhas").innerHTML = lista.map(i => `<tr class="${i.situacao === "fora de linha" ? "fora" : i.situacao === "em linha" ? "linha" : "duvida"}">
      <td><span class="sit">${esc(i.situacao)}</span></td><td class="loja">${esc(i.desc)}</td><td>${esc(i.ref)}</td><td>${esc(i.cor)}</td><td class="nome">${esc(i.marca)}${i.genero ? `<span class="mu cod">${esc(i.genero)}${i.grupo ? " · " + esc(i.grupo) : ""}</span>` : ""}</td>
      <td class="n">${i.pdv == null ? "—" : esc(dinheiro(i.pdv))}</td><td class="n"><b>${fmt(i.estoque)}</b></td><td class="n">${i.venda_mes == null ? "—" : dec(i.venda_mes)}</td><td class="n ${i.cobertura != null && i.cobertura >= 9 ? "pesado" : ""}">${dec(i.cobertura)}</td>
      <td>${i.ultimo_fat ? esc(mesBR(i.ultimo_fat + "-01")) : "nunca"}</td><td class="n">${i.meses_parado == null ? "—" : i.meses_parado + " m"}</td><td>${i.obs ? `<span class="obs">${esc(i.obs)}</span>` : ""}</td><td class="sug">${esc(i.sugestao)}</td></tr>`).join("")
    || `<tr><td colspan="13" class="mu">Nada com esses filtros.</td></tr>`;
}
const dinheiro = v => "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dinheiroCurto = v => !v ? "R$ 0" : v >= 1e6 ? "R$ " + (v / 1e6).toFixed(2).replace(".", ",") + " mi" : v >= 1e3 ? "R$ " + (v / 1e3).toFixed(0) + " mil" : dinheiro(v);

// ---- LOJAS: uma linha por porta, cluster, regulador e a diferença estoque − regulador
function vistaLojas(d){
  const L = d.lojas, maxV = Math.max(...L.map(l => l.v)), rede = L.length === 1;
  const reg = d.escopo.regulador;
  const tot = { v: d.escopo.v, e: d.escopo.e, reg: L.reduce((s, l) => s + l.reg, 0) };
  const linha = l => `<tr>
      ${rede ? "" : `<td>${badge(l.cluster)}</td>`}<td class="loja">${esc(l.loja)}</td><td class="nome">${esc(l.nome)}${l.codigo ? `<span class="mu cod">${esc(l.codigo)}</span>` : ""}</td>
      <td class="n"><div class="barra" style="--w:${(l.v / maxV * 100).toFixed(0)}%"><span>${fmt(l.v)}</span></div></td>
      <td class="n">${pct(l.part)}</td><td class="n">${fmt(l.e)}</td><td class="n">${dec(l.cob)}</td><td class="n">${fmt(l.reg)}</td>
      <td class="n ${l.dif < 0 ? "pede" : "sobra"}">${l.dif < 0 ? "−" : "+"}${fmt(Math.abs(l.dif))}<small>${l.dif < 0 ? "pede entrada" : "acima do regulador"}</small></td></tr>`;
  return `<div class="card">
    <div class="sec-tit">RESUMO POR LOJA <small>${esc(reg.escopo)} · regulador = ${esc(reg.regra)} · ${fmt(reg.total)} pares</small></div>
    <div class="rolagem"><table class="rx">
      <thead><tr>${rede ? "" : "<th>cluster</th>"}<th>loja</th><th>nome</th><th class="n">venda/mês</th><th class="n">partic.</th><th class="n">estoque</th><th class="n">cobertura</th><th class="n">regulador</th><th class="n">estoque − regulador</th></tr></thead>
      <tbody>${L.map(linha).join("")}</tbody>
      <tfoot><tr>${rede ? "" : "<td></td>"}<td colspan="2">rede · ${L.length} ${rede ? "linha (sem visão por loja)" : "lojas"}</td><td class="n">${fmt(tot.v)}</td><td class="n">100%</td><td class="n">${fmt(tot.e)}</td><td class="n">${dec(tot.e / tot.v)}</td><td class="n">${fmt(tot.reg)}</td>
        <td class="n ${tot.e - tot.reg < 0 ? "pede" : "sobra"}">${tot.e - tot.reg < 0 ? "−" : "+"}${fmt(Math.abs(tot.e - tot.reg))}</td></tr></tfoot>
    </table></div>
    <div class="legenda mu">${rede ? "" : `${badge("A")} perto de 500 pares/mês · ${badge("B")} de 230 a 290 · ${badge("C")} de 140 a 216 · `}cobertura em meses = estoque ÷ venda/mês · amarelo = abaixo do regulador, pede entrada</div>
  </div>`;
}

// ---- CATEGORIAS: a leitura no topo e a tabela por loja; índice 100 = a loja vende a categoria na proporção dela
function vistaCat(d, corpo){
  S.cat = S.cat || d.cats[0];
  const unid = c => (d.unidade || {})[c] || "pares";
  corpo.innerHTML = `<div class="card filtros"><label>categoria</label><div class="chips" id="rx-cat"></div></div><div id="rx-cat-corpo"></div>`;
  chips("rx-cat", d.cats.map(c => [c, c, fmt(d.totais[c].v) + "/mês"]), S.cat, v => { S.cat = v; vistaCat(d, corpo); });
  const c = S.cat, t = d.totais[c], L = d.lojas, maxV = Math.max(...L.map(l => l.cat[c].v)), rede = L.length === 1;
  const linha = l => { const x = l.cat[c]; const idx = x.idx == null ? null : Math.min(x.idx, 200);
    return `<tr>
      ${rede ? "" : `<td>${badge(l.cluster)}</td>`}<td class="loja">${esc(l.loja)}</td><td class="nome">${esc(l.nome)}</td>
      <td class="n"><div class="barra" style="--w:${maxV ? (x.v / maxV * 100).toFixed(0) : 0}%"><span>${fmt(x.v)}</span></div></td>
      <td class="n">${pct(x.part)}</td><td class="n">${fmt(x.e)}</td><td class="n ${x.cob != null && x.cob >= 9 ? "pesado" : ""}">${dec(x.cob)}</td>
      <td class="n idx ${x.idx == null ? "" : x.idx >= 120 ? "alto" : x.idx <= 80 ? "baixo" : ""}"><div class="ibar" style="--w:${idx == null ? 0 : (idx / 2).toFixed(0)}%"><i></i><span>${x.idx == null ? "—" : x.idx}</span></div></td></tr>`; };
  corpo.querySelector("#rx-cat-corpo").innerHTML = `<div class="card">
    <div class="sec-tit">${esc(c)} <small>${fmt(t.v)} ${esc(unid(c))}/mês na rede · estoque ${fmt(t.e)} · cobertura ${dec(t.v ? t.e / t.v : null)} meses</small></div>
    ${d.leitura[c] ? `<div class="leitura">${esc(d.leitura[c])}</div>` : ""}
    <div class="rolagem"><table class="rx">
      <thead><tr>${rede ? "" : "<th>cluster</th>"}<th>loja</th><th>nome</th><th class="n">venda/mês (${esc(unid(c))})</th><th class="n">partic.</th><th class="n">estoque</th><th class="n">cobertura</th><th class="n">índice <small>100 = proporção da loja</small></th></tr></thead>
      <tbody>${L.map(linha).join("")}</tbody>
    </table></div>
    <div class="legenda mu">índice acima de 120 = a loja puxa a categoria · abaixo de 80 = a loja não vende a categoria na proporção dela · cobertura em destaque a partir de 9 meses</div>
  </div>`;
}

// ---- SAZONALIDADE: a série mensal, picos e vales (média ±15%), o índice por mês do ano, os semestres e o gênero
function vistaSaz(d, corpo){
  const fams = ordenar(Object.keys(d.sazonal), ORD_FAM); S.fam = S.fam && d.sazonal[S.fam] ? S.fam : fams[0];
  const f = d.sazonal[S.fam], subs = ordenar(Object.keys(f.subs || {}), ORD_SUB);
  if (S.sub && !f.subs[S.sub]) S.sub = "";
  corpo.innerHTML = `<div class="card filtros"><label>família</label><div class="chips" id="rx-fam"></div>${subs.length ? `<label>recorte</label><div class="chips" id="rx-sub"></div>` : ""}</div><div id="rx-saz-corpo"></div>`;
  chips("rx-fam", fams.map(x => [x, x]), S.fam, v => { S.fam = v; S.sub = ""; vistaSaz(d, corpo); });
  if (subs.length) chips("rx-sub", [["", "total"], ...subs.map(x => [x, x])], S.sub, v => { S.sub = v; vistaSaz(d, corpo); });
  const serie = S.sub ? f.subs[S.sub] : f.mensal;
  const meses = Object.keys(f.mensal).sort(), vals = meses.map(m => serie[m] || 0);
  const media = vals.reduce((a, b) => a + b, 0) / (vals.length || 1), maxV = Math.max(...vals, 1);
  const classe = v => v >= media * 1.15 ? "pico" : v <= media * 0.85 ? "vale" : "";
  const unid = (d.unidade || {})[S.fam] || "pares";
  // índice por mês do ano: média do mês ÷ média geral (o que o calendário faz, tirando o ano)
  const porMes = Array.from({ length: 12 }, () => []);
  meses.forEach((m, i) => porMes[+m.slice(5, 7) - 1].push(vals[i]));
  const idxMes = porMes.map(a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) / media * 100 : null);
  const picos = MESES.filter((_, i) => idxMes[i] != null && idxMes[i] >= 115), vales = MESES.filter((_, i) => idxMes[i] != null && idxMes[i] <= 85);
  // semestres: média por mês e a variação contra o mesmo semestre do ano anterior (parcial quando faltam meses)
  const sem = new Map();
  meses.forEach((m, i) => { const k = (+m.slice(5, 7) <= 6 ? "1S" : "2S") + m.slice(2, 4); if (!sem.has(k)) sem.set(k, { k, n: 0, s: 0, ini: m, fim: m }); const x = sem.get(k); x.n++; x.s += vals[i]; x.fim = m; });
  const sems = [...sem.values()];
  const linhaSem = x => { const ant = sem.get(x.k.slice(0, 2) + String(+x.k.slice(2) - 1).padStart(2, "0")); const med = x.s / x.n, var_ = ant ? (med / (ant.s / ant.n) - 1) : null;
    return `<tr><td>${esc(x.k)}${x.n < 6 ? ` <small class="mu">${esc(mesBR(x.ini).slice(0, 3))}–${esc(mesBR(x.fim).slice(0, 3))}, parcial</small>` : ""}</td><td class="n">${fmt(med)}</td><td class="n">${fmt(x.s)}</td>
      <td class="n ${var_ == null ? "" : var_ < 0 ? "pede" : "sobra"}">${var_ == null ? "—" : (var_ < 0 ? "−" : "+") + Math.abs(var_ * 100).toFixed(0) + "%"}</td></tr>`; };
  // gênero / faixa: a participação de cada recorte no total da série (só onde há recorte)
  const totalSerie = Object.values(f.mensal).reduce((a, b) => a + b, 0);
  const partes = subs.map(s => [s, Object.values(f.subs[s]).reduce((a, b) => a + b, 0)]).filter(([, n]) => n > 0);
  corpo.querySelector("#rx-saz-corpo").innerHTML = `<div class="card">
    <div class="sec-tit">${esc(S.fam)}${S.sub ? " · " + esc(S.sub) : ""} <small>média ${fmt(media)} ${esc(unid)}/mês · ${esc(mesBR(meses[0]))} a ${esc(mesBR(meses[meses.length - 1]))}</small></div>
    <div class="grafico" style="--n:${meses.length}">${meses.map((m, i) => `<div class="col ${classe(vals[i])}" title="${esc(mesBR(m))}: ${fmt(vals[i])}"><span class="v">${fmt(vals[i])}</span><div class="b" style="--h:${(vals[i] / maxV * 100).toFixed(0)}%"></div><span class="m">${esc(mesBR(m))}</span></div>`).join("")}</div>
    <div class="legenda mu"><span class="am">■</span> pico (15% acima da média) · <span class="ci">□</span> vale (15% abaixo) · a linha tracejada é a média</div>
    <div class="duas">
      <div><div class="sub-tit">PICOS E VALES <small>índice por mês do ano · 100 = média</small></div>
        <div class="calend">${MESES.map((m, i) => `<div class="${idxMes[i] == null ? "" : idxMes[i] >= 115 ? "pico" : idxMes[i] <= 85 ? "vale" : ""}"><b>${esc(m)}</b><span>${idxMes[i] == null ? "—" : Math.round(idxMes[i])}</span></div>`).join("")}</div>
        <div class="mu">picos: <b>${picos.length ? esc(picos.join(", ")) : "nenhum"}</b> · vales: <b>${vales.length ? esc(vales.join(", ")) : "nenhum"}</b></div></div>
      <div><div class="sub-tit">SEMESTRES <small>média por mês · contra o mesmo semestre do ano anterior</small></div>
        <table class="rx"><thead><tr><th>semestre</th><th class="n">média/mês</th><th class="n">total</th><th class="n">variação</th></tr></thead><tbody>${sems.map(linhaSem).join("")}</tbody></table></div>
    </div>
    ${partes.length ? `<div class="sub-tit">RECORTES <small>participação no total da série</small></div><div class="partes">${partes.map(([s, n]) => `<div><span class="r">${esc(s)}</span><div class="pb"><i style="--w:${(n / totalSerie * 100).toFixed(1)}%"></i></div><span class="p">${pct(n / totalSerie)} <small>${fmt(n)}</small></span></div>`).join("")}</div>` : ""}
  </div>`;
}

// ---- PIRÂMIDE DE PDV: por família, da faixa de cima para a de baixo
function vistaPir(d){
  const fams = ordenar(Object.keys(d.piramide), ORD_FAM);
  const bloco = f => { const fx = d.piramide[f], ent = Object.entries(fx), tot = ent.reduce((s, [, n]) => s + n, 0), unid = (d.unidade || {})[f] || "pares";
    const ordem = ent.slice().sort((a, b) => nivel(b[0]) - nivel(a[0]));
    return `<div class="pir"><div class="sub-tit">${esc(f)} <small>${fmt(tot)} ${esc(unid)} no período</small></div>
      ${ordem.map(([k, n]) => `<div class="faixa ${nivelNome(k)}"><span class="r">${esc(k)}</span><div class="pb"><i style="--w:${tot ? (n / tot * 100).toFixed(1) : 0}%"></i></div><span class="p"><b>${pct(tot ? n / tot : null)}</b> <small>${fmt(n)}</small></span></div>`).join("")}
    </div>`; };
  return `<div class="card"><div class="sec-tit">PIRÂMIDE DE PDV <small>${esc(d.periodo_piramide || d.base.serie)}</small></div><div class="pirs">${fams.map(bloco).join("")}</div>
    <div class="legenda mu">tênis nas faixas dele: base 189,99 a 229,99 · meio 249,99 a 299,99 · topo acima de 299,99 — as outras famílias pelos pontos de preço</div></div>`;
}
// ---- A APRESENTAÇÃO = ANÁLISE COMERCIAL no molde oficial do NÚCLEO (moldes\deck_banban, 19/10; ajustes do PICASSO, 20/10): capa
// azul com a barra amarela e texto sem jargão; páginas off-white de 1_920×1_080 com margem 96/128/160, Barlow, kicker azul em caixa
// alta, título 64px em caixa normal; tabelas de 19–24px com cabeçalho preto e as lojas em DUAS colunas lado a lado (linha "Rede" no
// fim da segunda); leitura em texto escuro com filete azul; azul cheio só na capa e no KPI de destaque; rodapé "Fonte: …" à esquerda
// e "<Cliente> · N" à direita, numa faixa reservada. A ordem é a do molde (deck.json): o slide cujo dado ainda não existe no
// documento some (mix de meias, Under Armour quando a família não vem, gênero quando a série não traz o recorte). Nada interno sai.
const CDN_CANVAS = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", CDN_JSPDF = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const FONTE_BARLOW = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&display=swap";
const carregaScript = src => new Promise((ok, falha) => { const sc = document.createElement("script"); sc.src = src; sc.onload = () => ok(); sc.onerror = () => falha(new Error("não carreguei " + src.split("/").slice(-2)[0] + " (sem internet?)")); document.head.appendChild(sc); });
async function carregarPdfLib(){
  if (!document.getElementById("fonte-barlow")) { const l = document.createElement("link"); l.id = "fonte-barlow"; l.rel = "stylesheet"; l.href = FONTE_BARLOW; document.head.appendChild(l); }
  if (!window.html2canvas) await carregaScript(CDN_CANVAS);
  if (!(window.jspdf && window.jspdf.jsPDF)) await carregaScript(CDN_JSPDF);
  try { for (const f of ["800 128px Barlow", "700 64px Barlow", "600 24px Barlow", "400 24px Barlow"]) await document.fonts.load(f); } catch (e) {}
}
// a paleta oficial, como no molde (o preto é #000: o guarda do repositório recusa seis dígitos)
const AZUL = "#2E3EFC", AMARELO = "#FFFF1A", PRETO = "#000", CINZA = "#787B86", CINZA2 = "#ADAEB3", OFF = "#F6F5F0";
const W = 1_664;                                   // largura útil da página: 1_920 − 2 × 128
const n0 = v => v == null || isNaN(v) ? "—" : Math.round(v).toLocaleString("pt-BR");
const n1 = v => v == null || isNaN(v) ? "—" : Number(v).toFixed(1).replace(".", ",");
const pc = v => v == null || isNaN(v) ? "—" : Math.round(v * 100) + "%";
const pc1 = v => v == null || isNaN(v) ? "—" : (v * 100).toFixed(1).replace(".", ",") + "%";
const vr = v => v == null || isNaN(v) ? "—" : (v < 0 ? "−" : "+") + Math.abs(Math.round(v * 100)) + "%";
const mmaa = m => MESES[+m.slice(5, 7) - 1] + "/" + m.slice(2, 4);
const mesAno = m => MESES[+m.slice(5, 7) - 1] + "/" + m.slice(0, 4);
const MESES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const cap = t => String(t || "").replace(/^./, c => c.toUpperCase());
const tint = c => c === "A" ? "rgba(46,62,252,0.14)" : c === "B" ? "rgba(46,62,252,0.06)" : "transparent";
const MINUSC = ["DA", "DE", "DO", "DAS", "DOS", "E"];
// "TOP SHOP DA ILHA" → "Top Shop da Ilha" · "POLYÉLLE MA" → "Polyélle MA" · "130G ULTRALEVE /749" → "130G Ultraleve /749" · "CORRIDA/TREINO" → "Corrida/Treino"
const bonito = s => String(s == null ? "" : s).trim().split(/\s+/).map((w, i) => { const u = w.toUpperCase();
  if (i && MINUSC.includes(u)) return u.toLowerCase();
  if (/^[IVX]+$/.test(u) || (u.length <= 2 && /^[A-Z]+$/.test(u)) || /\d/.test(u)) return u;
  return u.charAt(0) + u.slice(1).toLowerCase().replace(/\/(.)/g, (m, c) => "/" + c.toUpperCase()); }).join(" ");
const lista = arr => arr.length > 1 ? arr.slice(0, -1).join(", ") + " e " + arr[arr.length - 1] : (arr[0] || "");
const corte = arr => arr.length < 2 ? [arr, []] : [arr.slice(0, Math.ceil(arr.length / 2)), arr.slice(Math.ceil(arr.length / 2))];
// PICASSO (20/10): nas tabelas por loja a altura da linha = espaço útil ÷ (lojas por coluna + 2), teto TETO_LINHA, e o corpo da letra
// acompanha (com 29 lojas volta ao compacto do molde). util = o que sobra da página depois do cabeçalho, dos vãos e da leitura.
// PICASSO (20/10, regra corrigida): teto 56 px; fonte = 0,42 × altura da linha, entre 11 e 22 px — a Poly (6 por coluna) enche ~70%,
// o Ban Ban (15 por coluna) fica no compacto. fsMax é o teto do slide (o mapa de calor pede letra menor nas células estreitas).
// Mínimo 20 px (decisão de 20/10: "o Ban Ban fica como está"), nunca acima do teto do slide.
const TETO_LINHA = 56, ALT_UTIL = 1_080 - 96 - 160;
const medida = (porColuna, util, fsMax, extraLinhas) => { const h = Math.max(22, Math.min(TETO_LINHA, Math.floor(util / (porColuna + 2 + (extraLinhas || 0))))); const fs = Math.max(Math.min(20, fsMax || 22), Math.min(fsMax || 22, Math.round(h * 0.42))); return { fs, pv: Math.max(1, Math.floor((h - fs * 1.2 - 1) / 2)), h }; };
const altCabec = 107, altLeitura = (frases, size) => 12 + frases.filter(Boolean).reduce((s, f) => s + Math.ceil(String(f).replace(/<[^>]+>/g, "").length / (W / ((size || 24) * 0.5))) * (size || 24) * 1.35 + 6, 0);
let NOME_DECK = "";
// mede um texto na fonte do deck (canvas 2d), para cortar o que não cabe antes de fotografar
const medir = (() => { let ctx = null; return (t, fs, peso) => { if (!ctx) ctx = document.createElement("canvas").getContext("2d"); ctx.font = `${peso || 400} ${fs}px Barlow, Arial, sans-serif`; return ctx.measureText(t).width; }; })();
const kick = t => `<p style="font-size:24px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:${AZUL}">${t}</p>`;
const cabec = (kicker, titulo, sub) => `<div style="display:flex;flex-direction:column;gap:8px">${kick(kicker)}<div style="display:flex;flex-direction:row;align-items:baseline;gap:24px"><h2 style="font-size:64px;font-weight:700;line-height:1.1;color:${PRETO};white-space:nowrap">${titulo}</h2>${sub ? `<p style="font-size:24px;color:${CINZA}">${sub}</p>` : ""}</div></div>`;
const leitura = (frases, size) => `<div style="border-left:6px solid ${AZUL};padding:6px 0 6px 24px;display:flex;flex-direction:column;gap:6px">${frases.filter(Boolean).map(f => `<p style="font-size:${size || 24}px;line-height:1.35;color:${PRETO}">${f}</p>`).join("")}</div>`;
// a página: margem do molde, rodapé na faixa reservada (160px) — o número entra no fim, quando a ordem está fechada
function pagina(corpo, fonte, gap, o){ o = o || {};
  return `<section class="pg" style="background:${OFF};color:${PRETO};font-family:'Barlow',Arial,Helvetica,sans-serif;padding:96px 128px 160px;display:flex;flex-direction:${o.row ? "row" : "column"};${o.entre ? "justify-content:space-between;" : ""}gap:${gap || 20}px;box-sizing:border-box;width:1920px;height:1080px;overflow:hidden;position:relative">${corpo}
    <p style="position:absolute;left:128px;bottom:64px;width:1250px;font-size:24px;color:${CINZA}">Fonte: ${fonte}</p><p style="position:absolute;left:1392px;bottom:64px;width:400px;font-size:24px;color:${CINZA};text-align:right">${esc(NOME_DECK)} · {{pg}}</p></section>`;
}
// tabela do molde: cols = [[título, alinhamento]] · linhas = [{bg, cells: [[texto, estilo]]}] · larg = px por coluna · grupos = [[título, colspan, cor]]
function tabela(cols, linhas, larg, fs, pad, grupos){
  const Wt = larg.reduce((a, b) => a + b, 0);
  let s = `<table style="width:${Wt}px;font-size:${fs || 22}px;color:${PRETO};border-collapse:collapse;table-layout:fixed"><colgroup>${larg.map(w => `<col style="width:${w}px">`).join("")}</colgroup>`;
  if (grupos) s += `<tr>${grupos.map(([t, n, bg]) => `<th colspan="${n}" style="background:${bg};color:${bg === "transparent" ? PRETO : OFF};font-weight:700;padding:3px 4px;text-align:center;border-left:2px solid ${OFF}">${t}</th>`).join("")}</tr>`;
  s += `<tr>${cols.map(([t, al]) => `<th style="background:${PRETO};color:${OFF};font-weight:700;padding:${pad};text-align:${al};line-height:1.15">${t}</th>`).join("")}</tr>`;
  for (const ln of linhas) s += `<tr style="background:${ln.bg || "transparent"}">${ln.cells.map(([t, extra], i) => `<td style="padding:${pad};text-align:${cols[i][1]};border-bottom:1px solid rgba(0,0,0,0.12);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${extra || ""}">${t}</td>`).join("")}</tr>`;
  return s + "</table>";
}
const duas = (a, b, gap) => `<div style="display:flex;flex-direction:row;gap:${gap || 32}px;align-items:flex-start">${a}${b}</div>`;
// pico = 15% acima da média do PRÓPRIO ano; vale = 15% abaixo (a rede cresce de um ano para o outro)
function picosDe(vals, meses){
  const porAno = {}; meses.forEach((m, i) => { const a = m.slice(0, 4); (porAno[a] = porAno[a] || []).push(vals[i]); });
  const med = {}; for (const a in porAno) med[a] = porAno[a].reduce((x, y) => x + y, 0) / porAno[a].length;
  return vals.map((v, i) => { const m = med[meses[i].slice(0, 4)]; return v >= 1.15 * m ? "p" : v <= 0.85 * m ? "v" : "n"; });
}
// barras mensais em colunas (sem svg): amarelo = pico, cinza = vale, separador de ano, rótulo do valor só no pico; top = N maiores em amarelo
function barras(vals, meses, h, w, rotulo, top){
  let tp = picosDe(vals, meses);
  if (top) { const lim = vals.slice().sort((a, b) => b - a)[Math.min(top, vals.length) - 1]; tp = vals.map(v => v > 0 && v >= lim ? "p" : "n"); }
  else if (!rotulo) tp = tp.map(t => t === "v" ? "n" : t);
  const max = Math.max(...vals, 1) * 1.08, util = h - 4 - (rotulo ? 32 : 0);
  const cols = meses.map((m, i) => { const alt = Math.max(0, Math.round(util * vals[i] / max)), p = tp[i] === "p";
    return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:${h - 4}px;${m.endsWith("-01") && i ? `border-left:2px solid ${CINZA2};` : ""}">${rotulo && p ? `<p style="margin:0 0 4px;font-size:22px;font-weight:600;color:${PRETO};white-space:nowrap">${n0(vals[i])}</p>` : ""}<div style="width:68%;height:${alt}px;background:${p ? AMARELO : tp[i] === "v" ? CINZA2 : AZUL};${p ? `border:2px solid ${PRETO};` : ""}box-sizing:border-box"></div></div>`; }).join("");
  return [`<div style="width:${w}px;height:${h}px;display:flex;flex-direction:row;border-bottom:2px solid ${CINZA}">${cols}</div>`, tp];
}
// eixo: inicial do mês; no pico, o nome do mês e o ano embaixo; a linha dos anos com o ano embaixo do eixo
function eixo(meses, tp, w){
  const s = meses.map((m, i) => tp[i] === "p" ? `<div style="flex:1;display:flex;flex-direction:column;align-items:center"><p style="font-size:19px;font-weight:800;line-height:1.1">${MESES[+m.slice(5, 7) - 1]}</p><p style="font-size:17px;font-weight:700;line-height:1.1">${m.slice(0, 4)}</p></div>` : `<div style="flex:1"><p style="font-size:20px;line-height:1.1;color:${CINZA};text-align:center">${MESES[+m.slice(5, 7) - 1][0].toUpperCase()}</p></div>`).join("");
  const anos = [...new Set(meses.map(m => m.slice(0, 4)))], st = w / meses.length;
  return `<div style="width:${w}px;display:flex;flex-direction:row;margin-top:4px">${s}</div><div style="width:${w}px;display:flex;flex-direction:row;border-top:2px solid ${CINZA2};padding-top:2px">${anos.map(a => `<p style="width:${Math.round(meses.filter(m => m.startsWith(a)).length * st)}px;font-size:24px;font-weight:700">${a}</p>`).join("")}</div>`;
}
const anosRow = (meses, w) => { const anos = [...new Set(meses.map(m => m.slice(0, 4)))], st = w / meses.length; return `<div style="width:${w}px;display:flex;flex-direction:row">${anos.map(a => `<p style="width:${Math.round(meses.filter(m => m.startsWith(a)).length * st)}px;font-size:22px;color:${CINZA}">${a}</p>`).join("")}</div>`; };
// índice de cada mês do ano: média do mês ÷ média geral × 100 (null quando o mês não aparece na série)
const idxMes = (vals, meses) => { const por = Array.from({ length: 12 }, () => []); meses.forEach((m, i) => por[+m.slice(5, 7) - 1].push(vals[i])); const med = vals.reduce((a, b) => a + b, 0) / (vals.length || 1); return por.map(a => a.length && med ? (a.reduce((x, y) => x + y, 0) / a.length) / med * 100 : null); };
// cartões de semestre: total · média/mês · variação contra os MESMOS meses do ano anterior (o semestre parcial compara jul–set com jul–set)
function semestres(serie, meses){
  const sem = new Map();
  for (const m of meses) { const k = (+m.slice(5, 7) <= 6 ? "1S" : "2S") + m.slice(2, 4); const x = sem.get(k) || { k, ms: [], s: 0 }; x.ms.push(m); x.s += serie[m] || 0; sem.set(k, x); }
  const lst = [...sem.values()].map(x => { const ant = x.ms.map(m => String(+m.slice(0, 4) - 1) + m.slice(4)), ok = ant.every(m => serie[m] != null), sa = ok ? ant.reduce((s, m) => s + serie[m], 0) : 0;
    return { k: x.k, s: x.s, n: x.ms.length, v: ok && sa ? x.s / sa - 1 : null, nome: x.ms.length < 6 ? `${MESES[+x.ms[0].slice(5, 7) - 1]}–${MESES[+x.ms[x.ms.length - 1].slice(5, 7) - 1]}/${x.k.slice(2)}` : x.k }; });
  const cards = lst.map(x => `<div style="flex:1;border:2px solid ${CINZA2};border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:2px"><p style="font-size:24px;font-weight:700;color:${AZUL}">${esc(x.nome)}</p><p style="font-size:36px;font-weight:800;line-height:1.1">${n0(x.s)}</p><p style="font-size:24px;color:${CINZA}">${n0(x.s / x.n)}/mês</p><p style="font-size:24px;font-weight:700">${vr(x.v)}</p></div>`).join("");
  return [`<div style="flex:none;width:1000px;display:flex;flex-direction:column;gap:8px"><p style="font-size:24px;color:${CINZA}">Semestres: total · média/mês · variação contra o mesmo período do ano anterior</p><div style="display:flex;flex-direction:row;gap:12px">${cards}</div></div>`, lst];
}
// a faixa de preço pelo texto da chave: "TOPO (149,99–179,99)" → "149,99 a 179,99" · "BASE (até 99,99)" → "até 99,99" · "49,99–59,99" → "49,99 a 59,99"
const rotuloFaixa = k => { const m = /\(([^)]*)\)/.exec(k); return (m ? m[1] : String(k)).replace(/[–—]/g, " a ").toLowerCase(); };
const faixaRS = k => { const t = rotuloFaixa(k); return /^(acima de|até) /.test(t) ? t.replace(/^(acima de|até) /, "$1 R$ ") : "R$ " + t; };
const nivel = k => /TOPO/i.test(k) ? 3 : /MEIO/i.test(k) ? 2 : /BASE/i.test(k) ? 1 : parseFloat(String(k).replace(",", ".")) || 0;
const nivelNome = k => /TOPO/i.test(k) ? "topo" : /MEIO/i.test(k) ? "meio" : /BASE/i.test(k) ? "base" : "";
// "PREÇO · PDV R$": a pirâmide da família em barras azuis, da faixa de cima para a de baixo. PICASSO (20/10): a largura é proporcional
// ao percentual (a maior faixa ocupa a coluna inteira; 0,1% vira um traço), e o rótulo sai para FORA quando a barra é estreita.
function precoBarras(fx, larg){
  const ent = Object.entries(fx || {}).sort((a, b) => nivel(b[0]) - nivel(a[0])), tot = ent.reduce((s, [, n]) => s + n, 0); if (!tot) return "";
  const LT = larg || 632, maxV = Math.max(...ent.map(([, v]) => v), 1);
  return kick("Preço · PDV R$") + `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:6px">${ent.map(([k, v]) => { const w = Math.max(6, Math.round(LT * v / maxV)), dentro = w >= 330;
    const rot = fg => `<p style="font-size:32px;font-weight:800;line-height:1.1;color:${fg};white-space:nowrap">${pc1(v / tot)}</p><p style="font-size:24px;font-weight:700;color:${fg};white-space:nowrap">${esc(rotuloFaixa(k))}</p>`;
    return `<div style="display:flex;flex-direction:row;align-items:center;gap:14px;width:${LT}px"><div style="flex:none;width:${w}px;height:44px;background:${AZUL};border-radius:8px;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:16px;overflow:hidden">${dentro ? rot(OFF) : ""}</div>${dentro ? "" : `<div style="display:flex;flex-direction:row;align-items:baseline;gap:12px">${rot(PRETO)}</div>`}</div>`; }).join("")}</div>`;
}

// modo (ele, 20/10: "deixa as duas apresentações disponíveis: portas e consolidada"): 'portas' = a rede E os slides por loja;
// 'consolidada' = só a rede (capa, posicionamento, sazonalidade, peso do mês, pirâmide, categorias, chinelos/acessórios/meias, UA rede,
// oportunidade de giro). O que cita "N de 12 lojas" vira a versão de rede, como quando o documento só tem uma linha.
function montarApresentacao(d, modo){
  NOME_DECK = bonito(d.nome);
  const pags = [], ESC = d.escopo || {}, cob = ESC.v ? ESC.e / ESC.v : null;
  const L = (d.lojas || []).slice().sort((a, b) => String(a.cluster || "").localeCompare(String(b.cluster || "")) || (b.v || 0) - (a.v || 0)), nL = L.length;
  const consolidada = modo === "consolidada", porLoja = !consolidada && nL > 1;
  const clusters = [...new Set(L.map(l => l.cluster).filter(Boolean))].sort(), temCl = clusters.length > 1;
  // a loja para o cliente é o CÓDIGO DELE (l.loja: MA09, 021…), que é como ele a reconhece; l.nome é a descrição e vai ao lado, em
  // cinza, quando cabe; l.codigo (o da Vulcabras) nunca sai. Nas leituras, só o código dele (o texto do banco já fala nele).
  const nomeL = l => esc(String(l.loja));
  // PICASSO (20/10): o nome entra SEMPRE; quando não cabe, corta com reticências. O html2canvas não desenha text-overflow, então a
  // reticência é posta aqui, medindo o texto na própria fonte (a td continua nowrap + overflow hidden como rede de segurança).
  const lojaCel = (l, larg, fs, ph) => { const cod = String(l.loja); let nome = bonito(l.nome || ""); if (!nome) return `<b>${esc(cod)}</b>`;
    const livre = larg - 2 * (ph || 6) - medir(cod + " ", fs, 700) - 2;
    if (medir(nome, fs) > livre) { while (nome.length > 1 && medir(nome + "…", fs) > livre) nome = nome.slice(0, -1); nome = nome.trimEnd() + "…"; }
    return `<b>${esc(cod)}</b> <span style="color:${CINZA}">${esc(nome)}</span>`; };
  const xc = (l, c) => ((l.cat || {})[c] || {});
  const texto = t => esc(t);
  // famílias e categorias: pelo nome, não pela posição
  const cats = d.cats || [], ehOutra = c => /CHINEL|ACESS|MEIA/i.test(c), ehUA = c => /^UA\b/i.test(c);
  const catsTenis = cats.filter(c => !ehOutra(c) && !ehUA(c)), catChi = cats.find(c => /CHINEL/i.test(c)), catAcc = cats.find(c => /ACESS/i.test(c)), catMei = cats.find(c => /MEIA/i.test(c)), catUA = cats.find(ehUA);
  const SZ = d.sazonal || {}, famDe = re => Object.keys(SZ).find(k => re.test(k) && !/^UA/i.test(k));
  const famTen = famDe(/T[EÊ]NIS/i), famChi = famDe(/CHINEL/i), famAcc = famDe(/ACESS/i), famMei = famDe(/MEIA/i), famUA = Object.keys(SZ).find(k => /^UA/i.test(k));
  const PIR = d.piramide || {}, pirDe = re => Object.keys(PIR).find(k => re.test(k) && !/^UA/i.test(k));
  const serieDe = f => { const ms = Object.keys(((SZ[f] || {}).mensal) || {}).sort(); return { meses: ms, vals: ms.map(k => SZ[f].mensal[k] || 0) }; };
  const ref = serieDe(famTen || Object.keys(SZ)[0] || ""), ini = ref.meses[0], fim = ref.meses[ref.meses.length - 1];
  const temUA = !!(catUA || famUA), T = d.totais || {}, unid = c => (d.unidade || {})[c] || "pares";
  const jan = /de (\w{3}) a (\w{3})\/(\d{2})/.exec(String((d.base || {}).lojas || ""));      // "sellout médio por mês de jan a set/26": a janela das lojas
  const mesBase = d.base_em ? mmaa(d.base_em) : jan ? jan[2] + "/" + jan[3] : (fim ? mmaa(fim) : "");
  const janela = jan ? `${jan[1]}–${jan[2]}/${jan[3]}` : "até " + mesBase;
  const mesB = d.base_em ? +d.base_em.slice(5, 7) : 0, preNatal = mesB >= 9 && mesB <= 11;
  const FONTE_LJ = `análise de giro por loja · sellout médio ${janela} · estoque das lojas em ${mesBase} · ${nL} loja${nL === 1 ? "" : "s"}`;
  const FONTE_RD = ini ? `análise de giro consolidada da rede · sellout ${mmaa(ini)}–${mmaa(fim)} · série desde ${mmaa(ini)}` : FONTE_LJ;   // a série começa onde o banco tem dado
  const KSAZ = ini ? `rede · ${mmaa(ini)}–${mmaa(fim)}` : "rede";
  const escopoTxt = esc(String((ESC.regulador || {}).escopo || "tênis Olympikus").replace(/\s*\([^)]*\)\s*$/, ""));   // sem o parêntese longo do escopo
  const idxT = ref.meses.length ? idxMes(ref.vals, ref.meses) : [], idxDez = idxT[11];
  // 1 · capa
  const capaTxt = [ini ? `Sellout da rede de ${mesAno(ini)} a ${mesAno(fim)}` : "", nL ? `sellout e estoque ${nL === 1 ? "da rede" : `das ${nL} lojas`} ${jan ? `de ${jan[1]} a ${jan[2]}/20${jan[3]}` : "em " + (d.base_em ? mesAno(d.base_em) : mesBase)}` : "", "Olympikus" + (temUA ? " e Under Armour" : "")].filter(Boolean).join(" · ");
  pags.push(`<section class="pg" style="background:${AZUL};color:${OFF};font-family:'Barlow',Arial,Helvetica,sans-serif;padding:128px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;width:1920px;height:1080px;overflow:hidden">
    <div style="display:flex;flex-direction:column;gap:32px"><div style="width:160px;height:12px;background:${AMARELO}"></div><p style="font-size:32px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Olympikus</p></div>
    <div style="display:flex;flex-direction:column;gap:40px"><h1 style="font-size:128px;font-weight:800;line-height:1.02">${esc(NOME_DECK)}<br>Análise Comercial</h1><p style="font-size:36px;font-weight:500;line-height:1.35">${esc(capaTxt)}</p></div>
    <p style="font-size:28px">${cap(new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }))}</p></section>`);
  // 2 · posicionamento: a razão venda × estoque, a régua de 2 a 10 meses (4–5 em azul, "hoje" marcado) e os quatro KPIs do molde
  if (cob != null) {
    const ate5 = L.filter(l => l.cob != null && l.cob <= 5), secas = L.filter(l => l.cob != null && l.cob < 4);
    const X0 = 2, X1 = 10, px = m => Math.round(W * (Math.min(X1, Math.max(X0, m)) - X0) / (X1 - X0));
    const regua = `<div style="position:relative;width:${W}px;height:150px">
      <div style="position:absolute;left:0;top:44px;width:${W}px;height:48px;background:rgba(173,174,179,0.35)"></div><div style="position:absolute;left:0;top:44px;width:${px(4)}px;height:48px;background:${CINZA2}"></div>
      <div style="position:absolute;left:${px(4)}px;top:44px;width:${px(5) - px(4)}px;height:48px;background:${AZUL}"></div><div style="position:absolute;left:${px(cob) - 3}px;top:30px;width:6px;height:76px;background:${PRETO}"></div>
      <p style="position:absolute;left:0;top:54px;width:${px(4)}px;font-size:24px;font-weight:700;text-align:center">abaixo de 4: falta produto</p><p style="position:absolute;left:${px(4)}px;top:54px;width:${px(5) - px(4)}px;font-size:24px;font-weight:700;color:${OFF};text-align:center">4 a 5 meses</p>
      <p style="position:absolute;left:${Math.min(W - 420, Math.max(0, px(cob) - 210))}px;top:0;width:420px;font-size:24px;font-weight:700;text-align:center">hoje: ${n0(ESC.e)} pares ≈ ${n1(cob)} meses</p>
      ${[2, 3, 4, 5, 6, 7, 8, 9, 10].map(m => `<p style="position:absolute;left:${m === X0 ? 0 : m === X1 ? W - 120 : px(m) - 60}px;top:108px;width:120px;font-size:24px;color:${CINZA};text-align:${m === X0 ? "left" : m === X1 ? "right" : "center"};white-space:nowrap">${m === X0 || m === X1 ? m + " meses" : m}</p>`).join("")}</div>`;
    const card = (num, rot, dest) => `<div style="flex:1;${dest ? "background:" + AZUL : "border:2px solid " + PRETO};padding:28px 32px;border-radius:8px;display:flex;flex-direction:column;gap:8px"><p style="font-size:80px;font-weight:800;line-height:1;color:${dest ? AMARELO : PRETO}">${num}</p><p style="font-size:28px;line-height:1.3;color:${dest ? OFF : PRETO}">${rot}</p></div>`;
    const secasTxt = !secas.length ? "nenhuma abaixo de 4" : secas.length === 1 ? "só a " + nomeL(secas[0]) + " abaixo de 4" : secas.length + " abaixo de 4";
    const cards = card(n0(ESC.v), `pares/mês de venda média nas lojas, ${janela}`) + card(n0(ESC.e), `pares em estoque nas lojas (${mesBase}) ≈ ${n1(cob)} meses`, true)
      + (porLoja ? card(`${ate5.length} de ${nL}`, `lojas com até 5 meses; ${secasTxt}`) : nL > 1 ? card(String(nL), "lojas na rede, somadas nesta leitura") : card(n1(cob), "meses de cobertura da rede"))
      + (idxDez != null ? card(n1(idxDez / 100) + "×", `o mês médio: é quanto dezembro vende (índice ${Math.round(idxDez)})`) : card(String(nL), "lojas ativas na análise"));
    const frase = preNatal && idxDez != null ? `Em ${MESES_LONGO[mesB - 1]}, ficar acima dela é normal: a loja carrega estoque para o Natal, e dezembro vende ${n1(idxDez / 100)} vez o mês médio.` : "Abaixo de 4 meses falta produto na loja; acima de 5, o estoque pesa.";
    pags.push(pagina(cabec("Posicionamento · " + escopoTxt + " nas lojas", "O que importa é a razão venda × estoque", "") + `<p style="font-size:32px;line-height:1.4">O estoque acompanha a venda: se a venda sobe, o estoque sobe; se cai, reduz. <b>A referência de cobertura é de 4 a 5 meses.</b> ${frase}</p>${regua}<div style="display:flex;flex-direction:row;gap:24px">${cards}</div>`, FONTE_LJ, 28, { entre: true }));
  }
  // 3 · venda e estoque por porta: as lojas em duas colunas, "Rede" no fim da segunda, leitura embaixo (só no modo por portas)
  if (porLoja) {
    const cols = [...(temCl ? [["Cl.", "center"]] : []), ["Loja", "left"], ["Venda/mês", "center"], ["Part.", "center"], ["Estoque", "center"], ["Cob.", "center"]], LG = [...(temCl ? [48] : []), 304, 124, 100, 124, 88];
    const secas = L.filter(l => l.cob != null && l.cob < 4), pesadas = L.filter(l => l.cob > 8).sort((a, b) => b.cob - a.cob);
    const [e1, e2] = corte(L);
    const faixa = c => { const vs = L.filter(l => l.cluster === c).map(l => l.v || 0); return `${n0(Math.min(...vs))} a ${n0(Math.max(...vs))}`; };
    const frCl = temCl ? clusters.map((c, i) => { const ls = L.filter(l => l.cluster === c); return `<b>${i ? "" : "Cluster "}${esc(c)}</b> (${faixa(c)} pares/mês): ${i ? ls.length + " lojas" : lista(ls.map(nomeL))}.`; }).join(" ") : "";
    const frSec = !secas.length ? "Nenhuma loja está abaixo de 4 meses." : secas.length === 1 ? `Só a ${nomeL(secas[0])}${secas[0] === L[0] ? ", a maior loja," : ""} está abaixo de 4 meses (${n1(secas[0].cob)}).` : `${lista(secas.map(l => `${nomeL(l)} (${n1(l.cob)})`))} estão abaixo de 4 meses.`;
    const frPes = !pesadas.length ? "Nenhuma passa de 8 meses." : pesadas.length === 1 ? `A ${nomeL(pesadas[0])} passa de 8 meses (${n1(pesadas[0].cob)}).` : `${lista(pesadas.map(nomeL))} passam de 8 meses; a ${nomeL(pesadas[0])} tem ${n1(pesadas[0].cob)}.`;
    const frases = [frCl, frSec + " " + frPes], { fs, pv } = medida(e1.length, ALT_UTIL - altCabec - 32 - altLeitura(frases)), pad = `${pv}px 8px`;
    const lin = l => ({ bg: tint(l.cluster), cells: [...(temCl ? [[esc(l.cluster || ""), ""]] : []), [lojaCel(l, 304, fs, 8), ""], [n0(l.v), ""], [pc1(l.part), ""], [n0(l.e), ""], [n1(l.cob), l.cob == null ? "" : l.cob < 4 ? `background:${AMARELO};font-weight:800` : l.cob > 8 ? `background:${CINZA2}` : ""]] });
    const rede = { bg: CINZA2, cells: [...(temCl ? [["", ""]] : []), ["<b>Rede</b>", ""], [`<b>${n0(ESC.v)}</b>`, ""], ["<b>100%</b>", ""], [`<b>${n0(ESC.e)}</b>`, ""], [`<b>${n1(cob)}</b>`, ""]] };
    const corpoT = e2.length ? duas(tabela(cols, e1.map(lin), LG, fs, pad), tabela(cols, [...e2.map(lin), rede], LG, fs, pad)) : tabela(cols, [...e1.map(lin), rede], LG, fs, pad);
    pags.push(pagina(cabec("Lojas e clusters · " + escopoTxt, "Venda e estoque por porta", "pares · cobertura em meses · amarelo: abaixo de 4 · cinza: acima de 8") + corpoT + leitura(frases), FONTE_LJ, 16));
  }
  // 4 · quanto cada loja leva de cada categoria (mapa de calor: cada coluna soma 100%)
  const ABVQ = { "CAMINHADA P1": "Cam.<br>P1", "CAMINHADA P2": "Cam.<br>P2", "CORRIDA/TREINO": "Corrida<br>Treino", "CORRE": "Corre", "CLÁSSICOS": "Clás-<br>sicos", "INFANTIL": "Infan-<br>til", "CHINELOS": "Chine-<br>los", "ACESSÓRIOS": "Acess.", "MEIAS": "Meias", "UA TÊNIS": "UA<br>tênis" };
  const ABV = { "CAMINHADA P1": "P1", "CAMINHADA P2": "P2", "CORRIDA/TREINO": "Corrida", "CORRE": "Corre", "CLÁSSICOS": "Clássicos", "INFANTIL": "Infantil" };
  const ab = c => ABV[String(c).toUpperCase()] || esc(bonito(c));
  if (porLoja && cats.length) {
    const partDe = (l, c) => xc(l, c).part || 0, mx = cats.map(c => Math.max(...L.map(l => partDe(l, c))));
    const heat = (p, m) => { const a = m ? 0.04 + 0.96 * Math.pow(p / m, 1.2) : 0; return `background:rgba(46,62,252,${a.toFixed(2)});color:${a > 0.7 ? OFF : PRETO};${m && p === m ? "font-weight:800" : ""}`; };
    const colw = Math.min(66, Math.floor((W - 24 - 2 * 222) / (2 * cats.length)));
    const cols = [["Cl.", "center"], ["Loja", "left"], ...cats.map(c => [ABVQ[String(c).toUpperCase()] || esc(bonito(c)), "center"])], LG = [34, 188, ...cats.map(() => colw)];
    const [e1, e2] = corte(L), A = L.filter(l => l.cluster === clusters[0]), somaA = c => A.reduce((s, l) => s + partDe(l, c), 0);
    const fr1 = temCl ? `As ${A.length} lojas ${esc(clusters[0])} levam ${pc1(A.reduce((s, l) => s + (l.part || 0), 0))} da venda de tênis${catMei ? `; nas meias, ${pc1(somaA(catMei))}` : ""}${catAcc ? `, e nos acessórios, ${pc1(somaA(catAcc))}` : ""}.` : "";
    const top3 = c => lista(L.slice().sort((a, b) => partDe(b, c) - partDe(a, c)).slice(0, 3).map(nomeL));
    const fr2 = catChi ? `O chinelo se concentra em ${top3(catChi)}.` : "";
    const frases = [`<span style="color:${CINZA}">venda média ${janela} · a participação é da loja dentro de cada categoria</span>`, [fr1, fr2].filter(Boolean).join(" ")];
    const { fs, pv } = medida(e1.length, ALT_UTIL - altCabec - 28 - altLeitura(frases), cats.length <= 9 ? 19 : 17), pad = `${pv}px 4px`;
    const lin = l => ({ bg: "transparent", cells: [[esc(l.cluster || ""), "background:" + tint(l.cluster)], [lojaCel(l, 188, fs, 4), "background:" + tint(l.cluster)], ...cats.map((c, j) => [pc1(partDe(l, c)), heat(partDe(l, c), mx[j])])] });
    const rede = { bg: PRETO, cells: [["", "color:" + OFF], ["<b>Rede</b>", "color:" + OFF], ...cats.map(() => ["<b>100%</b>", "color:" + OFF])] };
    pags.push(pagina(cabec("Lojas e clusters · participação de cada porta", "Quanto cada loja leva de cada categoria", "cada coluna soma 100% · mais escuro = fatia maior") + duas(tabela(cols, e1.map(lin), LG, fs, pad), tabela(cols, [...e2.map(lin), rede], LG, fs, pad), 24)
      + leitura(frases), FONTE_LJ, 14));
  }
  // o slide de sazonalidade: barras jan–set com o ano embaixo do eixo, "Em amarelo", cartões de semestre e a coluna da direita
  const sazSlide = (fam, titulo, un, kicker, direita, fonte) => {
    const { meses, vals } = serieDe(fam); if (meses.length < 2) return "";
    const [g, tp] = barras(vals, meses, 250, W, true), [semHtml, sems] = semestres(SZ[fam].mensal, meses), dest = meses.filter((_, i) => tp[i] === "p").map(mmaa);
    return pagina(cabec(kicker, titulo, `${un}/mês · amarelo = pico, 15% acima da média do ano · cinza = vale, 15% abaixo`)
      + `<div style="display:flex;flex-direction:column;gap:4px">${g}${eixo(meses, tp, W)}<p style="font-size:24px;line-height:1.3"><b>Em amarelo:</b> ${dest.join(" · ") || "nenhum mês 15% acima da média do ano"}</p></div>`
      + `<div style="flex:1;display:flex;flex-direction:row;gap:32px">${semHtml}<div style="flex:1;display:flex;flex-direction:column;gap:10px">${direita(sems, vals, meses)}</div></div>`, fonte, 14);
  };
  const ordemIdx = idx => idx.map((v, i) => [v, i]).filter(([v]) => v != null).sort((a, b) => b[0] - a[0]);
  // 5 · sazonalidade do tênis: a leitura à direita
  if (famTen) pags.push(sazSlide(famTen, "Tênis", unid(famTen), "Sazonalidade · " + KSAZ, (sems, vals, meses) => {
    const comVar = sems.filter(s => s.v != null), ordem = ordemIdx(idxT), iMin = vals.indexOf(Math.min(...vals));
    const f1 = comVar.length ? `Contra o mesmo período do ano anterior: ${comVar.map(s => `${esc(s.nome)} ${vr(s.v)}`).join(" · ")}.` : "Ainda não há um ano inteiro anterior para comparar.";
    const f2 = ordem.length ? `<b>${cap(MESES_LONGO[ordem[0][1]])} é o grande pico (índice ${Math.round(ordem[0][0])})${ordem.length > 2 ? `; ${MESES_LONGO[ordem[1][1]]} e ${MESES_LONGO[ordem[2][1]]} vêm em seguida` : ""}.</b>` : "";
    const vale = ordem[ordem.length - 1], f3 = vale ? `Vale em ${MESES_LONGO[vale[1]]} (índice ${Math.round(vale[0])}): ${mmaa(meses[iMin])} foi o mês mais fraco do período.` : "";
    return kick("Leitura") + [f1, f2, f3].filter(Boolean).map(t => `<p style="font-size:24px;line-height:1.3">${t}</p>`).join("");
  }, FONTE_RD));
  // 6 · o peso de cada mês (índice 100 = mês médio) e, quando a série traz o recorte, o que se destacou por gênero
  if (famTen && ref.meses.length >= 12) {
    const mxi = Math.max(...idxT.filter(v => v != null), 1);
    const colsI = MESES.map((m, i) => { const v = idxT[i], alt = v == null ? 0 : Math.round(154 * v / mxi), pico = v != null && v >= 110, vale = v != null && v <= 85;
      return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:190px"><p style="font-size:24px;font-weight:700;margin-bottom:4px">${v == null ? "—" : Math.round(v)}</p><div style="width:80px;height:${alt}px;background:${pico ? AMARELO : vale ? CINZA2 : AZUL};${pico ? `border:2px solid ${PRETO};` : ""}box-sizing:border-box"></div></div>`; }).join("");
    const grafico = `<div style="display:flex;flex-direction:column;gap:4px"><div style="width:${W}px;display:flex;flex-direction:row;border-bottom:2px solid ${CINZA}">${colsI}</div><div style="display:flex;flex-direction:row">${MESES.map(m => `<p style="flex:1;font-size:24px;color:${CINZA};text-align:center">${m}</p>`).join("")}</div></div>`;
    const subs = SZ[famTen].subs || {}, gens = ["MASCULINO", "FEMININO", "INFANTIL"].map(g => Object.keys(subs).find(k => k.toUpperCase() === g)).filter(Boolean), uni = Object.keys(subs).find(k => /UNISSEX/i.test(k));
    const gtot = ref.vals.reduce((a, b) => a + b, 0), somaSub = k => ref.meses.reduce((s, m) => s + (subs[k][m] || 0), 0);
    const cardsG = gens.map(g => { const vals = ref.meses.map(m => subs[g][m] || 0), t = vals.reduce((a, b) => a + b, 0); if (!t) return ""; const [sv, tp] = barras(vals, ref.meses, 120, 480, false), pk = ref.meses.filter((_, i) => tp[i] === "p").map(mmaa);
      return `<div style="flex:1;border:2px solid ${CINZA2};border-radius:8px;padding:20px 24px;display:flex;flex-direction:column;gap:8px"><p style="font-size:32px;font-weight:700;line-height:1.2">${esc(bonito(g))} · ${pc1(gtot ? t / gtot : null)}</p><p style="font-size:24px;color:${CINZA}">${n0(t / ref.meses.length)} pares/mês</p>${sv}${anosRow(ref.meses, 480)}<p style="font-size:24px;line-height:1.3"><b>Em amarelo:</b> ${pk.join(" · ") || "nenhum pico"}.</p></div>`; }).filter(Boolean).join("");
    const ordem = ordemIdx(idxT), picos = ordem.filter(([v]) => v >= 110).map(([, i]) => MESES[i]), vales = ordem.filter(([v]) => v <= 85).map(([, i]) => MESES[i]);
    const baixo = cardsG ? kick("O que se destacou · por gênero") + `<div style="display:flex;flex-direction:row;gap:24px">${cardsG}</div>` : leitura([`Acima de 110: <b>${picos.join(", ") || "nenhum mês"}</b>. Abaixo de 85: <b>${vales.join(", ") || "nenhum mês"}</b>.`]);
    pags.push(pagina(cabec("Sazonalidade · " + KSAZ, "Tênis: o peso de cada mês", "índice 100 = mês médio · amarelo ≥ 110 · cinza ≤ 85") + grafico + baixo, FONTE_RD + (uni && gtot ? ` · unissex = ${pc1(somaSub(uni) / gtot)}` : ""), 22));
  }
  // 7 · pirâmide de preço do tênis: topo amarelo estreito, meio e base azuis largos; à direita a leitura e o topo em pares/mês
  const pirTen = pirDe(/T[EÊ]NIS/i);
  if (pirTen) {
    const ent = Object.entries(PIR[pirTen]).sort((a, b) => nivel(b[0]) - nivel(a[0])), tot = ent.reduce((s, [, n]) => s + n, 0), nMes = ref.meses.length || 1;
    if (tot) {
      const larg = [500, 680, 940];
      const caixas = ent.map(([k, n], i) => { const topo = i === 0 && ent.length > 1, bg = topo ? AMARELO : AZUL, fg = topo ? PRETO : OFF;
        return `<div style="width:${i < 3 ? larg[i] : 940}px;background:${bg};${topo ? `border:2px solid ${PRETO};` : ""}border-radius:8px;padding:20px 24px;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:20px;box-sizing:border-box"><p style="font-size:64px;font-weight:800;line-height:1;color:${fg}">${pc1(n / tot)}</p><div style="display:flex;flex-direction:column;gap:2px"><p style="font-size:28px;font-weight:700;line-height:1.2;color:${fg}">${esc((nivelNome(k) || k).toUpperCase())}</p><p style="font-size:24px;line-height:1.3;color:${fg}">${esc(faixaRS(k))}</p><p style="font-size:24px;line-height:1.3;color:${fg}">${n0(n / nMes)} pares/mês</p></div></div>`; }).join("");
      const base = ent[ent.length - 1], meio = ent.length > 2 ? ent[1] : null;
      const f1 = `A base, ${esc(faixaRS(base[0]))}, faz ${pc1(base[1] / tot)} da venda${meio ? `; o meio, ${pc1(meio[1] / tot)}` : ""}.`;
      const subs = (SZ[famTen] || {}).subs || {}, kTopo = Object.keys(subs).find(k => /TOPO/i.test(k)), kFx = Object.keys(subs).filter(k => /TOPO|MEIO|BASE/i.test(k));
      let f2 = "", caixa = "";
      if (kTopo && kFx.length > 1 && ref.meses.length) {
        const anos = [...new Set(ref.meses.map(m => m.slice(0, 4)))];
        const porAno = anos.map(a => { const ms = ref.meses.filter(m => m.startsWith(a)), t = kFx.reduce((s, k) => s + ms.reduce((x, m) => x + (subs[k][m] || 0), 0), 0), tp = ms.reduce((x, m) => x + (subs[kTopo][m] || 0), 0);
          return { a, p: t ? tp / t : null, med: tp / ms.length, rot: ms.length < 12 ? ` (${MESES[+ms[0].slice(5, 7) - 1]}–${MESES[+ms[ms.length - 1].slice(5, 7) - 1]})` : "" }; });
        const sobe = porAno.length > 1 && porAno[porAno.length - 1].p > porAno[0].p;
        f2 = `${sobe ? "O topo ganha espaço" : "O topo"}: ${lista(porAno.map(x => `${pc1(x.p)} em ${x.a}${x.rot}`))}.`;
        const tv = ref.meses.map(m => subs[kTopo][m] || 0), [sv, tp] = barras(tv, ref.meses, 200, 560, false, 2), pk = ref.meses.filter((_, i) => tp[i] === "p");
        caixa = `<div style="border:2px solid ${CINZA2};border-radius:8px;padding:18px 36px;display:flex;flex-direction:column;gap:6px"><p style="font-size:24px;font-weight:600">Topo, em pares/mês</p>${sv}${anosRow(ref.meses, 560)}<p style="font-size:24px;line-height:1.3"><b>Em amarelo:</b> ${pk.map(m => `${mmaa(m)} (${n0(subs[kTopo][m])})`).join(" · ")}</p>${porAno.length > 1 ? `<p style="font-size:24px;line-height:1.3">Média do topo: ${n0(porAno[0].med)} pares/mês em ${porAno[0].a} → ${n0(porAno[porAno.length - 1].med)} em ${porAno[porAno.length - 1].a}.</p>` : ""}</div>`;
      }
      pags.push(pagina(cabec("Pirâmide de preço · PDV · " + KSAZ, "Tênis", "participação na venda e média de pares/mês") + `<div style="flex:1;display:flex;flex-direction:row;gap:64px"><div style="flex:none;width:960px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px">${caixas}</div><div style="flex:1;display:flex;flex-direction:column;gap:18px">${kick("Leitura")}<p style="font-size:28px;line-height:1.4">${f1}</p>${f2 ? `<p style="font-size:28px;font-weight:700;line-height:1.4">${f2}</p>` : ""}${caixa}</div></div>`, FONTE_RD, 32));
    }
  }
  // 8 · o que vende e como gira: as categorias do tênis na rede, quem puxa cada uma, e a leitura do NÚCLEO das maiores
  if (catsTenis.length) {
    const tt = catsTenis.reduce((s, c) => s + ((T[c] || {}).v || 0), 0), te = catsTenis.reduce((s, c) => s + ((T[c] || {}).e || 0), 0);
    const puxa = c => L.filter(l => (xc(l, c).idx || 0) >= 110).sort((a, b) => xc(b, c).idx - xc(a, c).idx).slice(0, 3).map(l => `${nomeL(l)} (${xc(l, c).idx})`).join(", ");
    const cobCel = v => v == null ? ["—", ""] : [n1(v), v < 4 ? `background:${AMARELO};font-weight:800` : v > 8 ? `background:${CINZA2}` : ""];
    const cols = [["Categoria", "left"], ["Venda/mês", "center"], ["Part.", "center"], ["Estoque", "center"], ["Cob.", "center"], ...(porLoja ? [["Quem puxa · índice 110 ou mais", "left"]] : [])], LG = porLoja ? [380, 160, 120, 160, 120, 724] : [640, 256, 256, 256, 256];
    const lin = catsTenis.map(c => { const t = T[c] || {}; return { bg: "transparent", cells: [[`<b>${esc(bonito(c))}</b>`, ""], [n0(t.v), ""], [pc1(tt ? t.v / tt : null), ""], [n0(t.e), ""], cobCel(t.v ? t.e / t.v : null), ...(porLoja ? [[puxa(c) || "—", "font-size:22px"]] : [])] }; });
    lin.push({ bg: CINZA2, cells: [["<b>Tênis Olympikus</b>", ""], [`<b>${n0(tt)}</b>`, ""], ["<b>100%</b>", ""], [`<b>${n0(te)}</b>`, ""], [`<b>${n1(tt ? te / tt : null)}</b>`, ""], ...(porLoja ? [["", ""]] : [])] });
    const ordC = catsTenis.slice().sort((a, b) => ((T[b] || {}).v || 0) - ((T[a] || {}).v || 0)), lei = []; let soma = 0;
    // na consolidada a leitura é só da rede: participação e cobertura de cada categoria pelos totais; do texto do banco ficam só as frases
    // que não citam loja (código ou nome), cluster ("as A", "B e C") nem índice por loja (PICASSO, 20/10)
    const citaLoja = (() => { const cods = L.map(l => String(l.loja)), nomes = L.map(l => bonito(l.nome || "")).filter(Boolean);
      const re = new RegExp("\\b(" + [...cods, ...nomes].map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b", "i");
      return f => (cods.length && re.test(f)) || /índice/i.test(f) || /\b(lojas?|as|nas|das|cluster)\s+[ABC]\b/i.test(f) || /\b[ABC]\s+(e|ou)\s+[ABC]\b/.test(f) || /\b[ABC]\s+(estão|está|vendem|vende|giram|gira|dependem|têm|tem|seguram|puxam)\b/.test(f); })();
    const sóRede = t => String(t || "").split(/(?<=[.!?])\s+/).filter(f => f.trim() && !citaLoja(f)).join(" ");
    if (consolidada) {
      const partes = ordC.map(c => { const t = T[c] || {}; return `${esc(bonito(c))} ${pc1(tt ? t.v / tt : null)}${t.v ? ` (${n1(t.e / t.v)} meses)` : ""}`; });
      lei.push(`<b>Participação no tênis e cobertura:</b> ${partes.join(" · ")}.`);
      const cobs = ordC.map(c => [c, (T[c] || {}).v ? T[c].e / T[c].v : null]).filter(([, v]) => v != null), pes = cobs.filter(([, v]) => v > 8).sort((a, b) => b[1] - a[1]), lev = cobs.slice().sort((a, b) => a[1] - b[1])[0];
      lei.push((pes.length ? `${lista(pes.map(([c, v]) => `${esc(bonito(c))} (${n1(v)} meses)`))} ${pes.length > 1 ? "estão pesados" : "está pesado"} na rede` : "Nenhuma categoria passa de 8 meses na rede") + (lev ? `; a ${esc(bonito(lev[0]))} gira em ${n1(lev[1])}.` : "."));
      for (const c of ordC) { const t = sóRede((d.leitura || {})[c]); if (!t) continue; if (soma + t.length > 520) break; soma += t.length; lei.push(`<b>${esc(bonito(c))}:</b> ${texto(t)}`); }
    } else for (const c of ordC) { const t = (d.leitura || {})[c]; if (!t) continue; if (soma + t.length > 900) break; soma += t.length; lei.push(`<b>${esc(bonito(c))}:</b> ${texto(t)}`); }
    pags.push(pagina(cabec(consolidada ? "Tênis · categorias · rede" : "Tênis · categorias · nas lojas", "O que vende e como gira", `venda média/mês ${consolidada ? "da rede" : "nas lojas"} · cobertura em meses: amarelo abaixo de 4, cinza acima de 8`) + tabela(cols, lin, LG, 24, "7px 10px") + (lei.length ? leitura(lei, 22) : ""), FONTE_LJ, 18));
  }
  // 9 · índice por categoria e 10 · cobertura por categoria: tênis por loja, duas colunas
  if (porLoja && catsTenis.length) {
    const n = catsTenis.length, cw = Math.min(104, Math.floor((W - 32 - 460) / (2 * n)));
    const abH = c => cw < 110 && ab(c).length > 8 ? ab(c).slice(0, 5) + "." : ab(c);     // "Clássicos" não cabe na coluna estreita: "Cláss."
    const cols = [["Cl.", "center"], ["Loja", "left"], ...catsTenis.map(c => [abH(c), "center"])], LG = [40, 190, ...catsTenis.map(() => cw)];
    const [e1, e2] = corte(L);
    const celIdx = v => { if (v == null) return ["—", `color:${CINZA}`]; if (v >= 110) { const a = Math.min(0.9, 0.25 + (v - 110) / 150); return [String(Math.round(v)), `background:rgba(46,62,252,${a.toFixed(2)});color:${a > 0.5 ? OFF : PRETO};font-weight:700`]; } return [String(Math.round(v)), v <= 70 ? `background:${CINZA2}` : ""]; };
    const lid = c => L.filter(l => (xc(l, c).idx || 0) >= 110).sort((a, b) => xc(b, c).idx - xc(a, c).idx).slice(0, 2);
    const frI = catsTenis.map(c => { const t = lid(c); return t.length ? `<b>${ab(c)}</b> puxa em ${lista(t.map(l => `${nomeL(l)} (${xc(l, c).idx})`))}` : ""; }).filter(Boolean).join("; ");
    const frasesI = [frI ? frI + "." : "Nenhuma loja passa de 110 em categoria alguma."], mI = medida(e1.length, ALT_UTIL - altCabec - 32 - altLeitura(frasesI)), padI = `${mI.pv}px 6px`;
    const linI = l => ({ bg: tint(l.cluster), cells: [[esc(l.cluster || ""), ""], [lojaCel(l, 190, mI.fs, 6), ""], ...catsTenis.map(c => celIdx(xc(l, c).idx))] });
    const redeI = { bg: CINZA2, cells: [["", ""], ["<b>Rede (pares/mês)</b>", ""], ...catsTenis.map(c => [`<b>${n0((T[c] || {}).v)}</b>`, ""])] };
    pags.push(pagina(cabec("Tênis por loja · quem vende o quê", "Índice por categoria", "100 = a loja vende a categoria na mesma proporção do seu tênis · azul: 110 ou mais · cinza: 70 ou menos")
      + duas(tabela(cols, e1.map(linI), LG, mI.fs, padI), tabela(cols, [...e2.map(linI), redeI], LG, mI.fs, padI)) + leitura(frasesI), FONTE_LJ, 16));
    const celCob = x => !x.v || x.cob == null || x.e < 0 ? ["—", `color:${CINZA}`] : [n1(x.cob), x.cob < 4 ? `background:${AMARELO};font-weight:800` : x.cob > 10 ? `background:${CINZA2}` : ""];
    const redeC = { bg: CINZA2, cells: [["", ""], ["<b>Rede</b>", ""], ...catsTenis.map(c => { const t = T[c] || {}; return [`<b>${n1(t.v ? t.e / t.v : null)}</b>`, ""]; })] };
    const falta = []; for (const l of L) for (const c of catsTenis) { const x = xc(l, c); if (x.v >= 15 && x.cob != null && x.cob < 4) falta.push([l, c, x.cob]); } falta.sort((a, b) => a[2] - b[2]);
    const cobs = catsTenis.map(c => [c, (T[c] || {}).v ? T[c].e / T[c].v : null]).filter(([, v]) => v != null), pesados = cobs.filter(([, v]) => v > 8).sort((a, b) => b[1] - a[1]), leve = cobs.slice().sort((a, b) => a[1] - b[1])[0];
    const frF = falta.length ? `Falta produto onde a venda é alta: ${falta.slice(0, 7).map(([l, c, v]) => `${nomeL(l)} ${ab(c)} (${n1(v)})`).join("; ")}.` : "Nenhuma loja está abaixo de 4 meses numa categoria em que vende 15 pares/mês ou mais.";
    const frP = (pesados.length ? `${lista(pesados.map(([c, v]) => `${esc(bonito(c))} (${n1(v)} meses)`))} ${pesados.length > 1 ? "estão pesados" : "está pesado"} na rede` : "Nenhuma categoria passa de 8 meses na rede") + (leve ? `; a ${esc(bonito(leve[0]))} gira em ${n1(leve[1])}.` : ".");
    const mC = medida(e1.length, ALT_UTIL - altCabec - 32 - altLeitura([frF, frP])), padC = `${mC.pv}px 6px`;
    const linC = l => ({ bg: tint(l.cluster), cells: [[esc(l.cluster || ""), ""], [lojaCel(l, 190, mC.fs, 6), ""], ...catsTenis.map(c => celCob(xc(l, c)))] });
    pags.push(pagina(cabec("Tênis por loja · estoque contra venda", "Cobertura por categoria", "meses de estoque na venda média · amarelo: abaixo de 4 · cinza: acima de 10")
      + duas(tabela(cols, e1.map(linC), LG, mC.fs, padC), tabela(cols, [...e2.map(linC), redeC], LG, mC.fs, padC)) + leitura([frF, frP]), FONTE_LJ + " · — = sem venda ou estoque negativo no relatório", 16));
  }
  // 11 · chinelos, 12 · acessórios, 13 · meias: sazonalidade + "PREÇO · PDV R$" da pirâmide da família + duas linhas curtas
  const dirPreco = (pirKey, cat, lojasPrimeiro) => (sems, vals, meses) => {
    const idx = idxMes(vals, meses), ordem = ordemIdx(idx), vales = idx.map((v, i) => [v, i]).filter(([v]) => v != null && v <= 85).map(([, i]) => MESES[i]);
    const f1 = ordem.length ? `<b>${cap(MESES_LONGO[ordem[0][1]])} vale ${n1(ordem[0][0] / 100)} ${ordem[0][0] >= 200 ? "vezes" : "vez"} o mês médio (índice ${Math.round(ordem[0][0])})${vales.length ? `; vale em ${vales.join(", ")}` : ""}.</b>` : "";
    const ult = sems[sems.length - 1], f2 = ult && ult.v != null ? `Em ${esc(ult.nome)} a venda ficou ${vr(ult.v)} contra o mesmo período do ano anterior.` : "";
    const t = cat && T[cat], f3 = t && t.v ? `${consolidada ? "Na rede" : "Nas lojas"}: ${n0(t.v)} ${unid(cat)}/mês e ${n0(t.e)} em estoque, ${n1(t.e / t.v)} meses de cobertura.` : "";
    const linhas = (lojasPrimeiro ? [f3, f1] : [f1, f2 || f3]).filter(Boolean).slice(0, 2);
    return precoBarras(pirKey ? PIR[pirKey] : null) + linhas.map(x => `<p style="font-size:23px;line-height:1.3">${x}</p>`).join("");
  };
  if (famChi) pags.push(sazSlide(famChi, "Chinelos", unid(catChi || famChi), "Sazonalidade e preço · " + KSAZ, dirPreco(pirDe(/CHINEL/i), catChi, false), FONTE_RD));
  if (famAcc) pags.push(sazSlide(famAcc, "Acessórios", unid(catAcc || famAcc), "Sazonalidade e preço · " + KSAZ, dirPreco(pirDe(/ACESS/i), catAcc, false), FONTE_RD));
  if (famMei) pags.push(sazSlide(famMei, "Meias", unid(catMei || famMei), "Sazonalidade e preço · " + KSAZ, dirPreco(pirDe(/MEIA/i), catMei, true), FONTE_RD));
  // 14 · mix de meias (modelo · gênero · cor): o documento ainda não traz — some
  // 15 · chinelos, acessórios e meias por loja: venda e cobertura, duas colunas, leitura do NÚCLEO embaixo
  const OC = [[catChi, "Chinelos", AZUL], [catAcc, "Acessórios", CINZA], [catMei, "Meias", PRETO]].filter(([c]) => c);
  if (porLoja && OC.length) {
    const cols = [["Cl.", "center"], ["Loja", "left"], ...OC.flatMap(() => [["Venda", "center"], ["Cob.", "center"]])], LG = [40, 216, ...OC.flatMap(() => [96, 88])];
    const grp = [["", 2, "transparent"], ...OC.map(([c, t, bg]) => [`${t} · ${unid(c)}`, 2, bg])];
    const [e1, e2] = corte(L);
    const secasM = catMei ? L.filter(l => xc(l, catMei).v >= 20 && xc(l, catMei).cob != null && xc(l, catMei).cob < 1).sort((a, b) => xc(a, catMei).cob - xc(b, catMei).cob) : [];
    const fr0 = secasM.length ? `Meias: ${lista(secasM.slice(0, 5).map(l => `${nomeL(l)} (${n1(xc(l, catMei).cob)})`))} ${secasM.length > 1 ? "têm" : "tem"} menos de 1 mês de estoque.` : "";
    const frs = e1.length <= 10 ? OC.map(([c, t]) => (d.leitura || {})[c] ? `<b>${t}:</b> ${texto(d.leitura[c])}` : "").filter(Boolean) : [];
    const fsL = e1.length <= 10 ? 24 : 22, { fs, pv } = medida(e1.length, ALT_UTIL - altCabec - 28 - altLeitura([fr0, ...frs], fsL), 21, 1), pad = `${pv}px 5px`;
    const lin = l => ({ bg: tint(l.cluster), cells: [[esc(l.cluster || ""), ""], [lojaCel(l, 216, fs, 5), ""], ...OC.flatMap(([c]) => { const x = xc(l, c), lim = /MEIA/i.test(c) ? 2 : 4;
      return [[x.v == null ? "—" : x.v < 100 ? n1(x.v) : n0(x.v), ""], !x.v || x.cob == null || x.e < 0 ? ["—", `color:${CINZA}`] : [n1(x.cob), x.cob < lim ? `background:${AMARELO};font-weight:800` : x.cob > 12 ? `background:${CINZA2}` : ""]]; })] });
    const rede = { bg: CINZA2, cells: [["", ""], ["<b>Rede</b>", ""], ...OC.flatMap(([c]) => { const t = T[c] || {}; return [[`<b>${n0(t.v)}</b>`, ""], [`<b>${n1(t.v ? t.e / t.v : null)}</b>`, ""]]; })] };
    pags.push(pagina(cabec("Chinelos, acessórios e meias · por loja", "Venda e cobertura", "venda média/mês · cobertura em meses · amarelo: abaixo de 4 (meias: abaixo de 2) · cinza: acima de 12")
      + duas(tabela(cols, e1.map(lin), LG, fs, pad, grp), tabela(cols, [...e2.map(lin), rede], LG, fs, pad, grp)) + leitura([fr0, ...frs], fsL), FONTE_LJ + " · — = sem venda ou estoque negativo no relatório", 14));
  }
  // 16 · Under Armour na rede e 17 · onde o UA gira: só quando a família vem no documento
  if (famUA) pags.push(sazSlide(famUA, "Under Armour · tênis", unid(catUA || famUA), "Under Armour · sazonalidade e preço · " + KSAZ, dirPreco(Object.keys(PIR).find(k => /^UA/i.test(k)), catUA, true), FONTE_RD));
  if (catUA && porLoja) {
    const cols = [["Cl.", "center"], ["Loja", "left"], ["Venda/mês", "center"], ["Estoque", "center"], ["Cob.", "center"], ["Índice", "center"]], LG = [52, 236, 140, 140, 120, 128], t = T[catUA] || {}, cobU = t.v ? t.e / t.v : null;
    const [e1, e2] = corte(L);
    const topU = L.slice().sort((a, b) => (xc(b, catUA).v || 0) - (xc(a, catUA).v || 0)).slice(0, 6), somaTop = topU.reduce((s, l) => s + (xc(l, catUA).v || 0), 0), par = L.filter(l => (xc(l, catUA).v || 0) < 1.5 && (xc(l, catUA).e || 0) >= 40);
    const frases = [`As ${topU.length} lojas que mais vendem (${topU.map(nomeL).join(", ")}) fazem ${pc(t.v ? somaTop / t.v : null)} da venda de UA.${par.length ? ` ${lista(par.map(nomeL))} quase não ${par.length > 1 ? "vendem" : "vende"} e ${par.length > 1 ? "têm" : "tem"} estoque.` : ""}`];
    const { fs, pv } = medida(e1.length, ALT_UTIL - altCabec - 32 - altLeitura(frases)), pad = `${pv}px 8px`;
    const lin = l => { const x = xc(l, catUA); return { bg: tint(l.cluster), cells: [[esc(l.cluster || ""), ""], [lojaCel(l, 236, fs, 8), ""], [n1(x.v), ""], [x.e < 0 ? "—" : n0(x.e), ""], !x.v || x.cob == null || x.e < 0 ? ["—", `color:${CINZA}`] : [n0(x.cob), x.cob > 24 ? `background:${CINZA2}` : ""], [x.idx == null ? "—" : String(x.idx), x.idx >= 110 ? `background:rgba(46,62,252,0.75);color:${OFF};font-weight:700` : ""]] }; };
    const rede = { bg: CINZA2, cells: [["", ""], ["<b>Rede</b>", ""], [`<b>${n1(t.v)}</b>`, ""], [`<b>${n0(t.e)}</b>`, ""], [`<b>${n0(cobU)}</b>`, ""], ["<b>100</b>", ""]] };
    pags.push(pagina(cabec("Under Armour · tênis por loja", "Onde o UA gira", "pares · cobertura em meses · índice 100 = proporção do tênis da loja · azul: 110 ou mais · cinza: acima de 24 meses")
      + duas(tabela(cols, e1.map(lin), LG, fs, pad), tabela(cols, [...e2.map(lin), rede], LG, fs, pad)) + leitura(frases), FONTE_LJ + " · — = sem venda ou estoque negativo no relatório", 16));
  }
  // 18 · oportunidade de giro: os modelos fora de linha com mais pares (cores agrupadas) e, à direita, o número grande e os totais por família.
  // NÚCLEO (regra definitiva, 20/10, aplicada na carga_ponta): item com `excluido` (referência na coleção vigente ou na lista manual
  // ponta_excluir.json) sai da LISTA de modelos, mas continua nos totais. O número grande e a leitura somam só o que é PAR: tênis
  // Olympikus, tênis Under Armour e chinelos (meias são packs e acessórios peças — ficam só na tabela de totais).
  const its = ((d.ponta || {}).itens || []).filter(i => i.situacao === "fora de linha" && (i.estoque || 0) > 0);
  if (its.length) {
    const tipo = m => /FTW/i.test(m) ? "tenis" : /MEIA/i.test(m) ? "meias" : /ACC/i.test(m) ? "acess" : /CHI/i.test(m) ? "chin" : "outro", ua = m => /^UA/i.test(m);
    const grupo = (f, base) => { const g = new Map(); for (const i of (base || its).filter(f)) { const x = g.get(i.desc) || { desc: i.desc, pares: 0, cores: new Set(), gen: i.genero }; x.pares += i.estoque || 0; x.cores.add(i.cor); g.set(i.desc, x); } return [...g.values()].sort((a, b) => b.pares - a.pares); };
    const naLista = its.filter(i => !i.excluido), ehOly = i => tipo(i.marca) === "tenis" && !ua(i.marca);
    const oly = grupo(ehOly, naLista), principal = oly.length ? oly : grupo(() => true, naLista), top = principal.slice(0, 18);
    const emPares = i => tipo(i.marca) === "tenis" || tipo(i.marca) === "chin", totP = its.filter(emPares).reduce((s, i) => s + (i.estoque || 0), 0), nModP = new Set(its.filter(emPares).map(i => i.desc)).size, totTop = top.reduce((s, m) => s + m.pares, 0);
    const cols = [[`Modelo · ${oly.length ? "tênis Olympikus" : "fora de linha"}`, "left"], ["Gênero", "center"], ["Cores", "center"], ["Pares", "center"]];
    const mP = medida(top.length, ALT_UTIL - altCabec - 20 - 35 - 20, 22, -1), padP = `${mP.pv}px 10px`;      // a mesma régua das tabelas por loja (PICASSO, 20/10)
    const lin = top.map((m, i) => ({ bg: i % 2 ? "transparent" : "rgba(46,62,252,0.06)", cells: [[esc(bonito(m.desc)), ""], [esc(bonito(m.gen || "")), ""], [String(m.cores.size), ""], [`<b>${n0(m.pares)}</b>`, ""]] }));
    const fams = [["Tênis Olympikus", i => tipo(i.marca) === "tenis" && !ua(i.marca), "pares"], ["Tênis Under Armour", i => tipo(i.marca) === "tenis" && ua(i.marca), "pares"], ["Meias", i => tipo(i.marca) === "meias", "packs"], ["Acessórios", i => tipo(i.marca) === "acess", "peças"], ["Chinelos", i => tipo(i.marca) === "chin", "pares"]]
      .map(([nm, f, un]) => { const g = grupo(f); return [nm, g.reduce((s, m) => s + m.pares, 0), un, g.length]; }).filter(([, q]) => q > 0);
    const resumo = fams.map(([a, b, c, k]) => `<div style="display:flex;flex-direction:row;justify-content:space-between;align-items:baseline;border-top:2px solid ${CINZA2};padding-top:6px"><p style="font-size:26px;font-weight:700">${a}</p><p style="font-size:26px"><b>${n0(b)}</b> ${c} · ${k} modelo${k > 1 ? "s" : ""}</p></div>`).join("");
    const dir = `<div style="flex:1;border-left:2px solid ${CINZA2};padding-left:40px;display:flex;flex-direction:column;gap:18px">${kick("Leitura")}<div style="display:flex;flex-direction:column;gap:6px"><p style="font-size:112px;font-weight:800;line-height:1;color:${AZUL}">${n0(totP)}</p><p style="font-size:28px;line-height:1.3">pares de tênis e chinelos fora de linha em ${nModP} modelos · ${pc(totP ? totTop / totP : null)} deles nos ${top.length} modelos ao lado</p></div>${resumo}<p style="font-size:26px;font-weight:700;line-height:1.35">Girar esse estoque antes ${preNatal ? "do Natal" : "da próxima coleção"} libera espaço na loja e caixa para a coleção nova.</p></div>`;
    const temUAponta = its.some(i => ua(i.marca));
    pags.push(pagina(`<div style="flex:none;width:980px;display:flex;flex-direction:column;gap:20px">${cabec("Ponta de estoque · fora de linha", "Oportunidade de giro", "")}<p style="font-size:26px;line-height:1.35">Produtos fora de linha com estoque · os modelos com mais pares</p>${tabela(cols, lin, [560, 170, 110, 140], mP.fs, padP)}</div>${dir}`,
      `estoque com saldo, lido em ${dmy((d.ponta.base || {}).lido_em)} · status fora de linha na Olympikus${temUAponta ? " e na Under Armour" : ""}`, 56, { row: true }));
  }
  // fecho: o número da página na ordem final e a guarda do que não sai para o cliente
  const paginas = pags.filter(Boolean).map((p, i) => p.replace("{{pg}}", String(i + 1)));
  const interno = /regulador|rebaixa|queima/i.exec(paginas.join(""));
  if (interno) throw new Error(`a apresentação sairia com termo interno ("${interno[0]}") — não monto`);
  const mes = new Date(); const nomeArq = (String(mes.getMonth() + 1).padStart(2, "0") + "," + String(mes.getFullYear()).slice(2) + " " + String(d.nome).toUpperCase() + " - ANÁLISE COMERCIAL - " + (consolidada ? "CONSOLIDADA" : "PORTAS")).replace(/[\\/:*?"<>|]+/g, "-");
  return { paginas, nomeArq, css: ".pg p,.pg h1,.pg h2,.pg h3{margin:0}.pg table{border-collapse:collapse}.pg *{box-sizing:border-box}" };
}
// monta as páginas, fotografa cada uma e devolve o PDF — quem chama decide se baixa, compartilha ou grava (o harness grava num receptor local)
async function gerarPdf(d, avisa, o){
  avisa = avisa || (() => {}); o = o || {};
  await carregarPdfLib();
  const { paginas, nomeArq, css } = montarApresentacao(d, o.modo || "portas");
  if (paginas.length > 18) throw new Error("a apresentação passou do teto de 18 páginas (" + paginas.length + ")");
  // o palco: 1_920 px de largura, atrás da página (fora da tela sai em branco); uma foto por página
  const q = document.createElement("div"); q.style.cssText = "position:absolute;left:0;top:0;z-index:-1;width:1920px;background:" + OFF + ";pointer-events:none"; q.innerHTML = `<style>${css}</style>` + paginas.join(""); document.body.appendChild(q);
  const pdf = new window.jspdf.jsPDF({ unit: "px", format: [1_920, 1_080], orientation: "landscape", hotfixes: ["px_scaling"] });
  try {
    const pgs = [...q.querySelectorAll(".pg")];
    for (let k = 0; k < pgs.length; k++) {
      avisa("gerando o PDF… " + (k + 1) + "/" + pgs.length);
      const cv = await window.html2canvas(pgs[k], { scale: 1, width: 1_920, height: 1_080, backgroundColor: k === 0 ? AZUL : OFF, useCORS: true, logging: false });
      if (k) pdf.addPage([1_920, 1_080], "landscape");
      pdf.addImage(cv.toDataURL("image/jpeg", 0.86), "JPEG", 0, 0, 1_920, 1_080);
    }
  } finally { q.remove(); }
  if (pdf.getNumberOfPages() !== paginas.length) throw new Error("o PDF saiu com " + pdf.getNumberOfPages() + " páginas e a apresentação tem " + paginas.length);
  return { blob: pdf.output("blob"), nomeArq, paginas: paginas.length };
}
async function apresentacao(modo){
  const bt = EL.querySelector(modo === "consolidada" ? "#rx-apres-cons" : "#rx-apres-portas"); const antes = bt ? bt.textContent : "";
  const avisa = t => { if (bt) bt.textContent = t; };
  try {
    let d; try { d = await doc(S.cliente); } catch (e) { alert("O banco recusou: " + e.message); return; }
    if (!d || !(d.sazonal || d.escopo)) { alert("este cliente ainda não tem o raio-x da rede (o NÚCLEO calcula)."); return; }
    if (modo !== "consolidada" && !(d.lojas && d.lojas.length > 1)) { alert("este cliente ainda não tem o raio-x por loja (o NÚCLEO calcula pela AG PORTA) — gere a consolidada."); return; }
    avisa("montando…");
    const { blob, nomeArq } = await gerarPdf(d, avisa, { modo });
    const arquivo = new File([blob], nomeArq + ".pdf", { type: "application/pdf" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) { try { await navigator.share({ files: [arquivo], title: nomeArq }); avisa("compartilhado ✓"); setTimeout(() => avisa(antes), 2.5e3); return; } catch (e) { if (e && e.name === "AbortError") { avisa(antes); return; } } }
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = nomeArq + ".pdf"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30e3);
    avisa("baixado: " + nomeArq + ".pdf"); setTimeout(() => avisa(antes), 4e3);
  } catch (e) { avisa(antes); alert("não montei a apresentação: " + (e.message || e)); }
}

window.RaioX = { abrir, montarApresentacao, gerarPdf, doc, estado: () => ({ cliente: S.cliente, vista: S.vista }), ir: (c, v) => { if (c) S.cliente = c; if (v) S.vista = v; S.cat = null; S.fam = null; } };
})();
