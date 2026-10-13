"use client";

import Link from "next/link";
import { BotaoEnviar, CampoTexto, MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { atribuirOrdem, cancelarOrdem } from "./actions";

type Apto = { id: number; nome: string; detalhe: string; nota: string; emAndamento: number; ultimo: string };

// T12b - janela de atribuicao. um formulario so, cada linha tem o proprio botao
export function FormAtribuir({ idOrdem, aptos, troca, children }: { idOrdem: number; aptos: Apto[]; troca: boolean; children: React.ReactNode }) {
  const { estado, enviar, enviando, valor } = useFormulario(atribuirOrdem.bind(null, idOrdem));
  return (
    <form action={enviar}>
      <div className="modal-corpo">
        <MensagemFormulario estado={estado} />
        {children}
        {troca && (
          <CampoTexto
            nome="motivo"
            rotulo="Motivo da troca"
            obrigatorio
            valor={valor("motivo")}
            ajuda="Mínimo de 10 caracteres. As duas atribuições ficam no histórico da ordem."
            className="mb-3"
          />
        )}
        {aptos.length === 0 ? (
          <p className="aviso atencao">
            <strong>Nenhum prestador apto para esta ordem.</strong>
            Habilite um prestador na categoria ou regularize a documentação de quem está pendente (UC13 A3.1).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela min-w-[600px]">
              <thead>
                <tr><th>Prestador</th><th className="numerico">Nota média</th><th className="numerico">Em andamento</th><th>Último atendimento</th><th></th></tr>
              </thead>
              <tbody>
                {aptos.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.nome}
                      <span className="secundario">{a.detalhe}</span>
                    </td>
                    <td className="numerico">{a.nota}</td>
                    <td className="numerico">{a.emAndamento}</td>
                    <td>{a.ultimo}</td>
                    <td className="acoes">
                      <button type="submit" name="id_prestador" value={a.id} disabled={enviando} className="botao-principal botao-pequeno">
                        {troca ? "Passar para ele" : "Atribuir"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </form>
  );
}

export function FormCancelar({ idOrdem, voltar }: { idOrdem: number; voltar: string }) {
  const { estado, enviar, enviando, valor, erro } = useFormulario(cancelarOrdem.bind(null, idOrdem));
  return (
    <form action={enviar} noValidate>
      <div className="modal-corpo">
        <p className="aviso atencao">
          <strong>O cancelamento não apaga a ordem.</strong>
          Ela continua no histórico com o motivo registrado, e o evento vai para o log de auditoria (RF19).
        </p>
        <MensagemFormulario estado={estado} />
        <CampoTexto
          nome="motivo"
          rotulo="Motivo do cancelamento"
          obrigatorio
          valor={valor("motivo")}
          erro={erro("motivo")}
          ajuda="Regra RN07. Ordens já concluídas não podem ser canceladas (RN06)."
        />
      </div>
      <div className="rodape-form">
        <Link href={voltar} className="botao">Voltar</Link>
        <BotaoEnviar enviando={enviando} texto="Confirmar cancelamento" enviandoTexto="Cancelando..." perigo />
      </div>
    </form>
  );
}
