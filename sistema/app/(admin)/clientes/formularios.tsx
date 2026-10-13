"use client";

import { BotaoEnviar, MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { FormularioPessoa } from "@/app/_componentes/formulario-pessoa";
import { alternarAtivo, anonimizar, liberarAcessoCliente, salvarCliente } from "./actions";

export function FormCliente({ id, inicial }: { id: number | null; inicial?: Record<string, string> }) {
  return (
    <FormularioPessoa
      acao={salvarCliente.bind(null, id)}
      inicial={inicial}
      voltar="/clientes"
      ajudaEmail="Usado também para liberar o acesso do cliente ao sistema."
      ajudaDocumento="Não pode existir outro cadastro ativo com o mesmo número (RN10)."
    />
  );
}

export function FormAtivo({ id, ativo }: { id: number; ativo: boolean }) {
  const { estado, enviar, enviando } = useFormulario(alternarAtivo.bind(null, id));
  return (
    <form action={enviar} className="space-y-3">
      <MensagemFormulario estado={estado} />
      {ativo && (
        <label className="marcador text-sm">
          <input type="checkbox" name="confirmo" value="sim" /> Confirmo a inativação. O cadastro não é apagado e pode ser reativado.
        </label>
      )}
      <BotaoEnviar enviando={enviando} texto={ativo ? "Inativar cliente" : "Reativar cliente"} perigo={ativo} />
    </form>
  );
}

export function BotaoLiberarAcesso({ id }: { id: number }) {
  const { estado, enviar, enviando } = useFormulario(liberarAcessoCliente.bind(null, id));
  return (
    <form action={enviar}>
      <MensagemFormulario estado={estado} />
      {!estado.ok && <BotaoEnviar enviando={enviando} texto="Liberar acesso" enviandoTexto="Liberando..." />}
    </form>
  );
}

export function FormAnonimizar({ id }: { id: number }) {
  const { estado, enviar, enviando } = useFormulario(anonimizar.bind(null, id));
  return (
    <form action={enviar} className="space-y-3">
      <MensagemFormulario estado={estado} />
      {!estado.ok && (
        <>
          <label className="marcador text-sm">
            <input type="checkbox" name="confirmo" value="sim" /> Confirmo que o titular pediu a remoção dos dados pessoais. Não tem volta.
          </label>
          <BotaoEnviar enviando={enviando} texto="Anonimizar dados" perigo />
        </>
      )}
    </form>
  );
}
