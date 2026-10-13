"use server";

import { revalidatePath } from "next/cache";
import { aplicarVencimentos } from "@/lib/aptidao";
import type { EstadoFormulario } from "@/lib/formulario";
import { exigirPerfil } from "@/lib/permissao";

// a mesma rotina do agendamento diario, disparada na mao (serve pra demonstracao e pra
// quando o administrador acabou de lancar uma validade antiga)
export async function rodarRotina(): Promise<EstadoFormulario> {
  await exigirPerfil("administrador");
  const n = await aplicarVencimentos();
  revalidatePath("/vencimentos");
  return { ok: n === 0 ? "Nenhum prestador ativo com documento obrigatório vencido." : `${n} ${n === 1 ? "prestador passou" : "prestadores passaram"} para pendente.` };
}
