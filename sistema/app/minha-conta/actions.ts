"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { contaDeDemonstracao } from "@/lib/acesso";
import { prisma } from "@/lib/db";
import { comErros, erroNoCampo, type EstadoFormulario } from "@/lib/formulario";
import { usuarioLogado } from "@/lib/permissao";

const senhaSchema = z
  .object({
    atual: z.string().min(1, "Informe a senha atual."),
    nova: z.string().min(8, "A senha nova precisa ter pelo menos 8 caracteres.").max(72, "Máximo de 72 caracteres."),
    confirmacao: z.string(),
  })
  .refine((d) => d.nova === d.confirmacao, { path: ["confirmacao"], message: "A confirmação não bate com a senha nova." });

// troca de senha. e aqui que o prestador e o cliente trocam a senha provisoria do primeiro acesso
export async function trocarSenha(_estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const sessao = await usuarioLogado();
  // senha nao volta pra tela depois do erro
  const validacao = senhaSchema.safeParse(Object.fromEntries(form));
  if (!validacao.success) return comErros(validacao.error, {});

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id_usuario: Number(sessao.id) } });
  if (contaDeDemonstracao(usuario.email)) return { mensagem: "A senha das contas de demonstração não muda, para todo mundo continuar entrando." };
  if (!(await bcrypt.compare(validacao.data.atual, usuario.senha_hash))) return erroNoCampo("atual", "Senha atual incorreta.", {});

  await prisma.usuario.update({ where: { id_usuario: usuario.id_usuario }, data: { senha_hash: await bcrypt.hash(validacao.data.nova, 10) } });
  return { ok: "Senha trocada. Use a nova no próximo acesso." };
}
