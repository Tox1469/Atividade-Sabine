import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

// telas abertas sem login: o proprio login e o cadastro
const PUBLICAS = ["/login", "/cadastro"];

// quem nao esta logado so ve as telas publicas. passar pelo middleware tambem renova
// o prazo da sessao (RNF03). a checagem de perfil e feita de novo no servidor de cada tela e action
export default auth((req) => {
  const logado = !!req.auth;
  const publica = PUBLICAS.some((p) => req.nextUrl.pathname.startsWith(p));

  if (!logado && !publica) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
  if (logado && publica) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api/auth|api/rotinas|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
