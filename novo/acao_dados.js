// Gestor · AÇÃO DE PREÇO (novo) — a CAMADA DE DADOS (TI, 28/10/2026). Contrato em TI\CONTRATO_ACAO_PRECO_DADOS.md; a casca é do PICASSO
// (window.desenharAcao(DADOS)). Fonte: v_acao_preco (0118: FORA DE LINHA · PONTA DE ESTOQUE · AÇÃO/REBAIXO — o holofote foi REVOGADO pelo Léo:
// produto em linha nunca entra, nem preço de referência externa); foto pela colecao.foto_url (referência + cor); corte por cliente já na view.
// Regras: a API corta em 1.000 linhas (.range em laço); nada embutido; a página de um cliente nunca cita outro; coluna interna (custo, carteira
// futura, meses sem faturar, último faturamento, valor de estoque) some em ?modo=cliente; chinelo nunca somado ao tênis; meias em packs.
window.DadosAcao = (() => {
  const sb = window.supabase.createClient(URL_SB, CHAVE);
  const MODO_CLIENTE = new URLSearchParams(location.search).get("modo") === "cliente";
  const DATA_OK = /^\d{4}-\d{2}-\d{2}/, MES_OK = /^\d{4}-\d{2}/;
  const PERIODOS = { bf: "Black Friday", outlet: "Outlet", queima: "Queima", aniversario: "Aniversário do cliente", promocao: "Promoção" };
  const TIPOS = { "FORA DE LINHA": { nome_tela: "Fora de linha", explicacao: "saiu de linha: não repor nem antecipar — queima ou outlet" },
                  "PONTA DE ESTOQUE": { nome_tela: "Ponta de estoque", explicacao: "pelo corte de estoque do cliente (até o limite de ponta) E sem faturar para ele há 6 meses ou mais — fechar grade; com carteira chegando, segurar" },
                  "AÇÃO/REBAIXO": { nome_tela: "Ação / rebaixo", explicacao: "pelo corte de estoque do cliente (acima da ponta, até o limite de ação) E sem faturar há 6 meses ou mais — orientar para ação, promoção ou rebaixo; com carteira chegando, segurar" } };
  // em ?modo=cliente a explicação é neutra (GAMER 28/10: o critério interno não vai à tela do cliente)
  const EXPLICA_CLIENTE = { "FORA DE LINHA": "modelos que saíram de linha", "PONTA DE ESTOQUE": "últimas unidades", "AÇÃO/REBAIXO": "seleção para a ação" };
  const ORDEM = ["FORA DE LINHA", "PONTA DE ESTOQUE", "AÇÃO/REBAIXO"];
  const UNIDADE = f => /MEIAS/.test(f) ? "packs" : /ACESS|VESTU/.test(f) ? "peças" : "pares";
  const NOME_FAM = { "TÊNIS": "Tênis Olympikus", "CHINELO": "Chinelos Olympikus", "MEIAS": "Meias Olympikus", "ACESSÓRIO": "Acessórios Olympikus", "VESTUÁRIO": "Confecção Olympikus",
                     "UA TÊNIS": "Tênis Under Armour", "UA CHINELO": "Chinelos Under Armour", "UA MEIAS": "Meias Under Armour", "UA ACESSÓRIO": "Acessórios Under Armour", "UA VESTUÁRIO": "Confecção Under Armour" };
  let BRUTO = null;
  const fotoLembrada = k => { try { return localStorage.getItem("acao_foto:" + k) || null; } catch (e) { return null; } };   // GAMER 28/10: a cascata gerava ~31 404 por carga; a URL que carregou é lembrada neste aparelho

  async function tudo(q) { const out = []; for (let i = 0; ; i += 1000) { const { data, error } = await q.range(i, i + 999); if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) break; } return out; }
  const semErro = (fn, vazio) => Promise.resolve().then(fn).catch(e => { console.warn("fonte acessória falhou", e && e.message || e); return vazio === undefined ? [] : vazio; });
  async function sessao() { const { data: { session } } = await sb.auth.getSession(); return session; }
  async function entrar(email, senha) { const { error } = await sb.auth.signInWithPassword({ email, password: senha }); return error ? error.message : null; }
  async function sair() { await sb.auth.signOut({ scope: "local" }); location.reload(); }
  async function clientes() { const { data, error } = await sb.rpc("clientes_lista"); if (error) throw error; return (data || []).map(c => ({ cliente: c.cliente, nome: c.nome })); }

  async function carregar(cliente, periodo) {
    const [linhas, perfil, corte] = await Promise.all([
      tudo(sb.from("v_acao_preco").select("tipo,tipo_ordem,familia,referencia,cor,descricao,genero,faixa,categoria,imagem,venda_m3,venda_12m,estoque,cobertura,excesso,ult_venda,meses_sem_fat,carteira_futura,mes_estoque,meses_venda,principal" + (MODO_CLIENTE ? "" : ",ult_fat,preco_medio,valor_estoque"))   // GAMER 28/10: em modo cliente a consulta não traz custo nem último faturamento; meses_sem_fat e carteira_futura ficam porque a TRAVA é calculada com eles (o item não os expõe)
             .eq("cliente", cliente).order("tipo_ordem").order("estoque", { ascending: false }).order("referencia").order("cor")),
      semErro(() => tudo(sb.from("cliente_perfil").select("cliente,nome").eq("cliente", cliente)), []),
      semErro(() => tudo(sb.from("corte_estoque_cliente").select("ponta_ate,acao_ate").eq("cliente", cliente)), []),   // GAMER 28/10: o texto da ponta/ação diz o número do corte do cliente
    ]);
    // fotos: colecao.foto_url por referência (+ cor), em blocos de 200 referências
    const refs = [...new Set(linhas.map(l => l.referencia).filter(Boolean))], FOTO = new Map();
    for (let i = 0; i < refs.length; i += 200) {
      const rows = await semErro(() => tudo(sb.from("colecao").select("referencia,cor,foto_url,imagem").in("referencia", refs.slice(i, i + 200)).order("referencia").order("cor")));
      for (const r of rows) { if (!r.foto_url) continue; FOTO.set(r.referencia + "|" + (r.cor || ""), r.foto_url); if (!FOTO.has(r.referencia + "|")) FOTO.set(r.referencia + "|", r.foto_url); }
    }
    // cadastro: nome da cor e a foto verificada por cor (produto.foto_url, 0124)
    const CAD = []; for (let i = 0; i < refs.length; i += 200) CAD.push(...await semErro(() => tudo(sb.from("produto").select("referencia,cor,cor_descricao,imagem,foto_url").in("referencia", refs.slice(i, i + 200)).order("referencia").order("cor"))));
    // foto VERIFICADA (Engenharia 0124, 28/10): produto.foto_url só existe quando o catálogo devolveu 200 com imagem — sem cascata, sem 404; Under Armour quase sem foto → silhueta
    const COR = new Map(CAD.map(p => [p.referencia + "|" + (p.cor || ""), p.cor_descricao])), IMG = new Map();
    for (const p of CAD) { if (!p.foto_url) continue; IMG.set(p.referencia + "|" + (p.cor || ""), p.foto_url); (IMG.get(p.referencia) || IMG.set(p.referencia, []).get(p.referencia)).push(p.foto_url); }
    const situ = await semErro(() => tudo(sb.from("produto_situacao").select("referencia,em_linha").eq("em_linha", false).order("referencia")));
    BRUTO = { cliente, nome: (perfil[0] || {}).nome || cliente, linhas, FOTO, COR, IMG, FORA: new Set(situ.map(s => s.referencia)), corte: (corte || [])[0] || null };
    return montar(periodo || "bf", null, "");
  }

  function montar(periodo, familia, busca) {
    const { cliente, nome, linhas, FOTO, COR, IMG, FORA, corte } = BRUTO, hojeD = new Date().toISOString().slice(0, 10);
    const nPt = corte && corte.ponta_ate != null ? Math.round(+corte.ponta_ate).toLocaleString("pt-BR") : null, nAc = corte && corte.acao_ate != null ? Math.round(+corte.acao_ate).toLocaleString("pt-BR") : null, nPt1 = corte && corte.ponta_ate != null ? (Math.round(+corte.ponta_ate) + 1).toLocaleString("pt-BR") : null;
    const EXPL = Object.assign({}, TIPOS);   // GAMER 28/10: limite com número, do corte deste cliente
    if (nPt) EXPL["PONTA DE ESTOQUE"] = { nome_tela: "Ponta de estoque", explicacao: "até " + nPt + " pares em estoque (corte deste cliente) E sem faturar para ele há 6 meses ou mais E sem carteira chegando — fechar grade" };
    if (nAc) EXPL["AÇÃO/REBAIXO"] = { nome_tela: "Ação / rebaixo", explicacao: "de " + nPt1 + " a " + nAc + " pares em estoque (corte deste cliente) E sem faturar há 6 meses ou mais E sem carteira chegando — orientar para ação, promoção ou rebaixo" };
    // ⛔ TRAVA (Léo, 28/10 — a maior bronca do dia; PICASSO): ação de preço NUNCA mostra produto EM LINHA. Fica só o que é fora de linha (tipo ou cadastro) ou está
    // sem faturar para o cliente há 6+ meses. O que a view trouxe pelo corte de estoque e ainda vende (ex.: 4 meses sem faturar) SAI, e é contado para o porteiro.
    // GAMER 28/10: com carteira chegando o produto SAI da lista nos dois modos (não se promove o que está chegando); no interno vai ao #a_exc com o motivo
    const chegando = l => +l.carteira_futura > 0;
    const permitido = l => !chegando(l) && (l.tipo === "FORA DE LINHA" || FORA.has(l.referencia) || (+l.meses_sem_fat >= 6));
    const excluidos = linhas.filter(l => ORDEM.includes(l.tipo) && !permitido(l)).map(l => ({ ref: l.referencia, modelo: l.descricao, tipo: l.tipo, meses_sem_fat: l.meses_sem_fat, estoque: l.estoque, motivo: chegando(l) ? "carteira chegando" : "ainda em linha (menos de 6 meses sem faturar)" }));
    const nCheg = excluidos.filter(e => e.motivo === "carteira chegando").length, nLinha = excluidos.length - nCheg;
    const termos = String(busca || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);   // vários termos separados por vírgula
    const casa = it => !termos.length || termos.every(t => [it.modelo, it.ref, it.cor, it.cor_nome, it.familia, it.genero, it.categoria, it.faixa].some(v => String(v || "").toLowerCase().includes(t)));
    const itens = linhas.filter(l => ORDEM.includes(l.tipo) && permitido(l)).map(l => {
      const k = l.referencia + "|" + (l.cor || ""), lembrada = fotoLembrada(k), fotos = [...new Set([l.cor ? IMG.get(k) : null, lembrada].concat(IMG.get(l.referencia) || [], [FOTO.get(k), FOTO.get(l.referencia + "|")]).filter(Boolean))], foto = fotos[0] || null;   // cascata: a casca tenta uma a uma (onerror) e cai na silhueta
      const it = { ref: l.referencia, cor: l.cor || "", cor_nome: COR.get(k) || l.cor || (l.cor ? l.cor : "todas as cores"), modelo: l.descricao || l.referencia, familia: l.familia, genero: l.genero, faixa: l.faixa, categoria: l.categoria,
                   foto, fotos, foto_falta: !foto, venda_mes: l.venda_m3 != null ? Math.round(+l.venda_m3) : null, venda_12m: l.venda_12m != null ? Math.round(+l.venda_12m) : null, estoque: l.estoque != null ? +l.estoque : null,
                   cobertura: l.cobertura != null ? Math.round(+l.cobertura * 10) / 10 : null, excesso: l.excesso != null ? Math.round(+l.excesso) : null, ult_venda: MES_OK.test(String(l.ult_venda)) ? String(l.ult_venda).slice(0, 7) : null,
                   mes_estoque: MES_OK.test(String(l.mes_estoque)) ? String(l.mes_estoque).slice(0, 7) : null, meses_venda: l.meses_venda || "", principal: !!l.principal, tipo: l.tipo,
                   tag: l.tipo === "FORA DE LINHA" ? "fora de linha" : l.tipo === "PONTA DE ESTOQUE" ? "ponta" : "ação/rebaixo", sem_repor: l.tipo === "FORA DE LINHA", unidade: UNIDADE(l.familia) };
      if (!MODO_CLIENTE) Object.assign(it, { preco_medio: l.preco_medio != null ? +l.preco_medio : null, valor_estoque: l.valor_estoque != null ? Math.round(+l.valor_estoque) : null, meses_sem_fat: l.meses_sem_fat,
                                              ult_fat: DATA_OK.test(String(l.ult_fat)) ? String(l.ult_fat).slice(0, 10) : null, carteira_futura: 0, segurar: false });   // quem tem carteira chegando já saiu da lista
      return it;
    }).filter(it => (!familia || it.familia === familia) && casa(it));
    itens.sort((a, b) => ORDEM.indexOf(a.tipo) - ORDEM.indexOf(b.tipo) || (b.estoque || 0) - (a.estoque || 0) || String(a.modelo).localeCompare(String(b.modelo), "pt-BR"));   // ordem garantida aqui (não depende do banco nem do harness)
    const famSet = [...new Set(linhas.map(l => l.familia).filter(Boolean))];
    const familias = famSet.map(f => { const L = itens.filter(i => i.familia === f); return { chave: f, nome: NOME_FAM[f] || f, unidade: UNIDADE(f), n: L.length, estoque: L.reduce((s, i) => s + (i.estoque || 0), 0) }; });
    const tipos = ORDEM.map((t, i) => { const L = itens.filter(x => x.tipo === t); return Object.assign({ tipo: t, ordem: i + 1, n: L.length, estoque: L.reduce((s, x) => s + (x.estoque || 0), 0), itens: L },
      EXPL[t], MODO_CLIENTE ? { explicacao: EXPLICA_CLIENTE[t] } : { valor_estoque: L.reduce((s, x) => s + (x.valor_estoque || 0), 0) }); });   // as 3 abas sempre (com 0 quando o filtro esvazia — GAMER 28/10)
    const base = linhas[0] || {};
    return { hoje: hojeD, cliente: { codigo: cliente, nome }, periodo: { chave: PERIODOS[periodo] ? periodo : "bf", rotulo: PERIODOS[periodo] || PERIODOS.bf }, ordem_tipos: ORDEM.slice(),
             familias, tipos, filtro: { familia: familia || null, busca: busca || "" }, bases: { giro: MES_OK.test(String(base.mes_estoque)) ? String(base.mes_estoque).slice(0, 7) : null, venda: base.meses_venda || null },
             excluidos_em_linha: MODO_CLIENTE ? 0 : excluidos.length, excluidos_carteira: MODO_CLIENTE ? 0 : nCheg, excluidos_linha: MODO_CLIENTE ? 0 : nLinha, excluidos: MODO_CLIENTE ? undefined : excluidos,   /* GAMER 28/10: em modo cliente nem o número vai ao DOM */ modo_cliente: MODO_CLIENTE, regra: MODO_CLIENTE ? "seleção para a ação: fora de linha, ponta de estoque e rebaixo" : "só fora de linha, ponta de estoque e ação/rebaixo pelo corte do cliente · produto em linha nunca entra · sem preço de referência externa · o período só muda o rótulo · critério desta tela: corte de estoque do cliente (a aba Cliente conta ponta pelo raio-x e fora de linha pelo cadastro — números diferentes com o mesmo nome)" };
  }
  return { sb, sessao, entrar, sair, clientes, carregar, refiltrar: (p, f, b) => montar(p, f, b), MODO_CLIENTE, PERIODOS, ORDEM };
})();
