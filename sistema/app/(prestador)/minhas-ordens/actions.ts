"use server";

import { revalidatePath } from "next/cache";
import type { EstadoFormulario } from "@/lib/formulario";
import { aceitar, concluir, iniciar, recusar, registrarAndamento } from "@/lib/ordens";
import { exigirPrestador } from "@/lib/permissao";

// o prestador vem sempre da sessao (exigirPrestador). o id da ordem vem da tela, mas
// lib/ordens so mexe se a ordem for desse prestador (RNF02, UC15 E2.2)
async function quem(idOrdem: number) {
  const { usuario, prestador } = await exigirPrestador();
  return { idOrdem, idPrestador: prestador.id_prestador, idUsuario: Number(usuario.id) };
}

function resposta(idOrdem: number | null, r: { ok: string } | { erro: string }, campo?: string, texto?: string): EstadoFormulario {
  if (idOrdem) revalidatePath(`/minhas-ordens/${idOrdem}`);
  if ("ok" in r) return { ok: r.ok };
  return campo ? { erros: { [campo]: [r.erro] }, valores: { [campo]: texto ?? "" } } : { mensagem: r.erro };
}

export async function acaoPrestador(idOrdem: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const p = await quem(idOrdem);
  const acao = String(form.get("acao"));
  const texto = String(form.get("texto") ?? "");

  if (acao === "aceitar") return resposta(idOrdem, await aceitar(p));
  if (acao === "iniciar") return resposta(idOrdem, await iniciar(p));
  // depois da recusa a ordem nao e mais dele: redesenhar a pagina dela daria 404, a tela e que volta pra lista
  if (acao === "recusar") return resposta(null, await recusar(p, texto), "texto", texto);
  if (acao === "andamento") return resposta(idOrdem, await registrarAndamento(p, texto), "texto", texto);
  if (acao === "concluir") return resposta(idOrdem, await concluir(p, texto), "texto", texto);
  return { mensagem: "Ação desconhecida." };
}
