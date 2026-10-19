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
const S = { cliente: null, form: false, erro: "", todosTopics: false, cartAberta: false };
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
      <div class="card filtros"><div class="linha-sel"><div id="cl-cli"></div><span class="mu" id="cl-conta"></span></div></div>
      <div id="cl-corpo"></div>
    </div>`;
  }
  window.GestorLib.seletor(el.querySelector("#cl-cli"), "cliente", LISTA.map(c => [c.cliente, c.nome]), { v: S.cliente }, v => { S.cliente = v; S.form = false; S.cartAberta = false; desenhar(); }, { unico: true, nomeDe });
  el.querySelector("#cl-conta").textContent = LISTA.length + " clientes";
  const corpo = el.querySelector("#cl-corpo");
  corpo.innerHTML = `<div class="card mu">lendo ${esc(nomeDe(S.cliente))}…</div>`;
  let d;
  try { d = await doc(S.cliente); } catch (e) { corpo.innerHTML = `<div class="msg erro">O banco recusou: ${esc(e.message)}</div>`; return; }
  if (!d) { corpo.innerHTML = `<div class="card mu">Nada no banco para este cliente.</div>`; return; }
  S.erro = "";
  corpo.innerHTML = cabecalho(d) + `<div class="grade">${pendentes(d)}${carteiraGiro(d)}${raioX(d)}${vitrine(d)}${atas(d)}${trade(d)}${carteiraDetalhada(d)}${pedidosOriginais(d)}</div>`;
  const ligarIr = () => { for (const b of corpo.querySelectorAll("button.ir")) b.onclick = () => { if (window.irPara) window.irPara(b.dataset.aba, JSON.parse(b.dataset.est || "{}")); }; };
  ligarIr(); ligarTrade(corpo, d); ligarTopics(corpo, d);
  desenharCarteira(corpo, d).then(ligarIr); desenharPedidos(corpo, d);
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
  const est = { bloco: t.bloco }, n = S.todosTopics ? itens.length : 8;
  if (!t.bloco) return `<div class="card">${tit("TOPICS", "", "")}<div class="vazio">este cliente não tem bloco no TOPICS.</div></div>`;
  return `<div class="card pend">${tit("TOPICS", esc(t.bloco) + " · vivo: marca feito e responde aqui", ir("topics", est, "ver melhor no TOPICS"))}
    <div class="num${t.urgentes ? " alerta" : ""}"><div><b>${fmt(t.pendentes)}</b><small>pendentes</small></div><div><b>${fmt(t.urgentes)}</b><small>urgentes</small></div><div><b>${fmt(ass.length)}</b><small>assuntos abertos</small></div></div>
    <div class="chips mini">${ass.map(a => `<span class="chip${a.urg ? " urg" : ""}">${esc(a.sub || "sem assunto")} <b>${a.n}</b></span>`).join("")}</div>
    ${S.erro ? `<div class="msg erro">${esc(S.erro)}</div>` : ""}
    <div class="lista">${itens.slice(0, n).map(i => `<div class="ti${i.alerta ? " urg" : ""}" data-id="${esc(i.id)}"><button type="button" class="marca" title="marcar como feito"></button><div class="corpo">${esc(i.txt)}<small>${esc(i.sub || "")}${i.prazo ? " · " + (i.prazo < hoje() ? "venceu " : "até ") + dmy(i.prazo) : ""}${i.tipo && i.tipo !== "tarefa" ? " · " + esc(i.tipo) : ""}${i.espera_de ? " · espera de " + esc(i.espera_de) : ""}${i.delegado ? " · " + esc(i.delegado) : ""}</small><div class="resposta" contenteditable="true" data-id="${esc(i.id)}" data-antes="${esc(i.resposta || "")}">${esc(i.resposta || "")}</div></div></div>`).join("")}
    ${itens.length > 8 ? `<button type="button" class="sec ver-mais">${S.todosTopics ? "mostrar só 8" : "ver os " + itens.length}</button>` : ""}${!itens.length ? `<div class="vazio">nada pendente.</div>` : ""}</div>
  </div>`;
}

// ---------- carteira e giro: sellout por mês (barras), estoque, cobertura e a carteira da base dele
function carteiraGiro(d){
  const g = d.giro || [], c = d.carteira || [];
  const est = { cliente: d.cliente };
  if (!g.length && !c.length) return `<div class="card">${tit("Análise de giro", "AG", ir("cg", est, "abrir a AG"))}<div class="vazio">sem carga de carteira nem de giro.</div></div>`;
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
  return `<div class="card">${tit("Análise de giro", "AG · sellout por mês · pares", ir("cg", est, "abrir a AG"))}
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
const TIPOS_TRADE = ["campanha", "material", "evento", "verba", "treinamento", "outro"], STATUS_TRADE = ["planejada", "em andamento", "feita", "cancelada", "não usada"];
const rs = n => n == null ? "—" : "R$ " + fmt(n);
function trade(d){
  const t = d.trade || {}, acoes = t.acoes || [], tp = t.topics || [];
  return `<div class="card trade">${tit("Ações de trade", acoes.length ? fmt(acoes.length) + " ações" : "", `<button type="button" class="sec ir-form">+ ação</button>`)}
    ${acoes.length ? `<div class="num">${(() => { const t = k => acoes.reduce((s, a) => s + (Number(a[k]) || 0), 0); const prov = t("provisionado"), ut = t("utilizada"); const rest = acoes.reduce((s, a) => s + (a.restante != null ? Number(a.restante) : (Number(a.provisionado) || 0) - (Number(a.utilizada) || 0)), 0); return `<div><b>${rs(prov)}</b><small>provisionado</small></div><div><b>${rs(ut)}</b><small>utilizada</small></div><div class="${rest > 0 ? "al" : ""}"><b>${rs(rest)}</b><small>restante</small></div>`; })()}</div>
    <table class="mini"><thead><tr><th>sem.</th><th>ação</th><th class="n">provisionado</th><th class="n">utilizada</th><th class="n">restante</th><th>status</th></tr></thead><tbody>${acoes.map(a => `<tr><td>${esc(a.semestre || (a.inicio ? dmy(a.inicio) : "—"))}</td><td><b>${esc(a.titulo)}</b>${a.tipo && a.tipo !== "outro" ? ` <span class="chip">${esc(a.tipo)}</span>` : ""}${a.loja ? ` <span class="mu">${esc(a.loja)}</span>` : ""}${a.vendedor ? ` <span class="mu">· ${esc(a.vendedor)}${a.portas ? " · " + a.portas + " portas" : ""}</span>` : ""}${a.nota ? `<small class="mu">${esc(a.nota)}</small>` : ""}</td><td class="n">${rs(a.provisionado != null ? a.provisionado : a.verba)}</td><td class="n">${a.utilizada != null ? rs(a.utilizada) : "—"}</td><td class="n c">${a.restante != null ? rs(a.restante) : "—"}</td><td><select class="st" data-id="${a.id}">${STATUS_TRADE.map(s => `<option ${s === a.status ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>` : `<div class="vazio">nenhuma ação de trade registrada para ${esc(nomeDe(d.cliente))} — nem na planilha de verbas, nem lançada aqui.</div>`}
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
    S.form = false; await doc(d.cliente, true); if (window.Trade) Trade.recarregar(); desenhar();
  };
  for (const sel of corpo.querySelectorAll("select.st")) sel.onchange = async () => {
    const r = await SB.from("trade_acao").update({ status: sel.value, atualizado_em: new Date().toISOString() }).match({ id: Number(sel.dataset.id) });
    if (r.error) { msg.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    await doc(d.cliente, true); if (window.Trade) Trade.recarregar();
  };
}


// ---------- TOPICS VIVO dentro do cliente (ele, 19/10 19:0x: "que eu não precise abrir o TOPICS para atualizar; faço a manutenção ali")
// marca feito / desfaz e responde, gravando em topics_item como a aba TOPICS (a política do banco é a mesma: só quem está em topics_leitor)
let EMAIL = null;
async function email(){ if (EMAIL !== null) return EMAIL; try { const s = await SB.auth.getSession(); EMAIL = (s.data && s.data.session && s.data.session.user && s.data.session.user.email) || ""; } catch (e) { EMAIL = ""; } return EMAIL; }
async function gravarTopic(id, patch, d){
  const r = await SB.from("topics_item").update(Object.assign({ atualizado_por: (await email()) || null }, patch)).match({ escritorio_id: ESC, id });
  if (r.error) { S.erro = "O banco recusou: " + r.error.message; return false; }
  if (window.Topics && Topics.recarregar) Topics.recarregar();
  await doc(d.cliente, true); return true;
}
function ligarTopics(corpo, d){
  const box = corpo.querySelector(".pend"); if (!box) return;
  for (const b of box.querySelectorAll(".marca")) b.onclick = async () => { const id = b.closest(".ti").dataset.id; b.disabled = true; if (await gravarTopic(id, { feito: true }, d)) desenhar(); else { b.disabled = false; desenhar(); } };
  for (const r of box.querySelectorAll(".resposta")) {
    r.onkeydown = ev => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); r.blur(); } };
    r.onblur = async () => { const v = r.textContent.trim(); if (v !== (r.dataset.antes || "")) { if (await gravarTopic(r.dataset.id, { resposta: v || null }, d)) desenhar(); } };
  }
  const mais = box.querySelector(".ver-mais"); if (mais) mais.onclick = () => { S.todosTopics = !S.todosTopics; desenhar(); };
}

// ---------- CARTEIRA DETALHADA viva (ele, 19/10 19:1x: "que eu possa manusear como no Excel: cancelar, transferir, cancelar parcial,
// repasse total, repasse parcial, em análise — deixa ela viva"). Lê carteira_consulta; a decisão grava em carteira_linha (só as colunas
// de decisão; a planilha dele fica como *_xl, ao lado, e o histórico vai para carteira_decisao por gatilho). A página não escreve xlsx.
const ACOES = ["", "OK", "CANCELAR", "CANCELAR PARCIAL", "TRANSFERIR", "TRANSF PARCIAL", "REPASSAR", "REPASSE PARCIAL", "ANALISAR", "DISTRIBUIR", "ANTECIPAR", "POSTERGAR", "AGUARDAR", "REVER"];
const STATUS_C = ["", "PENDENTE", "SOLICITADO", "PROCESSANDO", "OK"];
const CF = { mes: new Set(), marca: new Set(), porta: new Set(), acao: new Set(), busca: "", so: "cart" };
let CART = {};
async function carteiraDoc(cliente, denovo){
  if (CART[cliente] && !denovo) return CART[cliente];
  const r = await SB.rpc("carteira_consulta", { p_cliente: cliente });
  if (r.error) throw new Error(r.error.message);
  CART[cliente] = r.data; return r.data;
}
const grupoAcao = a => { const t = String(a || "").toUpperCase(); if (!t) return ""; if (["CASA PIO", "PIO", "LEO", "LÉO", "CMS"].includes(t)) return "MARCADA"; if (/^(FATURADO|OK|AMOSTRA)/.test(t)) return "OK"; if (t.startsWith("CANC")) return "CANCELAR"; if (t.startsWith("TRANSF")) return "TRANSFERIR"; if (t.startsWith("REPASS") || t.startsWith("EM REPASSE") || t.startsWith("PARCIAL REPASSE")) return "REPASSAR"; if (/^(ANALIS|AVALIAR|AGUARDAR|CONFIRMAR|INVESTIGAR|REVER|PENDENTE)/.test(t)) return "ANALISAR"; if (t.startsWith("DISTRIB")) return "DISTRIBUIR"; if (t.startsWith("ANTECIP")) return "ANTECIPAR"; if (t.startsWith("POSTERG")) return "POSTERGAR"; return "OUTRA"; };
function carteiraDetalhada(d){
  return `<div class="card cartd${S.cartAberta ? " larga" : " fechada"}" id="cl-cart">${tit("Carteira detalhada", "", "")}<div class="mu">lendo a carteira…</div></div>`;
}
async function desenharCarteira(corpo, d){
  const box = corpo.querySelector("#cl-cart"); if (!box) return;
  let c; try { c = await carteiraDoc(d.cliente); } catch (e) { box.innerHTML = tit("Carteira detalhada") + `<div class="msg erro">O banco recusou: ${esc(e.message)}</div>`; return; }
  const L = c.linhas || [];
  if (!L.length) { box.innerHTML = tit("Carteira detalhada") + `<div class="vazio">sem linhas de carteira para este cliente no banco (a DETALHADA só tem Ban Ban, Noroeste, Sapataria Nova, Polyélle, Casa Pio e CMS).</div>`; return; }
  const mesDe = x => x.prev ? String(x.prev).slice(0, 7) : "sem prev";
  const efetiva = x => x.a || x.axl || "";
  const passa = x => (CF.so !== "cart" || x.cart > 0) && (!CF.mes.size || CF.mes.has(mesDe(x))) && (!CF.marca.size || CF.marca.has(x.m || "")) && (!CF.porta.size || CF.porta.has(x.porta || "")) && (!CF.acao.size || CF.acao.has(grupoAcao(efetiva(x)) || "(vazia)"))
    && (!CF.busca || (x.r + " " + (x.d || "") + " " + x.c + " " + (x.gci || "") + " " + (x.oc || "") + " " + (x.porta || "") + " " + efetiva(x) + " " + (x.dest || x.dxl || "")).toUpperCase().includes(CF.busca.toUpperCase()));
  const vivas = L.filter(x => CF.so !== "cart" || x.cart > 0), lista = L.filter(passa);
  const conta = f => { const m = new Map(); for (const x of vivas) { const k = f(x); m.set(k, (m.get(k) || 0) + 1); } return [...m.entries()].sort(); };
  const chip = (id, sel, lista, rot) => `<div class="linha"><label>${rot}</label><div class="chips" data-f="${id}">${[["", "todos"], ...lista].map(([v, n]) => `<button type="button" data-v="${esc(v)}" class="${(v === "" ? !sel.size : sel.has(v)) ? "ativa" : ""}">${esc(v === "" ? "todos" : (id === "mes" && v !== "sem prev" ? mesBR(v + "-01") : v))}${n != null ? ` <small>${n}</small>` : ""}</button>`).join("")}</div></div>`;
  const cart = lista.reduce((s, x) => s + (x.cart || 0), 0), porAcao = new Map(); for (const x of lista) { const g = grupoAcao(efetiva(x)) || "(vazia)"; porAcao.set(g, (porAcao.get(g) || 0) + (x.cart || 0)); }
  const btExp = `<button type="button" class="sec expandir">${S.cartAberta ? "recolher ▴" : "tratar a carteira ›"}</button>`;
  if (!S.cartAberta) {
    // o cartão PEQUENO: só o placar; apertar abre a mesa inteira
    const tot = vivas.reduce((s, x) => s + (x.cart || 0), 0), pa = new Map(); for (const x of vivas) { const g = grupoAcao(efetiva(x)) || "(vazia)"; pa.set(g, (pa.get(g) || 0) + (x.cart || 0)); }
    const decididas = vivas.filter(x => x.a).length, pend = vivas.filter(x => !efetiva(x)).length;
    box.className = "card cartd fechada";
    box.innerHTML = tit("Carteira detalhada", `base ${dmy(c.base_em)}`, btExp) + `<div class="num"><div><b>${fmt(tot)}</b><small>pares em carteira</small></div><div><b>${fmt(vivas.length)}</b><small>linhas</small></div><div class="${pend ? "al" : ""}"><b>${fmt(pend)}</b><small>sem ação</small></div><div><b>${fmt(decididas)}</b><small>decididas na tela</small></div></div>
      <div class="chips mini">${[...pa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([g, n]) => `<span class="chip">${esc(g.toLowerCase())} <b>${fmt(n)}</b></span>`).join("")}</div>`;
    box.querySelector(".expandir").onclick = () => { S.cartAberta = true; box.className = "card cartd larga"; desenharCarteira(corpo, d); box.scrollIntoView({ behavior: "smooth", block: "start" }); };
    return;
  }
  box.className = "card cartd larga";
  box.innerHTML = tit("Carteira detalhada", `base ${dmy(c.base_em)} · ${fmt(c.n_total)} linhas vivas no banco`, btExp + ir("cg", { cliente: d.cliente }, "abrir a AG")) + `
    <div class="filtros">${chip("mes", CF.mes, conta(mesDe), "prev. fat.")}${chip("marca", CF.marca, conta(x => x.m || ""), "marca")}${chip("porta", CF.porta, conta(x => x.porta || ""), "porta")}${chip("acao", CF.acao, conta(x => grupoAcao(efetiva(x)) || "(vazia)"), "ação")}
      <div class="linha"><label>mostrar</label><div class="chips" data-f="so"><button type="button" data-v="cart" class="${CF.so === "cart" ? "ativa" : ""}">só carteira aberta</button><button type="button" data-v="tudo" class="${CF.so === "tudo" ? "ativa" : ""}">com faturado recente</button></div><input type="search" id="cl-cart-busca" placeholder="referência, descrição, cor, GCI, OC, porta…" value="${esc(CF.busca)}" autocomplete="off"></div></div>
    <div class="num"><div><b>${fmt(cart)}</b><small>pares na tela</small></div><div><b>${fmt(lista.length)}</b><small>linhas</small></div>${[...porAcao.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g, n]) => `<div><b>${fmt(n)}</b><small>${esc(g.toLowerCase())}</small></div>`).join("")}</div>
    <div class="rolagem"><table class="mini cart"><thead><tr><th>porta</th><th>produto</th><th>GCI</th><th class="n">prev</th><th class="n">CART</th><th class="n">FAT</th><th>ação</th><th class="n">vol.</th><th>destinatário</th><th>status</th><th>nota</th></tr></thead>
      <tbody>${lista.slice(0, 400).map(x => { const dif = x.a && x.axl && x.a !== x.axl; return `<tr data-k="${esc(x.k)}" class="${x.a ? "decidida" : ""}">
        <td>${esc(x.porta || "")}<small>${esc(x.m || "")}${x.fx ? " · " + esc(x.fx) : ""}</small></td>
        <td><b>${esc(x.d || x.r)}</b> ${esc(x.c)}<small>${esc(x.r)}${x.oc ? " · OC " + esc(x.oc) : ""}${x.lin ? " · linha " + x.lin : ""}</small></td>
        <td>${esc(x.gci || "")}</td><td class="n">${x.prev ? dmy(x.prev) : "—"}</td><td class="n c">${fmt(x.cart)}</td><td class="n">${x.fat ? fmt(x.fat) + (x.dfat ? `<small>${dmy(x.dfat)}</small>` : "") : "—"}</td>
        <td><select class="dec" data-campo="acao">${ACOES.map(a => `<option value="${a}" ${(x.a || "") === a ? "selected" : ""}>${a || "—"}</option>`).join("")}</select>${x.axl ? `<small class="xl ${dif ? "dif" : ""}" title="o que está na planilha dele">planilha: ${esc(x.axl)}${x.vxl ? " " + esc(x.vxl) : ""}${x.dxl ? " → " + esc(x.dxl) : ""}</small>` : ""}</td>
        <td class="n"><input type="number" class="dec" data-campo="volume" min="0" value="${x.v != null ? x.v : ""}" placeholder="${x.cart}"></td>
        <td><input type="text" class="dec" data-campo="destinatario" value="${esc(x.dest || "")}" placeholder="${esc(x.dxl || "")}"></td>
        <td><select class="dec" data-campo="status">${STATUS_C.map(s => `<option value="${s}" ${(x.s || "").split(" ")[0] === s ? "selected" : ""}>${s || "—"}</option>`).join("")}</select>${x.sxl ? `<small class="xl">planilha: ${esc(x.sxl)}</small>` : ""}${x.s && x.s.startsWith("SOLICITADO") ? `<small>${esc(x.s)}</small>` : ""}</td>
        <td><input type="text" class="dec" data-campo="nota" value="${esc(x.n || "")}" placeholder="nota">${x.q ? `<small class="mu">${esc(x.q.split("@")[0])} · ${dmy(x.em)}</small>` : ""}</td></tr>`; }).join("")}</tbody></table></div>
    ${lista.length > 400 ? `<div class="mu" style="font-size:.74rem">mostrando 400 de ${lista.length} — afine o filtro</div>` : ""}
    <div id="cl-cart-msg"></div>`;
  box.querySelector(".expandir").onclick = () => { S.cartAberta = false; desenharCarteira(corpo, d); };
  for (const b of box.querySelectorAll(".filtros .chips button")) b.onclick = () => { const f = b.parentElement.dataset.f, v = b.dataset.v; if (f === "so") CF.so = v; else { const sel = CF[f]; if (v === "") sel.clear(); else if (sel.has(v)) sel.delete(v); else sel.add(v); } desenharCarteira(corpo, d); };
  box.querySelector("#cl-cart-busca").oninput = ev => { CF.busca = ev.target.value; clearTimeout(desenharCarteira._t); desenharCarteira._t = setTimeout(() => desenharCarteira(corpo, d), 150); };
  for (const el of box.querySelectorAll(".dec")) el.onchange = async () => {
    const tr = el.closest("tr"), k = tr.dataset.k, campo = el.dataset.campo; let v = el.value.trim();
    if (campo === "volume") v = v === "" ? null : Number(v);
    else if (campo === "status" && v === "SOLICITADO") v = "SOLICITADO " + new Date().toLocaleDateString("pt-BR").slice(0, 5);
    else if (v === "") v = null;
    const patch = { [campo]: v, decidido_por: (await email()) || null, decidido_em: new Date().toISOString() };
    const r = await SB.from("carteira_linha").update(patch).match({ escritorio_id: ESC, chave: k });
    const msg = box.querySelector("#cl-cart-msg");
    if (r.error) { msg.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    const x = L.find(y => y.k === k); if (x) { x[{ acao: "a", volume: "v", destinatario: "dest", status: "s", nota: "n" }[campo]] = v; x.q = patch.decidido_por; x.em = patch.decidido_em; }
    tr.classList.add("decidida"); msg.innerHTML = `<div class="msg ok">gravado · ${esc(campo)} da linha ${esc(x && x.lin ? x.lin : k)} · a planilha não muda sozinha: a rotina do dia leva</div>`;
  };
}

// ---------- PEDIDOS ORIGINAIS do cliente (BOSS, 19/10: as 28 páginas escaneadas da Casa Pio no banco, com a imagem; "pedidos de
// outubro", "de meia", "UA do semestre", "mochila"). Riscadas aparecem, fora de totais e filtros; selo "conferir" na confiança baixa/dúvida.
const PF = { mes: new Set(), cat: new Set(), marca: new Set(), praca: "", busca: "", riscadas: false };
let PED = {};
async function pedidosDoc(cliente){
  if (PED[cliente]) return PED[cliente];
  const r = await SB.rpc("pedidos_consulta", { p_cliente: cliente });
  if (r.error) throw new Error(r.error.message);
  PED[cliente] = r.data; return r.data;
}
function pedidosOriginais(d){ return `<div class="card larga pedidos" id="cl-ped">${tit("Pedidos originais")}<div class="mu">lendo os pedidos…</div></div>`; }
async function desenharPedidos(corpo, d){
  const box = corpo.querySelector("#cl-ped"); if (!box) return;
  let p; try { p = await pedidosDoc(d.cliente); } catch (e) { box.innerHTML = tit("Pedidos originais") + `<div class="msg erro">O banco recusou: ${esc(e.message)}</div>`; return; }
  const L = p.linhas || [];
  if (!L.length) { box.remove(); return; }
  const PR = ["FORTALEZA", "RECIFE", "JPESSOA"], NP = { FORTALEZA: "Fortaleza", RECIFE: "Recife", JPESSOA: "J. Pessoa" };
  const mesDe = x => x.faturamento_mes ? String(x.faturamento_mes).slice(0, 7) : "sem mês";
  const base = L.filter(x => PF.riscadas || !x.riscado);
  const passa = x => (!PF.mes.size || PF.mes.has(mesDe(x))) && (!PF.cat.size || PF.cat.has(x.categoria || "—")) && (!PF.marca.size || PF.marca.has(x.marca || "—")) && (!PF.praca || ((x.qtd || {})[PF.praca] || 0) > 0)
    && (!PF.busca || (x.produto + " " + (x.referencia || "") + " " + (x.referencia_escrita || "") + " " + (x.cor || "") + " " + (x.cor_escrita || "") + " " + (x.arquivo_pagina || "")).toUpperCase().includes(PF.busca.toUpperCase()));
  const lista = base.filter(passa), conta = f => { const m = new Map(); for (const x of base) { const k = f(x); m.set(k, (m.get(k) || 0) + 1); } return [...m.entries()].sort(); };
  const chip = (id, sel, lista, rot, nome) => `<div class="linha"><label>${rot}</label><div class="chips" data-f="${id}">${[["", "todos"], ...lista].map(([v, n]) => `<button type="button" data-v="${esc(v)}" class="${(v === "" ? !sel.size : sel.has(v)) ? "ativa" : ""}">${esc(v === "" ? "todos" : (nome ? nome(v) : v))}${n != null ? ` <small>${n}</small>` : ""}</button>`).join("")}</div></div>`;
  const q = pr => lista.reduce((s, x) => s + (x.riscado ? 0 : (PF.praca ? ((x.qtd || {})[PF.praca] || 0) : (pr ? ((x.qtd || {})[pr] || 0) : (x.qtd_total || 0)))), 0);
  const pags = new Set(lista.map(x => x.arquivo_pagina));
  box.innerHTML = tit("Pedidos originais", `${fmt(p.paginas)} páginas · ${fmt(p.n)} linhas · ${fmt(p.total)} pares (sem riscadas)`) + `
    <div class="filtros">${chip("mes", PF.mes, conta(mesDe), "faturamento", v => v === "sem mês" ? v : mesBR(v + "-01"))}${chip("cat", PF.cat, conta(x => x.categoria || "—"), "categoria")}${chip("marca", PF.marca, conta(x => x.marca || "—"), "marca")}
      <div class="linha"><label>praça</label><div class="chips" data-f="praca"><button type="button" data-v="" class="${!PF.praca ? "ativa" : ""}">todas</button>${PR.map(pr => `<button type="button" data-v="${pr}" class="${PF.praca === pr ? "ativa" : ""}">${NP[pr]}</button>`).join("")}</div>
      <button type="button" class="sec risc ${PF.riscadas ? "ativa" : ""}">${PF.riscadas ? "escondendo" : "mostrar"} riscadas</button><input type="search" id="cl-ped-busca" placeholder="produto, referência, cor…" value="${esc(PF.busca)}" autocomplete="off"></div></div>
    <div class="num"><div><b>${fmt(q())}</b><small>pares${PF.praca ? " · " + NP[PF.praca] : ""}</small></div>${PF.praca ? "" : PR.map(pr => `<div><b>${fmt(q(pr))}</b><small>${NP[pr]}</small></div>`).join("")}<div><b>${fmt(lista.length)}</b><small>linhas</small></div><div><b>${fmt(pags.size)}</b><small>páginas</small></div></div>
    <div class="rolagem"><table class="mini ped"><thead><tr><th>pedido</th><th>fat.</th><th>produto</th><th>ref · cor</th><th class="n">preço</th>${PR.map(pr => `<th class="n">${NP[pr]}</th>`).join("")}<th class="n">total</th><th>cond.</th><th>original</th></tr></thead>
      <tbody>${lista.map(x => `<tr class="${x.riscado ? "riscada" : ""}">
        <td>${dmy(x.data_pedido)}<small>${esc(x.arquivo_origem)} p.${x.pagina}</small></td><td>${x.faturamento_mes ? mesBR(x.faturamento_mes) : "—"}<small>${esc(x.faturamento_texto || "")}</small></td>
        <td><b>${esc(x.produto || "")}</b>${x.genero ? ` <span class="mu">${esc(x.genero)}</span>` : ""}<small>${esc(x.marca || "")}${x.categoria ? " · " + esc(x.categoria) : ""}${(x.confianca === "baixa" || x.duvida) ? ` <span class="chip conferir" title="${esc(x.duvida || "confiança baixa na leitura")}">conferir</span>` : ""}${x.riscado ? ` <span class="chip">riscado</span>` : ""}</small>${x.obs ? `<small class="mu">${esc(x.obs)}</small>` : ""}${x.duvida ? `<small class="mu">? ${esc(x.duvida)}</small>` : ""}</td>
        <td>${esc(x.referencia || x.referencia_escrita || "")} · ${esc(x.cor || x.cor_escrita || "")}<small>na folha: ${esc(x.referencia_escrita || "")} ${esc(x.cor_escrita || "")}</small></td>
        <td class="n">${x.preco != null ? Number(x.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—"}</td>${PR.map(pr => `<td class="n">${(x.qtd || {})[pr] ? fmt(x.qtd[pr]) : "—"}</td>`).join("")}<td class="n c">${fmt(x.qtd_total)}</td>
        <td>${esc(x.cond_pag || "")}<small>${esc(x.transportadora || "")}</small></td>
        <td><button type="button" class="sec orig" data-p="${esc(x.imagem_path)}" data-n="${esc(x.arquivo_pagina)}">ver</button> <button type="button" class="sec orig" data-p="${esc(x.pdf_path)}" data-n="${esc(x.arquivo_pagina)}" data-baixa="1">baixar</button></td></tr>`).join("")}</tbody></table></div>
    <div id="cl-ped-msg"></div>`;
  for (const b of box.querySelectorAll(".filtros .chips button")) b.onclick = () => { const f = b.parentElement.dataset.f, v = b.dataset.v; if (f === "praca") PF.praca = v; else { const sel = PF[f]; if (v === "") sel.clear(); else if (sel.has(v)) sel.delete(v); else sel.add(v); } desenharPedidos(corpo, d); };
  box.querySelector(".risc").onclick = () => { PF.riscadas = !PF.riscadas; desenharPedidos(corpo, d); };
  box.querySelector("#cl-ped-busca").oninput = ev => { PF.busca = ev.target.value; clearTimeout(desenharPedidos._t); desenharPedidos._t = setTimeout(() => desenharPedidos(corpo, d), 150); };
  for (const b of box.querySelectorAll("button.orig")) b.onclick = async () => {
    const msg = box.querySelector("#cl-ped-msg"); msg.innerHTML = `<div class="msg ok">pedindo o original ao cofre…</div>`;
    const r = await SB.storage.from("pedidos-originais").createSignedUrl(b.dataset.p, 120, b.dataset.baixa ? { download: b.dataset.n } : undefined);
    if (r.error || !r.data) { msg.innerHTML = `<div class="msg erro">O cofre recusou: ${esc(r.error ? r.error.message : "sem endereço")}</div>`; return; }
    msg.innerHTML = ""; window.open(r.data.signedUrl, "_blank");
  };
}

window.Cliente = { abrir, estado: () => ({ cliente: S.cliente }), ir: c => { S.cliente = c; }, grupoAcao, recarregar: () => { DOCS = {}; } };
})();
