/* TRADE · SUGESTÃO DE AÇÕES por cliente (TI, 21/10/2026). Ordem dele, via NÚCLEO (memória trade-acoes-de-aceleracao-metodo): "botão
   sugestão de ações por cliente". A lista vem de trade_sugestao(cliente) (0065): por MODELO, venda média dos 3 meses fechados, estoque da
   CMS (o calculado da AG — o do cliente ao lado quando o banco tiver), cobertura, giro, PDV e a ELEIÇÃO ★: (a) estoque alto apesar de venda
   boa · (b) giro muito baixo (aqui R$/par raramente resolve: preço ou ponta — vem desmarcado). A SIMULAÇÃO é na tela: período, meta
   (normal × 1,30–1,35), incentivo R$/par; o impacto financeiro em TODA linha e no total, nas DUAS formas de pagamento (padrão: TODO par
   vendido = pares da meta × R$; opção: só o que passar do normal). Ordem das colunas (ele, 21/10): o INVESTIMENTO PREVISTO logo depois da
   meta — é o número principal; a venda prevista (PDV) por último. Formato dele: total ACIMA do cabeçalho · venda antes do estoque · uma linha por modelo, cores no + ·
   blocos Olympikus / Under Armour / chinelos SEPARADOS (verbas independentes; chinelo é outro dinheiro) · ★ elege, a caixa é dele.
   Saídas: PDF no navegador (GestorLib.pdfDePaginas, molde claro da casa), Excel pela fila das saídas (vitrine_saida tipo 'trade' →
   saidas_vitrine.py gera e sobe ao cofre), item no TOPICS e a ação em trade_acao (planejada). Sem número de 4+ dígitos aqui: vai ao repositório público. */
