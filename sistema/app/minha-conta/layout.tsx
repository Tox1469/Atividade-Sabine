import { Casca } from "@/app/_componentes/casca";
import type { Perfil } from "@/lib/permissao";
import { usuarioLogado } from "@/lib/permissao";

// a mesma tela pros tres perfis, cada um com o seu menu
export default async function LayoutConta({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioLogado();
  return <Casca perfil={usuario.perfil as Perfil} nome={usuario.name}>{children}</Casca>;
}
