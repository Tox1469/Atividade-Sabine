"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { EM_ABERTO } from "@/lib/dominio/ordem";
import { comErros, erroNoCampo, valoresDo, type EstadoFormulario } from "@/lib/formulario";
import { exigirPerfil } from "@/lib/permissao";

const servicoSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do serviço.").max(120, "Máximo de 120 caracteres."),
  id_categoria: z.coerce.number({ message: "Escolha a categoria." }).int().positive("Escolha a categoria."),
  descricao: z.string().trim().transform((v) => (v === "" ? null : v)),
  valor_referencia: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(/\./g, "").replace(",", "."))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Valor inválido. Use só números, como 187,50."),
  prazo_padrao_dias: z.coerce.number({ message: "Informe o prazo em dias." }).int("Prazo em dias inteiros.").min(1, "O prazo padrão é de pelo menos 1 dia.").max(365, "Máximo de 365 dias."),
  ativo: z.string().optional().transform((v) => v === "sim"),
});

// UC06 - manter catalogo de servicos (TA26)
export async function salvarServico(id: number | null, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  await exigirPerfil("administrador");
  const valores = valoresDo(form);
  const validacao = servicoSchema.safeParse(valores);
  if (!validacao.success) return comErros(validacao.error, valores);
  const dados = validacao.data;

  const categoria = await prisma.categoria_servico.findUnique({ where: { id_categoria: dados.id_categoria } });
  if (!categoria?.ativa && dados.ativo) return erroNoCampo("id_categoria", "Essa categoria está inativa.", valores);

  // servico com ordem em aberto nao pode ser inativado
  if (id !== null && !dados.ativo) {
    const abertas = await prisma.ordem_servico.findMany({ where: { id_servico: id, status: { in: EM_ABERTO } }, select: { numero: true } });
    if (abertas.length > 0) {
      return erroNoCampo("ativo", `Não dá para inativar com ordem em aberto: ${abertas.map((o) => o.numero).join(", ")}.`, valores);
    }
  }

  if (id === null) await prisma.servico.create({ data: dados });
  else await prisma.servico.update({ where: { id_servico: id }, data: dados });

  revalidatePath("/servicos");
  return { ok: id === null ? `Serviço ${dados.nome} cadastrado.` : "Alterações salvas." };
}