(function () {
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmt = n => n == null || isNaN(n) ? "—" : Math.round(Number(n)).toLocaleString("pt-BR");
const dec = x => x == null || isNaN(x) ? "—" : Number(x).toFixed(1).replace(".", ",");
const rs = v => v == null || isNaN(v) ? "—" : "R$ " + Math.round(Number(v)).toLocaleString("pt-BR");
const rs2 = v => v == null || isNaN(v) ? "—" : "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = v => v == null || isNaN(v) ? "—" : (Number(v) * 100).toFixed(1).replace(".", ",") + "%";
const dmy = d => d ? String(d).slice(8, 10) + "/" + String(d).slice(5, 7) + "/" + String(d).slice(2, 4) : "—";
const mesBR = m => m ? MESES[+String(m).slice(5, 7) - 1] + "/" + String(m).slice(2, 4) : "";
const pad = n => String(n).padStart(2, "0");
const isoLocal = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
// os blocos, na ordem dele: Olympikus tênis · Olympikus chinelos · UA tênis · UA chinelos; o resto (meias, acessórios, confecção) só se ele pedir
const BLOCOS = [["OLY|TENIS", "Olympikus · tênis"], ["OLY|CHINELOS", "Olympikus · chinelos"], ["UA|TENIS", "Under Armour · tênis"], ["UA|CHINELOS", "Under Armour · chinelos"],
                ["OLY|MEIAS", "Olympikus · meias (packs)"], ["OLY|ACESSORIOS", "Olympikus · acessórios"], ["OLY|CONFECCAO", "Olympikus · confecção"], ["UA|MEIAS", "Under Armour · meias"], ["UA|ACESSORIOS", "Under Armour · acessórios"], ["UA|CONFECCAO", "Under Armour · confecção"]];
const PRINCIPAIS = new Set(["OLY|TENIS", "OLY|CHINELOS", "UA|TENIS", "UA|CHINELOS"]);
const NOME_BLOCO = Object.fromEntries(BLOCOS);
const blocoDe = l => (l.marca_bloco || "OLY") + "|" + (l.tipo || "TENIS");
const FATOR_MIN = 1.3, FATOR_MAX = 1.35, COB_RUPTURA = 4;
let SB = null, ESC = null, EMAIL = null, BOX = null;
const S = { cliente: null, nome: "", d: null, ini: null, fim: null, fator: 1.35, inc: 5, modo: "meta", marc: new Set(), abertos: new Set(), todos: false, outros: false, msg: "", erro: "" };

// o período padrão: de amanhã ao último dia do mês seguinte (hoje 21/10 → 22/10 a 30/11, o exemplo dele)
function periodoPadrao(){
  const h = new Date(); const ini = new Date(h.getFullYear(), h.getMonth(), h.getDate() + 1); const fim = new Date(h.getFullYear(), h.getMonth() + 2, 0);
  return [isoLocal(ini), isoLocal(fim)];
}
async function escritorio(){ if (ESC) return ESC; const e = await SB.from("escritorio").select("id").limit(1); ESC = (e.data && e.data[0] && e.data[0].id) || null; return ESC; }
async function email(){ if (EMAIL !== null) return EMAIL; try { const s = await SB.auth.getSession(); EMAIL = (s.data && s.data.session && s.data.session.user && s.data.session.user.email) || ""; } catch (e) { EMAIL = ""; } return EMAIL; }

// ---------- abrir: lê a função e desenha; o estado da simulação fica em memória enquanto o cliente é o mesmo
async function abrir(sb, box, cliente, nome){
  SB = sb; BOX = box;
  if (S.cliente !== cliente) { S.cliente = cliente; S.nome = nome || cliente; S.d = null; S.marc = new Set(); S.abertos = new Set(); S.todos = false; S.outros = false; S.msg = ""; S.erro = ""; [S.ini, S.fim] = periodoPadrao(); }
  if (!S.d) {
    box.innerHTML = cab(`<div class="mu">elegendo pelo giro de ${esc(S.nome)}…</div>`);
    const r = await sb.rpc("trade_sugestao", { p_cliente: cliente, p_meses: 3 });
    if (r.error) { box.innerHTML = cab(`<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`); return; }
    S.d = r.data || { linhas: [] };
    if (S.d.nome) S.nome = S.d.nome;
    for (const l of S.d.linhas || []) if (l.eleito === "a") S.marc.add(l.referencia);   // ★ (a) vem marcado; (b) vem desmarcado — a decisão é dele
  }
  desenhar();
}
const tit = (nome, sub, botao) => `<div class="sec-tit">${esc(nome)}${sub ? ` <small>${sub}</small>` : ""}${botao || ""}</div>`;
const cab = corpo => tit("Ações de trade — sugestão", "elege pelo giro e simula o cashback") + corpo;

// ---------- a CONTA da campanha (memória, §3): normal = média mensal ÷ 30 × dias · meta = normal × fator · gasto nas duas contas
function conta(l){
  const dias = diasEntre(S.ini, S.fim), vm = Number(l.venda_media) || 0, pdv = l.pdv != null ? Number(l.pdv) : null, est = l.estoque != null ? Number(l.estoque) : null;
  const normal = Math.round(vm / 30 * dias), meta = Math.round(vm / 30 * dias * S.fator), aMais = meta - normal;
  const gastoMeta = meta * S.inc, gastoExtra = aMais * S.inc, gasto = S.modo === "meta" ? gastoMeta : gastoExtra;
  const vendaRS = pdv != null ? meta * pdv : null, aMaisRS = pdv != null ? aMais * pdv : null;
  const markup = (S.d && S.d.markups && S.d.markups[blocoDe(l)]) ? Number(S.d.markups[blocoDe(l)]) : null;
  return { dias, vm, pdv, est, normal, meta, aMais, gastoMeta, gastoExtra, gasto, vendaRS, aMaisRS,
           razao: vendaRS ? gasto / vendaRS : null, custoPar: aMais > 0 ? gasto / aMais : null,
           cob: l.cobertura != null ? Number(l.cobertura) : null, cobDepois: (est != null && vm) ? (est - meta) / vm : null,
           repos: (aMaisRS != null && markup) ? aMaisRS / markup : null, markup };
}
const somaDe = (linhas) => { const t = { n: 0, normal: 0, meta: 0, aMais: 0, est: 0, gastoMeta: 0, gastoExtra: 0, gasto: 0, vendaRS: 0, aMaisRS: 0, repos: 0, semPdv: 0, ruptura: 0 };
  for (const l of linhas) { const c = conta(l); t.n++; t.normal += c.normal; t.meta += c.meta; t.aMais += c.aMais; t.est += c.est || 0; t.gastoMeta += c.gastoMeta; t.gastoExtra += c.gastoExtra; t.gasto += c.gasto;
    if (c.vendaRS != null) { t.vendaRS += c.vendaRS; t.aMaisRS += c.aMaisRS; } else t.semPdv++; if (c.repos != null) t.repos += c.repos; if (c.cobDepois != null && c.cobDepois < COB_RUPTURA) t.ruptura++; }
  t.razao = t.vendaRS ? t.gasto / t.vendaRS : null; t.custoPar = t.aMais > 0 ? t.gasto / t.aMais : null; return t; };
const linhasDe = () => (S.d && S.d.linhas) || [];
const visiveis = () => linhasDe().filter(l => (S.todos || l.eleito) && (S.outros || PRINCIPAIS.has(blocoDe(l))));
const marcadas = () => linhasDe().filter(l => S.marc.has(l.referencia));
const porBloco = lista => { const g = new Map(); for (const l of lista) { const b = blocoDe(l); if (!g.has(b)) g.set(b, []); g.get(b).push(l); } return [...BLOCOS.map(([k]) => k).filter(k => g.has(k)).map(k => [k, g.get(k)]), ...[...g.keys()].filter(k => !NOME_BLOCO[k]).map(k => [k, g.get(k)])]; };

// ---------- o desenho
function desenhar(){
  const d = S.d, box = BOX, L = visiveis(), dias = diasEntre(S.ini, S.fim), nEl = linhasDe().filter(l => l.eleito).length;
  if (!linhasDe().length) { box.innerHTML = cab(`<div class="vazio">sem giro deste cliente no banco (a AG não foi carregada) — sem histórico, sem sugestão.</div>`); return; }
  const lim = d.limites || {};
  const fonte = `giro da AG até ${esc(mesBR((d.meses || []).slice(-1)[0]))} (base ${esc(dmy(d.base_giro))}) · venda média = ${esc((d.meses || []).map(mesBR).join(", "))} · estoque da CMS em ${esc(mesBR(d.mes_estoque))} (o calculado da AG; o informado pelo cliente ainda não vem no banco) · PDV do cadastro`;
  const regra = `★ (a) cobertura ≥ ${dec(lim.cob_alta)} meses com venda ≥ ${fmt(lim.venda_boa)} pares/mês · (b) cobertura ≥ ${dec(lim.cob_giro_baixo)} meses com estoque ≥ ${fmt(lim.estoque_min)} pares (giro baixo: R$/par raramente resolve — é preço ou ponta; vem desmarcado)`;
  const controles = `<div class="ts-ctl">
      <div><label>início</label><input type="date" id="ts-ini" value="${esc(S.ini)}"></div><div><label>fim</label><input type="date" id="ts-fim" value="${esc(S.fim)}"></div><div class="ts-dias"><b>${dias}</b><small>dias</small></div>
      <div><label>meta · normal ×</label><div class="ts-fator"><input type="range" id="ts-fator-r" min="${FATOR_MIN}" max="${FATOR_MAX}" step="0.01" value="${S.fator}"><input type="number" id="ts-fator" min="1" max="2" step="0.01" value="${S.fator}"></div></div>
      <div><label>incentivo R$/par</label><input type="number" id="ts-inc" min="0" step="0.5" value="${S.inc}"></div>
      <div><label>forma de pagamento</label><div class="chips" id="ts-modo"><button type="button" data-v="meta" class="${S.modo === "meta" ? "ativa" : ""}" title="padrão: a Vulcabras paga R$/par em TODO par vendido (os pares da meta)">todo par vendido</button><button type="button" data-v="extra" class="${S.modo === "extra" ? "ativa" : ""}" title="opção: paga só os pares que passarem da venda normal">só o que passar do normal</button></div></div>
      <div><label>mostrar</label><div class="chips"><button type="button" id="ts-todos" class="${S.todos ? "ativa" : ""}">${S.todos ? "só os eleitos" : "todos os modelos com histórico"}</button><button type="button" id="ts-outros" class="${S.outros ? "ativa" : ""}">${S.outros ? "só tênis e chinelos" : "meias, acessórios, confecção"}</button></div></div>
    </div>`;
  const blocos = porBloco(L);
  const placar = blocos.map(([b, ls]) => { const m = ls.filter(l => S.marc.has(l.referencia)); if (!m.length) return ""; const t = somaDe(m);
    return `<div class="ts-placar"><div class="ts-bloco">${esc(NOME_BLOCO[b] || b)}</div><div class="num">
      <div><b>${fmt(t.n)}</b><small>modelos marcados</small></div><div><b>${fmt(t.normal)}</b><small>venda normal · ${dias} d</small></div><div><b>${fmt(t.meta)}</b><small>meta · +${Math.round((S.fator - 1) * 100)}%</small></div>
      <div class="al"><b>${rs(t.gasto)}</b><small>investimento previsto · ${S.modo === "meta" ? "todo par vendido" : "só o que passar do normal"}</small></div><div><b>${rs(S.modo === "meta" ? t.gastoExtra : t.gastoMeta)}</b><small>${S.modo === "meta" ? "se pagar só o que passar do normal" : "se pagar em todo par vendido"}</small></div>
      <div><b>${fmt(t.aMais)}</b><small>pares a mais</small></div><div><b>${rs(t.aMaisRS)}</b><small>venda a mais · PDV</small></div><div><b>${pct(t.razao)}</b><small>investimento ÷ venda</small></div><div><b>${rs2(t.custoPar)}</b><small>custo por par a mais</small></div>
      ${t.repos ? `<div><b>${rs(t.repos)}</b><small>reposição a custo (sell-in)</small></div>` : ""}${t.ruptura ? `<div class="al"><b>${fmt(t.ruptura)}</b><small>modelo(s) iriam abaixo de ${COB_RUPTURA} meses</small></div>` : ""}<div><b>${rs(t.vendaRS)}</b><small>venda prevista · PDV${t.semPdv ? ` (${t.semPdv} sem PDV)` : ""}</small></div>
    </div></div>`; }).join("") || `<div class="vazio">nenhum modelo marcado — marque na caixa.</div>`;
  const acoes = `<div class="ts-acoes"><button type="button" class="sec" id="ts-pdf" title="PDF no molde claro da casa: capa, tabela por bloco, totais e leitura curta — MM,AA CLIENTE - AÇÃO DE TRADE - SUGESTÃO.pdf">PDF ⎙</button><button type="button" class="sec" id="ts-xlsx" title="anota o pedido; o Excel sai em até 2 min na máquina do Léo (pasta do cliente e TRADE) e fica no cofre para baixar">Excel ▤</button><button type="button" class="sec" id="ts-topics" title="cria o item no bloco do cliente no TOPICS, com o resumo">item no TOPICS ✓</button><button type="button" class="sec" id="ts-acao" title="grava em Ações de trade (planejada) com o valor da ação = investimento previsto">gravar como ação ＋</button><span id="ts-msg">${S.msg ? `<span class="msg ok">${esc(S.msg)}</span>` : ""}${S.erro ? `<span class="msg erro">${esc(S.erro)}</span>` : ""}</span></div><div class="mu" id="ts-saidas"></div>`;
  box.innerHTML = tit("Ações de trade — sugestão", `${fmt(nEl)} eleito(s) de ${fmt(d.n)} modelos com histórico · ${esc(S.nome)}`, `<button type="button" class="sec ir ts-fecha">recolher ▴</button>`)
    + `<div class="fontes">${fonte}</div><div class="fontes">${regra}</div>` + controles + placar + acoes
    + blocos.map(([b, ls]) => tabela(b, ls)).join("") + (!L.length ? `<div class="vazio">nenhum modelo eleito nos blocos principais — toque em "todos os modelos com histórico" ou "meias, acessórios, confecção".</div>` : "");
  ligar(box);
  mostrarSaidas();
}
// a TABELA do bloco: a linha de TOTAIS (dos marcados) ACIMA do cabeçalho; venda antes do estoque; uma linha por modelo, cores no +.
// ORDEM (ele, 21/10 via NÚCLEO): o número principal é quanto a VULCABRAS desembolsa — logo depois da meta; a venda prevista (PDV) é a última
const COLS = [["chk", ""], ["star", "★"], ["modelo", "modelo"], ["pdv", "PDV"], ["vm", "venda/mês"], ["normal", "normal"], ["meta", "meta"], ["gasto", "investimento previsto"], ["amais", "a mais (pares)"], ["amaisrs", "a mais R$"], ["razao", "investimento ÷ venda"], ["custo", "custo/par a mais"], ["repos", "reposição a custo"], ["est", "estoque CMS"], ["estc", "estoque cliente"], ["cob", "cob. hoje"], ["cobd", "cob. depois"], ["venda", "venda prevista (PDV)"]];
function tabela(b, ls){
  const m = ls.filter(l => S.marc.has(l.referencia)), t = somaDe(m), dias = diasEntre(S.ini, S.fim);
  const totais = `<tr class="tot"><th></th><th></th><th>total · ${fmt(m.length)} de ${fmt(ls.length)} marcado(s)</th><th></th><th class="n"></th><th class="n">${fmt(t.normal)}</th><th class="n">${fmt(t.meta)}</th><th class="n">${rs(t.gasto)}</th><th class="n">${fmt(t.aMais)}</th><th class="n">${rs(t.aMaisRS)}</th><th class="n">${pct(t.razao)}</th><th class="n">${rs2(t.custoPar)}</th><th class="n">${t.repos ? rs(t.repos) : "—"}</th><th class="n">${fmt(t.est)}</th><th class="n">—</th><th class="n"></th><th class="n"></th><th class="n">${rs(t.vendaRS)}</th></tr>`;
  const cabec = `<tr class="cab">${COLS.map(([k, n]) => `<th class="${["chk", "star", "modelo"].includes(k) ? "" : "n"} c-${k}" title="${k === "normal" ? `venda normal em ${dias} dias = média mensal ÷ 30 × ${dias}` : k === "meta" ? `normal × ${S.fator}` : k === "gasto" ? (S.modo === "meta" ? "todo par vendido: pares da meta × R$/par" : "só o que passar do normal: pares a mais × R$/par") : k === "cobd" ? "estoque − meta, em meses de venda média" : k === "repos" ? "pares a mais × PDV ÷ markup do cliente" : ""}">${n}${k === "normal" ? ` <small>${dias} d</small>` : ""}</th>`).join("")}</tr>`;
  const linha = l => { const c = conta(l), on = S.marc.has(l.referencia), ab = S.abertos.has(l.referencia), varias = (l.cores || []).length > 1;
    const star = l.eleito === "a" ? `<span class="star a" title="estoque alto apesar de venda boa">★</span>` : l.eleito === "b" ? `<span class="star b" title="giro muito baixo: R$/par raramente resolve — preço ou ponta">★</span>` : "";
    return `<tr class="mod${on ? " on" : ""}${l.em_linha === false ? " fora" : ""}" data-ref="${esc(l.referencia)}">
      <td class="chk"><input type="checkbox" class="ts-marca" data-ref="${esc(l.referencia)}" ${on ? "checked" : ""}></td><td class="star">${star}</td>
      <td class="modelo">${varias ? `<button type="button" class="mm" data-ref="${esc(l.referencia)}">${ab ? "−" : "+"}</button>` : ""}<b>${esc(l.descricao || l.referencia)}</b> <span class="mu">${esc(l.referencia)}${l.genero ? " · " + esc(String(l.genero).toLowerCase()) : ""}${varias ? " · " + l.cores.length + " cores" : ""}${l.em_linha === false ? " · fora de linha" : ""}${l.eleito === "b" ? " · giro baixo" : ""}</span></td>
      <td class="n">${c.pdv != null ? rs2(c.pdv) : "—"}</td><td class="n">${fmt(c.vm)}</td><td class="n">${fmt(c.normal)}</td><td class="n meta">${fmt(c.meta)}</td>
      <td class="n gasto">${rs(c.gasto)}</td><td class="n">${fmt(c.aMais)}</td><td class="n">${rs(c.aMaisRS)}</td><td class="n">${pct(c.razao)}</td><td class="n">${rs2(c.custoPar)}</td><td class="n">${c.repos != null ? rs(c.repos) : "—"}</td>
      <td class="n">${fmt(c.est)}</td><td class="n mu">${l.estoque_cliente != null ? fmt(l.estoque_cliente) : "—"}</td><td class="n${c.cob != null && c.cob >= (S.d.limites || {}).cob_alta ? " alta" : ""}">${dec(c.cob)}</td><td class="n${c.cobDepois != null && c.cobDepois < COB_RUPTURA ? " rupt" : ""}" title="${c.cobDepois != null && c.cobDepois < COB_RUPTURA ? "abaixo de " + COB_RUPTURA + " meses = ruptura: a meta tira estoque demais" : ""}">${dec(c.cobDepois)}</td>
      <td class="n">${rs(c.vendaRS)}</td></tr>`
      + (ab ? (l.cores || []).map(x => `<tr class="cor" data-ref="${esc(l.referencia)}"><td></td><td></td><td class="modelo mu">${esc(x.cor) || "sem cor"}</td><td class="n mu">${x.pdv != null ? rs2(x.pdv) : "—"}</td><td class="n mu">${fmt(x.venda_media)}</td><td class="n mu" colspan="8">${Object.entries(x.venda_meses || {}).map(([k, v]) => `${esc(mesBR(k))} ${fmt(v)}`).join(" · ")}</td><td class="n mu">${fmt(x.estoque)}</td><td class="n mu">—</td><td class="n mu">${dec(x.cobertura)}</td><td colspan="2"></td></tr>`).join("") : ""); };
  return `<div class="ts-tab"><div class="ts-bloco">${esc(NOME_BLOCO[b] || b)} <small>${fmt(ls.length)} modelo(s)</small></div><div class="rolagem"><table class="ts">${totais}${cabec}<tbody>${ls.map(linha).join("")}</tbody></table></div></div>`;
}
function ligar(box){
  const re = () => desenhar();
  box.querySelector(".ts-fecha").onclick = () => { S.d = null; S.cliente = null; box.innerHTML = cab(`<div class="vazio">recolhido. <button type="button" class="sec ir ts-abre">sugestão de ações ›</button></div>`); box.querySelector(".ts-abre").onclick = () => abrir(SB, box, box.dataset.cliente, box.dataset.nome); };
  box.querySelector("#ts-ini").onchange = ev => { if (ev.target.value) { S.ini = ev.target.value; if (S.fim < S.ini) S.fim = S.ini; re(); } };
  box.querySelector("#ts-fim").onchange = ev => { if (ev.target.value) { S.fim = ev.target.value; if (S.fim < S.ini) S.ini = S.fim; re(); } };
  const fat = v => { const x = Number(v); if (!isNaN(x) && x > 0) { S.fator = Math.round(x * 100) / 100; re(); } };
  box.querySelector("#ts-fator-r").oninput = ev => { box.querySelector("#ts-fator").value = ev.target.value; }; box.querySelector("#ts-fator-r").onchange = ev => fat(ev.target.value);
  box.querySelector("#ts-fator").onchange = ev => fat(ev.target.value);
  box.querySelector("#ts-inc").onchange = ev => { const x = Number(ev.target.value); if (!isNaN(x) && x >= 0) { S.inc = x; re(); } };
  for (const b of box.querySelectorAll("#ts-modo button")) b.onclick = () => { S.modo = b.dataset.v; re(); };
  box.querySelector("#ts-todos").onclick = () => { S.todos = !S.todos; re(); };
  box.querySelector("#ts-outros").onclick = () => { S.outros = !S.outros; re(); };
  for (const c of box.querySelectorAll("input.ts-marca")) c.onchange = () => { if (c.checked) S.marc.add(c.dataset.ref); else S.marc.delete(c.dataset.ref); re(); };
  for (const b of box.querySelectorAll("button.mm")) b.onclick = () => { const r = b.dataset.ref; if (S.abertos.has(r)) S.abertos.delete(r); else S.abertos.add(r); re(); };
  box.querySelector("#ts-pdf").onclick = () => pdf(box.querySelector("#ts-pdf"));
  box.querySelector("#ts-xlsx").onclick = () => excel(box.querySelector("#ts-xlsx"));
  box.querySelector("#ts-topics").onclick = () => topics(box.querySelector("#ts-topics"));
  box.querySelector("#ts-acao").onclick = () => gravarAcao(box.querySelector("#ts-acao"));
}
const aviso = (ok, erro) => { S.msg = ok || ""; S.erro = erro || ""; const el = BOX && BOX.querySelector("#ts-msg"); if (el) el.innerHTML = (S.msg ? `<span class="msg ok">${esc(S.msg)}</span>` : "") + (S.erro ? `<span class="msg erro">${esc(S.erro)}</span>` : ""); };

// ---------- o RESUMO (uma frase) e o pacote do que ele marcou — o mesmo vai ao TOPICS, à ação e ao Excel
function resumo(){
  const m = marcadas(), bl = porBloco(m), dias = diasEntre(S.ini, S.fim);
  const partes = bl.map(([b, ls]) => { const t = somaDe(ls); return `${NOME_BLOCO[b] || b}: ${ls.length} modelo(s) (${ls.map(l => l.descricao).join(", ")}) · meta ${fmt(t.meta)} pares (+${Math.round((S.fator - 1) * 100)}%) · investimento previsto ${rs(t.gasto)} (${S.modo === "meta" ? "todo par vendido" : "só o que passar do normal"})`; });
  return `Ação de trade (sugestão do Gestor) · cashback R$ ${String(S.inc).replace(".", ",")}/par · ${dmy(S.ini)} a ${dmy(S.fim)} (${dias} d) · ` + (partes.join(" · ") || "nenhum modelo marcado");
}
function pacote(){
  const m = marcadas(), dias = diasEntre(S.ini, S.fim);
  return { cliente: S.cliente, nome: S.nome, ini: S.ini, fim: S.fim, dias, fator: S.fator, incentivo: S.inc, modo: S.modo, meses: S.d.meses, mes_estoque: S.d.mes_estoque, base_giro: S.d.base_giro, limites: S.d.limites, markups: S.d.markups,
    linhas: m.map(l => { const c = conta(l); return { referencia: l.referencia, descricao: l.descricao, marca_bloco: l.marca_bloco, tipo: l.tipo, bloco: NOME_BLOCO[blocoDe(l)] || blocoDe(l), genero: l.genero, eleito: l.eleito, em_linha: l.em_linha, pdv: c.pdv, venda_media: c.vm, estoque: c.est, estoque_cliente: l.estoque_cliente,
      cobertura: c.cob, normal: c.normal, meta: c.meta, a_mais: c.aMais, gasto_meta: c.gastoMeta, gasto_extra: c.gastoExtra, venda_rs: c.vendaRS, a_mais_rs: c.aMaisRS, razao: c.razao, custo_par: c.custoPar, cob_depois: c.cobDepois, reposicao: c.repos, markup: c.markup, cores: l.cores }; }),
    blocos: porBloco(m).map(([b, ls]) => Object.assign({ bloco: NOME_BLOCO[b] || b, chave: b }, somaDe(ls))), resumo: resumo() };
}

// ---------- PDF no navegador: o molde claro da casa (como o raio-x): capa azul com a barra amarela; páginas off-white de 1_920×1_080,
// cabeçalho preto nas tabelas, azul cheio só na capa e no número de destaque; a leitura curta no fim. Só o que ele MARCOU entra.
const AZUL = "rgb(46,62,252)", AMARELO = "rgb(255,255,26)", PRETO = "#000", CINZA = "rgb(120,123,134)", CINZA2 = "rgb(173,174,179)", OFF = "rgb(246,245,240)";
const PG_W = 1_920, PG_H = 1_080, LINHAS_PG = 16;
function montarPdf(){
  const p = pacote(), bl = porBloco(marcadas()), pags = [], nome = S.nome;
  if (!bl.length) throw new Error("nenhum modelo marcado: marque na caixa o que entra na ação");
  const fontes = `giro da AG (venda média ${(p.meses || []).map(mesBR).join(", ")} · estoque CMS ${mesBR(p.mes_estoque)} · base ${dmy(p.base_giro)}) · PDV do cadastro`;
  const pagina = (corpo, n) => `<section class="pg" style="background:${OFF};color:${PRETO};font-family:Arial,Helvetica,sans-serif;padding:96px 128px 150px;box-sizing:border-box;width:${PG_W}px;height:${PG_H}px;overflow:hidden;position:relative;display:flex;flex-direction:column;gap:22px">${corpo}
    <p style="position:absolute;left:128px;bottom:60px;width:1250px;font-size:22px;color:${CINZA};margin:0">Fonte: ${esc(fontes)}</p><p style="position:absolute;right:128px;bottom:60px;font-size:22px;color:${CINZA};margin:0">${esc(nome)} · {{pg}}</p></section>`;
  const kick = t => `<p style="margin:0;font-size:24px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${AZUL}">${t}</p>`;
  const h2 = (t, sub) => `<div style="display:flex;align-items:baseline;gap:24px"><h2 style="margin:0;font-size:56px;font-weight:700;line-height:1.1">${t}</h2>${sub ? `<p style="margin:0;font-size:24px;color:${CINZA}">${sub}</p>` : ""}</div>`;
  // capa
  pags.push(`<section class="pg" style="background:${AZUL};color:${OFF};font-family:Arial,Helvetica,sans-serif;padding:128px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;width:${PG_W}px;height:${PG_H}px;overflow:hidden">
    <div style="display:flex;flex-direction:column;gap:32px"><div style="width:160px;height:12px;background:${AMARELO}"></div><p style="margin:0;font-size:32px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Olympikus · ação de trade</p></div>
    <div style="display:flex;flex-direction:column;gap:36px"><h1 style="margin:0;font-size:120px;font-weight:800;line-height:1.02">${esc(nome)}<br>Sugestão de ação</h1>
      <p style="margin:0;font-size:36px;font-weight:500;line-height:1.4">Cashback de R$ ${esc(String(S.inc).replace(".", ","))} por par ao vendedor · de ${esc(dmy(p.ini))} a ${esc(dmy(p.fim))} (${p.dias} dias) · meta = venda normal × ${esc(String(S.fator).replace(".", ","))}<br>forma de pagamento: ${S.modo === "meta" ? "todo par vendido" : "só o que passar do normal"}</p></div>
    <p style="margin:0;font-size:28px">${esc(new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }))}</p></section>`);
  // uma página (ou mais) por bloco: a tabela com os totais ACIMA do cabeçalho
  // 14 colunas em 1_664 px: a do modelo larga, as outras iguais; o cabeçalho quebra em duas linhas quando precisa, o corpo não quebra
  const th = (t, al) => `<th style="background:${PRETO};color:${OFF};font-weight:700;padding:6px 8px;text-align:${al};font-size:17px;line-height:1.1;white-space:normal;vertical-align:middle">${t}</th>`;
  const td = (t, al, extra) => `<td style="padding:6px 6px;text-align:${al};border-bottom:1px solid rgba(0,0,0,0.12);font-size:18px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${extra || ""}">${t}</td>`;
  const tt = (t, al) => `<th style="background:${AMARELO};color:${PRETO};font-weight:800;padding:8px 5px;text-align:${al};font-size:17px;white-space:nowrap;overflow:hidden">${t}</th>`;
  // a ordem dele: investimento previsto logo depois da meta; venda prevista (PDV) por último
  const colunas = [["Modelo", "left"], ["PDV", "right"], ["Venda/ mês", "right"], [`Normal ${p.dias} d`, "right"], ["Meta", "right"], ["Investimento previsto", "right"], ["A mais (pares)", "right"], ["A mais R$", "right"], ["Gasto ÷ venda", "right"], ["Custo/par a mais", "right"], ["Estoque CMS", "right"], ["Cob. hoje", "right"], ["Cob. depois", "right"], ["Venda prevista (PDV)", "right"]];
  const colgroup = `<colgroup><col style="width:273px">${colunas.slice(1).map(() => `<col style="width:107px">`).join("")}</colgroup>`;
  const forma = S.modo === "meta" ? "todo par vendido" : "só o que passar do normal";
  for (const [b, ls] of bl) {
    const t = somaDe(ls);
    for (let i = 0; i < ls.length; i += LINHAS_PG) {
      const fatia = ls.slice(i, i + LINHAS_PG), cont = i ? ` (continuação ${Math.floor(i / LINHAS_PG) + 1})` : "";
      const tot = `<tr>${tt(`Total · ${fmt(t.n)} modelo(s)`, "left")}${tt("", "right")}${tt("", "right")}${tt(fmt(t.normal), "right")}${tt(fmt(t.meta), "right")}${tt(rs(t.gasto), "right")}${tt(fmt(t.aMais), "right")}${tt(rs(t.aMaisRS), "right")}${tt(pct(t.razao), "right")}${tt(rs2(t.custoPar), "right")}${tt(fmt(t.est), "right")}${tt("", "right")}${tt("", "right")}${tt(rs(t.vendaRS), "right")}</tr>`;
      const linhas = fatia.map(l => { const c = conta(l); const rupt = c.cobDepois != null && c.cobDepois < COB_RUPTURA;
        return `<tr>${td(`<b>${esc(l.descricao)}</b> <span style="color:${CINZA}">${esc(l.referencia)}${l.eleito === "b" ? " · giro baixo" : ""}</span>`, "left")}${td(c.pdv != null ? rs2(c.pdv) : "—", "right")}${td(fmt(c.vm), "right")}${td(fmt(c.normal), "right")}${td(`<b>${fmt(c.meta)}</b>`, "right")}${td(`<b>${rs(c.gasto)}</b>`, "right")}${td(fmt(c.aMais), "right")}${td(rs(c.aMaisRS), "right")}${td(pct(c.razao), "right")}${td(rs2(c.custoPar), "right")}${td(fmt(c.est), "right")}${td(dec(c.cob), "right")}${td(dec(c.cobDepois), "right", rupt ? `background:${AMARELO};font-weight:800` : "")}${td(rs(c.vendaRS), "right")}</tr>`; }).join("");
      pags.push(pagina(kick("Produtos eleitos · " + esc(NOME_BLOCO[b] || b)) + h2(esc(NOME_BLOCO[b] || b) + cont, `cashback R$ ${esc(String(S.inc).replace(".", ","))}/par · ${esc(dmy(p.ini))} a ${esc(dmy(p.fim))} · meta +${Math.round((S.fator - 1) * 100)}% · pagamento: ${forma}`)
        + `<table style="width:1664px;border-collapse:collapse;table-layout:fixed">${colgroup}<tr>${colunas.map(([n, al]) => th(n, al)).join("")}</tr>${tot}${linhas}</table>`
        + `<p style="margin:0;font-size:20px;color:${CINZA}">investimento previsto = ${S.modo === "meta" ? "pares da meta" : "só os pares a mais"} × R$ ${esc(String(S.inc).replace(".", ","))} (forma: ${forma}) · pares · cobertura em meses de venda média · amarelo na cobertura depois = abaixo de ${COB_RUPTURA} meses (ruptura) · ★ (b) giro baixo: R$/par raramente resolve</p>`));
    }
  }
  // leitura curta: um bloco por verba, a alternativa do gasto, e o que não entra
  const tOly = bl.find(([b]) => b === "OLY|TENIS"), cards = bl.map(([b, ls]) => { const t = somaDe(ls);
    return `<div style="flex:1;border:2px solid ${CINZA2};border-radius:8px;padding:20px 24px;display:flex;flex-direction:column;gap:6px"><p style="margin:0;font-size:26px;font-weight:700;color:${AZUL}">${esc(NOME_BLOCO[b] || b)}</p><p style="margin:0;font-size:52px;font-weight:800;line-height:1.1">${rs(t.gasto)}</p><p style="margin:0;font-size:22px;color:${CINZA}">investimento previsto · ${forma}</p><p style="margin:0;font-size:24px;color:${CINZA}">${fmt(t.n)} modelo(s) · meta ${fmt(t.meta)} pares (+${fmt(t.aMais)}) · venda prevista ${rs(t.vendaRS)}</p><p style="margin:0;font-size:24px">gasto ÷ venda <b>${pct(t.razao)}</b> · custo por par a mais <b>${rs2(t.custoPar)}</b></p><p style="margin:0;font-size:22px;color:${CINZA}">${S.modo === "meta" ? "se pagar só o que passar do normal: " + rs(t.gastoExtra) : "se pagar em todo par vendido: " + rs(t.gastoMeta)}${t.repos ? " · reposição a custo " + rs(t.repos) : ""}</p></div>`; }).join("");
  const foraB = linhasDe().filter(l => l.eleito === "b" && !S.marc.has(l.referencia) && PRINCIPAIS.has(blocoDe(l))).map(l => l.descricao);
  const tx = tOly ? somaDe(tOly[1]) : null;
  const frases = [tx ? `Pagar R$ ${esc(String(S.inc).replace(".", ","))} em todo par vendido faz o par a mais custar ${rs2(tx.gastoMeta / Math.max(tx.aMais, 1))}; pagando só o que passar da venda normal, o mesmo par custa R$ ${esc(String(S.inc).replace(".", ","))} e a verba cai para ${rs(tx.gastoExtra)}.` : "",
    `As verbas não se misturam: Olympikus e Under Armour são contas separadas, e chinelo é outro dinheiro.`,
    foraB.length ? `Ficaram fora por giro muito baixo (${esc(foraB.slice(0, 8).join(", "))}${foraB.length > 8 ? " e mais " + (foraB.length - 8) : ""}): cashback não resolve — é caso de preço, ponta ou queima.` : "",
    `Nenhuma ação pode levar a cobertura abaixo de ${COB_RUPTURA} meses; a régua da casa é teto 5.`].filter(Boolean);
  pags.push(pagina(kick("Leitura") + h2("O que a ação custa e o que devolve", "") + `<div style="display:flex;gap:24px">${cards}</div><div style="border-left:6px solid ${AZUL};padding:6px 0 6px 24px;display:flex;flex-direction:column;gap:10px">${frases.map(f => `<p style="margin:0;font-size:26px;line-height:1.35">${f}</p>`).join("")}</div>`));
  const paginas = pags.map((x, i) => x.replace("{{pg}}", String(i + 1)));
  return { paginas, nomeArq: window.GestorLib.nomeArquivoCasa(nome, "AÇÃO DE TRADE - SUGESTÃO"), css: ".pg table{border-collapse:collapse}.pg *{box-sizing:border-box}" };
}
async function pdf(bt){
  const antes = bt.textContent; bt.disabled = true;
  try {
    const { paginas, nomeArq, css } = montarPdf();
    const r = await window.GestorLib.pdfDePaginas(paginas, css, nomeArq, { formato: [508, 285.75], fundo: OFF, largura: PG_W + "px", escala: 1, qualidade: 0.86, esperar: 0, teto: 30, avisa: t => { bt.textContent = "gerando… " + t; } });
    aviso(r.modo === "cancelado" ? "" : `PDF ${r.modo}: ${r.nome} (${r.paginas} páginas)`);
  } catch (e) { aviso("", "não montei o PDF: " + (e.message || e)); }
  bt.disabled = false; bt.textContent = antes;
}
// ---------- Excel: a página só ANOTA o pedido (vitrine_saida, tipo 'trade', com o que ele marcou); o saidas_vitrine.py gera e sobe ao cofre
async function excel(bt){
  const p = pacote(); if (!p.linhas.length) { aviso("", "marque pelo menos um modelo"); return; }
  bt.disabled = true;
  const sem = (+p.ini.slice(5, 7) <= 6 ? "1S" : "2S") + p.ini.slice(2, 4);
  const r = await SB.from("vitrine_saida").insert({ escritorio_id: await escritorio(), cliente: S.cliente, colecao: sem, tipo: "trade", dados: p });
  bt.disabled = false;
  if (r.error) { aviso("", "O banco recusou o pedido do Excel: " + r.error.message); return; }
  aviso("Excel pedido: sai em até 2 min na máquina do Léo (pasta do cliente e TRADE) e fica aqui para baixar");
  mostrarSaidas();
}
const XLSX_TIPO = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
async function mostrarSaidas(){
  const o = BOX && BOX.querySelector("#ts-saidas"); if (!o) return;
  const r = await SB.from("vitrine_saida").select("id,pedido_em,atendido_em,arquivo,erro,nota,storage_path,tamanho").eq("escritorio_id", await escritorio()).eq("cliente", S.cliente).eq("tipo", "trade").order("pedido_em", { ascending: false }).limit(4);
  if (r.error || !r.data || !r.data.length) { o.innerHTML = ""; return; }
  const hora = s => s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  const agora = Date.now(), lista = r.data.filter(x => !x.atendido_em || (agora - new Date(x.atendido_em).getTime()) < (x.erro ? 30 : 10) * 60e3);
  clearTimeout(mostrarSaidas._t); if (lista.some(x => !x.atendido_em)) mostrarSaidas._t = setTimeout(mostrarSaidas, 20e3);
  const nomeArq = x => String(x.arquivo || "").split(/[\\/]/).pop() || "acao.xlsx";
  o.innerHTML = lista.map(x => `<div class="sai-item ${x.erro ? "erro" : x.atendido_em ? "pronto" : "fila"}"><b>Excel da sugestão</b> · pedido ${esc(hora(x.pedido_em))} · ${x.erro ? "não saiu: " + esc(x.erro) : x.atendido_em ? `pronto ${esc(hora(x.atendido_em))} → ${x.storage_path ? `<button type="button" class="sai-baixa" data-p="${esc(x.storage_path)}" data-n="${esc(nomeArq(x))}">baixar</button> <span class="mu" title="${esc(x.arquivo || "")}">${esc(nomeArq(x))}</span>` : `<span class="mu" title="${esc(x.arquivo || "")}">arquivo só na máquina do Léo</span>`}${x.nota ? " · " + esc(x.nota) : ""}` : "na fila — sai em até 2 min (esta linha se atualiza sozinha)"}</div>`).join("");
  for (const b of o.querySelectorAll(".sai-baixa")) b.onclick = async () => {
    b.disabled = true; const r2 = await SB.storage.from("saidas-vitrine").createSignedUrl(b.dataset.p, 120, { download: b.dataset.n });
    if (r2.error || !r2.data || !r2.data.signedUrl) { b.textContent = "o cofre recusou"; return; }
    const a = document.createElement("a"); a.href = r2.data.signedUrl; a.download = b.dataset.n; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); b.textContent = "baixado ✓";
  };
}
// ---------- item no TOPICS (no bloco do cliente) e a ação em trade_acao (planejada, verba = gasto)
async function topics(bt){
  const bloco = S.d.bloco_topics; if (!bloco) { aviso("", "este cliente não tem bloco no TOPICS (cliente_perfil.bloco_topics)"); return; }
  if (!marcadas().length) { aviso("", "marque pelo menos um modelo"); return; }
  bt.disabled = true;
  const id = "trade-" + S.cliente.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
  const r = await SB.from("topics_item").insert({ escritorio_id: await escritorio(), id, bloco, sub: "TRADE", txt: resumo(), tipo: "tarefa", dono: "LEO", agente: "TRADE", atualizado_por: (await email()) || null });
  bt.disabled = false;
  if (r.error) { aviso("", "O TOPICS recusou: " + r.error.message); return; }
  aviso(`item criado no TOPICS, bloco ${bloco}`); if (window.Topics && Topics.recarregar) Topics.recarregar(); if (window.Cliente && Cliente.recarregar) Cliente.recarregar();
}
async function gravarAcao(bt){
  const p = pacote(); if (!p.linhas.length) { aviso("", "marque pelo menos um modelo"); return; }
  bt.disabled = true;
  const gasto = p.blocos.reduce((s, b) => s + b.gasto, 0);
  const r = await SB.from("trade_acao").insert({ escritorio_id: await escritorio(), cliente: S.cliente, titulo: `Cashback R$ ${String(S.inc).replace(".", ",")}/par · ${p.linhas.length} modelo(s) · ${dmy(p.ini)}–${dmy(p.fim)}`, tipo: "campanha", inicio: p.ini, fim: p.fim, status: "planejada", verba: gasto, nota: p.resumo, fonte: "sugestão do Gestor (trade_sugestao)" });
  bt.disabled = false;
  if (r.error) { aviso("", "O banco recusou a ação: " + r.error.message); return; }
  aviso(`ação gravada (planejada, valor da ação ${rs(gasto)}) — está em Ações de trade`); if (window.Trade && Trade.recarregar) Trade.recarregar(); if (window.Cliente && Cliente.recarregar) Cliente.recarregar();
}
// ---------- o CSS do painel (tema da aba Cliente; a tabela clara como a AG; cores só da paleta, em rgb)
const CSS = `
.cliente .tsug .fontes{margin-top:4px}
.cliente .ts-ctl{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;margin:10px 0}.cliente .ts-ctl>div{display:flex;flex-direction:column}.cliente .ts-ctl label{margin:0 0 3px}
.cliente .ts-ctl input[type=date],.cliente .ts-ctl input[type=number]{width:auto;padding:7px 9px;font-size:.86rem}.cliente .ts-ctl input[type=number]{width:84px}.cliente .ts-fator{display:flex;gap:6px;align-items:center}.cliente .ts-fator input[type=range]{width:110px;padding:0}
.cliente .ts-dias b{font-size:1.3rem;line-height:1.1}.cliente .ts-dias small{font-size:.64rem;color:var(--mu);text-transform:uppercase}
.cliente .ts-ctl .chips button{width:auto;margin:0;padding:7px 10px;font-size:.78rem}
.cliente .ts-placar{border-top:1px solid var(--bd);padding-top:8px;margin-top:6px}.cliente .ts-bloco{font-weight:800;color:var(--amarelo);margin:6px 0 2px;font-size:.9rem}.cliente .ts-bloco small{color:var(--mu);font-weight:500}
.cliente .ts-acoes{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}.cliente .ts-acoes button{width:auto;margin:0;padding:7px 12px;font-size:.8rem}.cliente .ts-acoes .msg{display:inline-block;margin:0;padding:6px 10px;font-size:.8rem}
.cliente .ts-tab{margin-top:10px}.cliente .ts-tab .rolagem{overflow:auto;max-height:60vh;background:var(--off-white);color:var(--preto);border-radius:8px}
.cliente table.ts{width:auto;min-width:100%;border-collapse:separate;border-spacing:0;font-size:.8rem;color:var(--preto);margin:0}
.cliente table.ts th,.cliente table.ts td{padding:4px 7px;white-space:nowrap;border-bottom:1px solid rgba(120,123,134,.25);color:var(--preto);vertical-align:middle}
.cliente table.ts th.n,.cliente table.ts td.n{text-align:right;font-variant-numeric:tabular-nums}
.cliente table.ts tr.tot th{position:sticky;top:0;z-index:3;background:var(--preto);color:var(--off-white);font-weight:800;box-shadow:inset 0 -2px 0 var(--amarelo);text-align:right}.cliente table.ts tr.tot th:nth-child(3){text-align:left;color:var(--amarelo)}
.cliente table.ts tr.cab th{position:sticky;top:27px;z-index:2;background:var(--cinza-claro);color:var(--preto);font-weight:700;font-size:.7rem;text-align:right}.cliente table.ts tr.cab th.c-chk,.cliente table.ts tr.cab th.c-star,.cliente table.ts tr.cab th.c-modelo{text-align:left}.cliente table.ts tr.cab th small{font-weight:500;color:var(--cinza-escuro)}
.cliente table.ts tbody td{background:#fff}.cliente table.ts tr.mod.on td{background:rgba(255,255,26,.22)}.cliente table.ts tr.mod td.meta,.cliente table.ts tr.mod td.gasto{font-weight:700}.cliente table.ts tr.fora td.modelo b{color:var(--cinza-escuro);font-style:italic}
.cliente table.ts td.modelo{text-align:left}.cliente table.ts td.modelo .mu{color:var(--cinza-escuro)}.cliente table.ts tr.cor td{background:rgba(173,174,179,.18);font-size:.74rem}.cliente table.ts tr.cor td.modelo{padding-left:34px}
.cliente table.ts .star{color:var(--cinza-claro);font-size:1rem}.cliente table.ts .star.a{color:var(--azul)}.cliente table.ts .star.b{color:var(--cinza-escuro)}
.cliente table.ts td.alta{color:var(--azul);font-weight:700}.cliente table.ts td.rupt{background:var(--amarelo);font-weight:800}
.cliente table.ts input[type=checkbox]{width:16px;height:16px;margin:0;padding:0}
.cliente table.ts button.mm{width:20px;height:20px;padding:0;margin:0 6px 0 0;border-radius:6px;background:var(--off-white);color:var(--preto);border:1px solid var(--cinza-escuro);font-weight:800;line-height:1;vertical-align:middle}
.cliente .tsug .sai-item{font-size:.76rem;margin:4px 0}.cliente .tsug .sai-item .sai-baixa{width:auto;margin:0 2px;padding:2px 10px;border-radius:6px;background:var(--azul);color:var(--off-white);font-size:.68rem;font-weight:700}
`;
if (typeof document !== "undefined" && !document.getElementById("css-trade-sug")) { const st = document.createElement("style"); st.id = "css-trade-sug"; st.textContent = CSS; document.head.appendChild(st); }
window.TradeSugestao = { abrir, montarPdf, conta, pacote, resumo, estado: () => ({ cliente: S.cliente, ini: S.ini, fim: S.fim, fator: S.fator, inc: S.inc, modo: S.modo, marcadas: [...S.marc] }), set: o => Object.assign(S, o || {}), redesenhar: desenhar };
})();
