"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { avisar } from "@/app/_componentes/aviso-flutuante";
import { BotaoEnviar, Campo, CampoTexto, MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { Janela } from "@/app/_componentes/janela";
import { salvarCategoria } from "./actions";

// T07 - os mesmos campos servem pra nova categoria (cartao ao lado da lista) e pra editar (janela)
function CamposCategoria({ id, inicial, aoConcluir, aoCancelar }: { id: number | null; inicial: Record<string, string>; aoConcluir: (ok: string) => void; aoCancelar?: () => void }) {
  const { estado, enviar, enviando, valor, erro } = useFormulario(salvarCategoria.bind(null, id), inicial, undefined, aoConcluir);
  const ativa = estado.valores ? estado.valores.ativa === "sim" : inicial.ativa !== "nao";
  return (
    <form onSubmit={enviar} noValidate>
      <div className="space-y-3 p-5">
        <MensagemFormulario estado={estado.ok ? {} : estado} />
        <Campo nome="nome" rotulo="Nome" obrigatorio valor={valor("nome")} erro={erro("nome")} placeholder="Ex.: Jardinagem" ajuda="O nome não pode se repetir." />
        <CampoTexto nome="descricao" rotulo="Descrição" valor={valor("descricao")} erro={erro("descricao")} placeholder="O que essa categoria abrange" />
        <div>
          <label className="marcador text-sm">
            <input type="checkbox" name="ativa" value="sim" defaultChecked={ativa} /> Categoria ativa
          </label>
          {erro("ativa") && <p className="msg-erro">{erro("ativa")}</p>}
        </div>
      </div>
      <div className="rodape-form">
        {aoCancelar && <button type="button" onClick={aoCancelar} className="botao">Cancelar</button>}
        <BotaoEnviar enviando={enviando} texto={id === null ? "Adicionar" : "Salvar"} />
      </div>
    </form>
  );
}

export function NovaCategoria() {
  const router = useRouter();
  return (
    <section className="cartao" style={{ flex: "0 1 360px" }}>
      <h2 className="cartao-titulo">Nova categoria</h2>
      <CamposCategoria
        id={null}
        inicial={{}}
        aoConcluir={(ok) => {
          avisar(ok);
          router.refresh();
        }}
      />
    </section>
  );
}

export function BotaoEditarCategoria({ id, inicial, nome }: { id: number; inicial: Record<string, string>; nome: string }) {
  const [aberta, setAberta] = useState(false);
  const router = useRouter();
  const fechar = () => setAberta(false);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className="botao botao-pequeno">Editar</button>
      {aberta && (
        <Janela titulo={`Editar ${nome}`} aoFechar={fechar} largura={520}>
          <CamposCategoria
            id={id}
            inicial={inicial}
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
