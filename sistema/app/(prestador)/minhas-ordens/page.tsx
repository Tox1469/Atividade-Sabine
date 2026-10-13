import Link from "next/link";
import { Aviso, Chip, ChipStatus, Paginacao, paginaAtual, Titulo, Vazio } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { emAtraso } from "@/lib/dominio/ordem";
import { dataBR, diasEntre, hoje, plural } from "@/lib/formato";
import { exigirPrestador } from "@/lib/permissao";

export const metadata = { title: "Minhas ordens" };

const POR_PAGINA = 20;

// T13 - minhas ordens (RF14). o filtro por prestador sai da sessao, nunca da tela (RNF02)
export default async function MinhasOrdens({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { prestador } = await exigirPrestador();
  const params = await searchParams;
  const pagina = paginaAtual(params.pagina);
  const dia = hoje();
  const inicioMes = new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), 1));
  const minhas = { id_prestador: prestador.id_prestador };

  const [atribuidas, emExecucao, concluidasMes, total, ativas, encerradas] = await Promise.all([
    prisma.ordem_servico.count({ where: { ...minhas, status: "atribuida" } }),
    prisma.ordem_servico.findMany({ where: { ...minhas, status: "em_execucao" }, orderBy: { prazo: "asc" }, select: { prazo: true } }),
    prisma.ordem_servico.findMany({ where: { ...minhas, status: "concluida", data_conclusao: { gte: inicioMes } }, select: { entregue_no_prazo: true } }),
    prisma.ordem_servico.count({ where: { ...minhas, status: { in: ["concluida", "cancelada"] } } }),
    // as que pedem acao vem primeiro, sempre inteiras. as encerradas paginam abaixo delas
    prisma.ordem_servico.findMany({ where: { ...minhas, status: { in: ["em_execucao", "atribuida"] } }, include: { cliente: true, servico: true }, orderBy: [{ status: "desc" }, { prazo: "asc" }] }),
    prisma.ordem_servico.findMany({
      where: { ...minhas, status: { in: ["concluida", "cancelada"] } },
      include: { cliente: true, servico: true },
      orderBy: { id_ordem: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);
  const ordens = [...(pagina === 1 ? ativas : []), ...encerradas];
  const atrasadasMes = concluidasMes.filter((o) => !o.entregue_no_prazo).length;

  return (
    <div className="w-full">
      <Titulo
        titulo="Minhas ordens"
        subtitulo={[
          atribuidas === 0 ? "Nenhuma esperando início" : plural(atribuidas, "esperando início", "esperando início"),
          emExecucao.length === 0 ? "nenhuma em execução" : `${plural(emExecucao.length, "em execução", "em execução")}, prazo mais próximo em ${plural(Math.max(0, diasEntre(dia, emExecucao[0].prazo)), "dia", "dias")}`,
          concluidasMes.length === 0 ? "nenhuma concluída no mês" : `${plural(concluidasMes.length, "concluída", "concluídas")} no mês, ${atrasadasMes === 0 ? "todas no prazo" : plural(atrasadasMes, "com atraso", "com atraso")}`,
        ].join(", ") + "."}
      />

      {prestador.situacao === "pendente" && (
        <Aviso tom="atencao" titulo="Seu cadastro está pendente, por isso você não recebe ordens novas.">
          Envie ou renove os documentos obrigatórios em <Link href="/meus-documentos" className="underline">Meus documentos</Link>. Depois da conferência o
          administrador libera você (RN01 e RN02).
        </Aviso>
      )}
      {prestador.situacao === "bloqueado" && (
        <Aviso tom="erro" titulo="Seu cadastro está bloqueado pelo administrador.">As ordens que já estavam com você continuam aqui. Para saber o motivo, fale com a administração.</Aviso>
      )}

      <div className="cartao overflow-x-auto">
        <h2 className="cartao-titulo">Ordens atribuídas a mim</h2>
        {ordens.length === 0 ? (
          <Vazio titulo="Nenhuma ordem atribuída a você ainda.">Quando o administrador atribuir uma ordem, ela aparece aqui.</Vazio>
        ) : (
          <table className="tabela min-w-[640px]">
            <thead>
              <tr><th>Número</th><th>Cliente</th><th>Serviço</th><th>Prazo</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {ordens.map((o) => (
                <tr key={o.id_ordem}>
                  <td className="whitespace-nowrap">{o.numero}</td>
                  <td>{o.cliente.nome_fantasia ?? o.cliente.nome_razao_social}</td>
                  <td>{o.servico.nome}</td>
                  <td className="whitespace-nowrap">{dataBR(o.prazo)}</td>
                  <td className="whitespace-nowrap">
                    <ChipStatus status={o.status} /> {emAtraso(o.status, o.prazo, dia) && <Chip tom="atraso">Atrasada</Chip>}
                  </td>
                  <td className="acoes">
                    <Link href={`/minhas-ordens/${o.id_ordem}`} className={`${o.status === "em_execucao" || o.status === "atribuida" ? "botao-principal" : "botao"} botao-pequeno`}>
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} base="/minhas-ordens" params={params} />
    </div>
  );
}
