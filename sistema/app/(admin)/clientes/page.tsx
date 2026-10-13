import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Aviso, Chip, Paginacao, paginaAtual, Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { formatarCpfCnpj, soDigitos } from "@/lib/dominio/cpf-cnpj";
import { EM_ABERTO } from "@/lib/dominio/ordem";
import { exigirPerfil } from "@/lib/permissao";

const POR_PAGINA = 20;

type Busca = { busca?: string; situacao?: string; pagina?: string; ok?: string };

// T05 - clientes (UC04, TA24)
export default async function Clientes({ searchParams }: { searchParams: Promise<Busca> }) {
  await exigirPerfil("administrador");
  const params = await searchParams;
  const busca = (params.busca ?? "").trim();
  const situacao = ["ativos", "inativos", "todos"].includes(params.situacao ?? "") ? params.situacao! : "ativos";
  const pagina = paginaAtual(params.pagina);

  const filtro: Prisma.clienteWhereInput = {};
  if (situacao !== "todos") filtro.ativo = situacao === "ativos";
  if (busca) {
    const digitos = soDigitos(busca);
    filtro.OR = [
      { nome_razao_social: { contains: busca, mode: "insensitive" } },
      { nome_fantasia: { contains: busca, mode: "insensitive" } },
      ...(digitos.length >= 3 ? [{ cpf_cnpj: { contains: digitos } }] : []),
    ];
  }

  const [total, clientes] = await Promise.all([
    prisma.cliente.count({ where: filtro }),
    prisma.cliente.findMany({
      where: filtro,
      include: { _count: { select: { ordens: { where: { status: { in: EM_ABERTO } } } } } },
      orderBy: { nome_razao_social: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Titulo titulo="Clientes" subtitulo="Empresas e pessoas atendidas pela rede">
        <Link href="/clientes/novo" className="botao-principal">Novo cliente</Link>
      </Titulo>

      {params.ok && <Aviso tom="ok" titulo={params.ok === "novo" ? "Cliente cadastrado." : "Alterações salvas."} />}

      <form className="cartao mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="busca" className="rotulo">Buscar</label>
          <input id="busca" name="busca" defaultValue={busca} placeholder="Nome, razão social, CPF ou CNPJ" className="campo" />
        </div>
        <div className="w-40">
          <label htmlFor="situacao" className="rotulo">Situação</label>
          <select id="situacao" name="situacao" defaultValue={situacao} className="campo">
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <button className="botao">Filtrar</button>
      </form>

      <div className="cartao overflow-x-auto">
        <p className="cartao-titulo">{total === 1 ? "1 cliente encontrado" : `${total} clientes encontrados`}</p>
        {clientes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-tinta2">Nenhum cliente com esse filtro.</p>
        ) : (
          <table className="tabela min-w-[720px]">
            <thead>
              <tr><th>Cliente</th><th>CPF / CNPJ</th><th>Cidade</th><th className="numerico">Ordens abertas</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id_cliente}>
                  <td>
                    {c.nome_razao_social}
                    <span className="secundario">{[c.nome_fantasia, c.email].filter(Boolean).join(", ") || c.telefone}</span>
                  </td>
                  <td className="whitespace-nowrap tabular-nums">{formatarCpfCnpj(c.cpf_cnpj)}</td>
                  <td>{c.cidade} / {c.uf}</td>
                  <td className="numerico">{c._count.ordens}</td>
                  <td>{c.ativo ? <Chip tom="ativo">Ativo</Chip> : <Chip tom="inativo">Inativo</Chip>}</td>
                  <td className="acoes"><Link href={`/clientes/${c.id_cliente}`} className="botao botao-pequeno">Abrir</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} base="/clientes" params={params} />
    </div>
  );
}
