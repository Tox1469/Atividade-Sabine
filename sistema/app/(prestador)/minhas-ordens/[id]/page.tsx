import { notFound } from "next/navigation";
import { HistoricoOrdem } from "@/app/_componentes/historico-ordem";
import { Aviso, Chip, ChipStatus, Titulo, Trilha } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { emAtraso, foiAceita } from "@/lib/dominio/ordem";
import { dataBR, diasEntre, hoje, plural } from "@/lib/formato";
import { enderecoDe, FILTRO_ACEITE } from "@/lib/ordens";
import { exigirPrestador } from "@/lib/permissao";
import { FormAndamento, FormConcluir, FormIniciar, FormResposta } from "../formularios";

export const metadata = { title: "Execução da ordem" };

// T14 - execucao da ordem. so abre ordem que e do prestador logado (UC15 E2.2)
export default async function ExecucaoOrdem({ params }: { params: Promise<{ id: string }> }) {
  const { prestador } = await exigirPrestador();
  const ordem = await prisma.ordem_servico.findFirst({
    where: { id_ordem: Number((await params).id) || 0, id_prestador: prestador.id_prestador },
    include: { cliente: true, servico: true, andamentos: { include: { usuario: true } } },
  });
  if (!ordem) notFound();

  const dia = hoje();
  const aceites = ordem.andamentos.filter(
    (a) => a.status_anterior === FILTRO_ACEITE.status_anterior && a.status_novo === FILTRO_ACEITE.status_novo && a.usuario.perfil === "prestador",
  );
  const aceita = foiAceita(ordem.data_atribuicao, aceites);
  const faltam = diasEntre(dia, ordem.prazo);

  return (
    <div className="w-full">
      <Titulo voltar={["/minhas-ordens", "minhas ordens"]} titulo={`Ordem ${ordem.numero}`} subtitulo={ordem.servico.nome}>
        <ChipStatus status={ordem.status} />
        {emAtraso(ordem.status, ordem.prazo, dia) && <Chip tom="atraso">Em atraso</Chip>}
      </Titulo>

      <div className="cartao mb-4 p-4">
        <Trilha status={ordem.status} />
      </div>

      {ordem.status === "concluida" && <Aviso tom="ok" titulo={`Concluída ${ordem.entregue_no_prazo ? "dentro do prazo" : "com atraso"}.`}>A ordem não pode mais ser alterada (RN06).</Aviso>}
      {ordem.status === "cancelada" && <Aviso tom="erro" titulo="Ordem cancelada pelo administrador.">{ordem.motivo_cancelamento}</Aviso>}

      <div className="colunas mb-4">
        <div className="cartao">
          <h2 className="cartao-titulo">O que foi pedido</h2>
          <div className="grid gap-4 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="rotulo">Cliente</p>
              {ordem.cliente.nome_fantasia ?? ordem.cliente.nome_razao_social}
              <span className="secundario">{ordem.local_atendimento ?? enderecoDe(ordem.cliente)}</span>
              <span className="secundario">{ordem.cliente.telefone}</span>
            </div>
            <div>
              <p className="rotulo">Prazo</p>
              {dataBR(ordem.prazo)}
              {(ordem.status === "atribuida" || ordem.status === "em_execucao") && (
                <span className="secundario">{faltam < 0 ? `atrasada há ${plural(-faltam, "dia", "dias")}` : faltam === 0 ? "vence hoje" : `faltam ${plural(faltam, "dia", "dias")}`}</span>
              )}
              <span className="secundario">prioridade {ordem.prioridade}</span>
            </div>
            <div className="sm:col-span-2">
              <p className="rotulo">Descrição</p>
              <p className="whitespace-pre-line">{ordem.descricao}</p>
            </div>
            {ordem.relato_conclusao && (
              <div className="sm:col-span-2">
                <p className="rotulo">Seu relato da conclusão</p>
                <p className="whitespace-pre-line">{ordem.relato_conclusao}</p>
              </div>
            )}
          </div>
        </div>
        {ordem.status === "em_execucao" && <FormAndamento idOrdem={ordem.id_ordem} />}
      </div>

      {ordem.status === "atribuida" && (aceita ? <FormIniciar idOrdem={ordem.id_ordem} /> : <FormResposta idOrdem={ordem.id_ordem} />)}
      {ordem.status === "em_execucao" && <FormConcluir idOrdem={ordem.id_ordem} />}

      <div className="cartao mt-4">
        <h2 className="cartao-titulo">Histórico</h2>
        <div className="p-4">
          <HistoricoOrdem andamentos={ordem.andamentos} />
        </div>
      </div>
    </div>
  );
}
