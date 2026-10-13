import { Chip, Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { exigirPerfil } from "@/lib/permissao";
import { BotaoEditarCategoria, NovaCategoria } from "./formulario";

export const metadata = { title: "Categorias" };

// T07 - categorias (UC05, TA25). sao poucas, entao a lista nao pagina
export default async function Categorias() {
  await exigirPerfil("administrador");

  const categorias = await prisma.categoria_servico.findMany({
    include: { _count: { select: { servicos: { where: { ativo: true } }, prestadores: { where: { ativa: true } } } } },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="w-full">
      <Titulo titulo="Categorias" subtitulo="Classificam os serviços do catálogo e a habilitação dos prestadores" />

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
                  <td className="acoes">
                    <BotaoEditarCategoria id={c.id_categoria} nome={c.nome} inicial={{ nome: c.nome, descricao: c.descricao ?? "", ativa: c.ativa ? "sim" : "nao" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <NovaCategoria />
      </div>
    </div>
  );
}
