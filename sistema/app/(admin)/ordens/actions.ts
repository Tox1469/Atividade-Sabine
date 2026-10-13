"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { comErros, erroNoCampo, valoresDo, voltarPara, type EstadoFormulario } from "@/lib/formulario";
import { abrirOrdem, atribuir, cancelar } from "@/lib/ordens";
import { exigirPerfil } from "@/lib/permissao";
import { ordemSchema } from "@/lib/validacao/ordem";

// UC12 A1.1 - o administrador abre em nome do cliente
export async function abrirPeloAdmin(_estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPerfil("administrador");
  const valores = valoresDo(form);
  const idCliente = Number(valores.id_cliente) || 0;
  if (!idCliente) return erroNoCampo("id_cliente", "Escolha o cliente.", valores);
  const validacao = ordemSchema.safeParse(valores);
  if (!validacao.success) return comErros(validacao.error, valores);
  const d = validacao.data;

  const r = await abrirOrdem({
    idCliente,
    idServico: d.id_servico,
    descricao: d.descricao,
    prioridade: d.prioridade,
    prazoDesejado: d.prazo,
    local: d.local_atendimento,
    idUsuario: Number(usuario.id),
  });
  if ("erro" in r) return { mensagem: r.erro, valores };
  revalidatePath("/ordens");
  redirect(`/ordens/${r.id}?ok=${encodeURIComponent(`Ordem ${r.ok} aberta.`)}`);
}

// T12b - o botao de cada prestador manda o id dele. na troca vai junto o motivo (A5.1)
export async function atribuirOrdem(idOrdem: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPerfil("administrador");
  const idPrestador = Number(form.get("id_prestador")) || 0;
  const motivo = String(form.get("motivo") ?? "");
  if (!idPrestador) return { mensagem: "Escolha o prestador." };

  const r = await atribuir(idOrdem, idPrestador, Number(usuario.id), motivo || undefined);
  revalidatePath(`/ordens/${idOrdem}`);
  if ("erro" in r) return { mensagem: r.erro, valores: { motivo } };
  // volta pra tela de onde a janela abriu (painel, lista de ordens ou a propria ordem)
  revalidatePath("/painel");
  redirect(voltarPara(form.get("voltar"), `/ordens/${idOrdem}`, r.ok));
}

// T12c - cancelar com motivo (RN07)
export async function cancelarOrdem(idOrdem: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPerfil("administrador");
  const motivo = String(form.get("motivo") ?? "");
  const r = await cancelar(idOrdem, Number(usuario.id), motivo);
  if ("erro" in r) return { erros: { motivo: [r.erro] }, valores: { motivo } };
  revalidatePath(`/ordens/${idOrdem}`);
  redirect(voltarPara(form.get("voltar"), `/ordens/${idOrdem}`, r.ok));
}
