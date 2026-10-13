"use client";

import Link from "next/link";
import { useState } from "react";
import { dinheiro, plural } from "@/lib/formato";
import type { EstadoFormulario } from "@/lib/formulario";
import { BotaoEnviar, Campo, CampoTexto, MensagemFormulario, Selecao, useFormulario } from "./campos";

type Categoria = { id: number; nome: string; servicos: { id: number; nome: string; valor: string | null; prazo: number }[] };

type Props = {
  acao: (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  categorias: Categoria[];
  voltar: string;
  prazoMinimo: string;
  localPadrao?: string;
  clientes?: { id: number; nome: string; local: string }[]; // so na abertura pelo administrador (UC12 A1.1)
  clienteInicial?: string;
};

// T17 - nova solicitacao. o servico depende da categoria escolhida
export function FormularioOrdem({ acao, categorias, voltar, prazoMinimo, localPadrao = "", clientes, clienteInicial = "" }: Props) {
  const { estado, enviar, enviando, valor, erro } = useFormulario(acao);
  const servicoInicial = valor("id_servico");
  const [categoria, setCategoria] = useState(
    String(categorias.find((c) => c.servicos.some((s) => String(s.id) === servicoInicial))?.id ?? categorias[0]?.id ?? ""),
  );
  const [servico, setServico] = useState(servicoInicial);
  const [cliente, setCliente] = useState(valor("id_cliente") || clienteInicial);

  const daCategoria = categorias.find((c) => String(c.id) === categoria)?.servicos ?? [];
  const escolhido = daCategoria.find((s) => String(s.id) === servico);
  const local = clientes?.find((c) => String(c.id) === cliente)?.local ?? localPadrao;

  return (
    <form action={enviar} className="cartao" noValidate>
      <h2 className="cartao-titulo">O que você precisa</h2>
      <div className="space-y-3 p-4">
        <MensagemFormulario estado={estado} />
        {clientes && (
          <Selecao
            nome="id_cliente"
            rotulo="Cliente"
            obrigatorio
            valor={cliente}
            onChange={setCliente}
            vazio="Escolha o cliente"
            erro={erro("id_cliente")}
            opcoes={clientes.map((c) => ({ valor: String(c.id), texto: c.nome }))}
            ajuda="Para quando a solicitação chega por telefone ou e-mail."
          />
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Selecao
            nome="categoria"
            rotulo="Categoria"
            obrigatorio
            valor={categoria}
            onChange={(v) => {
              setCategoria(v);
              setServico("");
            }}
            opcoes={categorias.map((c) => ({ valor: String(c.id), texto: c.nome }))}
          />
          <Selecao
            key={categoria}
            nome="id_servico"
            rotulo="Serviço"
            obrigatorio
            valor={servico}
            onChange={setServico}
            vazio="Escolha o serviço"
            erro={erro("id_servico")}
            opcoes={daCategoria.map((s) => ({ valor: String(s.id), texto: s.nome }))}
            ajuda={
              escolhido
                ? `${escolhido.valor ? `Valor de referência ${dinheiro(escolhido.valor)}, ` : ""}prazo padrão de ${plural(escolhido.prazo, "dia", "dias")}.`
                : undefined
            }
          />
          <Selecao
            nome="prioridade"
            rotulo="Prioridade"
            valor={valor("prioridade") || "normal"}
            erro={erro("prioridade")}
            opcoes={[
              { valor: "normal", texto: "Normal" },
              { valor: "baixa", texto: "Baixa" },
              { valor: "alta", texto: "Alta" },
              { valor: "urgente", texto: "Urgente" },
            ]}
          />
        </div>

        <CampoTexto
          nome="descricao"
          rotulo="Descrição do problema"
          obrigatorio
          valor={valor("descricao")}
          erro={erro("descricao")}
          linhas={4}
          ajuda="Quanto mais claro o pedido, menor a chance de o prestador chegar sem o material certo."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            nome="prazo"
            rotulo="Prazo desejado"
            type="date"
            min={prazoMinimo}
            valor={valor("prazo")}
            erro={erro("prazo")}
            ajuda="Se ficar em branco, o sistema aplica o prazo padrão do serviço e mostra a data calculada."
          />
          <Campo key={cliente} nome="local_atendimento" rotulo="Local do atendimento" valor={valor("local_atendimento") || local} erro={erro("local_atendimento")} />
        </div>
      </div>
      <div className="rodape-form">
        <Link href={voltar} className="botao">Cancelar</Link>
        <BotaoEnviar enviando={enviando} texto="Enviar solicitação" enviandoTexto="Enviando..." />
      </div>
    </form>
  );
}
