"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { erroNoCampo, valoresDo, type EstadoFormulario } from "@/lib/formulario";
import { pessoaSchema } from "@/lib/validacao/pessoa";

const contaSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Informe um e-mail válido. Ele vai ser o seu login."),
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(72, "Máximo de 72 caracteres."),
    confirmacao: z.string(),
    consentimento: z.literal("sim", { message: "Para criar a conta é preciso concordar com o uso dos dados." }),
  })
  .refine((d) => d.senha === d.confirmacao, { path: ["confirmacao"], message: "A confirmação não bate com a senha." });

// cadastro pela tela de login. cliente entra ativo e ja pode pedir servico.
// prestador entra pendente, como todo prestador novo, ate o administrador conferir os documentos
export async function criarConta(perfil: "cliente" | "prestador", _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  // o perfil chega do navegador (bind no formulario) e pode ser trocado na mao.
  // sem essa conferencia alguem criaria a propria conta como administrador (RNF02)
  if (perfil !== "cliente" && perfil !== "prestador") return { mensagem: "Escolha se vai pedir ou prestar serviço." };
  const valores = valoresDo(form);
  // senha nao volta pra tela
  const devolver = { ...valores, senha: "", confirmacao: "" };

  const pessoa = pessoaSchema.safeParse(valores);
  const conta = contaSchema.safeParse(valores);
  if (!pessoa.success || !conta.success) {
    return {
      erros: { ...(pessoa.success ? {} : pessoa.error.flatten().fieldErrors), ...(conta.success ? {} : conta.error.flatten().fieldErrors) } as Record<string, string[]>,
      mensagem: "Confira os campos destacados.",
      valores: devolver,
    };
  }
  const dados = { ...pessoa.data, email: conta.data.email };

  if (await prisma.usuario.findUnique({ where: { email: dados.email } })) {
    return erroNoCampo("email", "Já existe uma conta com este e-mail. Use Esqueceu a senha na tela de login.", devolver);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: { nome: (dados.nome_fantasia ?? dados.nome_razao_social).slice(0, 120), email: dados.email, perfil, senha_hash: await bcrypt.hash(conta.data.senha, 10) },
      });
      if (perfil === "cliente") {
        await tx.cliente.create({ data: { ...dados, id_usuario: usuario.id_usuario } });
      } else {
        await tx.prestador.create({
          data: {
            ...dados,
            id_usuario: usuario.id_usuario,
            historicos: {
              create: { situacao_anterior: null, situacao_nova: "pendente", motivo: "Cadastro feito pelo próprio prestador, aguardando a documentação obrigatória.", id_usuario: usuario.id_usuario },
            },
          },
        });
      }
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      const nome = dados.tipo_pessoa === "F" ? "CPF" : "CNPJ";
      return erroNoCampo("cpf_cnpj", `Já existe um cadastro com este ${nome}. Se ele é seu, peça o acesso ao administrador.`, devolver);
    }
    throw erro;
  }

  try {
    await signIn("credentials", { email: dados.email, senha: conta.data.senha, redirectTo: perfil === "cliente" ? "/minhas-solicitacoes" : "/minhas-ordens" });
  } catch (erro) {
    if (erro instanceof AuthError) return { ok: "Conta criada. Entre pela tela de login." };
    throw erro; // o redirect do next chega aqui e precisa seguir
  }
  return {};
}
