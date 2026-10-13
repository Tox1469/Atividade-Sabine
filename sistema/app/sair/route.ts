import { signOut } from "@/auth";

// destino de quem tem cookie de sessao mas a conta foi desativada ou mudou de perfil.
// tela nenhuma consegue apagar o cookie, so rota e action. sem apagar, o middleware
// mandaria do /login de volta pro inicio e o inicio de volta pro /login, sem fim
export async function GET() {
  await signOut({ redirectTo: "/login" });
}
