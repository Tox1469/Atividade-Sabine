"use client";

import Link from "next/link";

// qualquer erro nao previsto cai aqui, sem mostrar detalhe tecnico pra quem esta usando
export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="cartao max-w-md p-6">
        <h1 className="mb-2 text-lg font-semibold">Algo deu errado</h1>
        <p className="mb-4 text-sm text-tinta2">
          A operação não foi concluída e nada foi gravado pela metade. Tente de novo. Se continuar, avise o administrador com o horário em que aconteceu.
        </p>
        <div className="flex gap-2">
          <button onClick={reset} className="botao-principal">Tentar de novo</button>
          <Link href="/" className="botao">Ir para o início</Link>
        </div>
      </div>
    </main>
  );
}
