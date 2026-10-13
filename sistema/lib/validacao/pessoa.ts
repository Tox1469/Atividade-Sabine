import { z } from "zod";
import { documentoValido, soDigitos } from "@/lib/dominio/cpf-cnpj";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const SITUACOES = ["ativo", "pendente", "bloqueado", "inativo"] as const;

const obrigatorio = (max: number) =>
  z.string().trim().min(1, "Campo obrigatório.").max(max, `Máximo de ${max} caracteres.`);

const opcional = (max: number) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres.`).transform((v) => (v === "" ? null : v));

// RF02 + RN10. o mesmo esquema e usado no formulario e na action do servidor (RNF02)
export const prestadorSchema = z
  .object({
    tipo_pessoa: z.enum(["F", "J"], { message: "Escolha o tipo." }),
    nome_razao_social: obrigatorio(150).pipe(z.string().min(3, "Informe o nome completo.")),
    nome_fantasia: opcional(120),
    cpf_cnpj: z.string().transform(soDigitos),
    telefone: obrigatorio(20).refine((v) => soDigitos(v).length >= 10, "Telefone com DDD, só números."),
    email: opcional(150).refine((v) => v === null || z.string().email().safeParse(v).success, "E-mail inválido."),
    cep: z.string().transform(soDigitos).refine((v) => v.length === 8, "CEP com 8 números."),
    logradouro: obrigatorio(150),
    numero: obrigatorio(10),
    complemento: opcional(60),
    bairro: obrigatorio(60),
    cidade: obrigatorio(60),
    uf: z.enum(UFS, { message: "Escolha a UF." }),
  })
  .superRefine((dados, ctx) => {
    const nome = dados.tipo_pessoa === "F" ? "CPF" : "CNPJ";
    if (!dados.cpf_cnpj) {
      ctx.addIssue({ code: "custom", path: ["cpf_cnpj"], message: "Campo obrigatório." });
    } else if (!documentoValido(dados.tipo_pessoa, dados.cpf_cnpj)) {
      ctx.addIssue({ code: "custom", path: ["cpf_cnpj"], message: `${nome} inválido: o dígito verificador não confere.` });
    }
  });

export type DadosPrestador = z.infer<typeof prestadorSchema>;
