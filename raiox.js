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
        <div class="linha-sel"><div id="rx-cli"></div><button type="button" class="sec" id="rx-apres" title="gera o PDF da apresentação deste cliente, já nomeado; no celular abre o compartilhar">gerar apresentação PDF ⎙</button></div>
        <label>vista</label><div class="chips" id="rx-vista"></div>
        <div class="mu" id="rx-base"></div>
      </div>
      <div id="rx-corpo"></div>
    </div>`;
  }
  window.GestorLib.seletor(el.querySelector("#rx-cli"), "cliente", LISTA.map(c => [c.cliente, c.nome]), { v: S.cliente }, v => { S.cliente = v; S.cat = null; S.fam = null; S.sub = ""; desenhar(); }, { unico: true, nomeDe: c => (LISTA.find(x => x.cliente === c) || {}).nome || c });
  el.querySelector("#rx-apres").onclick = () => apresentacao();
  const corpo = el.querySelector("#rx-corpo");
  let d;
  try { d = await doc(S.cliente); } catch (e) { corpo.innerHTML = `<div class="msg erro">O banco recusou: ${esc(e.message)}</div>`; return; }
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
// ---- A APRESENTAÇÃO = ANÁLISE COMERCIAL no padrão da Polyélle (ele, 20/10 00:5x: "não ficou parecido nada com a Poly; até a cor ficou
// preta; os meses de cabeça para baixo; refaz tudo"). O molde é o deck da Poly feito pelo NÚCLEO (deck_poly: capa azul com a barra
// amarela, páginas off-white 1_920×1_080, Barlow, kicker azul em caixa alta, título 64px, tabelas de 24px com cabeçalho preto, cluster A
// em azul claro, sazonalidade em barras — amarelo = pico, cinza = vale —, cartões de número grande). Uma página por slide, teto de 18.
const CDN_CANVAS = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", CDN_JSPDF = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const FONTE_BARLOW = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&display=swap";
const carregaScript = src => new Promise((ok, falha) => { const sc = document.createElement("script"); sc.src = src; sc.onload = () => ok(); sc.onerror = () => falha(new Error("não carreguei " + src.split("/").slice(-2)[0] + " (sem internet?)")); document.head.appendChild(sc); });
async function carregarPdfLib(){
  if (!document.getElementById("fonte-barlow")) { const l = document.createElement("link"); l.id = "fonte-barlow"; l.rel = "stylesheet"; l.href = FONTE_BARLOW; document.head.appendChild(l); }
  if (!window.html2canvas) await carregaScript(CDN_CANVAS);
  if (!(window.jspdf && window.jspdf.jsPDF)) await carregaScript(CDN_JSPDF);
  try { await document.fonts.load("700 64px Barlow"); await document.fonts.load("400 24px Barlow"); } catch (e) {}
}
// a paleta oficial, como no deck
const AZUL = "#2E3EFC", AMARELO = "#FFFF1A", PRETO = "#000", CINZA = "#787B86", CINZA2 = "#ADAEB3", OFF = "#F6F5F0";
const n0 = v => v == null ? "—" : Math.round(v).toLocaleString("pt-BR");
const n1 = v => v == null ? "—" : Number(v).toFixed(1).replace(".", ",");
const pc = v => v == null ? "—" : Math.round(v * 100) + "%";
const mmaa = m => MESES[+m.slice(5, 7) - 1] + "/" + m.slice(2, 4);
const clTint = c => c === "A" ? "rgba(46,62,252,0.14)" : c === "B" ? "rgba(46,62,252,0.06)" : "transparent";
function slide(kicker, titulo, nota, corpo, extra){
  return `<section class="pg" style="background:${OFF};color:${PRETO};font-family:'Barlow',Arial,Helvetica,sans-serif;padding:72px 128px 96px;display:flex;flex-direction:column;gap:20px;box-sizing:border-box;width:1920px;height:1080px;overflow:hidden;position:relative">
    <div style="display:flex;flex-direction:column;gap:8px"><p style="margin:0;font-size:24px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:${AZUL}">${kicker}</p>
      <div style="display:flex;flex-direction:row;align-items:baseline;gap:24px"><h2 style="margin:0;font-size:64px;font-weight:700;line-height:1.1;color:${PRETO}">${titulo}</h2>${nota ? `<p style="margin:0;font-size:24px;color:${CINZA}">${nota}</p>` : ""}</div></div>
    ${corpo}${extra || ""}
    <p style="position:absolute;left:128px;bottom:40px;margin:0;font-size:22px;color:${CINZA}">Olympikus · ${esc(S._nomeDeck || "")} · Análise Comercial</p></section>`;
}
const th = (t, al, w) => `<th style="${w ? "width:" + w + ";" : ""}text-align:${al || "center"};color:${OFF};font-weight:600;padding:5px 10px;font-size:24px">${t}</th>`;
const td = (t, al, estilo) => `<td style="text-align:${al || "center"};padding:4px 10px;font-size:24px;${estilo || ""}">${t}</td>`;
const tabela = (cab, linhas, larg) => `<table style="width:${larg || 1_664}px;border-collapse:collapse;color:${PRETO}"><tr style="background:${PRETO}">${cab}</tr>${linhas}</table>`;
const cartao = (num, rotulo, azul) => `<div style="flex:1;${azul ? "background:" + AZUL + ";" : "border:2px solid " + PRETO + ";"}padding:28px 32px;border-radius:8px;display:flex;flex-direction:column;gap:8px"><p style="margin:0;font-size:72px;font-weight:800;line-height:1;color:${azul ? AMARELO : PRETO}">${num}</p><p style="margin:0;font-size:26px;line-height:1.3;color:${azul ? OFF : PRETO}">${rotulo}</p></div>`;

function montarApresentacao(d){
  S._nomeDeck = d.nome;
  const pags = [], ESC = d.escopo || {}, reg = ESC.regulador || {}, L = (d.lojas || []).slice().sort((a, b) => (b.v || 0) - (a.v || 0)), rede = L.length === 1;
  const cob = ESC.v ? ESC.e / ESC.v : null;
  const mesesSerie = (() => { const f = d.sazonal && d.sazonal[Object.keys(d.sazonal)[0]]; const ms = f ? Object.keys(f.mensal).sort() : []; return ms.length ? mmaa(ms[0]) + " a " + mmaa(ms[ms.length - 1]) : ""; })();
  // 1 · capa
  pags.push(`<section class="pg" style="background:${AZUL};color:${OFF};font-family:'Barlow',Arial,Helvetica,sans-serif;padding:128px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;width:1920px;height:1080px;overflow:hidden">
    <div style="display:flex;flex-direction:column;gap:32px"><div style="width:160px;height:12px;background:${AMARELO}"></div><p style="margin:0;font-size:32px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Olympikus</p></div>
    <div style="display:flex;flex-direction:column;gap:40px"><h1 style="margin:0;font-size:120px;font-weight:800;line-height:1.02">${esc(d.nome)}<br>Análise Comercial</h1>
      <p style="margin:0;font-size:36px;font-weight:500;line-height:1.35">${esc(d.base.serie || "")}${d.base.lojas ? " · " + esc(d.base.lojas) : ""}</p></div>
    <p style="margin:0;font-size:28px">${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, c => c.toUpperCase())}</p></section>`);
  // 2 · posicionamento: venda × estoque, cobertura, regulador
  const faixa = cob == null ? "" : cob < 4 ? "abaixo de 4 meses: ruptura" : cob > 5 ? "acima de 5 meses: excesso" : "entre 4 e 5 meses: saudável";
  pags.push(slide("Posicionamento · " + esc(reg.escopo || "tênis Olympikus"), "O que importa é a razão venda × estoque", "cobertura saudável entre 4 e 5 meses",
    `<p style="margin:0;font-size:32px;line-height:1.4">A rede vende <b>${n0(ESC.v)} pares/mês</b> no escopo e tem <b>${n0(ESC.e)} pares</b> em estoque: cobertura de <b>${n1(cob)} meses</b>${faixa ? " — " + faixa : ""}. ${reg.total ? "Regulador proposto: <b>" + n0(reg.total) + " pares</b> (" + esc(reg.regra || "") + ")." : ""}</p>
     <div style="display:flex;flex-direction:row;gap:24px">${cartao(n0(ESC.v), "pares/mês de venda média no escopo")}${cartao(n0(ESC.e), "estoque atual nas lojas")}${cartao(n1(cob) + " m", "cobertura atual (estoque ÷ venda)", true)}${reg.total ? cartao(n0(reg.total), "regulador proposto") : cartao(String(L.length), rede ? "rede (sem visão por loja)" : "lojas ativas")}</div>`));
  // 3 · lojas (duas páginas acima de 30)
  const linhaLoja = l => { const sit = l.dif == null ? "—" : l.dif < 0 ? "pede entrada" : (l.reg && l.e / l.reg > 1.1) ? "acima" : "na faixa";
    return `<tr style="background:${clTint(l.cluster)}">${rede ? "" : td(esc(l.cluster || ""), "left")}${td(esc(l.loja), "left")}${td(esc(l.nome || ""), "left")}${td(n0(l.v))}${td(pc(l.part))}${td(n0(l.e))}${td(n1(l.cob))}${td(n0(l.reg))}${td((l.dif < 0 ? "−" : "+") + n0(Math.abs(l.dif || 0)))}${td(sit, "center", l.dif < 0 ? "color:" + AZUL : "")}</tr>`; };
  const cabLoja = `${rede ? "" : th("Cl.", "left", "5%")}${th("Loja", "left", "8%")}${th("Nome", "left", "22%")}${th("Venda/mês")}${th("Partic.")}${th("Estoque")}${th("Cob.")}${th("Regulador")}${th("Diferença")}${th("Situação")}`;
  const totLoja = `<tr style="background:${CINZA2}">${rede ? "" : td("", "left")}${td("<b>Total</b>", "left")}${td(L.length + " lojas", "left")}${td("<b>" + n0(ESC.v) + "</b>")}${td("100%")}${td("<b>" + n0(ESC.e) + "</b>")}${td("<b>" + n1(cob) + "</b>")}${td(n0(L.reduce((s, l) => s + (l.reg || 0), 0)))}${td("")}${td("")}</tr>`;
  const fatias = L.length > 30 ? [L.slice(0, Math.ceil(L.length / 2)), L.slice(Math.ceil(L.length / 2))] : [L];
  fatias.forEach((f, i) => pags.push(slide("Lojas e clusters · " + esc(reg.escopo || ""), "Estoque por porta" + (fatias.length > 1 ? " " + (i + 1) + "/" + fatias.length : ""), "em pares · cobertura em meses · regulador = estoque oficial × participação",
    tabela(cabLoja, f.map(linhaLoja).join("") + (i === fatias.length - 1 ? totLoja : "")))));
  // 4 · categorias (as 8 que mais vendem): tabela por loja + a leitura
  const cats = (d.cats || []).slice().sort((a, b) => ((d.totais[b] || {}).v || 0) - ((d.totais[a] || {}).v || 0)).slice(0, 8);
  for (const c of cats) {
    const t = d.totais[c] || {}, un = (d.unidade || {})[c] || "pares";
    const linhas = L.slice(0, 30).map(l => { const x = (l.cat || {})[c] || {}; return `<tr style="background:${clTint(l.cluster)}">${rede ? "" : td(esc(l.cluster || ""), "left")}${td(esc(l.loja), "left")}${td(n0(x.v))}${td(pc(x.part))}${td(n0(x.e))}${td(n1(x.cob), "center", x.cob != null && x.cob >= 9 ? "color:" + AZUL + ";font-weight:700" : "")}${td(x.idx == null ? "—" : String(x.idx), "center", x.idx >= 110 ? "color:" + AZUL + ";font-weight:700" : "")}</tr>`; }).join("");
    const cab = `${rede ? "" : th("Cl.", "left", "5%")}${th("Loja", "left", "10%")}${th("Venda/mês (" + esc(un) + ")")}${th("Partic.")}${th("Estoque")}${th("Cob.")}${th("Índice")}`;
    pags.push(slide("Categoria · " + esc(c), esc(c), n0(t.v) + " " + esc(un) + "/mês na rede · estoque " + n0(t.e) + " · cobertura " + n1(t.v ? t.e / t.v : null) + " meses",
      `<div style="display:flex;flex-direction:row;gap:32px;align-items:flex-start"><div style="flex:0 0 ${d.leitura && d.leitura[c] ? "1100px" : "1664px"}">${tabela(cab, linhas, d.leitura && d.leitura[c] ? 1_100 : 1_664)}</div>${d.leitura && d.leitura[c] ? `<div style="flex:1;background:${AZUL};color:${OFF};padding:28px 32px;border-radius:8px"><p style="margin:0 0 8px;font-size:22px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${AMARELO}">Leitura</p><p style="margin:0;font-size:26px;line-height:1.4">${esc(d.leitura[c])}</p></div>` : ""}</div>`));
  }
  // 5 · sazonalidade (as 3 famílias que mais vendem): barras SVG, meses na horizontal, picos em amarelo e vales em cinza
  const somaFam = f => Object.values((d.sazonal[f] || {}).mensal || {}).reduce((a, b) => a + b, 0);
  const fams = ordenar(Object.keys(d.sazonal || {}), ORD_FAM).sort((a, b) => somaFam(b) - somaFam(a)).slice(0, 3);
  for (const f of fams) {
    const serie = d.sazonal[f].mensal, meses = Object.keys(serie).sort(), vals = meses.map(m => serie[m] || 0);
    const media = vals.reduce((a, b) => a + b, 0) / (vals.length || 1), max = Math.max(...vals, 1), W = 1_664, H = 300, n = meses.length, lw = W / n, bw = Math.min(40, lw * 0.68);
    const barras = meses.map((m, i) => { const h = vals[i] / max * (H - 44), x = i * lw + (lw - bw) / 2, y = H - 40 - h, pico = vals[i] >= media * 1.15, vale = vals[i] <= media * 0.85;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${pico ? AMARELO : vale ? CINZA2 : AZUL}" ${pico ? `stroke="${PRETO}" stroke-width="2"` : ""}/><text x="${(x + bw / 2).toFixed(1)}" y="${H - 18}" font-size="${n > 24 ? 15 : 18}" text-anchor="middle" fill="${CINZA}" font-family="Barlow, Arial">${mmaa(m)}</text>${n <= 36 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" font-size="15" text-anchor="middle" fill="${PRETO}" font-family="Barlow, Arial">${n0(vals[i])}</text>` : ""}`; }).join("");
    const anos = [...new Set(meses.map(m => m.slice(0, 4)))]; const linhasAno = anos.slice(1).map(a => { const i = meses.findIndex(m => m.startsWith(a)); return `<line x1="${(i * lw).toFixed(1)}" y1="0" x2="${(i * lw).toFixed(1)}" y2="${H - 40}" stroke="${CINZA2}" stroke-width="2"/>`; }).join("");
    const porMes = Array.from({ length: 12 }, () => []); meses.forEach((m, i) => porMes[+m.slice(5, 7) - 1].push(vals[i]));
    const idx = porMes.map(a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) / media * 100 : null);
    const picos = MESES.filter((_, i) => idx[i] != null && idx[i] >= 115), vales = MESES.filter((_, i) => idx[i] != null && idx[i] <= 85);
    const sem = new Map(); meses.forEach((m, i) => { const k = (+m.slice(5, 7) <= 6 ? "1S" : "2S") + m.slice(2, 4); const x = sem.get(k) || { k, n: 0, s: 0 }; x.n++; x.s += vals[i]; sem.set(k, x); });
    const sems = [...sem.values()].map(x => { const ant = sem.get(x.k.slice(0, 2) + String(+x.k.slice(2) - 1).padStart(2, "0")); const v = ant ? (x.s / x.n) / (ant.s / ant.n) - 1 : null; return `<tr>${td(x.k + (x.n < 6 ? " (parcial)" : ""), "left")}${td(n0(x.s / x.n))}${td(n0(x.s))}${td(v == null ? "—" : (v < 0 ? "−" : "+") + Math.abs(Math.round(v * 100)) + "%", "center", v != null && v < 0 ? "color:" + CINZA : "")}</tr>`; }).join("");
    pags.push(slide("Sazonalidade · rede · " + esc(mesesSerie), esc(f), "pares/mês · amarelo = pico · cinza = vale · média do período: " + n0(media),
      `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2_000/svg">${linhasAno}${barras}<line x1="0" y1="${H - 40}" x2="${W}" y2="${H - 40}" stroke="${CINZA}" stroke-width="2"/></svg>
       <div style="display:flex;flex-direction:row;gap:32px;margin-top:8px"><div style="flex:1"><p style="margin:0 0 8px;font-size:24px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${AZUL}">Picos e vales · índice por mês do ano (100 = média)</p>
         <div style="display:flex;flex-direction:row;gap:8px">${MESES.map((m, i) => `<div style="flex:1;text-align:center;padding:10px 0;border-radius:6px;background:${idx[i] == null ? "transparent" : idx[i] >= 115 ? AMARELO : idx[i] <= 85 ? CINZA2 : "rgba(46,62,252,0.10)"}"><p style="margin:0;font-size:22px;font-weight:700">${m}</p><p style="margin:0;font-size:22px">${idx[i] == null ? "—" : Math.round(idx[i])}</p></div>`).join("")}</div>
         <p style="margin:10px 0 0;font-size:24px">picos: <b>${picos.length ? esc(picos.join(", ")) : "nenhum"}</b> · vales: <b>${vales.length ? esc(vales.join(", ")) : "nenhum"}</b></p></div>
       <div style="flex:0 0 620px"><p style="margin:0 0 8px;font-size:24px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${AZUL}">Semestres</p>${tabela(th("Semestre", "left") + th("Média/mês") + th("Total") + th("Variação"), sems, 620)}</div></div>`));
  }
  // 6 · pirâmide de PDV
  if (d.piramide && Object.keys(d.piramide).length) {
    const blocos = ordenar(Object.keys(d.piramide), ORD_FAM).slice(0, 4).map(f => { const fx = d.piramide[f], ent = Object.entries(fx), tot = ent.reduce((s, [, n]) => s + n, 0), un = (d.unidade || {})[f] || "pares";
      const ordem = ent.slice().sort((a, b) => nivel(b[0]) - nivel(a[0]));
      return `<div style="min-width:0"><p style="margin:0 0 10px;font-size:28px;font-weight:700">${esc(f)} <span style="font-size:22px;color:${CINZA};font-weight:500">${n0(tot)} ${esc(un)}</span></p>${ordem.map(([k, n]) => `<div style="display:grid;grid-template-columns:260px 1fr 100px;gap:12px;align-items:center;margin:6px 0"><div style="font-size:22px">${esc(k)}</div><div style="height:28px;background:rgba(173,174,179,0.35)"><div style="width:${tot ? (n / tot * 100).toFixed(1) : 0}%;height:28px;background:${nivelNome(k) === "topo" ? AZUL : nivelNome(k) === "meio" ? AMARELO : CINZA2}"></div></div><div style="font-size:22px;text-align:right"><b>${pc(tot ? n / tot : null)}</b></div></div>`).join("")}</div>`; }).join("");
    pags.push(slide("Pirâmide de PDV · " + esc(d.periodo_piramide || d.base.serie || ""), "Preço: o que a rede vende em cada faixa", "tênis: base 189,99 a 229,99 · meio 249,99 a 299,99 · topo acima de 299,99",
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px 64px">${blocos}</div>`));
  }
  // 7 · ponta de estoque (fora de linha, as 18 maiores)
  if (d.ponta && d.ponta.itens && d.ponta.itens.length) {
    const its = d.ponta.itens.filter(i => i.situacao === "fora de linha").sort((a, b) => (b.estoque || 0) - (a.estoque || 0)).slice(0, 18);
    const T = d.ponta.totais || {}, fdl = T["fora de linha"] || {};
    pags.push(slide("Ponta de estoque · fora de linha · giro até " + esc(mmaa((d.ponta.base.giro_ate || "") + "-01")), "Produto parado para rebaixar", n0(fdl.pares) + " pares em " + (fdl.cores || 0) + " cores fora de linha · " + esc(dinheiroCurto(fdl.valor_pdv)) + " em PDV",
      tabela(th("Modelo", "left", "22%") + th("Ref.", "left") + th("Cor", "left") + th("PDV") + th("Estoque") + th("Venda/mês") + th("Cobertura") + th("Último fat.") + th("Sugestão", "left", "20%"),
        its.map(i => `<tr>${td(esc(i.desc), "left")}${td(esc(i.ref), "left")}${td(esc(i.cor), "left")}${td(i.pdv == null ? "—" : esc(dinheiro(i.pdv)))}${td("<b>" + n0(i.estoque) + "</b>")}${td(i.venda_mes == null ? "—" : n1(i.venda_mes))}${td(n1(i.cobertura), "center", i.cobertura >= 9 ? "color:" + AZUL + ";font-weight:700" : "")}${td(i.ultimo_fat ? esc(mmaa(i.ultimo_fat + "-01")) : "nunca")}${td(esc(i.sugestao || ""), "left")}</tr>`).join(""))));
  }
  // 8 · a leitura (fecho)
  if (d.leitura && Object.keys(d.leitura).length) {
    const ks = Object.keys(d.leitura).slice(0, 6);
    pags.push(slide("Leitura · o que fazer", "Próximos passos por categoria", "",
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">${ks.map(k => `<div style="border:2px solid ${PRETO};border-radius:8px;padding:20px 24px"><p style="margin:0 0 6px;font-size:24px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${AZUL}">${esc(k)}</p><p style="margin:0;font-size:24px;line-height:1.35">${esc(d.leitura[k])}</p></div>`).join("")}</div>`));
  }
  const mes = new Date(); const nomeArq = (String(mes.getMonth() + 1).padStart(2, "0") + "," + String(mes.getFullYear()).slice(2) + " " + String(d.nome).toUpperCase() + " - ANÁLISE COMERCIAL").replace(/[\\/:*?"<>|]+/g, "-");
  return { paginas: pags, nomeArq, css: "" };
}
async function apresentacao(){
  const bt = EL.querySelector("#rx-apres"); const antes = bt ? bt.textContent : "";
  const avisa = t => { if (bt) bt.textContent = t; };
  try {
    let d; try { d = await doc(S.cliente); } catch (e) { alert("O banco recusou: " + e.message); return; }
    if (!d || !d.lojas) { alert("este cliente ainda não tem o raio-x de lojas (o NÚCLEO calcula pela AG PORTA)."); return; }
    avisa("montando…"); await carregarPdfLib();
    const { paginas, nomeArq } = montarApresentacao(d);
    if (paginas.length > 18) throw new Error("a apresentação passou do teto de 18 páginas (" + paginas.length + ")");
    // o palco: 1_920 px de largura, atrás da página (fora da tela sai em branco); uma foto por página
    const q = document.createElement("div"); q.style.cssText = "position:absolute;left:0;top:0;z-index:-1;width:1920px;background:" + OFF + ";pointer-events:none"; q.innerHTML = paginas.join(""); document.body.appendChild(q);
    const pgs = [...q.querySelectorAll(".pg")], pdf = new window.jspdf.jsPDF({ unit: "px", format: [1_920, 1_080], orientation: "landscape", hotfixes: ["px_scaling"] });
    for (let k = 0; k < pgs.length; k++) {
      avisa("gerando o PDF… " + (k + 1) + "/" + pgs.length);
      const cv = await window.html2canvas(pgs[k], { scale: 1, width: 1_920, height: 1_080, backgroundColor: k === 0 ? AZUL : OFF, useCORS: true, logging: false });
      if (k) pdf.addPage([1_920, 1_080], "landscape");
      pdf.addImage(cv.toDataURL("image/jpeg", 0.86), "JPEG", 0, 0, 1_920, 1_080);
    }
    const blob = pdf.output("blob"); q.remove();
    if (pdf.getNumberOfPages() !== paginas.length) throw new Error("o PDF saiu com " + pdf.getNumberOfPages() + " páginas e a apresentação tem " + paginas.length);
    const arquivo = new File([blob], nomeArq + ".pdf", { type: "application/pdf" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) { try { await navigator.share({ files: [arquivo], title: nomeArq }); avisa("compartilhado ✓"); setTimeout(() => avisa(antes), 2.5e3); return; } catch (e) { if (e && e.name === "AbortError") { avisa(antes); return; } } }
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = nomeArq + ".pdf"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30e3);
    avisa("baixado: " + nomeArq + ".pdf"); setTimeout(() => avisa(antes), 4e3);
  } catch (e) { avisa(antes); alert("não montei a apresentação: " + (e.message || e)); }
}
const nivel = k => /TOPO/i.test(k) ? 3 : /MEIO/i.test(k) ? 2 : /BASE/i.test(k) ? 1 : parseFloat(String(k).replace(",", ".")) || 0;
const nivelNome = k => /TOPO/i.test(k) ? "topo" : /MEIO/i.test(k) ? "meio" : /BASE/i.test(k) ? "base" : "";

window.RaioX = { abrir, montarApresentacao, doc, estado: () => ({ cliente: S.cliente, vista: S.vista }), ir: (c, v) => { if (c) S.cliente = c; if (v) S.vista = v; S.cat = null; S.fam = null; } };
})();
