"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { avisar } from "@/app/_componentes/aviso-flutuante";
import { BotaoEnviar, CampoTexto, MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { Janela } from "@/app/_componentes/janela";
import { avaliarAtendimento } from "./actions";

// T18 - nota de 1 a 5 (botoes de radio com cara de botao) e comentario opcional
export function FormAvaliacao({ idOrdem, aoConcluir }: { idOrdem: number; aoConcluir?: (ok: string) => void }) {
  const emJanela = !!aoConcluir;
  const { estado, enviar, enviando, valor } = useFormulario(avaliarAtendimento.bind(null, idOrdem), {}, undefined, aoConcluir);
  return (
    <form onSubmit={enviar} className={emJanela ? "" : "cartao"} style={emJanela ? undefined : { flex: "0 1 400px" }}>
      {!emJanela && <h2 className="cartao-titulo">Avaliar o atendimento</h2>}
      <div className="space-y-3 p-4">
        <MensagemFormulario estado={estado} />
        <fieldset>
          <legend className="rotulo">
            Nota <span className="text-carimbo">*</span>
          </legend>
          <div className="notas-avaliacao">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="nota-opcao">
                <input type="radio" name="nota" value={n} required aria-label={`Nota ${n}`} />
                <span>{n}</span>
              </label>
            ))}
          </div>
          <p className="ajuda">1 para muito ruim, 5 para muito bom.</p>
        </fieldset>
        <CampoTexto nome="comentario" rotulo="Comentário" valor={valor("comentario")} placeholder="Conte como foi o atendimento (opcional)" />
      </div>
      <div className="rodape-form">
        <BotaoEnviar enviando={enviando} texto="Enviar avaliação" enviandoTexto="Enviando..." />
      </div>
    </form>
  );
}

// T16: avaliar direto da lista, numa janela por cima dela
export function BotaoAvaliar({ idOrdem, numero, detalhe }: { idOrdem: number; numero: string; detalhe: string }) {
  const [aberta, setAberta] = useState(false);
  const router = useRouter();
  const concluir = (ok: string) => {
    setAberta(false);
    avisar(ok);
    router.refresh();
  };
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className="botao-principal botao-pequeno">Avaliar</button>
      {aberta && (
        <Janela titulo={`Avaliar o atendimento da ${numero}`} aoFechar={() => setAberta(false)} largura={460}>
          <p className="px-4 pt-4 text-sm text-tinta2">{detalhe}</p>
          <FormAvaliacao idOrdem={idOrdem} aoConcluir={concluir} />
        </Janela>
      )}
    </>
  );
}
