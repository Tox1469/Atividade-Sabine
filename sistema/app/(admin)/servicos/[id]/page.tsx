import { notFound } from "next/navigation";
import { Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { exigirPerfil } from "@/lib/permissao";
import { FormServico } from "../formulario";

export const metadata = { title: "Ficha do serviço" };

// T09 - ficha do servico
export default async function FichaServico({ params }: { params: Promise<{ id: string }> }) {
  await exigirPerfil("administrador");
  const servico = await prisma.servico.findUnique({ where: { id_servico: Number((await params).id) || 0 } });
  if (!servico) notFound();
  // a categoria atual entra na lista mesmo se estiver inativa, pra nao sumir do select
  const categorias = await prisma.categoria_servico.findMany({
    where: { OR: [{ ativa: true }, { id_categoria: servico.id_categoria }] },
    orderBy: { nome: "asc" },
  });

  const inicial = {
    nome: servico.nome,
    id_categoria: String(servico.id_categoria),
    descricao: servico.descricao ?? "",
    valor_referencia: servico.valor_referencia === null ? "" : Number(servico.valor_referencia).toFixed(2).replace(".", ","),
    prazo_padrao_dias: String(servico.prazo_padrao_dias),
    ativo: servico.ativo ? "sim" : "nao",
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Titulo voltar={["/servicos", "serviços"]} titulo={servico.nome} subtitulo="Ficha do serviço" />
      <FormServico id={servico.id_servico} inicial={inicial} categorias={categorias.map((c) => ({ id: c.id_categoria, nome: c.nome }))} />
    </div>
  );
}
