"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { liberarAcesso } from "@/lib/acesso";
import { anonimizarPrestador } from "@/lib/anonimizar";
import { prisma } from "@/lib/db";
import { gravarDocumento } from "@/lib/documentos";
import { EM_ANDAMENTO } from "@/lib/dominio/ordem";
import { hoje, lerData } from "@/lib/formato";
import { comErros, erroNoCampo, valoresDo, type EstadoFormulario } from "@/lib/formulario";
import { registrarLog } from "@/lib/log";
import { exigirPerfil } from "@/lib/permissao";
import { apagarArquivo, linkDeEnvio, receberArquivo } from "@/lib/storage";
import { pessoaSchema, SITUACOES } from "@/lib/validacao/pessoa";

const caminho = (id: number, aba = "") => `/prestadores/${id}${aba}`;

// UC03 - manter prestador. id nulo = cadastro novo, com id = edicao
export async function salvarPrestador(id: number | null, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPerfil("administrador");
  const valores = valoresDo(form);
  const validacao = pessoaSchema.safeParse(valores);
  if (!validacao.success) return comErros(validacao.error, valores);
  const dados = validacao.data;

  try {
    if (id === null) {
      // todo prestador novo nasce pendente (dicionario de dados) e o primeiro registro
      // do historico de situacao ja e gravado junto, na mesma operacao
      await prisma.prestador.create({
        data: {
          ...dados,
          historicos: {
            create: { situacao_anterior: null, situacao_nova: "pendente", motivo: "Cadastro inicial, aguardando a documentação obrigatória.", id_usuario: Number(usuario.id) },
          },
        },
      });
    } else {
      await prisma.prestador.update({ where: { id_prestador: id }, data: { ...dados, atualizado_em: new Date() } });
    }
  } catch (erro) {
    // RN10: o banco tem unique em cpf_cnpj, entao um cadastro repetido cai aqui
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return erroNoCampo("cpf_cnpj", `Já existe um prestador cadastrado com este ${dados.tipo_pessoa === "F" ? "CPF" : "CNPJ"}.`, valores);
    }
    throw erro;
  }

  revalidatePath("/prestadores");
  redirect(`/prestadores?ok=${id === null ? "novo" : "editado"}`);
}

// UC07 - habilitar em categorias (TA27). desmarcar nao apaga: a habilitacao fica inativa
export async function salvarCategorias(id: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  await exigirPerfil("administrador");
  const marcadas = new Set(form.getAll("categoria").map(Number));
  const atuais = await prisma.prestador_categoria.findMany({ where: { id_prestador: id }, include: { categoria: true } });
  const removidas = atuais.filter((a) => a.ativa && !marcadas.has(a.id_categoria));

  // E3.1: categoria com ordem atribuida ou em execucao nao pode ser tirada
  if (removidas.length > 0) {
    const presas = await prisma.ordem_servico.findMany({
      where: { id_prestador: id, status: { in: EM_ANDAMENTO }, servico: { id_categoria: { in: removidas.map((r) => r.id_categoria) } } },
      include: { servico: { include: { categoria: true } } },
    });
    if (presas.length > 0) {
      const lista = presas.map((o) => `${o.numero} (${o.servico.categoria.nome})`).join(", ");
      return { mensagem: `Não dá para tirar a categoria enquanto houver ordem em andamento nela: ${lista}.` };
    }
  }

  const dia = hoje();
  await prisma.$transaction([
    ...removidas.map((r) =>
      prisma.prestador_categoria.update({ where: { id_prestador_id_categoria: { id_prestador: id, id_categoria: r.id_categoria } }, data: { ativa: false } }),
    ),
    ...[...marcadas]
      .filter((c) => !atuais.some((a) => a.ativa && a.id_categoria === c))
      .map((c) =>
        prisma.prestador_categoria.upsert({
          where: { id_prestador_id_categoria: { id_prestador: id, id_categoria: c } },
          create: { id_prestador: id, id_categoria: c, habilitado_em: dia },
          update: { ativa: true, habilitado_em: dia },
        }),
      ),
  ]);

  revalidatePath(caminho(id, "/categorias"));
  return { ok: "Habilitações salvas." };
}

const situacaoSchema = z.object({
  situacao: z.enum(SITUACOES, { message: "Escolha a nova situação." }),
  motivo: z.string().trim().min(10, "O motivo precisa ter no mínimo 10 caracteres.").max(255, "Máximo de 255 caracteres."),
});

