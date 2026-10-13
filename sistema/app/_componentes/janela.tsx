"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// janela por cima da tela, pra acao rapida nao tirar a pessoa de onde ela estava.
// abre na hora, sem trocar de pagina nem ir no servidor. fecha no esc, no clique fora e no x
export function Janela({ titulo, aoFechar, largura = 760, children }: { titulo: string; aoFechar: () => void; largura?: number; children: React.ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && fechar.current();
    document.addEventListener("keydown", aoTeclar);
    // a tela de baixo nao rola enquanto a janela esta aberta
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const foco = document.activeElement as HTMLElement | null;
    caixa.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea")?.focus();
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = antes;
      foco?.focus(); // devolve o foco pro botao que abriu
    };
  }, []);

  // desenhada direto no body: dentro de uma celula de tabela ela herdaria alinhamento e quebra de linha
  return createPortal(
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div ref={caixa} className="modal" style={{ maxWidth: largura }}>
        <div className="flex items-center justify-between gap-4 border-b border-regua-clara px-5 py-4">
          <h2 className="text-[17px] font-semibold">{titulo}</h2>
          <button type="button" onClick={aoFechar} className="-mr-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-xl leading-none text-tinta2 transition-colors hover:bg-[#f2f4f3] hover:text-tinta" aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
