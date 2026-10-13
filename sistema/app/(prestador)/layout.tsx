import { Casca } from "@/app/_componentes/casca";
import { exigirPrestador } from "@/lib/permissao";

export default async function LayoutPrestador({ children }: { children: React.ReactNode }) {
  const { prestador } = await exigirPrestador();
  return <Casca perfil="prestador" nome={prestador.nome_fantasia ?? prestador.nome_razao_social}>{children}</Casca>;
}
