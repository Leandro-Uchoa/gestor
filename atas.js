// ATAS — a aba das atas da CMS no Gestor (ordem dele via BOSS, 14/10/2026). Só desenho: a lista vem de atas_lista() e o texto de
// uma ata de ata_texto(id), do banco, atrás do login. Nada de ata mora neste repositório (tem decisão, cliente e número).
// 19/10 (ele): filtros em SELETOR (botão que abre a lista em ordem alfabética, múltipla escolha, como no Power BI/Excel): cliente, ano, mês,
// assunto, e "só a mais recente" de cada cliente marcado. Cada ata tem a versão GERAL (interna) e a VERSÃO DO CLIENTE (escrita pela sala ATA,
// sem o que não interessa ao cliente); na do cliente, "gerar PDF" e "encaminhar" (WhatsApp, e-mail ou os dois — o TI envia).
// Regra da casa para este arquivo (publica_portal): nenhum número de 4+ dígitos no código.
(function(){
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const semAcento = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dmy = d => d ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(2, 4) : "—";
let DADOS = null, EL = null, SB = null, ESC = null;
const S = { pasta: new Set(), ano: new Set(), mes: new Set(), assunto: new Set(), recente: false, busca: "" };

async function abrir(sb, el){
  SB = sb; EL = el;
  if (!DADOS) {
    el.innerHTML = `<div class="card">carregando as atas…</div>`;
    const [r, e] = await Promise.all([sb.rpc("atas_lista"), sb.from("escritorio").select("id").limit(1)]);
    if (r.error) { el.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
    DADOS = r.data || { atas: [], n: 0 }; ESC = (e.data && e.data[0] && e.data[0].id) || null;
    for (const a of DADOS.atas) { a.mes = a.data ? a.data.slice(5, 7) : ""; a.ano = a.data ? a.data.slice(0, 4) : ""; }
  }
  desenhar();
}

function filtradas(){
  const t = semAcento(S.busca).split(/\s+/).filter(Boolean);
  let lista = DADOS.atas.filter(a => (!S.pasta.size || S.pasta.has(a.pasta)) && (!S.ano.size || S.ano.has(a.ano)) && (!S.mes.size || S.mes.has(a.mes))
    && (!S.assunto.size || (a.assunto || []).some(x => S.assunto.has(x)))
    && (!t.length || t.every(x => semAcento(a.titulo + " " + a.pasta + " " + (a.participantes || "") + " " + (a.decisoes || "") + " " + (a.assunto || []).join(" ")).includes(x))));
  if (S.recente) { const vista = new Set(); lista = lista.filter(a => { if (vista.has(a.pasta)) return false; vista.add(a.pasta); return true; }); }   // a lista já vem da mais nova para a mais velha
  return lista;
}

// o SELETOR (ele, 19/10: "um botão que aí eu seleciono, tipo no Power BI ou no Excel, e embaixo aparecem por ordem alfabética"): botão com o
// resumo do que está marcado; abre uma lista com busca e caixas; múltipla escolha; "todos" limpa
function seletor(id, rotulo, opcoes, sel, nomeDe){
  const el = EL.querySelector("#" + id), nomes = nomeDe || (v => v);
  const resumo = () => !sel.size ? `todos <small>${opcoes.length}</small>` : [...sel].map(nomes).slice(0, 3).join(", ") + (sel.size > 3 ? ` <small>+${sel.size - 3}</small>` : "");
  el.innerHTML = `<button type="button" class="sel-bt"><span class="sel-rot">${esc(rotulo)}</span><span class="sel-val">${resumo()}</span><span class="sel-seta">▾</span></button>
    <div class="sel-lista oculto"><input type="search" placeholder="procurar…" autocomplete="off"><div class="sel-itens"><label class="sel-item todos"><input type="checkbox" ${!sel.size ? "checked" : ""} data-v="">todos</label>${opcoes.map(([v, n]) => `<label class="sel-item"><input type="checkbox" data-v="${esc(v)}" ${sel.has(v) ? "checked" : ""}>${esc(nomes(v))} <small>${n}</small></label>`).join("")}</div></div>`;
  const bt = el.querySelector(".sel-bt"), lista = el.querySelector(".sel-lista"), busca = lista.querySelector("input[type=search]");
  bt.onclick = ev => { ev.stopPropagation(); const aberto = !lista.classList.contains("oculto"); for (const l of EL.querySelectorAll(".sel-lista")) l.classList.add("oculto"); if (!aberto) { lista.classList.remove("oculto"); busca.focus(); } };
  lista.onclick = ev => ev.stopPropagation();
  busca.oninput = () => { const q = semAcento(busca.value); for (const it of lista.querySelectorAll(".sel-item:not(.todos)")) it.classList.toggle("oculto", !!q && !semAcento(it.textContent).includes(q)); };
  for (const cb of lista.querySelectorAll("input[type=checkbox]")) cb.onchange = () => { const v = cb.dataset.v; if (v === "") sel.clear(); else if (cb.checked) sel.add(v); else sel.delete(v); desenhar(true); };
}
if (typeof document !== "undefined") document.addEventListener("click", () => { if (EL) for (const l of EL.querySelectorAll(".sel-lista")) l.classList.add("oculto"); });

function desenhar(manterAberto){
  const el = EL;
  if (!el.querySelector(".atas")) {
    el.innerHTML = `<div class="atas">
      <div class="card filtros">
        <input type="search" id="atas-busca" placeholder="buscar: cliente, assunto, quem estava, o que foi decidido…" autocomplete="off" value="${esc(S.busca)}" style="padding:10px 12px">
        <div class="seletores"><div class="seletor" id="atas-pasta"></div><div class="seletor" id="atas-ano"></div><div class="seletor" id="atas-mes"></div><div class="seletor" id="atas-assunto"></div>
          <button type="button" class="sel-bt recente" id="atas-recente" title="só a ata mais nova de cada cliente"><span class="sel-rot">mais recente</span><span class="sel-val">${S.recente ? "ligado" : "desligado"}</span></button></div>
        <div class="mu" id="atas-conta"></div>
      </div>
      <div class="lista" id="atas-lista"></div>
      <div class="luz oculto" id="atas-luz"></div>
    </div>`;
    el.querySelector("#atas-busca").oninput = (ev) => { S.busca = ev.target.value; clearTimeout(desenhar._t); desenhar._t = setTimeout(desenharLista, 120); };
    el.querySelector("#atas-luz").onclick = (ev) => { if (ev.target.id === "atas-luz" || ev.target.classList.contains("fecha")) fecharLuz(); };
  }
  const abertos = manterAberto ? [...el.querySelectorAll(".sel-lista:not(.oculto)")].map(l => l.parentElement.id) : [];
  const conta = (f) => { const c = new Map(); for (const a of DADOS.atas) for (const v of f(a)) if (v) c.set(v, (c.get(v) || 0) + 1); return c; };
  const alfa = (m, desc) => [...m.entries()].sort((x, y) => desc ? y[0].localeCompare(x[0]) : x[0].localeCompare(y[0], "pt-BR"));
  seletor("atas-pasta", "cliente", alfa(conta(a => [a.pasta])), S.pasta);
  seletor("atas-ano", "ano", alfa(conta(a => [a.ano]), true), S.ano);
  seletor("atas-mes", "mês", alfa(conta(a => [a.mes])), S.mes, m => MESES[+m - 1] || m);
  seletor("atas-assunto", "assunto", alfa(conta(a => (a.assunto || []).filter(x => x !== a.pasta))), S.assunto);
  for (const id of abertos) { const l = el.querySelector("#" + id + " .sel-lista"); if (l) l.classList.remove("oculto"); }
  const rb = el.querySelector("#atas-recente"); rb.classList.toggle("ativa", S.recente); rb.querySelector(".sel-val").textContent = S.recente ? "ligado" : "desligado"; rb.onclick = () => { S.recente = !S.recente; desenhar(); };
  desenharLista();
}

function desenharLista(){
  const lista = filtradas();
  EL.querySelector("#atas-conta").textContent = `${lista.length} de ${DADOS.n} ata(s)${S.recente ? " · só a mais recente de cada cliente" : ""}`;
  const g = EL.querySelector("#atas-lista");
  g.innerHTML = lista.map(a => `<div class="ata" data-id="${esc(a.id)}">
      <div class="cab"><span class="data">${dmy(a.data)}</span><span class="pasta">${esc(a.pasta)}</span><span class="fmt mu">${esc(a.formato)}</span>${a.tem_cliente ? `<span class="selo-cli" title="tem a versão do cliente">versão do cliente</span>` : ""}</div>
      <div class="titulo">${esc(a.titulo)}</div>
      ${a.participantes ? `<div class="mu part">${esc(a.participantes.replace(/\|/g, " · ").replace(/\s+/g, " ").slice(0, 160))}</div>` : ""}
      ${a.decisoes ? `<div class="dec">${esc(a.decisoes.replace(/[#*|_>`]/g, "").replace(/\s+/g, " ").slice(0, 260))}${a.decisoes.length > 260 ? "…" : ""}</div>` : ""}
    </div>`).join("") || `<div class="card mu">Nenhuma ata com esses filtros.</div>`;
  for (const d of g.querySelectorAll(".ata")) d.onclick = () => abrirAta(d.dataset.id);
}

let ATA = null, VERSAO = "geral";
// a VERSÃO DO CLIENTE só leva a data da reunião e o texto_cliente (BOSS, 19/10: o `titulo` interno da ata de 22/09 tem "(cancelamentos)";
// participantes, arquivo, tags e hora interna também ficam de fora). O título é a 1ª linha "# …" do texto_cliente; o corpo vem sem ela.
const tituloCliente = a => { const m = /^\s*#{1,3}\s+(.+?)\s*$/m.exec(String(a.texto_cliente || "")); return m ? m[1].replace(/[*_`]/g, "").trim() : "Ata da reunião"; };
const corpoCliente = a => String(a.texto_cliente || "").replace(/^\s*#{1,3}\s+.+?(\n|$)/, "");
const nomeArquivoCliente = a => (tituloCliente(a) + " " + dmy(a.data)).replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
function pdfHtmlCliente(a, cor){
  const T = cor || (n => "#000");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(nomeArquivoCliente(a))}</title>
<style>@page{size:A4;margin:0}html,body{margin:0;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif}body{padding:16mm 18mm}
h1{font-size:16pt;margin:0 0 4px}.sub{font-size:9pt;color:${T("--cinza-escuro")};margin-bottom:14px}h2,h3,h4{font-size:11pt;margin:14px 0 4px;color:${T("--azul")}}p,li{font-size:10.5pt;line-height:1.45}table{border-collapse:collapse;margin:8px 0;font-size:9.5pt}th,td{border:1px solid ${T("--cinza-claro")};padding:4px 8px;text-align:left;vertical-align:top}th{background:${T("--off-white")}}blockquote{border-left:3px solid ${T("--amarelo")};margin:8px 0;padding:2px 10px;color:${T("--cinza-escuro")}}</style></head>
<body><h1>${esc(tituloCliente(a))}</h1><div class="sub">${esc(dmy(a.data))}</div>${md2html(corpoCliente(a))}
<script>setTimeout(function(){window.focus();window.print();},200);<\/script></body></html>`;
}
async function abrirAta(id){
  const luz = EL.querySelector("#atas-luz");
  luz.innerHTML = `<div class="quadro"><button type="button" class="fecha">×</button><div class="mu">abrindo…</div></div>`;
  luz.classList.remove("oculto");
  const r = await SB.rpc("ata_texto", { p_id: id });
  if (r.error || !r.data) { luz.querySelector(".quadro").innerHTML = `<button type="button" class="fecha">×</button><div class="msg erro">O banco recusou: ${esc(r.error ? r.error.message : "ata não encontrada")}</div>`; return; }
  ATA = r.data; VERSAO = ATA.texto_cliente ? "cliente" : "geral";
  desenharAta();
}
function desenharAta(){
  const a = ATA, q = EL.querySelector("#atas-luz .quadro"), cli = VERSAO === "cliente";
  const texto = cli ? a.texto_cliente : a.texto;
  q.innerHTML = `<button type="button" class="fecha">×</button>
    <div class="cab"><span class="data">${dmy(a.data)}</span>${cli ? "" : `<span class="pasta">${esc(a.pasta)}</span><span class="mu">${esc(a.arquivo)}</span>`}</div>
    <h2>${esc(cli && a.texto_cliente ? tituloCliente(a) : a.titulo)}</h2>
    <div class="versoes"><button type="button" class="${cli ? "" : "ativa"}" data-v="geral">versão geral</button><button type="button" class="${cli ? "ativa" : ""}" data-v="cliente" ${a.texto_cliente ? "" : 'title="a sala ATA ainda não escreveu a versão do cliente desta ata"'}>versão do cliente${a.texto_cliente ? "" : " <small>(a fazer)</small>"}</button>
      ${cli ? `<button type="button" class="acao" id="ata-pdf">gerar PDF</button><button type="button" class="acao" id="ata-enviar">encaminhar…</button>` : ""}</div>
    ${cli && !a.texto_cliente ? `<div class="msg">Esta ata ainda não tem a versão do cliente. A sala ATA escreve a partir da versão geral, sem o que é interno (quem fez o quê na casa, números do nosso lado). Peça à ATA ou ao BOSS; aparece aqui quando pronta.</div>` : ""}
    <div class="texto">${cli ? (a.texto_cliente ? md2html(corpoCliente(a)) : "") : (texto ? (a.formato === "md" ? md2html(texto) : `<pre>${esc(texto)}</pre>`) : "")}</div>
    <div class="mu" id="ata-envios"></div>`;
  for (const b of q.querySelectorAll(".versoes button[data-v]")) b.onclick = () => { VERSAO = b.dataset.v; desenharAta(); };
  const pdf = q.querySelector("#ata-pdf"); if (pdf) pdf.onclick = () => imprimirAta();
  const env = q.querySelector("#ata-enviar"); if (env) env.onclick = () => pedirEnvio();
  mostrarEnvios();
}
function fecharLuz(){ EL.querySelector("#atas-luz").classList.add("oculto"); }

// o PDF da versão do cliente: janela própria, A4 em pé, só o texto do cliente — o interno não vai (coluna interna nunca vai ao cliente)
function imprimirAta(){
  const a = ATA; if (!a || !a.texto_cliente) { alert("Esta ata ainda não tem a versão do cliente."); return; }
  const T = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#000";
  const doc = pdfHtmlCliente(a, T);
  const w = window.open("", "_blank"); if (!w) { alert("O navegador bloqueou a janela do PDF. Libere pop-ups para o Gestor."); return; }
  w.document.open(); w.document.write(doc); w.document.close();
}
// encaminhar: WhatsApp, e-mail ou os dois — a página anota o pedido; o TI envia (e-mail pelo envia_gmail.py, WhatsApp pelo posto) e devolve o resultado aqui
function pedirEnvio(){
  const a = ATA; if (!a || !a.texto_cliente) { alert("Esta ata ainda não tem a versão do cliente."); return; }
  const luz = document.createElement("div"); luz.className = "luz grade-luz";
  luz.innerHTML = `<div class="quadro grade-quadro"><div class="gq-nome">Encaminhar a versão do cliente</div><div class="gq-perg">${esc(tituloCliente(a))} · ${esc(dmy(a.data))}</div>
    <div class="gq-grade"><label class="gq-opt"><input type="radio" name="canal" value="whatsapp" checked> WhatsApp</label><label class="gq-opt"><input type="radio" name="canal" value="email"> e-mail</label><label class="gq-opt"><input type="radio" name="canal" value="ambos"> os dois</label></div>
    <div class="gq-perg">Para quem? <span class="mu">nome como está no WhatsApp, ou o e-mail</span></div><input type="text" class="gq-texto" placeholder="ex.: Helinho Polyélle · helio@…">
    <div class="gq-acoes"><button type="button" class="gq-sobe">pedir o envio</button><button type="button" class="sec gq-deixa">deixa</button></div></div>`;
  const fecha = () => luz.remove();
  luz.onclick = ev => { if (ev.target === luz) fecha(); }; luz.querySelector(".gq-deixa").onclick = fecha;
  luz.querySelector(".gq-sobe").onclick = async () => {
    const canal = luz.querySelector("input[name=canal]:checked").value, dest = luz.querySelector(".gq-texto").value.trim();
    if (!dest) { luz.querySelector(".gq-texto").focus(); return; }
    const r = await SB.from("ata_envio").insert({ escritorio_id: ESC, ata_id: a.id, canal, destinatario: dest });
    fecha(); if (r.error) alert("O banco recusou o pedido: " + r.error.message); mostrarEnvios();
  };
  document.body.appendChild(luz); luz.querySelector(".gq-texto").focus();
}
async function mostrarEnvios(){
  const o = EL.querySelector("#ata-envios"); if (!o || !ATA) return;
  const r = await SB.from("ata_envio").select("canal,destinatario,pedido_em,atendido_em,resultado,erro").eq("ata_id", ATA.id).order("pedido_em", { ascending: false }).limit(5);
  if (r.error || !r.data || !r.data.length) { o.innerHTML = ""; return; }
  const hora = s => s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  o.innerHTML = r.data.map(x => `<div class="sai-item ${x.erro ? "erro" : (x.atendido_em ? "pronto" : "fila")}"><b>${esc(x.canal)}</b> para ${esc(x.destinatario || "")} · pedido ${esc(hora(x.pedido_em))} · ${x.erro ? "não saiu: " + esc(x.erro) : (x.atendido_em ? "enviado " + esc(hora(x.atendido_em)) + (x.resultado ? " · " + esc(x.resultado) : "") : "na fila — o TI envia e confirma aqui")}</div>`).join("");
}

// markdown mínimo, só o que a ATA VIVA usa: títulos, negrito, itálico, listas, tabelas, citações, linhas
function md2html(src){
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/~~(.+?)~~/g, "<s>$1</s>");
  const linhas = String(src || "").replace(/\r/g, "").split("\n"); let out = "", i = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    if (/^\s*\|/.test(l)) {
      const tb = []; while (i < linhas.length && /^\s*\|/.test(linhas[i])) tb.push(linhas[i++]);
      const rows = tb.filter(r => !/^\s*\|?\s*:?-{2,}/.test(r)).map(r => r.replace(/^\s*\||\|\s*$/g, "").split("|").map(c => c.trim()));
      out += "<table>" + rows.map((r, k) => "<tr>" + r.map(c => `<${k ? "td" : "th"}>${inline(c)}</${k ? "td" : "th"}>`).join("") + "</tr>").join("") + "</table>"; continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(l);
    if (h) { out += `<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`; i++; continue; }
    if (/^\s*[-*]\s+/.test(l)) { let ul = ""; while (i < linhas.length && /^\s*[-*]\s+/.test(linhas[i])) ul += `<li>${inline(linhas[i++].replace(/^\s*[-*]\s+/, ""))}</li>`; out += `<ul>${ul}</ul>`; continue; }
    if (/^\s*\d+[.)]\s+/.test(l)) { let ol = ""; while (i < linhas.length && /^\s*\d+[.)]\s+/.test(linhas[i])) ol += `<li>${inline(linhas[i++].replace(/^\s*\d+[.)]\s+/, ""))}</li>`; out += `<ol>${ol}</ol>`; continue; }
    if (/^\s*>/.test(l)) { let q = ""; while (i < linhas.length && /^\s*>/.test(linhas[i])) q += inline(linhas[i++].replace(/^\s*>\s?/, "")) + " "; out += `<blockquote>${q}</blockquote>`; continue; }
    if (/^\s*-{3,}\s*$/.test(l)) { out += "<hr>"; i++; continue; }
    if (!l.trim()) { i++; continue; }
    let p = ""; while (i < linhas.length && linhas[i].trim() && !/^(#{1,4}\s|\s*[-*]\s|\s*\d+[.)]\s|\s*>|\s*\||\s*-{3,}\s*$)/.test(linhas[i])) p += inline(linhas[i++]) + " ";
    out += `<p>${p}</p>`;
  }
  return out;
}

window.Atas = { abrir, tituloCliente, corpoCliente, nomeArquivoCliente, pdfHtmlCliente, md2html };
})();
