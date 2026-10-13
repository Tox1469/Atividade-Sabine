import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type Perfil = "administrador" | "prestador" | "cliente";

// o cookie da sessao guarda o perfil do momento do login e e renovado a cada requisicao.
// sem olhar o banco, quem foi desativado (ou mudou de perfil) seguiria usando o sistema
// enquanto continuasse clicando. por isso a conta e conferida de novo a cada tela e action
export async function contaValida(user: { id: string; perfil: string }) {
  const conta = await prisma.usuario.findUnique({ where: { id_usuario: Number(user.id) || 0 }, select: { ativo: true, perfil: true } });
  return !!conta && conta.ativo && conta.perfil === user.perfil;
}

// RNF02: a permissao e decidida aqui no servidor, nunca so escondendo botao na tela.
// toda pagina e toda action chamam uma dessas funcoes antes de fazer qualquer coisa.
// o perfil do cookie e conferido antes, pra recusar sem nem consultar o banco
export async function exigirPerfil(perfil: Perfil) {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");
  if (sessao.user.perfil !== perfil) redirect("/sem-permissao");
  if (!(await contaValida(sessao.user))) redirect("/sair");
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
  if (!(await contaValida(sessao.user))) redirect("/sair");
  return sessao.user;
}
