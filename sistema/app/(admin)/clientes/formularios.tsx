"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { avisar } from "@/app/_componentes/aviso-flutuante";
import { Janela } from "@/app/_componentes/janela";
import { useConcluir } from "../ordens/formularios";
import { BotaoEnviar, MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { FormularioPessoa } from "@/app/_componentes/formulario-pessoa";
import { alternarAtivo, anonimizar, liberarAcessoCliente, salvarCliente } from "./actions";

// edicao na ficha (T06): salva, avisa e continua na ficha
export function FormCliente({ id, inicial }: { id: number; inicial?: Record<string, string> }) {
  const router = useRouter();
  return (
    <FormularioPessoa
      acao={salvarCliente.bind(null, id)}
      inicial={inicial}
      voltar="/clientes"
      ajudaEmail="Usado também para liberar o acesso do cliente ao sistema."
      ajudaDocumento="Não pode existir outro cadastro ativo com o mesmo número (RN10)."
      aoConcluir={(ok) => {
        avisar(ok);
        router.refresh();
      }}
    />
  );
}

// T06 novo: abre por cima da lista de clientes
export function BotaoNovoCliente() {
  const [aberta, setAberta] = useState(false);
  const fechar = () => setAberta(false);
  const concluir = useConcluir(fechar);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className="botao-principal">Novo cliente</button>
      {aberta && (
        <Janela titulo="Novo cliente" aoFechar={fechar} largura={1000}>
          <div className="bg-papel p-4 sm:p-5">
            <FormularioPessoa
              acao={salvarCliente.bind(null, null)}
              ajudaEmail="Usado também para liberar o acesso do cliente ao sistema."
              ajudaDocumento="Não pode existir outro cadastro ativo com o mesmo número (RN10)."
              textoBotao="Cadastrar cliente"
              aoConcluir={concluir}
              aoCancelar={fechar}
            />
          </div>
        </Janela>
      )}
    </>
  );
}

export function FormAtivo({ id, ativo }: { id: number; ativo: boolean }) {
  const { estado, enviar, enviando } = useFormulario(alternarAtivo.bind(null, id));
  return (
    <form onSubmit={enviar} className="space-y-3">
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
    <form onSubmit={enviar}>
      <MensagemFormulario estado={estado} />
      {!estado.ok && <BotaoEnviar enviando={enviando} texto="Liberar acesso" enviandoTexto="Liberando..." />}
    </form>
  );
}

export function FormAnonimizar({ id }: { id: number }) {
  const { estado, enviar, enviando } = useFormulario(anonimizar.bind(null, id), {}, undefined, avisar);
  return (
    <form onSubmit={enviar} className="space-y-3">
      <MensagemFormulario estado={estado} />
      {!estado.ok && (
        <>
          <label className="marcador text-sm">
            <input type="checkbox" name="confirmo" value="sim" /> Confirmo que o titular pediu a remoção dos dados pessoais. Não tem volta.
          </label>
          <BotaoEnviar enviando={enviando} texto="Anonimizar dados" perigo confirmar="Anonimizar os dados pessoais deste cliente? Não tem volta." />
        </>
      )}
    </form>
  );
}
