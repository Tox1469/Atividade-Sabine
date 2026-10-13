import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoricoOrdem } from "@/app/_componentes/historico-ordem";
import { Aviso, Chip, ChipStatus, Titulo, Trilha } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { emAtraso, foiAceita, semRespostaHaMaisDe24h } from "@/lib/dominio/ordem";
import { dataBR, dataHoraBR, diasEntre, hoje, plural } from "@/lib/formato";
import { FILTRO_ACEITE } from "@/lib/ordens";
import { exigirPerfil } from "@/lib/permissao";
import { BotaoImprimir } from "@/app/_componentes/imprimir";
import { BotaoAtribuir, BotaoCancelar } from "../formularios";

export const metadata = { title: "Ordem de serviço" };

const PRIORIDADE: Record<string, string> = { baixa: "neutro", normal: "aberta", alta: "pendente", urgente: "atraso" };

// T12 - a ordem na visao do administrador. atribuir e cancelar abrem por cima (T12b, T12c)
export default async function OrdemAdmin({ params }: { params: Promise<{ id: string }> }) {
  await exigirPerfil("administrador");
  const ordem = await prisma.ordem_servico.findUnique({
    where: { id_ordem: Number((await params).id) || 0 },
    include: {
      cliente: true,
      prestador: true,
      servico: { include: { categoria: true } },
      avaliacao: true,
      andamentos: { include: { usuario: true } },
    },
  });
  if (!ordem) notFound();

  const dia = hoje();
  const aceites = await prisma.andamento_ordem.findMany({ where: { id_ordem: ordem.id_ordem, ...FILTRO_ACEITE } });
  const aceita = foiAceita(ordem.data_atribuicao, aceites);
  const atrasada = emAtraso(ordem.status, ordem.prazo, dia);
  const aberta = ordem.status === "aberta" || ordem.status === "atribuida" || ordem.status === "em_execucao";
  const nome = (p: { nome_fantasia: string | null; nome_razao_social: string }) => p.nome_fantasia ?? p.nome_razao_social;

  return (
    <div className="w-full">
      <Titulo voltar={["/ordens", "ordens de serviço"]} titulo={`Ordem ${ordem.numero}`} subtitulo={`${ordem.servico.nome}, para ${nome(ordem.cliente)}`}>
        <ChipStatus status={ordem.status} />
        {atrasada && <Chip tom="atraso">Em atraso</Chip>}
        <BotaoImprimir texto="Imprimir" />
      </Titulo>

      {ordem.status === "atribuida" && semRespostaHaMaisDe24h(ordem.status, ordem.data_atribuicao, aceita, new Date()) && (
        <Aviso tom="atencao" titulo="Aguardando resposta do prestador há mais de 24h.">
          Dá para trocar o prestador enquanto a execução não começou (UC14 E3.1).
        </Aviso>
      )}

      <div className="cartao mb-4 p-4">
        <Trilha status={ordem.status} />
        <p className="ajuda mt-2">A ordem só anda nessa sequência. Não é possível pular etapa nem voltar para um status anterior (RN05).</p>
      </div>

      <div className="colunas">
        <div className="cartao" style={{ flexGrow: 2 }}>
          <h2 className="cartao-titulo">Dados da ordem</h2>
          <div className="grid gap-4 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="rotulo">Cliente</p>
              <Link href={`/clientes/${ordem.id_cliente}`} className="underline">{nome(ordem.cliente)}</Link>
              <span className="secundario">{ordem.local_atendimento}</span>
            </div>
            <div>
              <p className="rotulo">Serviço</p>
              {ordem.servico.nome}
              <span className="secundario">Categoria: {ordem.servico.categoria.nome}</span>
            </div>
            <div>
              <p className="rotulo">Prioridade</p>
              <Chip tom={PRIORIDADE[ordem.prioridade]}>{ordem.prioridade[0].toUpperCase() + ordem.prioridade.slice(1)}</Chip>
            </div>
            <div>
              <p className="rotulo">Aberta em</p>
              {dataHoraBR(ordem.data_abertura)}
            </div>
            <div>
              <p className="rotulo">Prazo combinado</p>
              {dataBR(ordem.prazo)}
              {aberta && <span className="secundario">{atrasada ? `atrasada há ${plural(diasEntre(ordem.prazo, dia), "dia", "dias")}` : `faltam ${plural(diasEntre(dia, ordem.prazo), "dia", "dias")}`}</span>}
              {ordem.status === "concluida" && <span className="secundario">{ordem.entregue_no_prazo ? "entregue no prazo" : "entregue com atraso"}</span>}
            </div>
            <div>
              <p className="rotulo">Prestador responsável</p>
              {ordem.prestador ? (
                <>
                  <Link href={`/prestadores/${ordem.id_prestador}`} className="underline">{nome(ordem.prestador)}</Link>
                  <span className="secundario">
                    {ordem.status === "atribuida" ? (aceita ? "aceitou, ainda não iniciou" : "ainda não respondeu") : ordem.data_atribuicao ? `desde ${dataBR(ordem.data_atribuicao)}` : ""}
                  </span>
                </>
              ) : (
                "Ainda não atribuída"
              )}
            </div>
            <div className="sm:col-span-3">
              <p className="rotulo">Descrição do cliente</p>
              <p className="whitespace-pre-line">{ordem.descricao}</p>
            </div>
            {ordem.relato_conclusao && (
              <div className="sm:col-span-3">
                <p className="rotulo">Relato da conclusão</p>
                <p className="whitespace-pre-line">{ordem.relato_conclusao}</p>
              </div>
            )}
            {ordem.motivo_cancelamento && (
              <div className="sm:col-span-3">
                <p className="rotulo">Motivo do cancelamento</p>
                <p>{ordem.motivo_cancelamento}</p>
              </div>
            )}
            {ordem.avaliacao && (
              <div className="sm:col-span-3">
                <p className="rotulo">Avaliação do cliente</p>
                <p>
                  Nota {ordem.avaliacao.nota} de 5{ordem.avaliacao.comentario ? `: ${ordem.avaliacao.comentario}` : ""}
                </p>
              </div>
            )}
          </div>
          {aberta && (
            <div className="rodape-form">
              <BotaoCancelar idOrdem={ordem.id_ordem} numero={ordem.numero} />
              {ordem.status === "aberta" && <BotaoAtribuir idOrdem={ordem.id_ordem} texto="Atribuir prestador" classe="botao-principal" />}
              {ordem.status === "atribuida" && <BotaoAtribuir idOrdem={ordem.id_ordem} texto="Trocar prestador" classe="botao" />}
            </div>
          )}
        </div>

        <div className="cartao">
          <h2 className="cartao-titulo">Histórico da ordem</h2>
          <div className="p-4">
            <HistoricoOrdem andamentos={ordem.andamentos} />
          </div>
        </div>
      </div>

    </div>
  );
}
