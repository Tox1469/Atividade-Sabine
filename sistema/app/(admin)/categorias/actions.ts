"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { comErros, erroNoCampo, valoresDo, type EstadoFormulario } from "@/lib/formulario";
import { exigirPerfil } from "@/lib/permissao";

const categoriaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da categoria.").max(60, "Máximo de 60 caracteres."),
  descricao: z.string().trim().max(255, "Máximo de 255 caracteres.").transform((v) => (v === "" ? null : v)),
  ativa: z.string().optional().transform((v) => v === "sim"),
});

// UC05 - manter categorias (TA25)
export async function salvarCategoria(id: number | null, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  await exigirPerfil("administrador");
  const valores = valoresDo(form);
  const validacao = categoriaSchema.safeParse(valores);
  if (!validacao.success) return comErros(validacao.error, valores);
  const dados = validacao.data;

  // categoria com servico ativo nao pode ser inativada
  if (id !== null && !dados.ativa) {
    const servicos = await prisma.servico.count({ where: { id_categoria: id, ativo: true } });
    if (servicos > 0) {
      return erroNoCampo("ativa", `Tem ${servicos} ${servicos === 1 ? "serviço ativo" : "serviços ativos"} nesta categoria. Inative ou mude os serviços antes.`, valores);
    }
  }

  try {
    if (id === null) await prisma.categoria_servico.create({ data: dados });
    else await prisma.categoria_servico.update({ where: { id_categoria: id }, data: dados });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return erroNoCampo("nome", "Já existe uma categoria com esse nome.", valores);
    }
    throw erro;
  }

  revalidatePath("/categorias");
  redirect(`/categorias?ok=${id === null ? "nova" : "editada"}`);
}
