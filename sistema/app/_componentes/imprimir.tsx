"use client";

// UC24: o pdf sai pela impressao do navegador ("salvar como pdf"). o css de impressao
// esconde menu, cabecalho e botoes e deixa so o conteudo da tela
export function BotaoImprimir({ texto = "Exportar PDF" }: { texto?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="botao nao-imprimir">
      {texto}
    </button>
  );
}
