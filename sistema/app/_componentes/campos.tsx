"use client";

import { useActionState } from "react";
import { LIMITE_ARQUIVO } from "@/lib/dominio/documento";
import { erroNoCampo, valoresDo, type EstadoFormulario } from "@/lib/formulario";

type Acao = (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
export type Preparar = (tipo: string) => Promise<{ caminho: string; url: string } | null>;

// publicado, o arquivo sobe direto do navegador pro storage (ver lib/storage.ts) e o form
// segue so com o caminho. local, preparar devolve null e o arquivo vai junto no form
async function subirArquivo(form: FormData, preparar: Preparar): Promise<string | null> {
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return null;
  if (arquivo.size > LIMITE_ARQUIVO) return "O arquivo passa de 10 MB.";

  const destino = await preparar(arquivo.type);
  if (!destino) return null;
  const resposta = await fetch(destino.url, {
    method: "PUT",
    headers: { "Content-Type": arquivo.type || "application/octet-stream" },
    body: arquivo,
  });
  if (resposta.status === 415) return "Formato não aceito. Envie o arquivo em PDF, JPG ou PNG, com até 10 MB.";
  if (resposta.status === 413) return "O arquivo passa de 10 MB.";
  if (!resposta.ok) return "Não foi possível enviar o arquivo. Tente de novo.";

  form.delete("arquivo");
  form.set("arquivo_caminho", destino.caminho);
  form.set("arquivo_nome", arquivo.name);
  return null;
}

// estado do formulario + leitura do valor e do erro de cada campo
export function useFormulario(acao: Acao, inicial: Record<string, string> = {}, preparar?: Preparar) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(async (anterior, form) => {
    if (preparar) {
      const erro = await subirArquivo(form, preparar);
      if (erro) return erroNoCampo("arquivo", erro, valoresDo(form));
    }
    return acao(anterior, form);
  }, {});
  return {
    estado,
    enviar,
    enviando,
    valor: (campo: string) => estado.valores?.[campo] ?? inicial[campo] ?? "",
    erro: (campo: string) => estado.erros?.[campo]?.[0],
  };
}

export function MensagemFormulario({ estado }: { estado: EstadoFormulario }) {
  if (estado.ok) {
    return <p className="aviso ok" role="status"><strong>{estado.ok}</strong></p>;
  }
  if (!estado.mensagem) return null;
  return <p className="aviso erro" role="alert"><strong>{estado.mensagem}</strong></p>;
}

type Base = { nome: string; rotulo: string; erro?: string; obrigatorio?: boolean; ajuda?: React.ReactNode; className?: string };

function Rotulo({ nome, rotulo, obrigatorio }: Base) {
  return (
    <label htmlFor={nome} className="rotulo">
      {rotulo} {obrigatorio && <span className="text-carimbo">*</span>}
    </label>
  );
}

function Rodape({ erro, ajuda }: Base) {
  return (
    <>
      {erro && <p className="msg-erro">{erro}</p>}
      {ajuda && <p className="ajuda">{ajuda}</p>}
    </>
  );
}

export function Campo(props: Base & { valor: string; type?: string; placeholder?: string; min?: string; max?: string; step?: string; disabled?: boolean }) {
  return (
    <div className={props.className}>
      <Rotulo {...props} />
      <input
        id={props.nome}
        name={props.nome}
        type={props.type ?? "text"}
        defaultValue={props.valor}
        placeholder={props.placeholder}
        min={props.min}
        max={props.max}
        step={props.step}
        disabled={props.disabled}
        aria-invalid={!!props.erro}
        className={`campo ${props.erro ? "campo-erro" : ""} disabled:bg-papel disabled:text-tinta2`}
      />
      <Rodape {...props} />
    </div>
  );
}

export function CampoTexto(props: Base & { valor: string; placeholder?: string; linhas?: number }) {
  return (
    <div className={props.className}>
      <Rotulo {...props} />
      <textarea
        id={props.nome}
        name={props.nome}
        defaultValue={props.valor}
        placeholder={props.placeholder}
        rows={props.linhas ?? 3}
        aria-invalid={!!props.erro}
        className={`campo ${props.erro ? "campo-erro" : ""}`}
      />
      <Rodape {...props} />
    </div>
  );
}

export function Selecao(props: Base & { valor: string; opcoes: { valor: string; texto: string }[]; vazio?: string; onChange?: (v: string) => void }) {
  return (
    <div className={props.className}>
      <Rotulo {...props} />
      <select
        id={props.nome}
        name={props.nome}
        defaultValue={props.valor}
        onChange={props.onChange ? (e) => props.onChange!(e.target.value) : undefined}
        aria-invalid={!!props.erro}
        className={`campo ${props.erro ? "campo-erro" : ""}`}
      >
        {props.vazio !== undefined && <option value="">{props.vazio}</option>}
        {props.opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.texto}</option>
        ))}
      </select>
      <Rodape {...props} />
    </div>
  );
}

export function CampoArquivo(props: Omit<Base, "nome"> & { aceita?: string }) {
  return (
    <div className={props.className}>
      <Rotulo nome="arquivo" {...props} />
      <input
        id="arquivo"
        name="arquivo"
        type="file"
        accept={props.aceita ?? ".pdf,.jpg,.jpeg,.png"}
        aria-invalid={!!props.erro}
        className={`campo cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border file:border-regua file:bg-papel file:px-2 file:py-0.5 file:text-sm ${props.erro ? "campo-erro" : ""}`}
      />
      <Rodape nome="arquivo" {...props} />
    </div>
  );
}

export function BotaoEnviar({ enviando, texto, enviandoTexto, perigo }: { enviando: boolean; texto: string; enviandoTexto?: string; perigo?: boolean }) {
  return (
    <button type="submit" disabled={enviando} className={perigo ? "botao-perigo" : "botao-principal"}>
      {enviando ? (enviandoTexto ?? "Salvando...") : texto}
    </button>
  );
}
