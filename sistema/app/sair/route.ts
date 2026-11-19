import { signOut } from "@/auth";

// destino de quem tem cookie de sessao mas a conta foi desativada ou mudou de perfil.
// tela nenhuma consegue apagar o cookie, so rota e action. sem apagar, o middleware
// mandaria do /login de volta pro inicio e o inicio de volta pro /login, sem fim
// a query segue pro login: ?como=<conta de demonstracao>&ir=<tela> troca de conta direto (apresentacao)
export async function GET(req: Request) {
  await signOut({ redirectTo: "/login" + new URL(req.url).search });
}
