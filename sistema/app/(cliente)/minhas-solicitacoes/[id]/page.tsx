import { notFound } from "next/navigation";
import { HistoricoOrdem } from "@/app/_componentes/historico-ordem";
import { Aviso, ChipStatus, Titulo, Trilha } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { dataBR, dataHoraBR } from "@/lib/formato";
import { exigirCliente } from "@/lib/permissao";
import { FormAvaliacao } from "../avaliacao";

export const metadata = { title: "Acompanhar solicitação" };

// T18 - acompanhar e avaliar. so abre ordem do cliente logado (RN08, RNF02)
export default async function OrdemCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nova?: string }> }) {
  const { cliente } = await exigirCliente();
  const { nova } = await searchParams;
  const ordem = await prisma.ordem_servico.findFirst({
    where: { id_ordem: Number((await params).id) || 0, id_cliente: cliente.id_cliente },
    include: { servico: true, prestador: true, avaliacao: true, andamentos: { include: { usuario: true } } },
  });
  if (!ordem) notFound();
  const andamentoPadrao = ordem.andamentos.find((a) => a.status_anterior === null);

  return (
    <div className="mx-auto max-w-5xl">
      <Titulo voltar={["/minhas-solicitacoes", "minhas solicitações"]} titulo={`Solicitação ${ordem.numero}`} subtitulo={ordem.servico.nome}>
        <ChipStatus status={ordem.status} />
      </Titulo>

      {nova && (
        <Aviso tom="ok" titulo={`Solicitação enviada com o número ${ordem.numero}.`}>
          Prazo combinado: {dataBR(ordem.prazo)}. {andamentoPadrao?.observacao?.startsWith("Prazo padrão") ? "Como você não informou prazo, valeu o prazo padrão do serviço." : ""}
        </Aviso>
      )}
      {ordem.status === "concluida" && ordem.data_conclusao && (
        <Aviso tom="ok" titulo={`Serviço concluído em ${dataHoraBR(ordem.data_conclusao).split(" às")[0]}, ${ordem.entregue_no_prazo ? "dentro do prazo" : "depois do prazo"}.`}>
          {ordem.avaliacao ? "Sua avaliação já foi registrada." : "A avaliação fica disponível agora e pode ser lançada uma única vez (RN08)."}
        </Aviso>
      )}
      {ordem.status === "cancelada" && <Aviso tom="erro" titulo="Solicitação cancelada.">{ordem.motivo_cancelamento}</Aviso>}

      <div className="colunas">
        <div className="cartao">
          <h2 className="cartao-titulo">Acompanhamento</h2>
          <div className="space-y-4 p-4">
            <Trilha status={ordem.status} />
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="rotulo">Prazo combinado</p>
                {dataBR(ordem.prazo)}
              </div>
              <div>
                <p className="rotulo">Prestador</p>
                {ordem.prestador ? ordem.prestador.nome_fantasia ?? ordem.prestador.nome_razao_social : "Ainda sendo definido"}
              </div>
              <div className="sm:col-span-2">
                <p className="rotulo">O que você pediu</p>
                <p className="whitespace-pre-line">{ordem.descricao}</p>
              </div>
            </div>
            <HistoricoOrdem andamentos={ordem.andamentos} />
          </div>
        </div>

        {ordem.status === "concluida" &&
          (ordem.avaliacao ? (
            <div className="cartao" style={{ flex: "0 1 400px" }}>
              <h2 className="cartao-titulo">Sua avaliação</h2>
              <div className="p-4 text-sm">
                <p className="text-2xl font-semibold">{ordem.avaliacao.nota} <span className="text-sm font-normal text-tinta2">de 5</span></p>
                {ordem.avaliacao.comentario && <p className="mt-2">{ordem.avaliacao.comentario}</p>}
                <p className="ajuda mt-2">Enviada em {dataHoraBR(ordem.avaliacao.avaliado_em)}. A avaliação não pode ser alterada.</p>
              </div>
            </div>
          ) : (
            <FormAvaliacao idOrdem={ordem.id_ordem} />
          ))}
      </div>
    </div>
  );
}
