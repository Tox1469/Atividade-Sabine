"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { liberarAcesso } from "@/lib/acesso";
import { anonimizarCliente } from "@/lib/anonimizar";
import { prisma } from "@/lib/db";
import { EM_ABERTO } from "@/lib/dominio/ordem";
import { comErros, erroNoCampo, valoresDo, type EstadoFormulario } from "@/lib/formulario";
import { exigirPerfil } from "@/lib/permissao";
import { pessoaSchema } from "@/lib/validacao/pessoa";

// UC04 - manter cliente (TA24). mesmo esquema do prestador, mesma regra de cpf/cnpj (RN10)
export async function salvarCliente(id: number | null, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  await exigirPerfil("administrador");
  const valores = valoresDo(form);
  const validacao = pessoaSchema.safeParse(valores);
  if (!validacao.success) return comErros(validacao.error, valores);
  const dados = validacao.data;

  try {
    if (id === null) await prisma.cliente.create({ data: dados });
    else await prisma.cliente.update({ where: { id_cliente: id }, data: dados });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return erroNoCampo("cpf_cnpj", `Já existe um cliente cadastrado com este ${dados.tipo_pessoa === "F" ? "CPF" : "CNPJ"}.`, valores);
    }
    throw erro;
  }

  revalidatePath("/clientes");
  redirect(`/clientes?ok=${id === null ? "novo" : "editado"}`);
}

// A3.2: inativar pede confirmacao e nao vale pra cliente com ordem em aberto
export async function alternarAtivo(id: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  await exigirPerfil("administrador");
  const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id_cliente: id } });

  if (cliente.ativo) {
    if (form.get("confirmo") !== "sim") return { mensagem: "Marque a confirmação para inativar." };
    const abertas = await prisma.ordem_servico.findMany({ where: { id_cliente: id, status: { in: EM_ABERTO } }, select: { numero: true } });
    if (abertas.length > 0) {
      return { mensagem: `Não dá para inativar: o cliente tem ordem em aberto (${abertas.map((o) => o.numero).join(", ")}). Conclua ou cancele antes.` };
    }
  }

  await prisma.cliente.update({ where: { id_cliente: id }, data: { ativo: !cliente.ativo } });
  // cliente inativo nao abre solicitacao (UC12 E4.3), entao o login dele acompanha
  if (cliente.id_usuario) await prisma.usuario.update({ where: { id_usuario: cliente.id_usuario }, data: { ativo: !cliente.ativo } });
  revalidatePath(`/clientes/${id}`);
  return { ok: cliente.ativo ? "Cliente inativado." : "Cliente reativado." };
}

export async function liberarAcessoCliente(id: number): Promise<EstadoFormulario> {
  await exigirPerfil("administrador");
  const c = await prisma.cliente.findUniqueOrThrow({ where: { id_cliente: id } });
  if (c.id_usuario) return { mensagem: "Este cliente já tem acesso." };
  if (!c.ativo) return { mensagem: "Reative o cliente antes de liberar o acesso." };
  const r = await liberarAcesso({ perfil: "cliente", id_cliente: id }, c.nome_fantasia ?? c.nome_razao_social, c.email);
  if ("erro" in r) return { mensagem: r.erro };
  revalidatePath(`/clientes/${id}`);
  return { ok: `Acesso liberado. Login ${r.login}, senha provisória ${r.senha}. Passe ao cliente: a senha não aparece de novo.` };
}

export async function anonimizar(id: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPerfil("administrador");
  if (form.get("confirmo") !== "sim") return { mensagem: "Marque a confirmação para anonimizar." };
  const r = await anonimizarCliente(id, Number(usuario.id));
  if ("erro" in r) return { mensagem: r.erro };
  revalidatePath("/clientes");
  return { ok: "Dados pessoais removidos. As ordens do cliente continuam no histórico." };
}
