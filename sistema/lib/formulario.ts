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

// pra onde voltar depois de salvar numa janela (painel, lista de ordens, vencimentos).
// o endereco vem do navegador, entao so vale caminho interno: nada de "//outro-site" (redirect aberto)
export function voltarPara(valor: FormDataEntryValue | null, padrao: string, ok: string) {
  const texto = typeof valor === "string" ? valor : "";
  const caminho = texto.startsWith("/") && !texto.startsWith("//") && !texto.includes("\\") ? texto : padrao;
  const url = new URL(caminho, "http://sgp");
  url.searchParams.delete("janela");
  url.searchParams.delete("atribuir");
  url.searchParams.delete("situacao_de");
  url.searchParams.set("ok", ok);
  return url.pathname + url.search;
}