// UC11 - alterar situacao cadastral (TA33), com historico e log (RF19)
export async function alterarSituacao(id: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPerfil("administrador");
  const valores = valoresDo(form);
  const validacao = situacaoSchema.safeParse(valores);
  if (!validacao.success) return comErros(validacao.error, valores);
  const { situacao, motivo } = validacao.data;

  const prestador = await prisma.prestador.findUniqueOrThrow({ where: { id_prestador: id } });
  if (prestador.situacao === situacao) return erroNoCampo("situacao", "O prestador já está nessa situação.", valores);

  // RN11 (TA35): nao inativa quem tem ordem atribuida ou em execucao
  if (situacao === "inativo") {
    const presas = await prisma.ordem_servico.findMany({ where: { id_prestador: id, status: { in: EM_ANDAMENTO } }, select: { numero: true } });
    if (presas.length > 0) {
      return erroNoCampo("situacao", `Não dá para inativar: conclua ou realoque antes as ordens ${presas.map((o) => o.numero).join(", ")}.`, valores);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.prestador.update({
      where: { id_prestador: id },
      data: {
        situacao,
        atualizado_em: new Date(),
        historicos: { create: { situacao_anterior: prestador.situacao, situacao_nova: situacao, motivo, id_usuario: Number(usuario.id) } },
      },
    });
    await registrarLog(tx, Number(usuario.id), "alteracao_situacao", "prestador", id, `${prestador.situacao} para ${situacao}: ${motivo}`);
  });

  revalidatePath(caminho(id, "/situacao"));
  return { ok: "Situação alterada." };
}

// UC08 A1: o administrador envia em nome do prestador
export async function prepararEnvio(id: number, pasta: "documentos" | "contratos", tipo: string) {
  await exigirPerfil("administrador");
  return linkDeEnvio(`${pasta}/${id}`, tipo);
}

export async function enviarDocumento(id: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPerfil("administrador");
  const resultado = await gravarDocumento(id, Number(usuario.id), form);
  revalidatePath(caminho(id, "/documentos"));
  return resultado;
}

const contratoSchema = z.object({
  numero: z.string().trim().min(1, "Informe o número do contrato.").max(30, "Máximo de 30 caracteres."),
  valor: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(/\./g, "").replace(",", "."))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Valor inválido."),
});

// UC10 - manter contratos (TA50). sem sobreposicao de vigencia pro mesmo prestador
export async function salvarContrato(id: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  await exigirPerfil("administrador");
  const valores = valoresDo(form);
  const erros: Record<string, string[]> = {};

  const validacao = contratoSchema.safeParse(valores);
  if (!validacao.success) Object.assign(erros, validacao.error.flatten().fieldErrors);
  const inicio = lerData(valores.data_inicio);
  const fim = lerData(valores.data_fim);
  if (!inicio) erros.data_inicio = ["Informe o início da vigência."];
  if (!fim) erros.data_fim = ["Informe o fim da vigência."];
  if (inicio && fim && fim <= inicio) erros.data_fim = ["O fim precisa ser depois do início."];

  if (inicio && fim && !erros.data_fim) {
    const sobreposto = await prisma.contrato.findFirst({ where: { id_prestador: id, data_inicio: { lte: fim }, data_fim: { gte: inicio } } });
    if (sobreposto) erros.data_inicio = [`A vigência cruza com a do contrato ${sobreposto.numero}.`];
  }

  const arquivo = await receberArquivo(form, `contratos/${id}`, ["application/pdf"]);
  if ("erro" in arquivo) erros.arquivo = [arquivo.erro];

  if (Object.keys(erros).length > 0 || !validacao.success || !inicio || !fim || "erro" in arquivo) {
    if (!("erro" in arquivo)) await apagarArquivo(arquivo.caminho);
    return { erros, mensagem: "Confira os campos destacados.", valores };
  }

  await prisma.contrato.create({
    data: { id_prestador: id, numero: validacao.data.numero, data_inicio: inicio, data_fim: fim, valor: validacao.data.valor, arquivo_url: arquivo.caminho },
  });
  revalidatePath(caminho(id, "/contratos"));
  return { ok: `Contrato ${validacao.data.numero} cadastrado.` };
}

export async function liberarAcessoPrestador(id: number): Promise<EstadoFormulario> {
  await exigirPerfil("administrador");
  const p = await prisma.prestador.findUniqueOrThrow({ where: { id_prestador: id } });
  if (p.id_usuario) return { mensagem: "Este prestador já tem acesso." };
  const r = await liberarAcesso({ perfil: "prestador", id_prestador: id }, p.nome_fantasia ?? p.nome_razao_social, p.email);
  if ("erro" in r) return { mensagem: r.erro };
  revalidatePath(caminho(id));
  return { ok: `Acesso liberado. Login ${r.login}, senha provisória ${r.senha}. Passe ao prestador: a senha não aparece de novo.` };
}

export async function anonimizar(id: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPerfil("administrador");
  if (form.get("confirmo") !== "sim") return { mensagem: "Marque a confirmação para anonimizar." };
  const r = await anonimizarPrestador(id, Number(usuario.id));
  if ("erro" in r) return { mensagem: r.erro };
  revalidatePath("/prestadores");
  return { ok: "Dados pessoais removidos. O cadastro continua no histórico das ordens." };
}
