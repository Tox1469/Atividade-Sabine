import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";

// o administrador libera o acesso do prestador ou do cliente pelo e-mail do cadastro.
// o sistema nao manda e-mail: a senha provisoria aparece uma vez na tela pro administrador
// passar pra pessoa, que troca em "minha conta" no primeiro acesso
const LETRAS = "abcdefghjkmnpqrstuvwxyz23456789";

export function senhaProvisoria() {
  return Array.from({ length: 10 }, () => LETRAS[randomInt(LETRAS.length)]).join("");
}

type Vinculo = { perfil: "prestador"; id_prestador: number } | { perfil: "cliente"; id_cliente: number };

export async function liberarAcesso(vinculo: Vinculo, nome: string, email: string | null) {
  if (!email) return { erro: "Cadastre um e-mail antes de liberar o acesso. Ele é o login da pessoa." };
  const login = email.trim().toLowerCase();
  if (await prisma.usuario.findUnique({ where: { email: login } })) {
    return { erro: `Já existe um usuário com o e-mail ${login}. Use outro e-mail no cadastro.` };
  }

  const senha = senhaProvisoria();
  const usuario = await prisma.usuario.create({
    data: { nome: nome.slice(0, 120), email: login, senha_hash: await bcrypt.hash(senha, 10), perfil: vinculo.perfil },
  });
  if (vinculo.perfil === "prestador") {
    await prisma.prestador.update({ where: { id_prestador: vinculo.id_prestador }, data: { id_usuario: usuario.id_usuario } });
  } else {
    await prisma.cliente.update({ where: { id_cliente: vinculo.id_cliente }, data: { id_usuario: usuario.id_usuario } });
  }
  return { login, senha };
}

export async function trocarAtivoDoAcesso(idUsuario: number, ativo: boolean) {
  await prisma.usuario.update({ where: { id_usuario: idUsuario }, data: { ativo, tentativas_falhas: 0, bloqueado_ate: null } });
}
