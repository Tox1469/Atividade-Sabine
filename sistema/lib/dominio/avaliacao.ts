// RN09: media simples das avaliacoes dos ultimos 12 meses. com menos de tres avaliacoes
// no periodo o prestador fica como "sem historico suficiente" (null)
export const MINIMO_AVALIACOES = 3;

export function notaMedia(notas: number[]) {
  if (notas.length < MINIMO_AVALIACOES) return null;
  return notas.reduce((soma, n) => soma + n, 0) / notas.length;
}

export function textoNota(media: number | null) {
  return media === null ? "Sem histórico suficiente" : media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function inicioJanelaNota(agora = new Date()) {
  const inicio = new Date(agora);
  inicio.setFullYear(inicio.getFullYear() - 1);
  return inicio;
}
