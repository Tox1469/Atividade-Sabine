"use server";

import { revalidatePath } from "next/cache";
import { gravarDocumento } from "@/lib/documentos";
import type { EstadoFormulario } from "@/lib/formulario";
import { exigirPrestador } from "@/lib/permissao";
import { linkDeEnvio } from "@/lib/storage";

// UC08 pelo proprio prestador: a pasta e o cadastro sempre saem da sessao
export async function prepararMeuEnvio(tipo: string) {
  const { prestador } = await exigirPrestador();
  return linkDeEnvio(`documentos/${prestador.id_prestador}`, tipo);
}

export async function enviarMeuDocumento(_estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { usuario, prestador } = await exigirPrestador();
  const r = await gravarDocumento(prestador.id_prestador, Number(usuario.id), form);
  revalidatePath("/meus-documentos");
  return r;
}
