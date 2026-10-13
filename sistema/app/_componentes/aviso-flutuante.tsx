"use client";

import { useEffect, useState } from "react";

// aviso que aparece no canto depois de uma acao feita numa janela (RNF05: mensagem de retorno).
// qualquer componente chama avisar("...") e o aviso some sozinho depois de uns segundos
const EVENTO = "sgp:aviso";

export function avisar(texto: string) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: texto }));
}

export function AvisosFlutuantes() {
  const [avisos, setAvisos] = useState<{ id: number; texto: string }[]>([]);

  useEffect(() => {
    const novo = (e: Event) => {
      const id = Date.now() + Math.random();
      setAvisos((a) => [...a, { id, texto: (e as CustomEvent<string>).detail }]);
      setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 5000);
    };
    window.addEventListener(EVENTO, novo);
    return () => window.removeEventListener(EVENTO, novo);
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-30 flex max-w-sm flex-col gap-2" role="status" aria-live="polite">
      {avisos.map((a) => (
        <div key={a.id} className="aviso-flutuante pointer-events-auto rounded-lg bg-tinta px-4 py-3 text-sm text-white shadow-[0_6px_20px_rgba(20,30,28,.25)]">
          {a.texto}
        </div>
      ))}
    </div>
  );
}
