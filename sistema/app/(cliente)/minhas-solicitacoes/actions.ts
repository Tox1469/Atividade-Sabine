"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { dataBR } from "@/lib/formato";
import { comErros, valoresDo, type EstadoFormulario } from "@/lib/formulario";
import { abrirOrdem, avaliar } from "@/lib/ordens";
import { exigirCliente } from "@/lib/permissao";
import { ordemSchema } from "@/lib/validacao/ordem";

// UC12 pelo cliente: a ordem fica sempre no nome do cliente logado
export async function abrirSolicitacao(_estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { usuario, cliente } = await exigirCliente();
  const valores = valoresDo(form);
  const validacao = ordemSchema.safeParse(valores);
  if (!validacao.success) return comErros(validacao.error, valores);
  const d = validacao.data;

  const r = await abrirOrdem({
    idCliente: cliente.id_cliente,
    idServico: d.id_servico,
    descricao: d.descricao,
    prioridade: d.prioridade,
    prazoDesejado: d.prazo,
    local: d.local_atendimento,
    idUsuario: Number(usuario.id),
  });
  if ("erro" in r) return { mensagem: r.erro, valores };
  revalidatePath("/minhas-solicitacoes");
  const ordem = await prisma.ordem_servico.findUniqueOrThrow({ where: { id_ordem: r.id! } });
  return { ok: `Solicitação ${ordem.numero} enviada. Prazo combinado: ${dataBR(ordem.prazo)}${d.prazo ? "" : ", pelo prazo padrão do serviço"}.` };
}

// UC18 - so o titular avalia (RN08): o cliente vem da sessao e lib/ordens confere a ordem
export async function avaliarAtendimento(idOrdem: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { cliente } = await exigirCliente();
  const comentario = String(form.get("comentario") ?? "");
  const r = await avaliar(idOrdem, cliente.id_cliente, Number(form.get("nota")), comentario);
  revalidatePath(`/minhas-solicitacoes/${idOrdem}`);
  revalidatePath("/minhas-solicitacoes");
  if ("erro" in r) return { mensagem: r.erro, valores: { comentario } };
  return { ok: r.ok };
}
