import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type Perfil = "administrador" | "prestador" | "cliente";

// RNF02: a permissao e decidida aqui no servidor, nunca so escondendo botao na tela.
// toda pagina e toda action chamam uma dessas funcoes antes de fazer qualquer coisa
export async function exigirPerfil(perfil: Perfil) {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");
  if (sessao.user.perfil !== perfil) redirect("/sem-permissao");
  return sessao.user;
}

// o prestador logado e o cadastro de prestador ligado ao usuario dele. o recorte
// "so as minhas ordens" e "so os meus documentos" sai desse id, nunca de um id vindo da tela
export async function exigirPrestador() {
  const usuario = await exigirPerfil("prestador");
  const prestador = await prisma.prestador.findUnique({ where: { id_usuario: Number(usuario.id) } });
  if (!prestador) redirect("/sem-permissao");
  return { usuario, prestador };
}

export async function exigirCliente() {
  const usuario = await exigirPerfil("cliente");
  const cliente = await prisma.cliente.findUnique({ where: { id_usuario: Number(usuario.id) } });
  if (!cliente) redirect("/sem-permissao");
  return { usuario, cliente };
}

export async function usuarioLogado() {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");
  return sessao.user;
}
