import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="cartao max-w-md p-6">
        <p className="text-sm font-semibold text-caneta">Erro 404</p>
        <h1 className="mb-2 text-lg font-semibold">Página não encontrada</h1>
        <p className="mb-4 text-sm text-tinta2">
          O endereço não existe ou o registro não está disponível para o seu perfil. Ordem, documento e cadastro de outra pessoa aparecem assim de propósito (RNF02).
        </p>
        <Link href="/" className="botao">Ir para o início</Link>
      </div>
    </main>
  );
}
