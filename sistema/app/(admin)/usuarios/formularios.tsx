"use client";

import { BotaoEnviar, Campo, MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { acaoUsuario, criarAdministrador } from "./actions";

export function FormAdministrador() {
  const { estado, enviar, enviando, valor, erro } = useFormulario(criarAdministrador);
  return (
    <form onSubmit={enviar} className="cartao" style={{ flex: "0 1 340px" }} noValidate>
      <h2 className="cartao-titulo">Novo administrador</h2>
      <div className="space-y-3 p-4">
        <MensagemFormulario estado={estado} />
        <Campo nome="nome" rotulo="Nome" obrigatorio valor={estado.ok ? "" : valor("nome")} erro={erro("nome")} />
        <Campo nome="email" rotulo="E-mail" type="email" obrigatorio valor={estado.ok ? "" : valor("email")} erro={erro("email")} ajuda="A senha provisória aparece uma vez, depois de criar." />
      </div>
      <div className="rodape-form">
        <BotaoEnviar enviando={enviando} texto="Criar administrador" />
      </div>
    </form>
  );
}

export function AcoesUsuario({ id, ativo, proprio }: { id: number; ativo: boolean; proprio: boolean }) {
  const { estado, enviar, enviando } = useFormulario(acaoUsuario.bind(null, id));
  return (
    <form onSubmit={enviar} className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1">
        <button type="submit" name="acao" value="senha" disabled={enviando} className="botao botao-pequeno">Gerar senha provisória</button>
        {!proprio && (
          <button
            type="submit"
            name="acao"
            value="ativo"
            disabled={enviando}
            onClick={(e) => {
              if (ativo && !confirm("Desativar este acesso? A pessoa não vai conseguir entrar até ser reativada.")) e.preventDefault();
            }}
            className={`${ativo ? "botao-perigo" : "botao"} botao-pequeno`}
          >
            {ativo ? "Desativar" : "Reativar"}
          </button>
        )}
      </div>
      {(estado.ok || estado.mensagem) && (
        <p className={`max-w-xs text-right text-xs font-semibold ${estado.ok ? "text-verde" : "text-carimbo"}`} role="status">
          {estado.ok ?? estado.mensagem}
        </p>
      )}
    </form>
  );
}
