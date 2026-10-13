"use client";

import Link from "next/link";
import { BotaoEnviar, CampoTexto, MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { acaoPrestador } from "./actions";

// cada acao da T14 e um formulario pequeno com o campo "acao" escondido
function useAcao(idOrdem: number) {
  return useFormulario(acaoPrestador.bind(null, idOrdem));
}

export function FormResposta({ idOrdem }: { idOrdem: number }) {
  const aceite = useAcao(idOrdem);
  const recusa = useAcao(idOrdem);
  return (
    <div className="colunas">
      <form action={aceite.enviar} className="cartao">
        <h2 className="cartao-titulo">Aceitar a ordem</h2>
        <div className="p-4 text-sm">
          <MensagemFormulario estado={aceite.estado} />
          <p className="text-tinta2">Ao aceitar, a ordem fica com você. A execução começa quando você chegar no local e clicar em iniciar.</p>
        </div>
        <input type="hidden" name="acao" value="aceitar" />
        <div className="rodape-form">
          <BotaoEnviar enviando={aceite.enviando} texto="Aceitar ordem" enviandoTexto="Aceitando..." />
        </div>
      </form>
      <form action={recusa.enviar} className="cartao" noValidate>
        <h2 className="cartao-titulo">Recusar</h2>
        <div className="p-4">
          <MensagemFormulario estado={recusa.estado} />
          <CampoTexto
            nome="texto"
            rotulo="Motivo da recusa"
            obrigatorio
            valor={recusa.valor("texto")}
            erro={recusa.erro("texto")}
            ajuda="Mínimo de 10 caracteres. A ordem volta para o administrador e não é oferecida de novo para você."
          />
        </div>
        <input type="hidden" name="acao" value="recusar" />
        <div className="rodape-form">
          <BotaoEnviar enviando={recusa.enviando} texto="Recusar ordem" enviandoTexto="Recusando..." perigo />
        </div>
      </form>
    </div>
  );
}

export function FormIniciar({ idOrdem }: { idOrdem: number }) {
  const { estado, enviar, enviando } = useAcao(idOrdem);
  return (
    <form action={enviar} className="cartao mb-4">
      <h2 className="cartao-titulo">Iniciar a execução</h2>
      <div className="p-4 text-sm">
        <MensagemFormulario estado={estado} />
        <p className="text-tinta2">Você aceitou esta ordem. Inicie quando começar o serviço: o cliente passa a ver a ordem como em execução.</p>
      </div>
      <input type="hidden" name="acao" value="iniciar" />
      <div className="rodape-form">
        <BotaoEnviar enviando={enviando} texto="Iniciar execução" enviandoTexto="Iniciando..." />
      </div>
    </form>
  );
}

export function FormAndamento({ idOrdem }: { idOrdem: number }) {
  const { estado, enviar, enviando, valor, erro } = useAcao(idOrdem);
  return (
    <form action={enviar} className="cartao" style={{ flex: "0 1 400px" }} noValidate>
      <h2 className="cartao-titulo">Registrar andamento</h2>
      <div className="p-4">
        <MensagemFormulario estado={estado} />
        <CampoTexto nome="texto" rotulo="Observação" valor={estado.ok ? "" : valor("texto")} erro={erro("texto")} placeholder="O que foi feito até agora" ajuda="O cliente e o administrador enxergam esse registro." />
      </div>
      <input type="hidden" name="acao" value="andamento" />
      <div className="rodape-form">
        <button type="submit" disabled={enviando} className="botao">{enviando ? "Salvando..." : "Salvar andamento"}</button>
      </div>
    </form>
  );
}

export function FormConcluir({ idOrdem }: { idOrdem: number }) {
  const { estado, enviar, enviando, valor, erro } = useAcao(idOrdem);
  return (
    <form action={enviar} className="cartao mt-4" noValidate>
      <h2 className="cartao-titulo">Concluir o serviço</h2>
      <div className="p-4">
        <MensagemFormulario estado={estado} />
        <CampoTexto
          nome="texto"
          rotulo="Relato do que foi executado"
          obrigatorio
          valor={valor("texto")}
          erro={erro("texto")}
          linhas={4}
          placeholder="Descreva o que foi executado"
          ajuda="Depois de concluída, a ordem não pode mais ser alterada (RN06). A correção exige cancelamento com justificativa e abertura de uma nova ordem."
        />
      </div>
      <input type="hidden" name="acao" value="concluir" />
      <div className="rodape-form">
        <Link href="/minhas-ordens" className="botao">Voltar</Link>
        <BotaoEnviar enviando={enviando} texto="Concluir ordem" enviandoTexto="Concluindo..." />
      </div>
    </form>
  );
}
