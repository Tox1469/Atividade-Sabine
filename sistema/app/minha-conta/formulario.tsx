"use client";

import { BotaoEnviar, Campo, MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { trocarSenha } from "./actions";

export function FormSenha() {
  const { estado, enviar, enviando, erro } = useFormulario(trocarSenha);
  return (
    <form onSubmit={enviar} className="cartao" noValidate>
      <h2 className="cartao-titulo">Trocar senha</h2>
      <div className="space-y-3 p-4">
        <MensagemFormulario estado={estado} />
        <Campo nome="atual" rotulo="Senha atual" type="password" obrigatorio valor="" erro={erro("atual")} />
        <Campo nome="nova" rotulo="Senha nova" type="password" obrigatorio valor="" erro={erro("nova")} ajuda="Pelo menos 8 caracteres." />
        <Campo nome="confirmacao" rotulo="Repita a senha nova" type="password" obrigatorio valor="" erro={erro("confirmacao")} />
      </div>
      <div className="rodape-form">
        <BotaoEnviar enviando={enviando} texto="Trocar senha" />
      </div>
    </form>
  );
}
