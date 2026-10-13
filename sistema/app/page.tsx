import { redirect } from "next/navigation";
import { usuarioLogado } from "@/lib/permissao";

// cada perfil cai na sua tela inicial
const INICIO: Record<string, string> = {
  administrador: "/painel",
  prestador: "/minhas-ordens",
  cliente: "/minhas-solicitacoes",
};

export default async function Inicio() {
  const usuario = await usuarioLogado();
  redirect(INICIO[usuario.perfil] ?? "/sem-permissao");
}
