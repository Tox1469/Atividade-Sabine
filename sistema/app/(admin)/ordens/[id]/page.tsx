import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoricoOrdem } from "@/app/_componentes/historico-ordem";
import { Aviso, Chip, ChipStatus, Titulo, Trilha } from "@/app/_componentes/ui";
import { candidatosDaOrdem } from "@/lib/aptidao";
import { prisma } from "@/lib/db";
import { textoNota } from "@/lib/dominio/avaliacao";
import { emAtraso, foiAceita, semRespostaHaMaisDe24h } from "@/lib/dominio/ordem";
import { dataBR, dataHoraBR, diasEntre, hoje, plural } from "@/lib/formato";
import { FILTRO_ACEITE } from "@/lib/ordens";
import { exigirPerfil } from "@/lib/permissao";
import { BotaoImprimir } from "@/app/_componentes/imprimir";
import { FormAtribuir, FormCancelar } from "../formularios";

export const metadata = { title: "Ordem de serviço" };

const PRIORIDADE: Record<string, string> = { baixa: "neutro", normal: "aberta", alta: "pendente", urgente: "atraso" };

// T12 - a ordem na visao do administrador. atribuir e cancelar abrem por cima (T12b, T12c)
export default async function OrdemAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ janela?: string; ok?: string }> }) {
  await exigirPerfil("administrador");
  const { janela, ok } = await searchParams;
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
  const podeAtribuir = ordem.status === "aberta" || ordem.status === "atribuida";
  const aqui = `/ordens/${ordem.id_ordem}`;
  const nome = (p: { nome_fantasia: string | null; nome_razao_social: string }) => p.nome_fantasia ?? p.nome_razao_social;

  const candidatos = (janela === "atribuir" || janela === "trocar") && podeAtribuir
    ? await candidatosDaOrdem(ordem.id_ordem, ordem.servico.id_categoria, ordem.servico.categoria.nome)
    : null;

  return (
    <div className="mx-auto max-w-6xl">
      <Titulo voltar={["/ordens", "ordens de serviço"]} titulo={`Ordem ${ordem.numero}`} subtitulo={`${ordem.servico.nome}, para ${nome(ordem.cliente)}`}>
        <ChipStatus status={ordem.status} />
        {atrasada && <Chip tom="atraso">Em atraso</Chip>}
        <BotaoImprimir texto="Imprimir" />
      </Titulo>

      {ok && <Aviso tom="ok" titulo={ok} />}
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
              <Link href={`${aqui}?janela=cancelar`} className="botao-perigo">Cancelar ordem</Link>
              {ordem.status === "aberta" && <Link href={`${aqui}?janela=atribuir`} className="botao-principal">Atribuir prestador</Link>}
              {ordem.status === "atribuida" && <Link href={`${aqui}?janela=trocar`} className="botao">Trocar prestador</Link>}
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

      {candidatos && (
        <div className="modal-fundo" role="dialog" aria-modal="true" aria-labelledby="titulo-janela">
          <div className="modal">
            <h2 id="titulo-janela">{janela === "trocar" ? "Trocar o prestador da ordem" : "Atribuir a ordem a um prestador"}</h2>
            <FormAtribuir
              idOrdem={ordem.id_ordem}
              troca={ordem.status === "atribuida"}
              aptos={candidatos.aptos
                .filter((a) => a.prestador.id_prestador !== ordem.id_prestador)
                .map((a) => ({
                  id: a.prestador.id_prestador,
                  nome: a.prestador.nome_razao_social,
                  detalhe: a.prestador.nome_fantasia ?? `cadastrado em ${dataBR(a.prestador.criado_em)}`,
                  nota: textoNota(a.nota),
                  emAndamento: a.emAndamento,
                  ultimo: a.ultimoAtendimento ? dataBR(a.ultimoAtendimento) : "Nenhum ainda",
                }))}
            >
              <p className="aviso">
                <strong>Aparecem apenas os prestadores aptos para esta ordem.</strong>
                Aptidão é estar ativo, estar habilitado na categoria {ordem.servico.categoria.nome}, não ter documento obrigatório vencido e ter contrato vigente
                (RN01 a RN04).
              </p>
            </FormAtribuir>
            {candidatos.inaptos.length > 0 && (
              <div className="modal-corpo border-t border-regua-clara">
                <h3 className="mb-1 text-sm font-semibold">Não disponíveis para esta ordem</h3>
                <p className="ajuda mb-2">A lista evita a dúvida de por que um prestador conhecido não aparece. Nenhum deles pode ser selecionado.</p>
                <div className="overflow-x-auto">
                  <table className="tabela min-w-[520px]">
                    <thead>
                      <tr><th>Prestador</th><th>Motivo do impedimento</th></tr>
                    </thead>
                    <tbody>
                      {candidatos.inaptos.map(({ prestador, motivo }) => (
                        <tr key={prestador.id_prestador}>
                          <td>{nome(prestador)}</td>
                          <td>
                            <Chip tom={motivo.tom}>{motivo.chip}</Chip> {motivo.texto}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {candidatos.outrosNaoHabilitados > 0 && (
                  <p className="ajuda mt-2">
                    E mais {plural(candidatos.outrosNaoHabilitados, "prestador ativo", "prestadores ativos")} sem habilitação em {ordem.servico.categoria.nome}.
                  </p>
                )}
              </div>
            )}
            <div className="rodape-form">
              <Link href={aqui} className="botao">Fechar</Link>
            </div>
          </div>
        </div>
      )}

      {janela === "cancelar" && aberta && (
        <div className="modal-fundo" role="dialog" aria-modal="true" aria-labelledby="titulo-cancelar">
          <div className="modal" style={{ maxWidth: 560 }}>
            <h2 id="titulo-cancelar">Cancelar a ordem {ordem.numero}</h2>
            <FormCancelar idOrdem={ordem.id_ordem} voltar={aqui} />
          </div>
        </div>
      )}
    </div>
  );
}
