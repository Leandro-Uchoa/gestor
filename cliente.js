/* CLIENTE · a aba por cliente do Gestor (TI, 19/10/2026). Ordem dele: "abre clientes, seleciono o cliente, e dentro vai ter tudo
   referente a ele — raio-x, carteiras, vitrine, gestão e ações de trade, ata, assuntos pendentes; dashboards; um raio-x do cliente".
   Um painel por assunto, cada um com o resumo e o botão que abre a aba inteira já no cliente. Tudo vem de UMA chamada
   (cliente_consulta) — a página é desenho; número mora no banco. Sem número de 4+ dígitos aqui (vai ao repositório público). */
(function () {
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_V = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const fmt = n => n == null ? "—" : Math.round(Number(n)).toLocaleString("pt-BR");
const dec = x => x == null ? "—" : Number(x).toFixed(1).replace(".", ",");
const mesBR = m => m ? MESES[+String(m).slice(5, 7) - 1] + "/" + String(m).slice(2, 4) : "";
const dmy = d => d ? String(d).slice(8, 10) + "/" + String(d).slice(5, 7) + "/" + String(d).slice(2, 4) : "—";
const hoje = () => new Date().toISOString().slice(0, 10);
let LISTA = null, DOCS = {}, EL = null, SB = null, ESC = null;
const S = { cliente: null, form: false, erro: "" };
const nomeDe = c => { const p = (LISTA || []).find(x => x.cliente === c); return p ? p.nome : c; };

async function abrir(sb, el){
  SB = sb; EL = el;
  if (!LISTA) {
    el.innerHTML = `<div class="card">carregando os clientes…</div>`;
    const [r, e] = await Promise.all([sb.rpc("clientes_lista"), sb.from("escritorio").select("id").limit(1)]);
    if (r.error) { el.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    LISTA = r.data || []; ESC = (e.data && e.data[0] && e.data[0].id) || null;
    if (!LISTA.length) { el.innerHTML = `<div class="card mu">Nenhum cliente cadastrado em cliente_perfil ainda. O TI cadastra.</div>`; return; }
    const h = new URLSearchParams(location.hash.slice(1));            // #aba=cliente&cliente=… (outra janela, link) abre no cliente certo
    if (!S.cliente && h.get("cliente") && LISTA.some(c => c.cliente === h.get("cliente"))) S.cliente = h.get("cliente");
  }
  if (!S.cliente || !LISTA.some(c => c.cliente === S.cliente)) S.cliente = LISTA[0].cliente;
  await desenhar();
}

async function doc(cliente, denovo){
  if (DOCS[cliente] && !denovo) return DOCS[cliente];
  const r = await SB.rpc("cliente_consulta", { p_cliente: cliente });
  if (r.error) throw new Error(r.error.message);
  DOCS[cliente] = r.data; return r.data;
}

function chips(id, lista, atual, aoClicar){
  const el = EL.querySelector("#" + id);
  el.innerHTML = lista.map(([v, r]) => `<button type="button" data-v="${esc(v)}" class="${v === atual ? "ativa" : ""}">${esc(r)}</button>`).join("");
  for (const b of el.querySelectorAll("button")) b.onclick = () => aoClicar(b.dataset.v);
}

// o botão que abre a aba inteira já no cliente: index.html expõe irPara(aba, estado)
const ir = (aba, est, rotulo) => `<button type="button" class="sec ir" data-aba="${esc(aba)}" data-est='${esc(JSON.stringify(est || {}))}'>${esc(rotulo)} ›</button>`;
const tit = (nome, sub, botao) => `<div class="sec-tit">${esc(nome)}${sub ? ` <small>${sub}</small>` : ""}${botao || ""}</div>`;

async function desenhar(){
  const el = EL;
  if (!el.querySelector(".cliente")) {
    el.innerHTML = `<div class="cliente">
      <div class="card filtros"><label>cliente</label><div class="chips" id="cl-cli"></div></div>
      <div id="cl-corpo"></div>
    </div>`;
  }
  chips("cl-cli", LISTA.map(c => [c.cliente, c.nome]), S.cliente, v => { S.cliente = v; S.form = false; desenhar(); });
  const corpo = el.querySelector("#cl-corpo");
  corpo.innerHTML = `<div class="card mu">lendo ${esc(nomeDe(S.cliente))}…</div>`;
  let d;
  try { d = await doc(S.cliente); } catch (e) { corpo.innerHTML = `<div class="msg erro">O banco recusou: ${esc(e.message)}</div>`; return; }
  if (!d) { corpo.innerHTML = `<div class="card mu">Nada no banco para este cliente.</div>`; return; }
  corpo.innerHTML = cabecalho(d) + `<div class="grade">${pendentes(d)}${carteiraGiro(d)}${raioX(d)}${vitrine(d)}${atas(d)}${trade(d)}</div>`;
  for (const b of corpo.querySelectorAll("button.ir")) b.onclick = () => { if (window.irPara) window.irPara(b.dataset.aba, JSON.parse(b.dataset.est || "{}")); };
  ligarTrade(corpo, d);
}

// ---------- cabeçalho: nome, condições comerciais e de quando é cada fonte
function cabecalho(d){
  const p = d.perfil || {}, cond = d.condicoes || [];
  const ultimo = (lista, campo) => { const l = lista && lista.length ? lista[lista.length - 1] : null; return l ? { mes: l.mes, base: l[campo || "base_em"] } : null; };
  const uc = ultimo(d.carteira), ug = ultimo(d.giro), rx = d.raio_x, vit = (d.vitrine || [])[0];
  const fontes = [
    uc ? `carteira até ${mesBR(uc.mes)} (base ${dmy(uc.base)})` : "carteira: sem carga",
    ug ? `giro até ${mesBR(ug.mes)} (base ${dmy(ug.base)})` : "giro: sem carga",
    rx ? `raio-x de ${dmy(rx.base_em)}` : "raio-x: ainda não calculado",
    vit ? `vitrine ${esc(vit.colecao)}` : "vitrine: vazia",
  ];
  const porMarca = ["OLY", "UA"].map(m => { const cs = cond.filter(c => c.marca === m); if (!cs.length) return ""; const prazo = cs[0].prazo;
    return `<div><b>${m === "OLY" ? "Olympikus" : "Under Armour"}</b> <small>prazo ${prazo ? prazo + " d" : "—"}</small> ${cs.map(c => `<span class="chip">${esc(nomeTipo(c.tipo))} ${dec(c.markup).replace(",", ",")}</span>`).join("")}</div>`; }).join("");
  return `<div class="card topo">
    <div class="sec-tit"><span class="nome">${esc(p.nome || nomeDe(d.cliente))}</span><small>${esc(d.cliente)}</small></div>
    <div class="cond">${porMarca || `<span class="vazio">sem condição comercial carregada (15+ CONDIÇÕES)</span>`}</div>
    <div class="fontes">${fontes.join(" · ")}</div>
  </div>`;
}
const nomeTipo = t => ({ TENIS: "tênis", CHINELOS: "chinelo", ACESSORIOS: "acessórios", MEIAS: "meias", CONFECCAO: "confecção" }[t] || String(t || "").toLowerCase());

// ---------- assuntos pendentes (TOPICS): o bloco do cliente, urgentes primeiro
function pendentes(d){
  const t = d.topics || {}, itens = t.itens || [], ass = t.assuntos || [];
  const est = { bloco: t.bloco };
  if (!t.bloco) return `<div class="card">${tit("Assuntos pendentes", "", "")}<div class="vazio">este cliente não tem bloco no TOPICS.</div></div>`;
  return `<div class="card">${tit("Assuntos pendentes", "TOPICS · " + esc(t.bloco), ir("topics", est, "abrir no TOPICS"))}
    <div class="num${t.urgentes ? " alerta" : ""}"><div><b>${fmt(t.pendentes)}</b><small>pendentes</small></div><div><b>${fmt(t.urgentes)}</b><small>urgentes</small></div><div><b>${fmt(ass.length)}</b><small>assuntos abertos</small></div></div>
    <div class="chips mini">${ass.map(a => `<span class="chip${a.urg ? " urg" : ""}">${esc(a.sub || "sem assunto")} <b>${a.n}</b></span>`).join("")}</div>
    <div class="lista">${itens.slice(0, 8).map(i => `<div class="ti${i.alerta ? " urg" : ""}">${esc(i.txt)}<small>${esc(i.sub || "")}${i.prazo ? " · " + (i.prazo < hoje() ? "venceu " : "até ") + dmy(i.prazo) : ""}${i.tipo && i.tipo !== "tarefa" ? " · " + esc(i.tipo) : ""}${i.espera_de ? " · espera de " + esc(i.espera_de) : ""}</small></div>`).join("")}
    ${itens.length > 8 ? `<div class="mu" style="font-size:.74rem;margin-top:6px">… e mais ${itens.length - 8} no TOPICS</div>` : ""}${!itens.length ? `<div class="vazio">nada pendente.</div>` : ""}</div>
  </div>`;
}

// ---------- carteira e giro: sellout por mês (barras), estoque, cobertura e a carteira da base dele
function carteiraGiro(d){
  const g = d.giro || [], c = d.carteira || [];
  const est = { cliente: d.cliente };
  if (!g.length && !c.length) return `<div class="card">${tit("Carteira e giro", "", ir("cg", est, "abrir carteira e giro"))}<div class="vazio">sem carga de carteira nem de giro.</div></div>`;
  // o mês em andamento é PARCIAL (a base é de meados do mês): entra na barra marcado, mas fica fora da média que faz a cobertura
  const mesAtual = hoje().slice(0, 7), parcial = x => String(x.mes).slice(0, 7) >= mesAtual;
  const ult = g[g.length - 1], fechados = g.filter(x => !parcial(x)), tres = fechados.slice(-3), media = tres.length ? tres.reduce((s, x) => s + (x.v || 0), 0) / tres.length : 0;
  const cob = ult && media ? ult.e / media : null;
  const serie = g.slice(-12), max = Math.max(1, ...serie.map(x => x.v || 0));
  const barras = `<div class="barras" style="--n:${serie.length}">${serie.map(x => `<div class="${parcial(x) ? "parcial" : ""}" style="height:${Math.round(100 * (x.v || 0) / max)}%" title="${mesBR(x.mes)}: ${fmt(x.v)} pares${parcial(x) ? " (mês em andamento, base " + dmy(x.base_em) + ")" : ""}"><span>${fmt(x.v)}</span></div>`).join("")}</div>
    <div class="eixo" style="--n:${serie.length}">${serie.map(x => `<span>${mesBR(x.mes)}${parcial(x) ? "*" : ""}</span>`).join("")}</div>${serie.some(parcial) ? `<div class="fontes">* mês em andamento (base ${dmy(ult.base_em)}); a cobertura usa a média dos ${tres.length} meses fechados</div>` : ""}`;
  const cart = c.filter(x => (x.fat || 0) + (x.cart || 0) > 0);
  const tabela = cart.length ? `<table class="mini"><thead><tr><th>carteira</th>${cart.map(x => `<th class="n">${mesBR(x.mes)}</th>`).join("")}</tr></thead>
    <tbody><tr><td>faturado</td>${cart.map(x => `<td class="n">${x.fat ? fmt(x.fat) : "—"}</td>`).join("")}</tr><tr><td>em carteira</td>${cart.map(x => `<td class="n c">${x.cart ? fmt(x.cart) : "—"}</td>`).join("")}</tr></tbody></table>` : "";
  return `<div class="card">${tit("Carteira e giro", "sellout por mês · pares", ir("cg", est, "abrir carteira e giro"))}
    <div class="num"><div><b>${ult ? fmt(ult.v) : "—"}</b><small>sellout ${ult ? mesBR(ult.mes) + (parcial(ult) ? "*" : "") : ""}</small></div><div><b>${ult ? fmt(ult.e) : "—"}</b><small>estoque ${ult ? mesBR(ult.mes) : ""}</small></div><div class="${cob != null && (cob > 5 || cob < 4) ? "al" : ""}"><b>${cob != null ? dec(cob) : "—"}</b><small>cobertura (meses)</small></div><div><b>${fmt(c.reduce((s, x) => s + (x.cart || 0), 0))}</b><small>carteira a faturar</small></div></div>
    ${barras}${tabela}
  </div>`;
}

// ---------- raio-x: totais, lojas e a leitura do NÚCLEO
function raioX(d){
  const r = d.raio_x, est = { cliente: d.cliente, vista: "lojas" };
  if (!r) return `<div class="card">${tit("Raio-X", "", "")}<div class="vazio">ainda não calculado para este cliente — o NÚCLEO calcula (AG PORTA) e o TI carrega.</div></div>`;
  const e = r.escopo || {}, reg = e.regulador || {}, lojas = (r.lojas || []).slice().sort((a, b) => (b.part || 0) - (a.part || 0));
  const leit = r.leitura || {}, chaves = Object.keys(leit);
  return `<div class="card">${tit("Raio-X", "base " + dmy(r.base_em) + (r.ponta_em ? " · ponta de estoque " + dmy(r.ponta_em) : ""), ir("raiox", est, "abrir raio-x"))}
    <div class="num"><div><b>${fmt(e.v)}</b><small>sellout/mês</small></div><div><b>${fmt(e.e)}</b><small>estoque</small></div><div><b>${e.v ? dec(e.e / e.v) : "—"}</b><small>cobertura</small></div>${reg.total ? `<div><b>${fmt(reg.total)}</b><small>regulador</small></div>` : ""}<div><b>${fmt(lojas.length)}</b><small>lojas</small></div></div>
    <table class="mini"><thead><tr><th>loja</th><th></th><th class="n">sellout</th><th class="n">estoque</th><th class="n">cob</th><th class="n">part</th></tr></thead>
      <tbody>${lojas.slice(0, 6).map(l => `<tr><td><b>${esc(l.loja)}</b> <span class="mu">${esc(l.nome || "")}</span></td><td><span class="cl cl-${esc(l.cluster || "")}">${esc(l.cluster || "")}</span></td><td class="n">${fmt(l.v)}</td><td class="n">${fmt(l.e)}</td><td class="n">${dec(l.cob)}</td><td class="n">${l.part != null ? Math.round(l.part * 100) + "%" : "—"}</td></tr>`).join("")}</tbody></table>
    ${lojas.length > 6 ? `<div class="mu" style="font-size:.74rem;margin-top:4px">… e mais ${lojas.length - 6} lojas no raio-x</div>` : ""}
    ${chaves.length ? `<div class="leituras">${chaves.slice(0, 3).map(k => `<div class="leitura"><b>${esc(k)}</b> ${esc(leit[k])}</div>`).join("")}${chaves.length > 3 ? `<div class="mu" style="font-size:.74rem">… a leitura das outras ${chaves.length - 3} categorias está no raio-x</div>` : ""}</div>` : ""}
  </div>`;
}

// ---------- vitrine: por coleção, cores e pares por mês
function vitrine(d){
  const vs = d.vitrine || [], sg = d.sugestao || {}, est = { cliente: d.cliente };
  if (!vs.length) return `<div class="card">${tit("Vitrine", "", ir("vitrine", est, "abrir vitrine"))}<div class="vazio">nenhuma cor escolhida ainda.${sg.n ? ` Há sugestão do NÚCLEO (${fmt(sg.n)} cores) esperando.` : ""}</div></div>`;
  return `<div class="card">${tit("Vitrine", sg.n ? `sugestão do NÚCLEO: ${fmt(sg.n)} cores` : "", ir("vitrine", est, "abrir vitrine"))}
    ${vs.map(v => { const m = v.meses || {}, ks = MESES_V.filter(k => k in m); return `<div class="colecao"><div class="num"><div><b>${esc(v.colecao)}</b><small>coleção</small></div><div><b>${fmt(v.n)}</b><small>cores</small></div><div><b>${fmt(v.pares)}</b><small>pares</small></div></div>
      ${ks.length ? `<table class="mini"><thead><tr>${ks.map(k => `<th class="n">${k.toLowerCase()}</th>`).join("")}</tr></thead><tbody><tr>${ks.map(k => `<td class="n">${fmt(m[k])}</td>`).join("")}</tr></tbody></table>` : `<div class="mu" style="font-size:.74rem">sem pares por mês ainda</div>`}</div>`; }).join("")}
  </div>`;
}

// ---------- atas: as últimas, com a marca de quem já tem versão do cliente
function atas(d){
  const as = d.atas || [], p = d.perfil || {}, est = { pasta: p.pasta_ata };
  return `<div class="card">${tit("Atas", as.length ? fmt(as.length) + " últimas" : "", ir("atas", est, "abrir atas"))}
    ${as.length ? `<div class="lista">${as.slice(0, 6).map(a => `<div class="ti"><b>${dmy(a.data)}</b> ${esc(a.titulo)}<small>${(a.assunto || []).filter(x => x !== p.pasta_ata).map(esc).join(" · ")}${a.tem_cliente ? " · <i>versão do cliente pronta</i>" : ""}</small></div>`).join("")}</div>` : `<div class="vazio">nenhuma ata na pasta ${esc(p.pasta_ata || "—")}.</div>`}
  </div>`;
}

// ---------- trade: as ações do cliente (trade_acao) e o que o TOPICS tem de trade sobre ele
const TIPOS_TRADE = ["campanha", "material", "evento", "verba", "treinamento", "outro"], STATUS_TRADE = ["planejada", "em andamento", "feita", "cancelada"];
function trade(d){
  const t = d.trade || {}, acoes = t.acoes || [], tp = t.topics || [];
  return `<div class="card trade">${tit("Ações de trade", acoes.length ? fmt(acoes.length) + " ações" : "", `<button type="button" class="sec ir-form">+ ação</button>`)}
    ${acoes.length ? `<table class="mini"><thead><tr><th>ação</th><th>tipo</th><th>quando</th><th>status</th><th class="n">verba</th></tr></thead><tbody>${acoes.map(a => `<tr><td><b>${esc(a.titulo)}</b>${a.loja ? ` <span class="mu">${esc(a.loja)}</span>` : ""}${a.nota ? `<small class="mu">${esc(a.nota)}</small>` : ""}</td><td>${esc(a.tipo)}</td><td>${a.inicio ? dmy(a.inicio) : "—"}${a.fim ? " → " + dmy(a.fim) : ""}</td><td><select class="st" data-id="${a.id}">${STATUS_TRADE.map(s => `<option ${s === a.status ? "selected" : ""}>${s}</option>`).join("")}</select></td><td class="n">${a.verba != null ? "R$ " + fmt(a.verba) : "—"}</td></tr>`).join("")}</tbody></table>` : `<div class="vazio">nenhuma ação de trade registrada para ${esc(nomeDe(d.cliente))}. Trade está adormecido: quando vier de cima, cai aqui.</div>`}
    ${tp.length ? `<div class="sub-tit">no TOPICS</div><div class="lista">${tp.map(i => `<div class="ti${i.feito ? " feito" : ""}">${esc(i.txt)}<small>${esc(i.bloco)} · ${esc(i.sub || "")}</small></div>`).join("")}</div>` : ""}
    <div id="cl-trade-form" class="${S.form ? "" : "oculto"}">${formTrade()}</div>
    <div id="cl-trade-msg"></div>
  </div>`;
}
function formTrade(){
  return `<form class="trade"><input name="titulo" placeholder="ação (ex.: campanha de Dia das Mães)" class="larga" required>
    <select name="tipo">${TIPOS_TRADE.map(t => `<option>${t}</option>`).join("")}</select><input name="loja" placeholder="loja (se for de uma só)">
    <input name="inicio" type="date" title="início"><input name="fim" type="date" title="fim">
    <select name="status">${STATUS_TRADE.map(t => `<option>${t}</option>`).join("")}</select><input name="verba" type="number" step="0.01" min="0" placeholder="verba R$">
    <input name="fonte" placeholder="de onde veio (e-mail, ata, ordem)"><input name="nota" placeholder="nota" class="larga">
    <div class="larga"><button type="submit">gravar ação</button> <button type="button" class="sec fechar">cancelar</button></div></form>`;
}
function ligarTrade(corpo, d){
  const bt = corpo.querySelector(".ir-form"), box = corpo.querySelector("#cl-trade-form"), msg = corpo.querySelector("#cl-trade-msg");
  if (!bt) return;
  bt.onclick = () => { S.form = !S.form; box.classList.toggle("oculto", !S.form); if (S.form) box.querySelector("input[name=titulo]").focus(); };
  box.querySelector(".fechar").onclick = () => { S.form = false; box.classList.add("oculto"); };
  box.querySelector("form").onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target), v = n => (f.get(n) || "").toString().trim() || null;
    const linha = { escritorio_id: ESC, cliente: d.cliente, titulo: v("titulo"), tipo: v("tipo") || "campanha", loja: v("loja"), inicio: v("inicio"), fim: v("fim"), status: v("status") || "planejada", verba: v("verba") ? Number(v("verba")) : null, nota: v("nota"), fonte: v("fonte") };
    if (!linha.titulo) return;
    msg.innerHTML = `<div class="msg ok">gravando…</div>`;
    const r = await SB.from("trade_acao").insert(linha);
    if (r.error) { msg.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    S.form = false; await doc(d.cliente, true); desenhar();
  };
  for (const sel of corpo.querySelectorAll("select.st")) sel.onchange = async () => {
    const r = await SB.from("trade_acao").update({ status: sel.value, atualizado_em: new Date().toISOString() }).match({ id: Number(sel.dataset.id) });
    if (r.error) { msg.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    await doc(d.cliente, true);
  };
}

window.Cliente = { abrir, estado: () => ({ cliente: S.cliente }), ir: c => { S.cliente = c; } };
})();
