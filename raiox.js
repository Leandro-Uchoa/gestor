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
let LISTA = null, DOCS = {}, EL = null, SB = null;
const S = { cliente: null, vista: "lojas", cat: null, fam: null, sub: "" };

async function abrir(sb, el){
  SB = sb; EL = el;
  if (!LISTA) {
    el.innerHTML = `<div class="card">carregando o raio-x…</div>`;
    const r = await sb.rpc("raio_x_lista");
    if (r.error) { el.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    LISTA = r.data || [];
    if (!LISTA.length) { el.innerHTML = `<div class="card mu">Nenhum cliente com raio-x ainda. O NÚCLEO calcula (AG PORTA) e o TI carrega.</div>`; return; }
    S.cliente = S.cliente || LISTA[0].cliente;
  }
  await desenhar();
}

async function doc(cliente){
  if (DOCS[cliente]) return DOCS[cliente];
  const r = await SB.rpc("raio_x_consulta", { p_cliente: cliente });
  if (r.error) throw new Error(r.error.message);
  DOCS[cliente] = r.data; return r.data;
}

function chips(id, lista, atual, aoClicar){
  const el = EL.querySelector("#" + id);
  el.innerHTML = lista.map(([v, r, n]) => `<button type="button" data-v="${esc(v)}" class="${v === atual ? "ativa" : ""}">${esc(r)}${n != null ? ` <small>${esc(n)}</small>` : ""}</button>`).join("");
  for (const b of el.querySelectorAll("button")) b.onclick = () => aoClicar(b.dataset.v);
}

const badge = c => `<span class="cl cl-${esc(c)}">${esc(c)}</span>`;

async function desenhar(){
  const el = EL;
  if (!el.querySelector(".raiox")) {
    el.innerHTML = `<div class="raiox">
      <div class="card filtros">
        <label>cliente</label><div class="chips" id="rx-cli"></div>
        <label>vista</label><div class="chips" id="rx-vista"></div>
        <div class="mu" id="rx-base"></div>
      </div>
      <div id="rx-corpo"></div>
    </div>`;
  }
  chips("rx-cli", LISTA.map(c => [c.cliente, c.nome]), S.cliente, v => { S.cliente = v; S.cat = null; S.fam = null; S.sub = ""; desenhar(); });
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
  const L = d.lojas, maxV = Math.max(...L.map(l => l.v));
  const reg = d.escopo.regulador;
  const tot = { v: d.escopo.v, e: d.escopo.e, reg: L.reduce((s, l) => s + l.reg, 0) };
  const linha = l => `<tr>
      <td>${badge(l.cluster)}</td><td class="loja">${esc(l.loja)}</td><td class="nome">${esc(l.nome)}${l.codigo ? `<span class="mu cod">${esc(l.codigo)}</span>` : ""}</td>
      <td class="n"><div class="barra" style="--w:${(l.v / maxV * 100).toFixed(0)}%"><span>${fmt(l.v)}</span></div></td>
      <td class="n">${pct(l.part)}</td><td class="n">${fmt(l.e)}</td><td class="n">${dec(l.cob)}</td><td class="n">${fmt(l.reg)}</td>
      <td class="n ${l.dif < 0 ? "pede" : "sobra"}">${l.dif < 0 ? "−" : "+"}${fmt(Math.abs(l.dif))}<small>${l.dif < 0 ? "pede entrada" : "acima do regulador"}</small></td></tr>`;
  return `<div class="card">
    <div class="sec-tit">RESUMO POR LOJA <small>${esc(reg.escopo)} · regulador = ${esc(reg.regra)} · ${fmt(reg.total)} pares</small></div>
    <div class="rolagem"><table class="rx">
      <thead><tr><th>cluster</th><th>loja</th><th>nome</th><th class="n">venda/mês</th><th class="n">partic.</th><th class="n">estoque</th><th class="n">cobertura</th><th class="n">regulador</th><th class="n">estoque − regulador</th></tr></thead>
      <tbody>${L.map(linha).join("")}</tbody>
      <tfoot><tr><td></td><td colspan="2">rede · ${L.length} lojas</td><td class="n">${fmt(tot.v)}</td><td class="n">100%</td><td class="n">${fmt(tot.e)}</td><td class="n">${dec(tot.e / tot.v)}</td><td class="n">${fmt(tot.reg)}</td>
        <td class="n ${tot.e - tot.reg < 0 ? "pede" : "sobra"}">${tot.e - tot.reg < 0 ? "−" : "+"}${fmt(Math.abs(tot.e - tot.reg))}</td></tr></tfoot>
    </table></div>
    <div class="legenda mu">${badge("A")} perto de 500 pares/mês · ${badge("B")} de 230 a 290 · ${badge("C")} de 140 a 216 · cobertura em meses = estoque ÷ venda/mês · amarelo = abaixo do regulador, pede entrada</div>
  </div>`;
}

// ---- CATEGORIAS: a leitura no topo e a tabela por loja; índice 100 = a loja vende a categoria na proporção dela
function vistaCat(d, corpo){
  S.cat = S.cat || d.cats[0];
  const unid = c => (d.unidade || {})[c] || "pares";
  corpo.innerHTML = `<div class="card filtros"><label>categoria</label><div class="chips" id="rx-cat"></div></div><div id="rx-cat-corpo"></div>`;
  chips("rx-cat", d.cats.map(c => [c, c, fmt(d.totais[c].v) + "/mês"]), S.cat, v => { S.cat = v; vistaCat(d, corpo); });
  const c = S.cat, t = d.totais[c], L = d.lojas, maxV = Math.max(...L.map(l => l.cat[c].v));
  const linha = l => { const x = l.cat[c]; const idx = x.idx == null ? null : Math.min(x.idx, 200);
    return `<tr>
      <td>${badge(l.cluster)}</td><td class="loja">${esc(l.loja)}</td><td class="nome">${esc(l.nome)}</td>
      <td class="n"><div class="barra" style="--w:${maxV ? (x.v / maxV * 100).toFixed(0) : 0}%"><span>${fmt(x.v)}</span></div></td>
      <td class="n">${pct(x.part)}</td><td class="n">${fmt(x.e)}</td><td class="n ${x.cob != null && x.cob >= 9 ? "pesado" : ""}">${dec(x.cob)}</td>
      <td class="n idx ${x.idx == null ? "" : x.idx >= 120 ? "alto" : x.idx <= 80 ? "baixo" : ""}"><div class="ibar" style="--w:${idx == null ? 0 : (idx / 2).toFixed(0)}%"><i></i><span>${x.idx == null ? "—" : x.idx}</span></div></td></tr>`; };
  corpo.querySelector("#rx-cat-corpo").innerHTML = `<div class="card">
    <div class="sec-tit">${esc(c)} <small>${fmt(t.v)} ${esc(unid(c))}/mês na rede · estoque ${fmt(t.e)} · cobertura ${dec(t.v ? t.e / t.v : null)} meses</small></div>
    ${d.leitura[c] ? `<div class="leitura">${esc(d.leitura[c])}</div>` : ""}
    <div class="rolagem"><table class="rx">
      <thead><tr><th>cluster</th><th>loja</th><th>nome</th><th class="n">venda/mês (${esc(unid(c))})</th><th class="n">partic.</th><th class="n">estoque</th><th class="n">cobertura</th><th class="n">índice <small>100 = proporção da loja</small></th></tr></thead>
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
const nivel = k => /TOPO/i.test(k) ? 3 : /MEIO/i.test(k) ? 2 : /BASE/i.test(k) ? 1 : parseFloat(String(k).replace(",", ".")) || 0;
const nivelNome = k => /TOPO/i.test(k) ? "topo" : /MEIO/i.test(k) ? "meio" : /BASE/i.test(k) ? "base" : "";

window.RaioX = { abrir };
})();
