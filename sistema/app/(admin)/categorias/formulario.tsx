"use client";

import Link from "next/link";
import { BotaoEnviar, Campo, CampoTexto, MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { salvarCategoria } from "./actions";

export function FormCategoria({ id, inicial }: { id: number | null; inicial: Record<string, string> }) {
  const { estado, enviar, enviando, valor, erro } = useFormulario(salvarCategoria.bind(null, id), inicial);
  const ativa = estado.valores ? estado.valores.ativa === "sim" : inicial.ativa !== "nao";

  return (
    <form action={enviar} className="cartao" style={{ flex: "0 1 340px" }} noValidate>
      <h2 className="cartao-titulo">{id === null ? "Nova categoria" : "Editar categoria"}</h2>
      <div className="space-y-3 p-4">
        <MensagemFormulario estado={estado} />
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
        {id !== null && <Link href="/categorias" className="botao">Cancelar</Link>}
        <BotaoEnviar enviando={enviando} texto={id === null ? "Adicionar" : "Salvar"} />
      </div>
    </form>
  );
}
