"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { feriados } from "@/lib/apis-publicas";
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
  emJanela?: boolean; // dentro da janela do administrador, sem a moldura de cartao
};

// T17 - nova solicitacao. o servico depende da categoria escolhida
export function FormularioOrdem({ acao, categorias, voltar, prazoMinimo, localPadrao = "", clientes, clienteInicial = "", emJanela }: Props) {
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

  // UC12 A3.1: sem prazo informado, mostra ja a data calculada pelo prazo padrao do servico.
  // e avisa se a data cai em fim de semana ou feriado nacional (api de feriados da brasilapi)
  const [prazo, setPrazo] = useState(valor("prazo"));
  const [listaFeriados, setListaFeriados] = useState<Map<string, string>>(new Map());
  const hojeBR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const calculado = escolhido ? new Date(Date.parse(hojeBR + "T00:00:00Z") + escolhido.prazo * 86400000).toISOString().slice(0, 10) : "";
  const alvo = prazo || calculado;
  const ano = Number(alvo.slice(0, 4));
  useEffect(() => {
    if (!ano) return;
    let vivo = true;
    feriados(ano).then((m) => vivo && setListaFeriados(m));
    return () => {
      vivo = false;
    };
  }, [ano]);
  const br = (iso: string) => iso.split("-").reverse().join("/");
  const diaSemana = alvo ? new Date(alvo + "T12:00:00Z").getUTCDay() : -1;
  const alertaData = !alvo
    ? ""
    : listaFeriados.get(alvo)
      ? `${br(alvo)} é feriado nacional (${listaFeriados.get(alvo)}). Confirme se o prestador atende nesse dia.`
      : diaSemana === 0 || diaSemana === 6
        ? `${br(alvo)} cai num ${diaSemana === 0 ? "domingo" : "sábado"}.`
        : "";

  return (
    <form onSubmit={enviar} className={emJanela ? "" : "cartao"} noValidate>
      {!emJanela && <h2 className="cartao-titulo">O que você precisa</h2>}
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
          <div>
            <label htmlFor="prazo" className="rotulo">Prazo desejado</label>
            <input
              id="prazo"
              name="prazo"
              type="date"
              min={prazoMinimo}
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              aria-invalid={!!erro("prazo")}
              className={`campo ${erro("prazo") ? "campo-erro" : ""}`}
            />
            {erro("prazo") && <p className="msg-erro">{erro("prazo")}</p>}
            <p className="ajuda">
              {prazo || !calculado
                ? "Se ficar em branco, o sistema aplica o prazo padrão do serviço."
                : `Em branco vale o prazo padrão do serviço: ${br(calculado)}.`}
            </p>
            {alertaData && <p className="mt-1 text-xs font-semibold text-ocre">{alertaData}</p>}
          </div>
          <Campo key={cliente} nome="local_atendimento" rotulo="Local do atendimento" valor={valor("local_atendimento") || local} erro={erro("local_atendimento")} />
        </div>
      </div>
      <div className="rodape-form">
        <Link href={voltar} className="botao">Cancelar</Link>
        <BotaoEnviar enviando={enviando} texto={emJanela ? "Abrir ordem" : "Enviar solicitação"} enviandoTexto="Enviando..." />
      </div>
    </form>
  );
}
