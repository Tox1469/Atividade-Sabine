"use client";

import { useState } from "react";
import { BotaoEnviar, Campo, CampoTexto, MensagemFormulario, Selecao, useFormulario } from "@/app/_componentes/campos";
import { Janela } from "@/app/_componentes/janela";
import { useConcluir } from "../ordens/formularios";
import { salvarServico } from "./actions";

type Categoria = { id: number; nome: string; ativa: boolean };

// T09 - ficha do servico, aberta em janela por cima do catalogo (T08)
export function BotaoServico({ id = null, inicial, categorias, titulo, texto, classe }: { id?: number | null; inicial?: Record<string, string>; categorias: Categoria[]; titulo: string; texto: string; classe: string }) {
  const [aberta, setAberta] = useState(false);
  const fechar = () => setAberta(false);
  const concluir = useConcluir(fechar);
  // categoria inativa so aparece se ja for a do servico
  const opcoes = categorias.filter((c) => c.ativa || String(c.id) === inicial?.id_categoria);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className={classe}>{texto}</button>
      {aberta && (
        <Janela titulo={titulo} aoFechar={fechar}>
          <FormServico id={id} inicial={inicial} categorias={opcoes} aoConcluir={concluir} aoCancelar={fechar} />
        </Janela>
      )}
    </>
  );
}

type Props = { id: number | null; inicial?: Record<string, string>; categorias: { id: number; nome: string }[]; aoConcluir: (ok: string) => void; aoCancelar: () => void };

function FormServico({ id, inicial = {}, categorias, aoConcluir, aoCancelar }: Props) {
  const { estado, enviar, enviando, valor, erro } = useFormulario(salvarServico.bind(null, id), inicial, undefined, aoConcluir);
  const ativo = estado.valores ? estado.valores.ativo === "sim" : inicial.ativo !== "nao";

  return (
    <form onSubmit={enviar} noValidate>
      <div className="space-y-3 p-4">
        <MensagemFormulario estado={estado} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo nome="nome" rotulo="Nome" obrigatorio valor={valor("nome")} erro={erro("nome")} className="sm:col-span-2" />
          <Selecao
            nome="id_categoria"
            rotulo="Categoria"
            obrigatorio
            valor={valor("id_categoria")}
            vazio="Escolha"
            erro={erro("id_categoria")}
            opcoes={categorias.map((c) => ({ valor: String(c.id), texto: c.nome }))}
          />
        </div>
        <CampoTexto nome="descricao" rotulo="Descrição" valor={valor("descricao")} erro={erro("descricao")} linhas={4} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo nome="valor_referencia" rotulo="Valor de referência" valor={valor("valor_referencia")} erro={erro("valor_referencia")} placeholder="187,50" ajuda="Serve de base para o orçamento, não é o valor cobrado." />
          <Campo nome="prazo_padrao_dias" rotulo="Prazo padrão (dias)" obrigatorio type="number" min="1" valor={valor("prazo_padrao_dias")} erro={erro("prazo_padrao_dias")} ajuda="Aplicado quando o cliente não informa prazo na solicitação." />
          <div>
            <p className="rotulo">Situação</p>
            <label className="marcador mt-2 text-sm">
              <input type="checkbox" name="ativo" value="sim" defaultChecked={ativo} /> Serviço ativo
            </label>
            {erro("ativo") && <p className="msg-erro">{erro("ativo")}</p>}
          </div>
        </div>
      </div>
      <div className="rodape-form">
        <button type="button" onClick={aoCancelar} className="botao">Cancelar</button>
        <BotaoEnviar enviando={enviando} texto="Salvar" />
      </div>
    </form>
  );
}
