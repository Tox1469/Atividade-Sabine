import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

// quem nao esta logado so ve a tela de login. passar pelo middleware tambem renova
// o prazo da sessao (RNF03). a checagem de perfil e feita de novo no servidor de cada tela e action
export default auth((req) => {
  const logado = !!req.auth;
  const naTelaDeLogin = req.nextUrl.pathname.startsWith("/login");

  if (!logado && !naTelaDeLogin) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
  if (logado && naTelaDeLogin) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api/auth|api/rotinas|_next/static|_next/image|favicon.ico).*)"],
};
