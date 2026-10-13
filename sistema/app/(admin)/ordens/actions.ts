"use server";

import { revalidatePath } from "next/cache";
import { candidatosDaOrdem } from "@/lib/aptidao";
import { prisma } from "@/lib/db";
import { textoNota } from "@/lib/dominio/avaliacao";
import { dataBR } from "@/lib/formato";
import { comErros, erroNoCampo, valoresDo, type EstadoFormulario } from "@/lib/formulario";
import { abrirOrdem, atribuir, cancelar } from "@/lib/ordens";
import { exigirPerfil } from "@/lib/permissao";
import { ordemSchema } from "@/lib/validacao/ordem";

// as acoes daqui sao chamadas de janelas por cima da tela. em vez de mudar de pagina,
// devolvem a mensagem: a janela fecha, mostra o aviso e a lista de tras se atualiza

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
  revalidatePath("/painel");
  return { ok: `Ordem ${r.ok} aberta. Ela já aparece na fila para atribuição.` };
}

// T12b - o que a janela de atribuicao mostra: aptos e inaptos com o motivo (UC22)
export async function carregarCandidatos(idOrdem: number) {
  await exigirPerfil("administrador");
  const ordem = await prisma.ordem_servico.findUnique({ where: { id_ordem: idOrdem }, include: { cliente: true, servico: { include: { categoria: true } } } });
  if (!ordem || (ordem.status !== "aberta" && ordem.status !== "atribuida")) return null;
  const categoria = ordem.servico.categoria.nome;
  const { aptos, inaptos, outrosNaoHabilitados } = await candidatosDaOrdem(ordem.id_ordem, ordem.servico.id_categoria, categoria);
  const nome = (p: { nome_fantasia: string | null; nome_razao_social: string }) => p.nome_fantasia ?? p.nome_razao_social;
  return {
    numero: ordem.numero,
    resumo: `${ordem.servico.nome} para ${nome(ordem.cliente)}, prazo ${dataBR(ordem.prazo)}.`,
    categoria,
    troca: ordem.status === "atribuida",
    aptos: aptos
      .filter((a) => a.prestador.id_prestador !== ordem.id_prestador)
      .map((a) => ({
        id: a.prestador.id_prestador,
        nome: a.prestador.nome_razao_social,
        detalhe: a.prestador.nome_fantasia ?? `cadastrado em ${dataBR(a.prestador.criado_em)}`,
        nota: textoNota(a.nota),
        emAndamento: a.emAndamento,
        ultimo: a.ultimoAtendimento ? dataBR(a.ultimoAtendimento) : "Nenhum ainda",
      })),
    inaptos: inaptos.map(({ prestador, motivo }) => ({ id: prestador.id_prestador, nome: nome(prestador), ...motivo })),
    outrosNaoHabilitados,
  };
}

export type Candidatos = NonNullable<Awaited<ReturnType<typeof carregarCandidatos>>>;

// T12b - o botao de cada prestador manda o id dele. na troca vai junto o motivo (A5.1)
export async function atribuirOrdem(idOrdem: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPerfil("administrador");
  const idPrestador = Number(form.get("id_prestador")) || 0;
  const motivo = String(form.get("motivo") ?? "");
  if (!idPrestador) return { mensagem: "Escolha o prestador." };

  const r = await atribuir(idOrdem, idPrestador, Number(usuario.id), motivo || undefined);
  revalidatePath("/ordens", "layout");
  revalidatePath("/painel");
  if ("erro" in r) return { mensagem: r.erro, valores: { motivo } };
  return { ok: r.ok };
}

// T12c - cancelar com motivo (RN07)
export async function cancelarOrdem(idOrdem: number, _estado: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPerfil("administrador");
  const motivo = String(form.get("motivo") ?? "");
  const r = await cancelar(idOrdem, Number(usuario.id), motivo);
  if ("erro" in r) return { erros: { motivo: [r.erro] }, valores: { motivo } };
  revalidatePath("/ordens", "layout");
  revalidatePath("/painel");
  return { ok: r.ok };
}
