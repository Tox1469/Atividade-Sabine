import { FormularioOrdem } from "@/app/_componentes/formulario-ordem";
import { Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { catalogoAtivo, enderecoDe } from "@/lib/ordens";
import { exigirPerfil } from "@/lib/permissao";
import { prazoMinimo } from "@/lib/validacao/ordem";
import { abrirPeloAdmin } from "../actions";

// UC12 A1.1 - abertura pelo administrador, quando o pedido chega por telefone
export default async function NovaOrdem({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  await exigirPerfil("administrador");
  const { cliente } = await searchParams;
  const [categorias, clientes] = await Promise.all([
    catalogoAtivo(),
    prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome_razao_social: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <Titulo titulo="Abrir ordem de serviço" subtitulo="Em nome de um cliente ativo" />
      <FormularioOrdem
        acao={abrirPeloAdmin}
        categorias={categorias}
        voltar="/ordens"
        prazoMinimo={prazoMinimo()}
        clienteInicial={cliente ?? ""}
        clientes={clientes.map((c) => ({ id: c.id_cliente, nome: c.nome_fantasia ? `${c.nome_fantasia} (${c.nome_razao_social})` : c.nome_razao_social, local: enderecoDe(c) }))}
      />
    </div>
  );
}
