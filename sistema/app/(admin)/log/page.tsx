import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Paginacao, paginaAtual, Titulo, Vazio } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { dataHoraBR, plural } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";

const POR_PAGINA = 30;
const ACOES: Record<string, string> = {
  alteracao_situacao: "Alteração de situação",
  atribuicao: "Atribuição de ordem",
  cancelamento: "Cancelamento de ordem",
  anonimizacao: "Anonimização (LGPD)",
};
const LINK: Record<string, string> = { prestador: "/prestadores/", cliente: "/clientes/", ordem_servico: "/ordens/" };

// RF19 / UC23 - log das acoes criticas. so leitura: nenhuma tela altera ou apaga registro
export default async function Log({ searchParams }: { searchParams: Promise<{ acao?: string; pagina?: string }> }) {
  await exigirPerfil("administrador");
  const params = await searchParams;
  const acao = params.acao && ACOES[params.acao] ? params.acao : "";
  const pagina = paginaAtual(params.pagina);
  const filtro: Prisma.log_acaoWhereInput = acao ? { acao } : {};

  const [total, registros] = await Promise.all([
    prisma.log_acao.count({ where: filtro }),
    prisma.log_acao.findMany({ where: filtro, include: { usuario: true }, orderBy: { registrado_em: "desc" }, skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Titulo titulo="Log de ações" subtitulo="Mudança de situação cadastral, atribuição e cancelamento de ordem, com usuário, data e hora (RF19)" />

      <form className="cartao mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="w-60">
          <label htmlFor="acao" className="rotulo">Ação</label>
          <select id="acao" name="acao" defaultValue={acao} className="campo">
            <option value="">Todas</option>
            {Object.entries(ACOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button className="botao">Filtrar</button>
      </form>

      <div className="cartao overflow-x-auto">
        <p className="cartao-titulo">{plural(total, "registro", "registros")}</p>
        {registros.length === 0 ? (
          <Vazio titulo="Nenhum registro ainda." />
        ) : (
          <table className="tabela min-w-[760px]">
            <thead>
              <tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Detalhe</th><th></th></tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id_log}>
                  <td className="whitespace-nowrap">{dataHoraBR(r.registrado_em)}</td>
                  <td>{r.usuario.nome}</td>
                  <td className="whitespace-nowrap">{ACOES[r.acao] ?? r.acao}</td>
                  <td>{r.detalhe}</td>
                  <td className="acoes">{LINK[r.entidade] && <Link href={`${LINK[r.entidade]}${r.entidade_id}`} className="botao botao-pequeno">Abrir</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} base="/log" params={params} />
    </div>
  );
}
