// Gestor · BUSCAR A META (novo) — a CAMADA DE DADOS (TI, 28/10/2026; v5 29/10: cadastro do TODOS, total soma as faixas, dispo sem cliente não se marca). Contrato em TI\CONTRATO_META_BUSCA_DADOS.md; a casca é do PICASSO
// (window.desenharMeta(DADOS)). Fontes: v_onde_buscar_meta (0099–0101: placar por preposto × faixa, movimentos m1–m5), v_buscar_meta_placar
// (0109–0117: 4 estados), v_buscar_meta (0104–0117: blocos 1–5, um SKU por linha), v_buscar_meta_pedido_sugerido (0117: pedido novo com teto),
// produto.foto_url (0124, verificada). Regras: a API corta em 1.000 linhas (.range em laço); nada embutido (preposto vem da view e da URL,
// nunca do código); chinelo nunca somado ao tênis; régua ruptura <4 · ideal 4–5 · alta ≥5; grade em múltiplos de 12; a tela só MOSTRA e marca —
// nada sai sem o clique do Léo; ⛔ atrás do login, nunca em ?modo=cliente (meta de vendedor é nome + dinheiro; não sai da casa).
window.DadosMeta = (() => {
  const sb = window.supabase.createClient(URL_SB, CHAVE);
  const MES_OK = /^\d{4}-\d{2}/, DATA_OK = /^\d{4}-\d{2}-\d{2}/;
  const NOME_BLOCO = { 1: "Origem → cliente seu", 2: "Sua carteira do mês seguinte", 3: "A origem antecipa para ela", 4: "Dispo imediata", 5: "Continua inchado na origem" };   // só para o aviso de bloco que não carregou (com linha, vale o bloco_nome da view — nome de cliente só vem do banco, nunca do código)
  const BLOCOS = { 1: { acao: "transferir", verbo: "Solicitar transferência", explicacao: "inchado na origem (cobertura alta) e em falta no cliente seu — até 1 mês de venda dele" },
                   2: { acao: "antecipar", verbo: "Antecipar", explicacao: "sua carteira do mês seguinte: ruptura → ideal → repasse da CMS → alta" },
                   3: { acao: "antecipar", verbo: "Antecipar", explicacao: "a origem antecipa para ela mesma só o que ela precisa (cobertura < 5)" },
                   4: { acao: "digitar", verbo: "Digitar", explicacao: "o que o EBM tem para faturar na quinzena: quem entra no pedido vem primeiro" },
                   5: { acao: null, verbo: null, explicacao: "continua inchado na origem: rever a entrada do mês seguinte ou outro cliente" } };
  const NOME_FAIXA = { "TT CALCADOS": "Total de tênis", "TT FTW_UA": "Total de tênis UA", "TT GERAL": "Total geral (R$)", "ACOLY": "Acessórios (R$)", "CHOLY": "Chinelos (R$)", "MEOLY": "Meias (R$)", "CFOLY": "Confecção (R$)", "UA_AC": "Acessórios UA (R$)", "UA_CF": "Confecção UA (R$)", "UA_CH": "Chinelos UA (R$)", "UA_ME": "Meias UA (R$)",
                       "CONF_FEM": "Conforto feminino", "CONF_MASC": "Conforto masculino", "CORRIDA/TREINO": "Corrida / treino", "CLASSICOS": "Clássicos", "INFANTIL": "Infantil", "CORRE": "Família Corre",
                       "UA_AC": "Acessórios UA (R$)", "UA_ME": "Meias UA (R$)", "UA_CH": "Chinelos UA (R$)", "UA_TN": "Tênis UA (R$)", "BASKETBALL": "Basquete UA", "TRAINING": "Treino UA", "RUNNING": "Corrida UA", "RUN INSPIRED": "Run inspired UA" };
  const NA_REGUA = g => /cobertura < 5|repasse CMS/i.test(g || "");                 // o que o "marcar o mínimo" pode marcar (NÚCLEO: dentro da régua)
  const FORA_REGUA = g => /alta|sem giro|a confirmar/i.test(g || "");             // recolhido atrás de "+N" (nunca misturado)
  let BRUTO = null, MARCADOS = new Set(), NOMES = new Map(), SAIDA = null, ESC = null, PEDINDO = false, CARGA = 0, P_CARGA = null;   /* P_CARGA: vendedor da carga mais nova, desde o 1º instante (v9: a troca é reconhecida antes do placar chegar) */   /* CARGA: nº da carga em curso (v8: carga velha não escreve na nova) */   /* SAIDA: o pedido do arquivo (vitrine_saida) em curso; PEDINDO: insert em andamento (v7: dois toques = um pedido) */   /* NOMES: código → nome do vendedor (nota do TODOS) */

  async function tudo(q) { const out = []; for (let i = 0; ; i += 1000) { const { data, error } = await q.range(i, i + 999); if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) break; } return out; }
  async function sessao() { const { data: { session } } = await sb.auth.getSession(); return session; }
  async function entrar(email, senha) { const { error } = await sb.auth.signInWithPassword({ email, password: senha }); return error ? error.message : null; }
  async function sair() { await sb.auth.signOut({ scope: "local" }); location.reload(); }
  // prepostos (vendedores) que a view conhece — TODOS = a CMS inteira; a ordem vem da view (preposto_ordem)
  async function prepostos() {
    const rows = await tudo(sb.from("v_onde_buscar_meta").select("preposto,preposto_nome,preposto_ordem").order("preposto_ordem").order("preposto"));
    const vistos = new Map(); for (const r of rows) if (r.preposto && !vistos.has(r.preposto)) { vistos.set(r.preposto, { codigo: r.preposto, nome: r.preposto_nome || r.preposto, ordem: r.preposto_ordem }); NOMES.set(r.preposto, r.preposto_nome || r.preposto); }
    return [...vistos.values()].sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
  }

  // GAMER 28/10 (v2): as 6 consultas em paralelo estouravam o teto de 8 s do banco (statement timeout) e a página não abria. Agora é EM FILA,
  // o placar primeiro, e a tela redesenha a cada passo (aoPasso); o que é acessório (estados do placar, pedido novo) vem por último e pode faltar.
  const PASSOS = 8;
  async function carregar(preposto, aoPasso) {
    const minha = ++CARGA, viva = () => minha === CARGA;   /* v8 (GAMER): só a carga mais nova escreve e desenha */
    P_CARGA = preposto || "TODOS";
    const P = preposto || "TODOS", emitir = (passo, rotulo) => { if (!viva()) return; try { if (aoPasso) aoPasso(montar(null, { passo, total: PASSOS, rotulo })); } catch (e) { console.error("passo " + passo, e); } };
    const placar = await tudo(sb.from("v_onde_buscar_meta").select("*")   // "*": colunas novas no FIM (m3_sem_ag, em curso no DBA) entram sem quebrar a consulta
             .eq("preposto", P).order("marca").order("faixa_ordem"));
    if (!viva()) return null;   /* v8: outra carga começou — esta para aqui */
    const nomeP = (placar[0] || {}).preposto_nome || (P === "TODOS" ? "CMS" : P);
    if (BRUTO && BRUTO.P !== P) SAIDA = null;   /* v7 (GAMER): o pedido do arquivo é do vendedor que o pediu; Atualizar no mesmo vendedor mantém */
    BRUTO = { P, nomeP, placar, estados: [], linhas: [], pedido: [], cms: [], cadastro: [], COR: new Map(), IMG: new Map(), falhas: {} }; MARCADOS = new Set();
    const B = BRUTO;   /* v8: as falhas desta carga vão no objeto DESTA carga; v9 (GAMER): TODA escrita da carga vai no B — a velha nunca anexa no BRUTO novo */
    const acess = async (nome, fn) => { try { return await fn(); } catch (e) { console.warn("fonte acessória falhou", nome, e && e.message || e); B.falhas[nome] = (e && e.message) || String(e); return []; } };   // GAMER: acessório que falha NÃO some calado
    emitir(1, "placar");
    // estados do placar logo depois do placar (0127: tabela pronta, 0,06 s) — a ordem e os selos valem desde o passo 2
    B.estados = await acess("estados", () => tudo(sb.from("v_buscar_meta_placar").select("preposto,faixa,falta_gatilho,fecha_na_regua,fecha_com_alta,repasse_a_confirmar,estado,fecha_com_pedido,fecha_com_pedido_sem_teto,base_em").eq("preposto", P)));
    if (!viva()) return null;   /* v8: outra carga começou — esta para aqui */
    B.cms = P === "TODOS" ? [] : await acess("cms", () => tudo(sb.from("v_onde_buscar_meta").select("marca,faixa,gatilho,real,falta_gatilho,bate,alcanca").eq("preposto", "TODOS")));
    if (!viva()) return null;   /* v8: outra carga começou — esta para aqui */
    // v5 (GAMER): no TODOS, o cadastro cliente → vendedor diz de quem são as listas (um só preposto cadastrado → a tela avisa em vez de parecer cópia)
    B.cadastro = P === "TODOS" ? await acess("cadastro", () => tudo(sb.from("preposto_cliente").select("preposto,cliente").order("preposto").order("cliente")), []) : [];
    if (!viva()) return null;   /* v8: outra carga começou — esta para aqui */
    emitir(2, "estados do placar");
    // blocos pelas views de cada um (as rápidas), em fila: 1 · origem → cliente seu · 2 · carteira do mês seguinte · 3 · origem antecipa · 5 · continua inchada · 4 · dispo
    const sel = v => sb.from(v).select("*");
    // v6 (GAMER): bloco que estoura o tempo NÃO some calado — a falha fica em falhas.blocoN, a tela avisa e oferece "tentar de novo"
    const b1 = await acess("bloco1", () => tudo((P === "TODOS" ? sel("v_buscar_meta_pio_cliente") : sel("v_buscar_meta_pio_cliente").eq("preposto", P)).order("faixa").order("prioridade")));
    if (!viva()) return null;   /* v8: outra carga começou — esta para aqui */
    const b2 = await acess("bloco2", () => tudo((P === "TODOS" ? sel("v_buscar_meta_carteira_nov") : sel("v_buscar_meta_carteira_nov").eq("preposto", P)).order("faixa").order("prioridade")));
    if (!viva()) return null;   /* v8: outra carga começou — esta para aqui */
    // v6 (Engenharia 29/10): a carteira_nov repete as linhas "repasse CMS" e "repasse a confirmar" em CADA preposto (alvo ∪ CMS por vendedor); no TODOS
    // elas entrariam 6 vezes e somariam em dobro — fica UMA por chave (a mesma do id), até o NÚCLEO fixar a regra de quem leva o repasse
    const vistas = new Set(), b2u = P === "TODOS" ? b2.filter(l => { const k = idDe(l); if (vistas.has(k)) return false; vistas.add(k); return true; }) : b2;
    B.linhas = b1.concat(b2u); emitir(3, "sua carteira");
    // blocos 3 e 5 são do cliente de origem (pontua noutro preposto): entram na visão do vendedor que tem o bloco 1, porque é a mesma jogada
    if (P === "TODOS" || b1.length || B.falhas.bloco1) { const b3 = await acess("bloco3", () => tudo(sel("v_buscar_meta_pio_antecipa").order("faixa").order("prioridade"))), b5 = await acess("bloco5", () => tudo(sel("v_buscar_meta_pio_inchado").order("faixa").order("prioridade"))); B.linhas = B.linhas.concat(b3, b5); }   // v6: bloco 1 falhou ≠ bloco 1 vazio
    if (!viva()) return null;   /* v8: outra carga começou — esta para aqui */
    emitir(4, "origem");
    const b4 = await acess("bloco4", () => tudo(sel("v_buscar_meta_dispo").order("faixa").order("prioridade"))); B.linhas = B.linhas.concat(b4); emitir(5, "dispo");
    if (!viva()) return null;   /* v8: outra carga começou — esta para aqui */
    // fotos verificadas (produto.foto_url, 0124) e nome da cor, em blocos de 200 referências
    const refs = [...new Set(B.linhas.map(l => l.referencia).filter(Boolean))], CAD = [];
    for (let i = 0; i < refs.length; i += 200) CAD.push(...await acess("fotos", () => tudo(sb.from("produto").select("referencia,cor,cor_descricao,foto_url").in("referencia", refs.slice(i, i + 200)).order("referencia").order("cor"))));
    if (!viva()) return null;   /* v8: outra carga começou — esta para aqui */
    B.COR = new Map(CAD.map(p => [p.referencia + "|" + (p.cor || ""), p.cor_descricao])); const IMG = B.IMG = new Map();
    for (const p of CAD) { if (!p.foto_url) continue; IMG.set(p.referencia + "|" + (p.cor || ""), p.foto_url); (IMG.get(p.referencia) || IMG.set(p.referencia, []).get(p.referencia)).push(p.foto_url); }
    emitir(6, "fotos");
    emitir(7, "pedido novo");
    B.pedido = await acess("pedido", () => tudo(sb.from("v_buscar_meta_pedido_sugerido").select("preposto,faixa,cliente,referencia,cor,descricao,venda_mes,estoque,carteira,transito,cob_base,cap,gdisp,pedido_sugerido,cabe_mais,cob_depois,alvo_faixa,base_em").eq("preposto", P).gt("pedido_sugerido", 0).order("faixa").order("cliente")));
    if (!viva()) return null;   /* v8: outra carga começou — esta para aqui */
    emitir(8, "pronto");
    return montar(null);
  }

  const idDe = l => [l.bloco, l.referencia, l.cor || "", l.cliente_de || "", l.cliente_para || "", l.prev_fat || "", l.grupo || "", l.acao_xl || ""].join("|");   // a mesma SKU × cliente pode ter duas previsões: o id leva as duas
  const num = v => v == null || v === "" || isNaN(+v) ? null : +v;
  // pares que o cliente pede na dispo: cliente_para vem "CLIENTE cob (qtd) · CLIENTE cob (qtd)" (0117); a dispo inteira NÃO conta no placar (dispo do mês seguinte não conta — NÚCLEO)
  const qtdPedida = s => { const m = String(s || "").match(/\((\d[\d.]*)\)/g); return m ? m.reduce((a, x) => a + (+x.replace(/[()\.]/g, "") || 0), 0) : 0; };
  function montar(faixa, carregando) {
    const { P, nomeP, placar, estados, linhas, pedido, cms, COR, IMG } = BRUTO, hoje = new Date().toISOString().slice(0, 10);
    const EST = new Map(estados.map(e => [e.faixa, e])), CMS = new Map(cms.map(c => [c.marca + "|" + c.faixa, c]));
    // itens dos blocos, com a marcação
    const itens = linhas.map(l => { const k = l.referencia + "|" + (l.cor || ""), fotos = [...new Set([l.cor ? IMG.get(k) : null].concat(IMG.get(l.referencia) || []).filter(Boolean))];
      const it = { id: idDe(l), bloco: +l.bloco, faixa: l.faixa, ref: l.referencia, cor: l.cor || "", cor_nome: COR.get(k) || l.cor || "", modelo: l.descricao || l.referencia, fotos, foto_falta: !fotos.length,
               cliente_de: l.cliente_de, cliente_para: l.cliente_para, pares: +l.bloco === 4 && qtdPedida(l.cliente_para) ? qtdPedida(l.cliente_para) : (num(l.pares) || 0), pares_origem: +l.bloco === 4 ? (num(l.pares) || num(l.pares_origem)) : num(l.pares_origem), prev_fat: DATA_OK.test(String(l.prev_fat)) ? String(l.prev_fat).slice(0, 10) : null,
               cobertura_de: num(l.cobertura_de), cobertura_para: num(l.cobertura_para), regua_de: l.regua_de, regua_para: l.regua_para, venda_mes: num(l.venda_mes), estoque: num(l.estoque),
               grupo: l.grupo || "", prioridade: num(l.prioridade), acumulado: num(l.acumulado_faixa), acao: l.acao || (BLOCOS[+l.bloco] || {}).acao, acao_xl: l.acao_xl || null,
               na_regua: +l.bloco === 1 || +l.bloco === 3 ? true : +l.bloco === 4 ? /entra no pedido/i.test(l.grupo || "") : NA_REGUA(l.grupo), fora_regua: +l.bloco === 2 ? FORA_REGUA(l.grupo) : +l.bloco === 4 ? !/entra no pedido/i.test(l.grupo || "") : +l.bloco === 5,
               marcavel: +l.bloco !== 5 && (num(l.pares) || 0) > 0 && (+l.bloco !== 4 || /entra no pedido/i.test(l.grupo || "")), marcado: MARCADOS.has(idDe(l)) }; it.grade_ok = !it.marcavel || (it.pares % 12) === 0; return it; });   /* v5: dispo sem cliente pedindo não se marca (não teria cliente no arquivo) nem pinta grade quebrada */
    // o que conta para a faixa do VENDEDOR: origem → cliente seu (1), sua carteira (2) e dispo digitada (4). O bloco 3 (a origem antecipa para ela) pontua no preposto da origem: só conta na visão CMS
    const contaFaixa = i => P === "TODOS" ? [1, 2, 3].includes(i.bloco) : [1, 2].includes(i.bloco);   // dispo (4) não conta no placar; 5 não se marca
    const FX_BUSCA = placar.filter(r => r.unidade === "pares" && !r.total && r.marca !== "UA").map(r => r.faixa), TOTAL_DE = f => placar.some(r => r.faixa === f && r.total);   /* v5: o total de tênis soma as faixas de busca */
    const naFaixa = (i, f) => TOTAL_DE(f) ? FX_BUSCA.includes(i.faixa) : i.faixa === f;
    const porFaixa = f => itens.filter(i => naFaixa(i, f) && i.marcado && contaFaixa(i)).reduce((s, i) => s + i.pares, 0);
    const faltaBlocoCedo = [1, 2, 3, 4, 5].filter(b => (BRUTO.falhas || {})["bloco" + b]);
    // placar: uma linha por faixa (marca OLY e UA), com o estado do NÚCLEO e a conta ao vivo do que está marcado
    const linhasPlacar = placar.map(r => { const e = EST.get(r.faixa) || {}, c = CMS.get(r.marca + "|" + r.faixa) || null, falta = num(r.falta_gatilho) || 0, marcado = r.unidade === "pares" ? porFaixa(r.faixa) : 0;
      const estado = r.bate ? "batida" : (e.estado || null);   // só os 4 estados do NÚCLEO; faixa sem linha no placar fica sem selo
      return { faixa: r.faixa, nome: (NOME_FAIXA[r.faixa] || r.faixa) + (r.marca === "UA" && !/UA/.test(NOME_FAIXA[r.faixa] || "") ? " · UA" : ""), marca: r.marca, unidade: r.unidade, total: !!r.total, ordem: num(r.faixa_ordem), gatilho_pct: num(r.gatilho_pct), meta: num(r.meta), gatilho: num(r.gatilho), real: num(r.real), faturado: num(r.faturado),
               falta_gatilho: falta, falta_100: num(r.falta_100), bate: !!r.bate, alcanca: !!r.alcanca, vale_buscar: r.vale_buscar !== false, se_nao_faturar: num(r.se_nao_faturar),
               estado, fecha_na_regua: num(e.fecha_na_regua), fecha_com_alta: num(e.fecha_com_alta), fecha_com_pedido: num(e.fecha_com_pedido), fecha_com_pedido_sem_teto: num(e.fecha_com_pedido_sem_teto), repasse_a_confirmar: num(e.repasse_a_confirmar), marcavel: r.unidade === "pares" && r.marca !== "UA" && (!!r.total || FX_BUSCA.includes(r.faixa)),
               minimo_ok: !faltaBlocoCedo.length && itens.some(i => naFaixa(i, r.faixa) && contaFaixa(i) && i.marcavel && (i.bloco !== 2 || i.na_regua) && !i.marcado),   /* o mesmo conjunto que o marcarMinimo usa */   /* v6: botão só quando há régua por marcar e nenhum bloco faltou */
               cms: c ? { gatilho: num(c.gatilho), real: num(c.real), falta: num(c.falta_gatilho) || 0, bate: !!c.bate, alcanca: !!c.alcanca } : null, cms_bate: !!r.cms_bate, cms_alcanca: !!r.cms_alcanca,
               movimentos: { m1_cobrar: num(r.m1_cobrar), m1_vencida: num(r.m1_vencida), m2_marcado: num(r.m2_marcado), m3_antecipar: num(r.m3_antecipar), m3_cob_alta: num(r.m3_cob_alta), m3_efeito: num(r.m3_efeito_mes_seguinte), m4_repasse: num(r.m4_repasse), m5_clientes: num(r.m5_rfv_clientes), m5_pares: num(r.m5_rfv_pares_2025), m3_sem_ag: num(r.m3_sem_ag), m3_sem_venda: num(r.m3_sem_venda) },   // m3_sem_venda (0130, a caminho): SKU sem venda em cliente com AG — lançamento/novo, decisão do Léo   // m3_sem_ag: mês seguinte em cliente sem AG — "régua não se aplica" (NÚCLEO)
               marcado, faltam: Math.max(0, falta - marcado), fecha: falta > 0 && marcado >= falta, pct_real: r.gatilho ? Math.min(1.5, (num(r.real) || 0) / +r.gatilho) : null, pct_marcado: r.gatilho ? Math.min(1.5, ((num(r.real) || 0) + marcado) / +r.gatilho) : null }; });
    // ordem do GAMER: a mais perto de fechar em cima; batida recolhida no fim; "não vale buscar" apagada
    const RANK = { "fecha na régua": 0, "fecha com pedido novo + antecipação": 1, "fecha com alta/fora da régua": 2, "não fecha": 4 };
    const peso = p => p.bate ? 6 : !p.vale_buscar ? 5 : p.fecha ? 0 : (p.estado in RANK ? RANK[p.estado] : 3);
    const placarOrd = linhasPlacar.slice().sort((a, b) => peso(a) - peso(b) || (a.total ? 1 : 0) - (b.total ? 1 : 0) || (a.faltam || 0) - (b.faltam || 0) || (a.ordem || 0) - (b.ordem || 0));
    const faixasBusca = FX_BUSCA;
    // blocos
    const faltaBloco = [1, 2, 3, 4, 5].filter(b => (BRUTO.falhas || {})["bloco" + b]);
    const blocos = [1, 2, 3, 4, 5].map(b => { const L = itens.filter(i => i.bloco === b && (!faixa || naFaixa(i, faixa)));
      if (!L.length) return faltaBloco.includes(b) ? Object.assign({ bloco: b, nome: NOME_BLOCO[b], n: 0, pares: 0, marcados: 0, pares_marcados: 0, n_regua: 0, n_fora: 0, itens: [], falhou: BRUTO.falhas["bloco" + b] }, BLOCOS[b]) : null;
      const nome = (linhas.find(l => +l.bloco === b) || {}).bloco_nome || ("Bloco " + b), ordem = (x, y) => (x.fora_regua ? 1 : 0) - (y.fora_regua ? 1 : 0) || (x.na_regua ? 0 : 1) - (y.na_regua ? 0 : 1) || (x.prioridade || 9e9) - (y.prioridade || 9e9) || (x.cobertura_para ?? 99) - (y.cobertura_para ?? 99);
      L.sort(ordem);
      return Object.assign({ bloco: b, nome, n: L.length, pares: L.reduce((s, i) => s + i.pares, 0), marcados: L.filter(i => i.marcado).length, pares_marcados: L.filter(i => i.marcado).reduce((s, i) => s + i.pares, 0),
                             n_regua: L.filter(i => !i.fora_regua).length, n_fora: L.filter(i => i.fora_regua).length, itens: L }, BLOCOS[b]); }).filter(Boolean);
    // prévia do pedido: o que está marcado, nas duas abas do arquivo (ANTECIPAR · TRANSFERIR) + DIGITAR
    const marc = itens.filter(i => i.marcado);
    const aba = a => marc.filter(i => i.acao === a).map(i => ({ id: i.id, bloco: i.bloco, faixa: i.faixa, ref: i.ref, cor: i.cor, cor_nome: i.cor_nome, modelo: i.modelo, cliente_de: i.cliente_de, cliente_para: i.cliente_para, pares: i.pares, prev_fat: i.prev_fat, grade_ok: i.grade_ok }));
    const previa = { antecipar: aba("antecipar"), transferir: aba("transferir"), digitar: aba("digitar"), n: marc.length, pares: marc.reduce((s, i) => s + i.pares, 0), grade_quebrada: marc.filter(i => !i.grade_ok).length,
                     por_faixa: faixasBusca.map(f => ({ faixa: f, nome: NOME_FAIXA[f] || f, pares: porFaixa(f) })) };
    const pedidoNovo = pedido.map(p => ({ faixa: p.faixa, cliente: p.cliente, ref: p.referencia, cor: p.cor, cor_nome: COR.get(p.referencia + "|" + (p.cor || "")) || p.cor, modelo: p.descricao, venda_mes: num(p.venda_mes), estoque: num(p.estoque), carteira: num(p.carteira), transito: num(p.transito), cob_base: num(p.cob_base), cap: num(p.cap), gdisp: num(p.gdisp), pedido: num(p.pedido_sugerido), cabe_mais: num(p.cabe_mais), cob_depois: num(p.cob_depois), alvo_faixa: num(p.alvo_faixa) }));
    const base = placar[0] || {};
    const porP = new Map(); for (const c of BRUTO.cadastro || []) porP.set(c.preposto, (porP.get(c.preposto) || 0) + 1);
    const cadastro = { prepostos: [...porP.entries()].map(([codigo, n]) => ({ codigo, nome: NOMES.get(codigo) || codigo, n })), n_clientes: (BRUTO.cadastro || []).length };
    const nota = P === "TODOS" && cadastro.prepostos.length === 1 ? `as listas são de ${cadastro.prepostos[0].nome} (${cadastro.prepostos[0].codigo}): o cadastro cliente → vendedor tem ${cadastro.n_clientes} clientes, todos dele — os outros vendedores entram quando o cadastro for preenchido` : null;
    return { hoje, carregando: carregando || null, falhas: Object.assign({}, BRUTO.falhas || {}), preposto: { codigo: P, nome: nomeP, cms: P === "TODOS" }, cadastro, nota, mes: MES_OK.test(String(base.mes)) ? String(base.mes).slice(0, 7) : null, quinzena2: !!base.quinzena2, dias_uteis: num(base.dias_uteis_restantes),
             placar: placarOrd, faixas_busca: faixasBusca, blocos, blocos_faltando: faltaBloco.map(b => ({ bloco: b, nome: NOME_BLOCO[b], erro: BRUTO.falhas["bloco" + b] })), previa, pedido_novo: pedidoNovo, filtro: { faixa: faixa || null }, saida: SAIDA,
             bases: { real_lido_em: base.real_lido_em || null, meta_lida_em: base.meta_lida_em || null, placar_em: (estados[0] || {}).base_em || null, pedido_em: (pedido[0] || {}).base_em || null },
             regra: "gatilhos da Vulcabras: tênis 90% no total e 100% na faixa · famílias 95% em R$ · a faixa do vendedor só paga se a CMS também alcança · régua ruptura <4 · ideal 4–5 · alta ≥5 · grade em 12 · nada sai sem o clique" };
  }
  // marcação (o estado vive aqui; a casca só pede)
  const marcar = (id, on) => { if (on === false || (on == null && MARCADOS.has(id))) MARCADOS.delete(id); else MARCADOS.add(id); };
  function marcarMinimo(faixa) {
    if ([1, 2, 3, 4, 5].some(b => (BRUTO.falhas || {})["bloco" + b])) return { erro: "um bloco não carregou — use Atualizar antes de marcar o mínimo" };   // GAMER: pré-marca na ordem do brief, SÓ dentro da régua, até cobrir a falta; só sugere
    const M = montar(null), p = M.placar.find(x => x.faixa === faixa); if (!p || p.unidade !== "pares") return { n: 0, faltam: 0 };
    const fxs = p.total ? M.faixas_busca : [faixa];   /* v5: o total de tênis marca em todas as faixas de busca */
    let falta = p.falta_gatilho - p.marcado, n = 0; if (falta <= 0) return { n: 0, faltam: 0 };
    const blocosOk = BRUTO.P === "TODOS" ? [1, 2, 3] : [1, 2];   // bloco 3 só conta na visão CMS
    const cand = BRUTO.linhas.filter(l => fxs.includes(l.faixa) && blocosOk.includes(+l.bloco) && (+l.bloco !== 2 || NA_REGUA(l.grupo)) && (num(l.pares) || 0) > 0 && !MARCADOS.has(idDe(l)))
      .sort((a, b) => (+a.bloco === 2 ? 0 : 1) - (+b.bloco === 2 ? 0 : 1) || (num(a.prioridade) || 9e9) - (num(b.prioridade) || 9e9));
    // GAMER: a MENOR sobra, não a gulosa (falta 100 com 90/60/50 → 110, não 140). Subset-sum em unidades de 12 até falta + maior linha; empate → menor soma de posições (ordem do brief)
    const U = cand.map(l => Math.max(1, Math.ceil(+l.pares / 12))), T = Math.ceil(falta / 12), LIM = T + Math.max(0, ...U), tot = U.reduce((a, b) => a + b, 0);
    if (tot <= T) { for (const l of cand) { MARCADOS.add(idDe(l)); falta -= +l.pares; n++; } return { n, faltam: Math.max(0, falta) }; }
    const best = new Array(LIM + 1).fill(null); best[0] = { prio: 0, i: -1, prev: null };   // best[s] = melhor conjunto com soma s
    for (let i = 0; i < cand.length; i++) { const u = U[i]; for (let s = LIM - u; s >= 0; s--) { const b = best[s]; if (!b) continue; const cand2 = { prio: b.prio + i, i, prev: b }; const c = best[s + u]; if (!c || cand2.prio < c.prio) best[s + u] = cand2; } }
    let alvo = -1; for (let s = T; s <= LIM; s++) if (best[s]) { alvo = s; break; }
    if (alvo < 0) return { n: 0, faltam: falta };
    for (let b = best[alvo]; b && b.i >= 0; b = b.prev) { MARCADOS.add(idDe(cand[b.i])); falta -= +cand[b.i].pares; n++; }
    return { n, faltam: Math.max(0, falta) };
  }
  // ---- v6: "Baixar o arquivo" — a tela só ANOTA a seleção em vitrine_saida (tipo 'meta'); a tarefa das saídas (Engenharia) gera no modelo do
  // Chris e sobe ao cofre; aqui se acompanha e se pede a URL assinada. Nenhuma regra de pedido mora aqui (contrato: TI\CONTRATO_BAIXAR_O_ARQUIVO.md).
  async function escritorio() { if (ESC) return ESC; const e = await tudo(sb.from("escritorio").select("id").order("id").limit(1)); ESC = (e[0] || {}).id || null; return ESC; }
  const nomeArq = s => String(s || "").split(/[\\/]/).pop() || "arquivo";
  const estadoDe = r => !r ? null : { id: r.id, estado: r.erro ? "erro" : r.atendido_em ? "pronto" : "fila", pedido_em: r.pedido_em || null, atendido_em: r.atendido_em || null,
                                      erro: r.erro || null, nota: r.nota || null, arquivo: r.arquivo || null, nome: nomeArq(r.arquivo), storage_path: r.storage_path || null, tamanho: num(r.tamanho) };
  async function pedirArquivo() {   /* v7: trava no clique — dois toques rápidos não gravam dois pedidos */
    if (PEDINDO) return "o pedido anterior ainda está sendo anotado";
    if (SAIDA && SAIDA.estado === "fila") return "já há um pedido na fila — espere ficar pronto ou tire a linha";
    PEDINDO = true; try { return await pedirArquivo_(); } finally { PEDINDO = false; }
  }
  async function pedirArquivo_() {
    const B = BRUTO, P0 = P_CARGA, M = montar(null), P = M.previa || { n: 0 };   /* v8: o pedido é do vendedor do início; v9: a troca se mede pelo vendedor pedido (P_CARGA), não pelo BRUTO */
    if (!P.n) return "nada marcado";
    const esc = await escritorio(); if (!esc) return "não achei o escritório do usuário";
    if (P_CARGA !== P0) return "o vendedor mudou enquanto eu anotava — peça de novo";
    const linhas = [].concat(P.antecipar.map(x => Object.assign({ acao: "antecipar" }, x)), P.transferir.map(x => Object.assign({ acao: "transferir" }, x)), P.digitar.map(x => Object.assign({ acao: "digitar" }, x)))
      .map(x => ({ bloco: x.bloco, acao: x.acao, faixa: x.faixa, ref: x.ref, cor: x.cor, cor_nome: x.cor_nome, modelo: x.modelo, cliente_de: x.cliente_de || null, cliente_para: x.cliente_para || null, pares: x.pares, prev_fat: x.prev_fat || null }));
    const dados = { preposto: B.P, preposto_nome: B.nomeP, mes: M.mes, quinzena2: !!M.quinzena2, linhas, totais: { n: P.n, pares: P.pares, por_faixa: (P.por_faixa || []).filter(f => f.pares).map(f => ({ faixa: f.faixa, pares: f.pares })), grade_quebrada: P.grade_quebrada || 0 } };
    let r; try { r = await sb.from("vitrine_saida").insert({ escritorio_id: esc, cliente: B.nomeP || B.P, colecao: M.mes || "", tipo: "meta", dados }).select("id,pedido_em,atendido_em,arquivo,erro,nota,storage_path,tamanho"); }
    catch (e) { return (e && e.message) || "a rede falhou"; }   // falha calada não existe: o erro vai ao aviso da tela
    if (r.error) return r.error.message || "o banco recusou";
    const row = (r.data || [])[0]; if (!row) return "o banco não devolveu o pedido";
    if (P_CARGA !== P0) return "o vendedor mudou enquanto eu anotava — o pedido ficou gravado para o vendedor anterior; confira na fila";
    SAIDA = estadoDe(row); return null;
  }
  async function lerSaida() {
    if (!SAIDA) return null; const S0 = SAIDA;   /* v8: releitura de um pedido que já saiu da tela não volta */
    const r = await sb.from("vitrine_saida").select("id,pedido_em,atendido_em,arquivo,erro,nota,storage_path,tamanho").eq("id", SAIDA.id).limit(1);
    if (SAIDA !== S0) return SAIDA;
    if (!r.error && r.data && r.data[0]) SAIDA = estadoDe(r.data[0]);
    else if (SAIDA) SAIDA.releitura = (r.error && r.error.message) || "a conferência não voltou";   /* v7: releitura que falha não fica calada */
    return SAIDA;
  }
  async function urlArquivo() {
    if (!SAIDA || !SAIDA.storage_path) return { erro: "o arquivo ainda não está no cofre" };
    const r = await sb.storage.from("saidas-vitrine").createSignedUrl(SAIDA.storage_path, 120, { download: SAIDA.nome });
    return r.error || !r.data ? { erro: (r.error && r.error.message) || "o cofre não respondeu" } : { url: r.data.signedUrl };
  }
  const limparSaida = () => { SAIDA = null; };
  const emDia = () => !!BRUTO && BRUTO.P === P_CARGA;   /* v9: o BRUTO já é do vendedor pedido? (durante a troca, a cola não redesenha o velho) */
  const saidaAtual = () => SAIDA;
  const pedindo = () => PEDINDO;
  const limpar = faixa => { const total = !!faixa && BRUTO.placar.some(r => r.faixa === faixa && r.total); for (const l of BRUTO.linhas) if (!faixa || total || l.faixa === faixa) MARCADOS.delete(idDe(l)); };
  return { sb, sessao, entrar, sair, prepostos, carregar, pedirArquivo, lerSaida, urlArquivo, limparSaida, pedindo, emDia, saidaAtual, refiltrar: f => montar(f), foraRegua: f => BRUTO ? BRUTO.linhas.filter(l => l.faixa === f && +l.bloco === 2 && FORA_REGUA(l.grupo)).length : 0, marcar, marcarMinimo, limpar, marcados: () => new Set(MARCADOS) };
})();
