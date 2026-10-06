/* GESTOR · funções puras da página, com teste próprio (teste_gestor_lib.js, roda em node). TI, 06/10/2026 — achados 3 e 4 do Conselho
   (MSG-CONSELHEIRO-032/BOSS-033): texto do banco interpolado em HTML sem escape; texto do usuário montando o filtro .or() do PostgREST.
   Sem número nenhum aqui: vai ao repositório público. */
(function () {
  // todo texto que vem do banco (cliente, referência, descrição, cor) ou de erro passa por aqui antes de virar HTML
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // O termo do usuário dentro de um filtro ilike do PostgREST, entre aspas duplas: aí vírgula, parêntese e ponto deixam de ser
  // sintaxe do filtro. Busca LITERAL: % e _ (curingas do ILIKE) ganham \ ; o * digitado vira curinga de propósito (%).
  // Camadas, de dentro para fora: (1) padrão do ILIKE (escape \ do Postgres); (2) aspas do PostgREST (\ e " escapados).
  // Nenhum caractere é cortado em silêncio — o que o usuário digitou é o que se procura.
  function padraoIlike(texto) {
    return "%" + String(texto).replace(/\\/g, "\\\\").replace(/[%_]/g, c => "\\" + c).replace(/\*/g, "%") + "%";
  }
  function citarPostgrest(valor) {
    return '"' + String(valor).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }
  const termoIlike = texto => citarPostgrest(padraoIlike(texto));
  const filtroProduto = texto => { const t = termoIlike(texto); return "referencia.ilike." + t + ",descricao.ilike." + t; };

  const lib = { esc, padraoIlike, citarPostgrest, termoIlike, filtroProduto };
  if (typeof window !== "undefined") window.GestorLib = lib;
  if (typeof module !== "undefined" && module.exports) module.exports = lib;
})();
