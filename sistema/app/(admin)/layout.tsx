import { Casca } from "@/app/_componentes/casca";
import { exigirPerfil } from "@/lib/permissao";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const usuario = await exigirPerfil("administrador");
  return <Casca perfil="administrador" nome={usuario.name}>{children}</Casca>;
}
