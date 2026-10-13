import { Aviso } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { dataBR } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";
import { FormCategorias } from "../../formularios";

export const metadata = { title: "Categorias do prestador" };

// T04b - habilitacao por categoria (UC07, TA27)
export default async function CategoriasPrestador({ params }: { params: Promise<{ id: string }> }) {
  await exigirPerfil("administrador");
  const id = Number((await params).id);

  const [categorias, habilitacoes, concluidas] = await Promise.all([
    prisma.categoria_servico.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
    prisma.prestador_categoria.findMany({ where: { id_prestador: id, ativa: true }, include: { categoria: true }, orderBy: { categoria: { nome: "asc" } } }),
    prisma.ordem_servico.findMany({ where: { id_prestador: id, status: "concluida" }, select: { servico: { select: { id_categoria: true } } } }),
  ]);
  const marcadas = new Set(habilitacoes.map((h) => h.id_categoria));

  return (
    <>
      <Aviso titulo="O prestador só aparece na atribuição das categorias marcadas aqui.">
        É o que a regra RN04 exige: a ordem de serviço só pode ir para quem está habilitado na categoria do serviço.
      </Aviso>

      <FormCategorias id={id} categorias={categorias.map((c) => ({ id: c.id_categoria, nome: c.nome, marcada: marcadas.has(c.id_categoria) }))} />

      <div className="cartao overflow-x-auto">
        <h2 className="cartao-titulo">Habilitações registradas</h2>
        {habilitacoes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-tinta2">Nenhuma categoria marcada ainda.</p>
        ) : (
          <table className="tabela">
            <thead>
              <tr><th>Categoria</th><th>Habilitado em</th><th className="numerico">Ordens concluídas</th></tr>
            </thead>
            <tbody>
              {habilitacoes.map((h) => (
                <tr key={h.id_categoria}>
                  <td>{h.categoria.nome}</td>
                  <td>{dataBR(h.habilitado_em)}</td>
                  <td className="numerico">{concluidas.filter((o) => o.servico.id_categoria === h.id_categoria).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
