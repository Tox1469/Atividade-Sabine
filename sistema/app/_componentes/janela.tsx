"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// janela por cima da tela, pra acao rapida nao tirar a pessoa da lista em que estava.
// abre e fecha pelo endereco (?janela=...), entao o voltar do navegador tambem fecha
// e o link pode ser copiado. fecha com esc, clicando fora ou no botao fechar
export function Janela({ titulo, fechar, largura = 760, children }: { titulo: string; fechar: string; largura?: number; children: React.ReactNode }) {
  const router = useRouter();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && router.replace(fechar, { scroll: false });
    document.addEventListener("keydown", aoTeclar);
    // a tela de baixo nao rola enquanto a janela esta aberta
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    caixa.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button")?.focus();
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = antes;
    };
  }, [fechar, router]);

  return (
    <div
      className="modal-fundo"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-janela"
      onMouseDown={(e) => e.target === e.currentTarget && router.replace(fechar, { scroll: false })}
    >
      <div ref={caixa} className="modal" style={{ maxWidth: largura }}>
        <div className="flex items-center justify-between border-b border-regua bg-[#f2f4f6] px-4 py-2.5">
          <h2 id="titulo-janela" className="text-[15px] font-semibold">{titulo}</h2>
          <button type="button" onClick={() => router.replace(fechar, { scroll: false })} className="cursor-pointer px-1 text-xl leading-none text-tinta2 hover:text-tinta" aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
