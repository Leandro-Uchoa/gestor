// ANÁLISE ESTRATÉGICA POR PRAÇA (TI, 23/10) — ordem dele via PICASSO (22/10): "um botão de análise estratégica por praça: Ceará,
// Piauí e Maranhão; por enquanto só essa até eu solicitar leitura de outras praças". INTERNO: Léo e Caio. Nada de praça, cliente ou número
// mora neste repositório público: a lista vem de analise_praca (RLS: só quem está em acesso_interno) e o PDF do Storage PRIVADO
// (bucket analises-internas, política por eh_interno()), aberto por URL assinada de 1 hora. Quem não é interno não vê nem o botão.
(function(){
const UFS = [["CE", "Ceará"], ["PI", "Piauí"], ["MA", "Maranhão"]];
const BUCKET = "analises-internas";
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CELULAR = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
let SB = null, EL = null, INTERNO = null, LISTA = null, UF = "CE";

async function ehInterno(sb){
  if (INTERNO !== null) return INTERNO;
  try { const r = await sb.rpc("eh_interno"); INTERNO = !r.error && r.data === true; } catch (e) { INTERNO = false; }
  return INTERNO;
}
// o botão nasce escondido; só aparece para quem o banco disser que é interno
async function mostrarBotao(sb){
  const b = document.querySelector('.abas button[data-aba="praca"]'); if (!b) return;
  b.hidden = !(await ehInterno(sb));
}
const dmy = iso => iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "";
const kb = n => n ? (n >= 1_048_576 ? (n / 1_048_576).toFixed(1).replace(".", ",") + " MB" : Math.round(n / 1_024) + " KB") : "";

async function abrir(sb, el){
  SB = sb; EL = el;
  if (!(await ehInterno(sb))) { el.innerHTML = `<div class="msg aviso">Esta área é interna (gestão).</div>`; return; }
  el.innerHTML = `<div class="msg ok">buscando…</div>`;
  const r = await sb.from("analise_praca").select("praca,nome,titulo,versao,paginas,tamanho,storage_path,atualizado_em");
  if (r.error) { el.innerHTML = `<div class="msg erro">O banco recusou: ${esc(r.error.message)}</div>`; return; }
  LISTA = r.data || [];
  if (!LISTA.some(x => x.praca === UF)) UF = (LISTA[0] || {}).praca || "CE";
  desenhar();
}

function desenhar(){
  const tem = uf => LISTA.find(x => x.praca === uf);
  const chips = UFS.map(([uf, nome]) => { const t = tem(uf);
    return `<button type="button" data-uf="${uf}" class="${uf === UF && t ? "ativa" : ""}" ${t ? "" : `disabled title="sem leitura ainda" style="opacity:.45;cursor:not-allowed"`}>${esc(nome)}${t ? "" : ` <small>· sem leitura ainda</small>`}</button>`; }).join("");
  const x = tem(UF);
  const corpo = !x ? `<div class="msg aviso">Nenhuma praça com leitura ainda.</div>` : `
    <div class="card" style="margin-top:12px">
      <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 16px">
        <b style="font-size:20px">${esc(x.titulo)}</b>
        <span class="mu">${esc(x.versao || "")}${x.paginas ? " · " + x.paginas + " páginas" : ""}${x.tamanho ? " · " + kb(x.tamanho) : ""} · atualizado em ${dmy(x.atualizado_em)}</span>
        <span style="border:1px solid currentColor;font-size:12px;font-weight:700;letter-spacing:1px;padding:2px 8px;border-radius:4px">INTERNO · gestão</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">
        <button type="button" id="pr-abrir" style="width:auto;margin:0;padding:10px 18px">abrir o PDF ⧉</button>
        <button type="button" class="sec" id="pr-baixar" style="width:auto;margin:0;padding:10px 18px">baixar</button>
      </div>
      <div id="pr-msg"></div>
      ${CELULAR ? "" : `<iframe id="pr-pdf" title="${esc(x.titulo)}" style="width:100%;height:78vh;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:#fff"></iframe>`}
    </div>`;
  EL.innerHTML = `<div class="card"><div class="sec-tit">ANÁLISE ESTRATÉGICA POR PRAÇA</div><div class="chips" id="pr-ufs">${chips}</div></div>` + corpo;
  for (const b of EL.querySelectorAll("#pr-ufs button[data-uf]")) b.onclick = () => { if (b.disabled) return; UF = b.dataset.uf; desenhar(); };
  if (!x) return;
  const url = async baixar => {
    const nome = (x.titulo || "analise") + (x.versao ? " " + x.versao : "") + ".pdf";
    const r = await SB.storage.from(BUCKET).createSignedUrl(x.storage_path, 3_600, baixar ? { download: nome } : undefined);
    if (r.error) { EL.querySelector("#pr-msg").innerHTML = `<div class="msg erro">O cofre recusou: ${esc(r.error.message)}</div>`; return null; }
    return r.data.signedUrl;
  };
  EL.querySelector("#pr-abrir").onclick = async () => { const u = await url(false); if (u) window.open(u, "_blank", "noopener"); };
  EL.querySelector("#pr-baixar").onclick = async () => { const u = await url(true); if (u) { const a = document.createElement("a"); a.href = u; document.body.appendChild(a); a.click(); a.remove(); } };
  if (!CELULAR) url(false).then(u => { const f = EL.querySelector("#pr-pdf"); if (u && f) f.src = u; });
}

window.Praca = { abrir, mostrarBotao, ehInterno, estado: () => ({ cliente: UF }), ir: uf => { if (uf) UF = String(uf).toUpperCase(); } };
})();
