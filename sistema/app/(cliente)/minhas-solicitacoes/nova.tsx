"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { avisar } from "@/app/_componentes/aviso-flutuante";
import { FormularioOrdem } from "@/app/_componentes/formulario-ordem";
import { Janela } from "@/app/_componentes/janela";
import { abrirSolicitacao } from "./actions";

type Props = Pick<Parameters<typeof FormularioOrdem>[0], "categorias" | "prazoMinimo" | "localPadrao">;

// T17 - nova solicitacao, por cima da lista do cliente (UC12)
export function BotaoNovaSolicitacao({ categorias, prazoMinimo, localPadrao }: Props) {
  const [aberta, setAberta] = useState(false);
  const router = useRouter();
  const fechar = () => setAberta(false);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className="botao-principal">Nova solicitação</button>
      {aberta && (
        <Janela titulo="Nova solicitação" aoFechar={fechar} largura={880}>
          <FormularioOrdem
            emJanela
            acao={abrirSolicitacao}
            categorias={categorias}
            prazoMinimo={prazoMinimo}
            localPadrao={localPadrao}
            voltar=""
            aoCancelar={fechar}
            aoConcluir={(ok) => {
              fechar();
              avisar(ok);
              router.refresh();
            }}
          />
        </Janela>
      )}
    </>
  );
}
