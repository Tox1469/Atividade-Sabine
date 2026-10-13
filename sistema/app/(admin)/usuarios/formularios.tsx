"use client";

import { useState } from "react";
import { BotaoEnviar, Campo, MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { Janela } from "@/app/_componentes/janela";
import { acaoUsuario, criarAdministrador } from "./actions";

// abre por cima da lista. depois de criar a janela continua aberta: a senha provisoria
// aparece uma vez so e tem que ficar na tela ate ser anotada
export function BotaoNovoAdministrador() {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className="botao-principal">Novo administrador</button>
      {aberta && (
        <Janela titulo="Novo administrador" aoFechar={() => setAberta(false)} largura={480}>
          <FormAdministrador />
        </Janela>
      )}
    </>
  );
}

function FormAdministrador() {
  const { estado, enviar, enviando, valor, erro } = useFormulario(criarAdministrador);
  return (
    <form onSubmit={enviar} noValidate>
      <div className="space-y-3 p-5">
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

export function AcoesUsuario({ id, ativo, desativavel }: { id: number; ativo: boolean; desativavel: boolean }) {
  const { estado, enviar, enviando } = useFormulario(acaoUsuario.bind(null, id));
  return (
    <form onSubmit={enviar} className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1">
        <button type="submit" name="acao" value="senha" disabled={enviando} className="botao botao-pequeno">Gerar senha provisória</button>
        {desativavel && (
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
        <p className={`max-w-xs text-right text-xs font-semibold whitespace-normal ${estado.ok ? "text-verde" : "text-carimbo"}`} role="status">
          {estado.ok ?? estado.mensagem}
        </p>
      )}
    </form>
  );
}
