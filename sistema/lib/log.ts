import type { Prisma } from "@prisma/client";

// RF19 / UC23: o log so recebe insert. nenhuma tela altera ou apaga registro dele.
// recebe a transacao de quem chamou, pra acao e log gravarem juntos ou nenhum dos dois
type Acao = "alteracao_situacao" | "atribuicao" | "cancelamento" | "anonimizacao";

export function registrarLog(
  tx: Prisma.TransactionClient,
  idUsuario: number,
  acao: Acao,
  entidade: "prestador" | "cliente" | "ordem_servico",
  entidadeId: number,
  detalhe: string,
) {
  return tx.log_acao.create({
    data: { id_usuario: idUsuario, acao, entidade, entidade_id: entidadeId, detalhe },
  });
}
