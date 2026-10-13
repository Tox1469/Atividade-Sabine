"use client";

import Link from "next/link";
import { useState } from "react";
import { BotaoEnviar, Campo, CampoArquivo, CampoTexto, MensagemFormulario, Selecao, useFormulario } from "@/app/_componentes/campos";
import { FormularioPessoa } from "@/app/_componentes/formulario-pessoa";
import {
  alterarSituacao,
  anonimizar,
  enviarDocumento,
  liberarAcessoPrestador,
  prepararEnvio,
  salvarCategorias,
  salvarContrato,
  salvarPrestador,
} from "./actions";

export function FormPrestador({ id, inicial }: { id: number | null; inicial?: Record<string, string> }) {
  return (
    <FormularioPessoa
      acao={salvarPrestador.bind(null, id)}
      inicial={inicial}
      voltar="/prestadores"
      ajudaEmail="Usado também para liberar o acesso do prestador ao sistema."
    />
  );
}

export function FormCategorias({ id, categorias }: { id: number; categorias: { id: number; nome: string; marcada: boolean }[] }) {
  const { estado, enviar, enviando } = useFormulario(salvarCategorias.bind(null, id));
  return (
    <form onSubmit={enviar} className="cartao mb-4">
      <h2 className="cartao-titulo">Categorias em que atua</h2>
      <div className="p-4">
        <MensagemFormulario estado={estado} />
        <div className="marcadores">
          {categorias.map((c) => (
            <label key={c.id} className="marcador">
              <input type="checkbox" name="categoria" value={c.id} defaultChecked={c.marcada} /> {c.nome}
            </label>
          ))}
        </div>
      </div>
      <div className="rodape-form">
        <Link href="/prestadores" className="botao">Cancelar</Link>
        <BotaoEnviar enviando={enviando} texto="Salvar habilitações" />
      </div>
    </form>
  );
}

type Tipo = { id: number; nome: string; exige_validade: boolean };

// T04c e T15 usam o mesmo formulario, so muda a action e quem prepara o envio
export function FormDocumento({
  tipos,
  acao,
  preparar,
}: {
  tipos: Tipo[];
  acao: Parameters<typeof useFormulario>[0];
  preparar: Parameters<typeof useFormulario>[2];
}) {
  const { estado, enviar, enviando, valor, erro } = useFormulario(acao, {}, preparar);
  const [tipo, setTipo] = useState(valor("id_tipo_documento"));
  const exige = tipos.find((t) => String(t.id) === tipo)?.exige_validade ?? true;

  return (
    <form onSubmit={enviar} className="cartao" noValidate>
      <h2 className="cartao-titulo">Enviar documento</h2>
      <div className="space-y-3 p-4">
        <MensagemFormulario estado={estado} />
        <Selecao
          nome="id_tipo_documento"
          rotulo="Tipo"
          obrigatorio
          valor={tipo}
          onChange={setTipo}
          vazio="Escolha o tipo"
          erro={erro("id_tipo_documento")}
          opcoes={tipos.map((t) => ({ valor: String(t.id), texto: t.nome }))}
          ajuda="Se já existe um documento desse tipo, o novo substitui e o anterior fica no histórico."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nome="data_emissao" rotulo="Data de emissão" type="date" obrigatorio valor={valor("data_emissao")} erro={erro("data_emissao")} />
          <Campo
            nome="data_validade"
            rotulo="Validade"
            type="date"
            obrigatorio={exige}
            disabled={!exige}
            valor={exige ? valor("data_validade") : ""}
            erro={erro("data_validade")}
            ajuda={exige ? undefined : "Este tipo não expira."}
          />
        </div>
        <CampoArquivo rotulo="Arquivo" obrigatorio erro={erro("arquivo")} ajuda="PDF, JPG ou PNG, com até 10 MB." />
      </div>
      <div className="rodape-form">
        <BotaoEnviar enviando={enviando} texto="Enviar" enviandoTexto="Enviando..." />
      </div>
    </form>
  );
}

export function FormDocumentoAdmin({ id, tipos }: { id: number; tipos: Tipo[] }) {
  return <FormDocumento tipos={tipos} acao={enviarDocumento.bind(null, id)} preparar={prepararEnvio.bind(null, id, "documentos")} />;
}

