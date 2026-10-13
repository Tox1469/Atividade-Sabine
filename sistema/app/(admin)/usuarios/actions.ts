"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redefinirSenha, senhaProvisoria, trocarAtivoDoAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/db";
import { comErros, erroNoCampo, valoresDo, type EstadoFormulario } from "@/lib/formulario";
import { exigirPerfil } from "@/lib/permissao";

const adminSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome.").max(120, "Máximo de 120 caracteres."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
});

// novo administrador. prestador e cliente ganham login pela ficha deles
export async function criarAdministrador(_estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  await exigirPerfil("administrador");
  const valores = valoresDo(form);
  const validacao = adminSchema.safeParse(valores);
  if (!validacao.success) return comErros(validacao.error, valores);
  if (await prisma.usuario.findUnique({ where: { email: validacao.data.email } })) return erroNoCampo("email", "Já existe um usuário com este e-mail.", valores);

  const senha = senhaProvisoria();
  await prisma.usuario.create({ data: { ...validacao.data, perfil: "administrador", senha_hash: await bcrypt.hash(senha, 10) } });
  revalidatePath("/usuarios");
  return { ok: `Administrador criado. Login ${validacao.data.email}, senha provisória ${senha}. A senha não aparece de novo.` };
}

// as acoes da linha de cada usuario. ninguem desativa o proprio acesso
export async function acaoUsuario(idUsuario: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const eu = await exigirPerfil("administrador");
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id_usuario: idUsuario } });
  const acao = form.get("acao");

  if (acao === "senha") {
    const senha = await redefinirSenha(idUsuario);
    revalidatePath("/usuarios");
    return { ok: `Senha provisória de ${usuario.email}: ${senha}` };
  }
  if (acao === "ativo") {
    if (idUsuario === Number(eu.id)) return { mensagem: "Você não pode desativar o seu próprio acesso." };
    if (usuario.email.endsWith("@sgp.invalido")) return { mensagem: "Login de cadastro anonimizado não pode ser reativado." };
    await trocarAtivoDoAcesso(idUsuario, !usuario.ativo);
    revalidatePath("/usuarios");
    return { ok: usuario.ativo ? "Acesso desativado." : "Acesso reativado." };
  }
  return { mensagem: "Ação desconhecida." };
}
