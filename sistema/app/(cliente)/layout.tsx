import { Casca } from "@/app/_componentes/casca";
import { exigirCliente } from "@/lib/permissao";

export default async function LayoutCliente({ children }: { children: React.ReactNode }) {
  const { cliente } = await exigirCliente();
  return <Casca perfil="cliente" nome={cliente.nome_fantasia ?? cliente.nome_razao_social}>{children}</Casca>;
}
