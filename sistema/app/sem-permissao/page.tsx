import Link from "next/link";
import { signOut } from "@/auth";

export const metadata = { title: "Acesso não liberado" };

export default function SemPermissao() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="cartao max-w-md p-6">
        <h1 className="mb-2 text-lg font-semibold">Acesso não liberado</h1>
        <p className="mb-4 text-sm text-tinta2">
          Seu perfil não tem permissão para esta área, ou o seu login ainda não foi ligado a um cadastro de prestador ou de cliente. Fale com o administrador.
        </p>
        <div className="flex gap-2">
          <Link href="/" className="botao">Ir para o início</Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="botao">Sair</button>
          </form>
        </div>
      </div>
    </main>
  );
}
