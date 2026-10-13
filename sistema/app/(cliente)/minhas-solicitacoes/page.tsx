import Link from "next/link";
import { ChipStatus, Paginacao, paginaAtual, Titulo, Vazio } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { dataBR, plural } from "@/lib/formato";
import { exigirCliente } from "@/lib/permissao";

export const metadata = { title: "Minhas solicitações" };

const POR_PAGINA = 20;

// T16 - minhas solicitacoes. so as ordens do cliente logado (RNF02)
export default async function MinhasSolicitacoes({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { cliente } = await exigirCliente();
  const params = await searchParams;
  const pagina = paginaAtual(params.pagina);
  const minhas = { id_cliente: cliente.id_cliente };

  const [total, ordens] = await Promise.all([
    prisma.ordem_servico.count({ where: minhas }),
    prisma.ordem_servico.findMany({
      where: minhas,
      include: { servico: true, avaliacao: { select: { id_avaliacao: true } } },
      orderBy: { id_ordem: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <Titulo titulo="Minhas solicitações" subtitulo={plural(total, "solicitação", "solicitações")}>
        {cliente.ativo && <Link href="/minhas-solicitacoes/nova" className="botao-principal">Nova solicitação</Link>}
      </Titulo>

      <div className="cartao overflow-x-auto">
        <h2 className="cartao-titulo">Minhas solicitações</h2>
        {ordens.length === 0 ? (
          <Vazio titulo="Você ainda não abriu nenhuma solicitação.">Use o botão Nova solicitação para pedir um serviço.</Vazio>
        ) : (
          <table className="tabela min-w-[600px]">
            <thead>
              <tr><th>Número</th><th>Serviço</th><th>Aberta em</th><th>Prazo</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {ordens.map((o) => {
                const avaliar = o.status === "concluida" && !o.avaliacao;
                return (
                  <tr key={o.id_ordem}>
                    <td className="whitespace-nowrap">{o.numero}</td>
                    <td>{o.servico.nome}</td>
                    <td>{dataBR(o.data_abertura)}</td>
                    <td>{dataBR(o.prazo)}</td>
                    <td><ChipStatus status={o.status} /></td>
                    <td className="acoes">
                      <Link href={`/minhas-solicitacoes/${o.id_ordem}`} className={`${avaliar ? "botao-principal" : "botao"} botao-pequeno`}>
                        {avaliar ? "Avaliar" : o.avaliacao ? "Ver avaliação" : "Acompanhar"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} base="/minhas-solicitacoes" params={params} />
    </div>
  );
}
