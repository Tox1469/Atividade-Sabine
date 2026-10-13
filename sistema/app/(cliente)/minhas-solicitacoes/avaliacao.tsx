"use client";

import { BotaoEnviar, CampoTexto, MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { avaliarAtendimento } from "./actions";

// T18 - nota de 1 a 5 (botoes de radio com cara de botao) e comentario opcional
export function FormAvaliacao({ idOrdem }: { idOrdem: number }) {
  const { estado, enviar, enviando, valor } = useFormulario(avaliarAtendimento.bind(null, idOrdem));
  return (
    <form action={enviar} className="cartao" style={{ flex: "0 1 400px" }}>
      <h2 className="cartao-titulo">Avaliar o atendimento</h2>
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
