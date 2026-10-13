import { Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { exigirPerfil } from "@/lib/permissao";
import { FormServico } from "../formulario";

export const metadata = { title: "Novo serviço" };

// T09 - novo servico
export default async function NovoServico() {
  await exigirPerfil("administrador");
  const categorias = await prisma.categoria_servico.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } });
  return (
    <div className="mx-auto max-w-4xl">
      <Titulo voltar={["/servicos", "serviços"]} titulo="Novo serviço" subtitulo="Entra no catálogo que o cliente usa para abrir a solicitação" />
      <FormServico id={null} categorias={categorias.map((c) => ({ id: c.id_categoria, nome: c.nome }))} />
    </div>
  );
}
