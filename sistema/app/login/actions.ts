"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";

type Estado = { erro: string | null; email: string };

export async function entrar(_estado: Estado, form: FormData): Promise<Estado> {
  // o react limpa o formulario depois da action, entao o email volta junto
  // pra pessoa nao ter que digitar de novo (defeito D01)
  const email = String(form.get("email") ?? "");
  try {
    await signIn("credentials", {
      email,
      senha: form.get("senha"),
      redirectTo: "/",
    });
    return { erro: null, email };
  } catch (erro) {
    if (erro instanceof CredentialsSignin && erro.code === "bloqueado") {
      return { erro: "Muitas tentativas erradas para este e-mail. Tente de novo em 15 minutos.", email };
    }
    if (erro instanceof AuthError) {
      // mesma mensagem pra email e senha, sem dizer qual dos dois errou (UC01)
      return { erro: "E-mail ou senha inválidos.", email };
    }
    // o redirect do next tambem chega aqui como erro e precisa seguir adiante
    throw erro;
  }
}
