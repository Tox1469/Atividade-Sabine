import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Aviso, Chip, Paginacao, paginaAtual, Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { dinheiro, plural } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";

const POR_PAGINA = 20;

type Busca = { busca?: string; categoria?: string; pagina?: string; ok?: string };

// T08 - catalogo de servicos (UC06, TA26)
export default async function Servicos({ searchParams }: { searchParams: Promise<Busca> }) {
  await exigirPerfil("administrador");
  const params = await searchParams;
  const busca = (params.busca ?? "").trim();
  const categoria = Number(params.categoria) || 0;
  const pagina = paginaAtual(params.pagina);

  const filtro: Prisma.servicoWhereInput = {};
  if (busca) filtro.nome = { contains: busca, mode: "insensitive" };
  if (categoria) filtro.id_categoria = categoria;

  const [total, servicos, categorias] = await Promise.all([
    prisma.servico.count({ where: filtro }),
    prisma.servico.findMany({
      where: filtro,
      include: { categoria: true },
      orderBy: [{ categoria: { nome: "asc" } }, { nome: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.categoria_servico.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Titulo titulo="Serviços" subtitulo="Catálogo com valor de referência e prazo padrão">
        <Link href="/servicos/novo" className="botao-principal">Novo serviço</Link>
      </Titulo>
      {params.ok && <Aviso tom="ok" titulo={params.ok === "novo" ? "Serviço cadastrado." : "Alterações salvas."} />}

      <form className="cartao mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="busca" className="rotulo">Buscar</label>
          <input id="busca" name="busca" defaultValue={busca} placeholder="Nome do serviço" className="campo" />
        </div>
        <div className="w-44">
          <label htmlFor="categoria" className="rotulo">Categoria</label>
          <select id="categoria" name="categoria" defaultValue={categoria || ""} className="campo">
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
            ))}
          </select>
        </div>
        <button className="botao">Filtrar</button>
      </form>

      <div className="cartao overflow-x-auto">
        <p className="cartao-titulo">{plural(total, "serviço no catálogo", "serviços no catálogo")}</p>
        {servicos.length === 0 ? (
          <p className="px-4 py-6 text-sm text-tinta2">Nenhum serviço com esse filtro.</p>
        ) : (
          <table className="tabela min-w-[680px]">
            <thead>
              <tr><th>Serviço</th><th>Categoria</th><th className="numerico">Valor de referência</th><th className="numerico">Prazo padrão</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr key={s.id_servico}>
                  <td>{s.nome}</td>
                  <td>{s.categoria.nome}</td>
                  <td className="numerico">{s.valor_referencia === null ? "-" : dinheiro(s.valor_referencia)}</td>
                  <td className="numerico">{plural(s.prazo_padrao_dias, "dia", "dias")}</td>
                  <td>{s.ativo ? <Chip tom="ativo">Ativo</Chip> : <Chip tom="inativo">Inativo</Chip>}</td>
                  <td className="acoes"><Link href={`/servicos/${s.id_servico}`} className="botao botao-pequeno">Abrir</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} base="/servicos" params={params} />
    </div>
  );
}
