import type { ZodError } from "zod";

// o que toda action de formulario devolve pra tela. depois de um erro o react limpa o
// formulario, entao os valores digitados voltam junto (foi o defeito D01 do login)
export type EstadoFormulario = {
  erros?: Record<string, string[] | undefined>;
  mensagem?: string;
  valores?: Record<string, string>;
  ok?: string;
};

export function valoresDo(form: FormData) {
  const valores: Record<string, string> = {};
  for (const [campo, valor] of form) if (typeof valor === "string") valores[campo] = valor;
  return valores;
}

export function comErros(erro: ZodError, valores: Record<string, string>): EstadoFormulario {
  return { erros: erro.flatten().fieldErrors as Record<string, string[]>, mensagem: "Confira os campos destacados.", valores };
}

export function erroNoCampo(campo: string, mensagem: string, valores: Record<string, string>): EstadoFormulario {
  return { erros: { [campo]: [mensagem] }, mensagem: "Confira os campos destacados.", valores };
}

