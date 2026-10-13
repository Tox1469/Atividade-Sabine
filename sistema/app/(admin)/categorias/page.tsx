import Link from "next/link";
import { Aviso, Chip, Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { exigirPerfil } from "@/lib/permissao";
import { FormCategoria } from "./formulario";

export const metadata = { title: "Categorias" };

// T07 - categorias (UC05, TA25). sao poucas, entao a lista nao pagina
export default async function Categorias({ searchParams }: { searchParams: Promise<{ editar?: string; ok?: string }> }) {
  await exigirPerfil("administrador");
  const params = await searchParams;

  const categorias = await prisma.categoria_servico.findMany({
    include: { _count: { select: { servicos: { where: { ativo: true } }, prestadores: { where: { ativa: true } } } } },
    orderBy: { nome: "asc" },
  });
  const editando = categorias.find((c) => c.id_categoria === Number(params.editar));

  return (
    <div className="mx-auto max-w-6xl">
      <Titulo titulo="Categorias" subtitulo="Classificam os serviços do catálogo e a habilitação dos prestadores" />
      {params.ok && <Aviso tom="ok" titulo={params.ok === "nova" ? "Categoria adicionada." : "Categoria salva."} />}

      <div className="colunas">
        <div className="cartao overflow-x-auto">
          <h2 className="cartao-titulo">Categorias cadastradas</h2>
          <table className="tabela min-w-[480px]">
            <thead>
              <tr><th>Categoria</th><th className="numerico">Serviços</th><th className="numerico">Prestadores</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id_categoria}>
                  <td>
                    {c.nome}
                    {c.descricao && <span className="secundario">{c.descricao}</span>}
                  </td>
                  <td className="numerico">{c._count.servicos}</td>
                  <td className="numerico">{c._count.prestadores}</td>
                  <td>{c.ativa ? <Chip tom="ativo">Ativa</Chip> : <Chip tom="inativo">Inativa</Chip>}</td>
                  <td className="acoes"><Link href={`/categorias?editar=${c.id_categoria}`} className="botao botao-pequeno">Editar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <FormCategoria
          key={editando?.id_categoria ?? "nova"}
          id={editando?.id_categoria ?? null}
          inicial={editando ? { nome: editando.nome, descricao: editando.descricao ?? "", ativa: editando.ativa ? "sim" : "nao" } : {}}
        />
      </div>
    </div>
  );
}
