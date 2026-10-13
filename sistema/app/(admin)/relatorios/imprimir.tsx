"use client";

// UC24: o pdf sai pela impressao do navegador ("salvar como pdf"). o css de impressao
// esconde menu e cabecalho e deixa so o relatorio
export function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="botao">
      Exportar PDF
    </button>
  );
}
