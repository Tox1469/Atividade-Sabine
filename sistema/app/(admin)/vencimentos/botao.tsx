"use client";

import { MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { rodarRotina } from "./actions";

export function BotaoRotina() {
  const { estado, enviar, enviando } = useFormulario(rodarRotina);
  return (
    <form onSubmit={enviar} className="flex flex-col items-end gap-2">
      <MensagemFormulario estado={estado} />
      <button type="submit" disabled={enviando} className="botao">
        {enviando ? "Verificando..." : "Aplicar RN02 agora"}
      </button>
    </form>
  );
}
