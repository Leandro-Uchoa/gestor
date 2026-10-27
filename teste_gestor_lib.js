// teste de gestor_lib.js — roda em node, sem navegador e sem banco: `node teste_gestor_lib.js`. TI, 06/10/2026.
// Achado 3 (escape de HTML) e achado 4 (texto do usuário no filtro .or do PostgREST): vírgula, parêntese, aspas, curinga, barra.
const L = require("./gestor_lib.js");
let ok = 0, ruim = 0;
const confere = (nome, cond, det) => { console.log("  " + (cond ? "OK" : "!!") + " " + nome + (det ? "   " + det : "")); cond ? ok++ : ruim++; };

console.log("ESCAPE de HTML (achado 3)");
confere("& < > \" ' viram entidades", L.esc(`<img src=x onerror="alert('1')">&`) === "&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;", L.esc(`<img src=x onerror="alert('1')">&`));
confere("null e undefined viram vazio; número vira texto", L.esc(null) === "" && L.esc(undefined) === "" && L.esc(12) === "12");
confere("texto comum passa inteiro (acento, barra, ponto)", L.esc("CORRE VENTO 3 · PTO/CH") === "CORRE VENTO 3 · PTO/CH");

console.log("\nFILTRO do PostgREST (achado 4): o termo vai entre aspas, literal; nada cortado");
const t = L.filtroProduto;
confere("termo simples: referencia.ilike.\"%corre%\",descricao.ilike.\"%corre%\"", t("corre") === 'referencia.ilike."%corre%",descricao.ilike."%corre%"', t("corre"));
confere("vírgula NÃO separa condições (fica dentro das aspas)", t("a,b") === 'referencia.ilike."%a,b%",descricao.ilike."%a,b%"', t("a,b"));
confere("parêntese NÃO agrupa (fica dentro das aspas)", t("x(y)") === 'referencia.ilike."%x(y)%",descricao.ilike."%x(y)%"', t("x(y)"));
confere("ponto NÃO vira separador de operador", t("v3.1") === 'referencia.ilike."%v3.1%",descricao.ilike."%v3.1%"', t("v3.1"));
confere("aspas duplas do usuário são escapadas (\\\")", t('a"b') === 'referencia.ilike."%a\\"b%",descricao.ilike."%a\\"b%"', t('a"b'));
confere("% do usuário é LITERAL: vira \\% no padrão e \\\\% dentro das aspas", t("10%") === 'referencia.ilike."%10\\\\%%",descricao.ilike."%10\\\\%%"', t("10%"));
confere("_ do usuário é LITERAL (\\_)", L.padraoIlike("a_b") === "%a\\_b%", L.padraoIlike("a_b"));
confere("* do usuário é CURINGA de propósito (vira %)", L.padraoIlike("cor*vento") === "%cor%vento%", L.padraoIlike("cor*vento"));
confere("barra invertida do usuário é literal: \\\\ no padrão, \\\\\\\\ nas aspas", L.padraoIlike("a\\b") === "%a\\\\b%" && L.citarPostgrest("a\\b") === '"a\\\\b"', L.citarPostgrest(L.padraoIlike("a\\b")));
confere("nenhum caractere é removido: o termo inteiro reaparece dentro do filtro", t("Çã-ü/é").includes("Çã-ü/é"));
confere("curinga sozinho (*) procura tudo, sem quebrar", t("*") === 'referencia.ilike."%%%",descricao.ilike."%%%"', t("*"));

console.log("\nAUTOFILTRO (20/10): a parte pura — o que passa e o que não passa");
const P = L.filtroPassa, txt = vs => ({ tipo: "txt", v: new Set(vs) });
confere("sem filtro, tudo passa", P(null, "x") && P(undefined, null));
confere("texto: passa só o que está na lista; vazio e null viram '(vazio)'", P(txt(["A"]), "A") && !P(txt(["A"]), "B") && P(txt(["(vazio)"]), null) && P(txt(["(vazio)"]), "") && L.chaveTxt(null) === "(vazio)");
confere("número: maior / menor / igual (±0,05) / entre", P({ tipo: "num", op: "maior", a: 10 }, 11) && !P({ tipo: "num", op: "maior", a: 10 }, 10) && P({ tipo: "num", op: "menor", a: 10 }, 9) && P({ tipo: "num", op: "igual", a: 2.5 }, 2.52) && !P({ tipo: "num", op: "igual", a: 2.5 }, 2.6) && P({ tipo: "num", op: "entre", a: 1, b: 3 }, 3) && !P({ tipo: "num", op: "entre", a: 1, b: 3 }, 4));
confere("número: vazio / não vazio; null não passa em maior/menor", P({ tipo: "num", op: "vazio" }, null) && !P({ tipo: "num", op: "vazio" }, 0) && P({ tipo: "num", op: "naovazio" }, 0) && !P({ tipo: "num", op: "maior", a: 0 }, null));
confere("semAcento: tira acento e põe em maiúsculas", L.semAcento("Polyélle São") === "POLYELLE SAO");
confere("autofiltro sem DOM: botao/limpar/passaTodos funcionam em node", (() => { const F = new Map([["a", txt(["1"])]]); const af = L.autofiltro({ filtros: F, nomeCol: c => c, valores: () => [], aplicar: () => {} }); return af.botao("a").includes("svg") && af.botao("b").includes("▾") && af.limpar().includes("limpar filtros (1)") && af.passaTodos((x, c) => x[c], { a: "1", b: "z" }) && !af.passaTodos((x, c) => x[c], { a: "2" }) && af.passaTodos((x, c) => x[c], { a: "2" }, "a"); })());

console.log("\nDATAS AGRUPADAS POR MÊS (20/10, ele: 'seleciono o mês e vêm todos os produtos daquele mês')");
const G = L.agruparDatas(new Map([["2026-11-30", 3], ["2026-10-08", 2], ["(vazio)", 4], ["2026-10-30", 5], ["2027-01-15", 1], ["2026-10-09", 1]]));
confere("meses em ordem ISO: out/26 · nov/26 · jan/27, cada um com a soma das contagens", G.meses.map(m => m.m + ":" + m.n).join(" ") === "2026-10:8 2026-11:3 2027-01:1", JSON.stringify(G.meses.map(m => [m.m, m.n])));
confere("os dias de cada mês em ordem ISO, com a contagem", G.meses[0].dias.map(d => d.join("=")).join(" ") === "2026-10-08=2 2026-10-09=1 2026-10-30=5", JSON.stringify(G.meses[0].dias));
confere("o que não é data (vazio) fica solto, fora da árvore", G.soltos.length === 1 && G.soltos[0][0] === "(vazio)" && G.soltos[0][1] === 4, JSON.stringify(G.soltos));
confere("rótulo do mês em 'out/26' (ordenação é pela ISO, não pelo rótulo)", L.mesCurto("2026-10") === "out/26" && L.mesCurto("2027-01-15") === "jan/27");
confere("sem data nenhuma: árvore vazia, soltos preservados", (() => { const g = L.agruparDatas(new Map([["A", 1]])); return g.meses.length === 0 && g.soltos.length === 1; })());

console.log("\npassou " + ok + " de " + (ok + ruim));
process.exit(ruim ? 1 : 0);
