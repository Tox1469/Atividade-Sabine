import { FormularioOrdem } from "@/app/_componentes/formulario-ordem";
import { Janela } from "@/app/_componentes/janela";
import { prisma } from "@/lib/db";
import { catalogoAtivo, enderecoDe } from "@/lib/ordens";
import { prazoMinimo } from "@/lib/validacao/ordem";
import { abrirPeloAdmin } from "./actions";

// UC12 A1.1 - o administrador abre em nome do cliente, quando o pedido chega por telefone
export async function JanelaNovaOrdem({ fechar, cliente }: { fechar: string; cliente?: string }) {
  const [categorias, clientes] = await Promise.all([
    catalogoAtivo(),
    prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome_razao_social: "asc" } }),
  ]);
  return (
    <Janela titulo="Abrir ordem de serviço" fechar={fechar}>
      <FormularioOrdem
        emJanela
        acao={abrirPeloAdmin}
        categorias={categorias}
        voltar={fechar}
        prazoMinimo={prazoMinimo()}
        clienteInicial={cliente ?? ""}
        clientes={clientes.map((c) => ({ id: c.id_cliente, nome: c.nome_fantasia ? `${c.nome_fantasia} (${c.nome_razao_social})` : c.nome_razao_social, local: enderecoDe(c) }))}
      />
    </Janela>
  );
}