export function FormSituacao({ id, atual, voltar }: { id: number; atual: string; voltar?: string }) {
  const { estado, enviar, enviando, valor, erro } = useFormulario(alterarSituacao.bind(null, id));
  const opcoes = ["ativo", "pendente", "bloqueado", "inativo"].filter((s) => s !== atual);
  return (
    <form onSubmit={enviar} className={voltar ? "" : "cartao"} noValidate>
      {voltar ? <input type="hidden" name="voltar" value={voltar} /> : <h2 className="cartao-titulo">Alterar situação cadastral</h2>}
      <div className="space-y-3 p-4">
        <MensagemFormulario estado={estado} />
        <Selecao
          nome="situacao"
          rotulo="Nova situação"
          obrigatorio
          valor={valor("situacao")}
          vazio="Escolha"
          erro={erro("situacao")}
          opcoes={opcoes.map((s) => ({ valor: s, texto: s[0].toUpperCase() + s.slice(1) }))}
        />
        <CampoTexto
          nome="motivo"
          rotulo="Motivo"
          obrigatorio
          valor={valor("motivo")}
          erro={erro("motivo")}
          placeholder="Descreva o motivo da alteração"
          ajuda="Mínimo de 10 caracteres. O motivo fica registrado no histórico e no log (RF19)."
        />
      </div>
      <div className="rodape-form">
        <Link href={voltar ?? "/prestadores"} scroll={false} className="botao">Cancelar</Link>
        <BotaoEnviar enviando={enviando} texto="Gravar alteração" />
      </div>
    </form>
  );
}

export function FormContrato({ id }: { id: number }) {
  const { estado, enviar, enviando, valor, erro } = useFormulario(salvarContrato.bind(null, id), {}, prepararEnvio.bind(null, id, "contratos"));
  return (
    <form onSubmit={enviar} className="cartao" noValidate>
      <h2 className="cartao-titulo">Novo contrato</h2>
      <div className="space-y-3 p-4">
        <MensagemFormulario estado={estado} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nome="numero" rotulo="Número" obrigatorio valor={valor("numero")} erro={erro("numero")} placeholder="CT-2026-031" />
          <Campo nome="valor" rotulo="Valor mensal" valor={valor("valor")} erro={erro("valor")} placeholder="1.500,00" />
          <Campo nome="data_inicio" rotulo="Início da vigência" type="date" obrigatorio valor={valor("data_inicio")} erro={erro("data_inicio")} />
          <Campo nome="data_fim" rotulo="Fim da vigência" type="date" obrigatorio valor={valor("data_fim")} erro={erro("data_fim")} />
        </div>
        <CampoArquivo rotulo="Contrato assinado" obrigatorio aceita=".pdf" erro={erro("arquivo")} ajuda="Só PDF, com até 10 MB." />
      </div>
      <div className="rodape-form">
        <BotaoEnviar enviando={enviando} texto="Cadastrar contrato" />
      </div>
    </form>
  );
}

export function BotaoLiberarAcesso({ id }: { id: number }) {
  const { estado, enviar, enviando } = useFormulario(liberarAcessoPrestador.bind(null, id));
  return (
    <form onSubmit={enviar}>
      <MensagemFormulario estado={estado} />
      {!estado.ok && <BotaoEnviar enviando={enviando} texto="Liberar acesso" enviandoTexto="Liberando..." />}
    </form>
  );
}

export function FormAnonimizar({ id }: { id: number }) {
  const { estado, enviar, enviando } = useFormulario(anonimizar.bind(null, id));
  return (
    <form onSubmit={enviar} className="space-y-3">
      <MensagemFormulario estado={estado} />
      {!estado.ok && (
        <>
          <label className="marcador text-sm">
            <input type="checkbox" name="confirmo" value="sim" /> Confirmo que o titular pediu a remoção dos dados pessoais. Não tem volta.
          </label>
          <BotaoEnviar enviando={enviando} texto="Anonimizar dados" perigo confirmar="Anonimizar os dados pessoais deste prestador? Não tem volta." />
        </>
      )}
    </form>
  );
}
