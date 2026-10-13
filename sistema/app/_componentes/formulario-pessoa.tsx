"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { consultarCep, consultarCnpj, municipios } from "@/lib/apis-publicas";
import { cnpjValido, soDigitos } from "@/lib/dominio/cpf-cnpj";
import type { EstadoFormulario } from "@/lib/formulario";
import { UFS } from "@/lib/validacao/pessoa";
import { BotaoEnviar, Campo, MensagemFormulario, Selecao, useFormulario } from "./campos";

// prestador (T04), cliente (T06) e o cadastro pela tela de login tem os mesmos campos
type Props = {
  acao: (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  inicial?: Record<string, string>;
  voltar?: string;
  ajudaEmail: string;
  ajudaDocumento?: string;
  emailObrigatorio?: boolean;
  textoBotao?: string;
  aoConcluir?: (ok: string) => void;
  aoCancelar?: () => void;
  // campos a mais antes do botao (senha e consentimento do cadastro). recebe o erro de cada campo
  children?: (erro: (campo: string) => string | undefined) => React.ReactNode;
};

// mascara enquanto digita. o servidor guarda so os digitos de qualquer jeito
function mascara(campo: string, valor: string, juridica: boolean) {
  const d = soDigitos(valor);
  if (campo === "cpf_cnpj") {
    return juridica
      ? d.slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2")
      : d.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  if (campo === "cep") return d.slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
  if (campo === "telefone") {
    const t = d.slice(0, 11);
    if (t.length <= 2) return t;
    if (t.length <= 6) return `(${t.slice(0, 2)}) ${t.slice(2)}`;
    return `(${t.slice(0, 2)}) ${t.slice(2, t.length - 4)}-${t.slice(-4)}`;
  }
  return valor;
}

export function FormularioPessoa({ acao, inicial = {}, voltar, ajudaEmail, ajudaDocumento, emailObrigatorio, textoBotao = "Salvar", children, aoConcluir, aoCancelar }: Props) {
  const { estado, enviar, enviando, valor, erro } = useFormulario(acao, inicial, undefined, aoConcluir);
  const form = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState(valor("tipo_pessoa") || "J");
  const [uf, setUf] = useState(valor("uf") || "PR");
  const [cidades, setCidades] = useState<string[]>([]);
  const [receita, setReceita] = useState<{ texto: string; tom: string } | null>(null);
  const [cepAviso, setCepAviso] = useState("");
  const [consultando, setConsultando] = useState(false);
  const juridica = tipo === "J";

  useEffect(() => {
    let vivo = true;
    municipios(uf).then((l) => vivo && setCidades(l));
    return () => {
      vivo = false;
    };
  }, [uf]);

  // preenche os campos que vieram da api sem apagar o que a pessoa ja digitou nos que vieram vazios
  function preencher(dados: Record<string, string>) {
    for (const [nome, v] of Object.entries(dados)) {
      const campo = form.current?.elements.namedItem(nome) as HTMLInputElement | null;
      if (campo && v) campo.value = mascara(nome, v, juridica);
    }
    if (dados.uf && UFS.includes(dados.uf as never)) setUf(dados.uf);
  }

  async function buscarNaReceita() {
    const cnpj = (form.current?.elements.namedItem("cpf_cnpj") as HTMLInputElement).value;
    if (!cnpjValido(soDigitos(cnpj))) {
      setReceita({ texto: "Digite um CNPJ válido para consultar.", tom: "erro" });
      return;
    }
    setConsultando(true);
    setReceita(null);
    const d = await consultarCnpj(cnpj);
    setConsultando(false);
    if (!d) {
      setReceita({ texto: "Não foi possível consultar a Receita agora. Preencha os dados manualmente.", tom: "atencao" });
      return;
    }
    preencher({
      nome_razao_social: d.razaoSocial,
      nome_fantasia: d.nomeFantasia,
      telefone: d.telefone,
      email: d.email,
      cep: d.cep,
      logradouro: d.logradouro,
      numero: d.numero,
      complemento: d.complemento,
      bairro: d.bairro,
      cidade: d.cidade,
      uf: d.uf,
    });
    setReceita(
      d.situacao === "ATIVA"
        ? { texto: "Dados preenchidos pela Receita Federal. Situação do CNPJ: ativa.", tom: "ok" }
        : { texto: `Atenção: na Receita Federal este CNPJ está com situação ${d.situacao.toLowerCase() || "desconhecida"}.`, tom: "erro" },
    );
  }

  async function buscarCep(cep: string) {
    if (soDigitos(cep).length !== 8) return;
    setCepAviso("Consultando o CEP...");
    const d = await consultarCep(cep);
    if (!d) {
      setCepAviso("CEP não encontrado. Confira ou preencha o endereço manualmente.");
      return;
    }
    preencher({ logradouro: d.logradouro, bairro: d.bairro, cidade: d.cidade, uf: d.uf });
    setCepAviso("Endereço preenchido pelo CEP. Falta o número.");
    (form.current?.elements.namedItem("numero") as HTMLInputElement | null)?.focus();
  }

  const aoDigitar = (e: React.FormEvent<HTMLFormElement>) => {
    const alvo = e.target as HTMLInputElement;
    if (["cpf_cnpj", "cep", "telefone"].includes(alvo.name)) alvo.value = mascara(alvo.name, alvo.value, juridica);
    if (alvo.name === "cep" && soDigitos(alvo.value).length === 8) buscarCep(alvo.value);
  };

  return (
    <form ref={form} onSubmit={enviar} onInput={aoDigitar} className="space-y-4" noValidate>
      <MensagemFormulario estado={estado} />

      <section className="cartao">
        <h2 className="cartao-titulo">Identificação</h2>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-12">
          <Selecao
            nome="tipo_pessoa"
            rotulo="Tipo"
            obrigatorio
            valor={tipo}
            onChange={(v) => {
              setTipo(v);
              setReceita(null);
            }}
            opcoes={[{ valor: "J", texto: "Pessoa jurídica" }, { valor: "F", texto: "Pessoa física" }]}
            className="lg:col-span-3"
          />
          <div className="lg:col-span-4">
            <Campo
              nome="cpf_cnpj"
              valor={valor("cpf_cnpj")}
              erro={erro("cpf_cnpj")}
              rotulo={juridica ? "CNPJ" : "CPF"}
              obrigatorio
              placeholder={juridica ? "00.000.000/0000-00" : "000.000.000-00"}
              ajuda={erro("cpf_cnpj") ? undefined : ajudaDocumento}
            />
            {juridica && (
              <button type="button" onClick={buscarNaReceita} disabled={consultando} className="mt-1 cursor-pointer text-xs font-semibold text-caneta hover:underline disabled:cursor-wait">
                {consultando ? "Consultando a Receita..." : "Buscar dados na Receita Federal"}
              </button>
            )}
          </div>
          <Campo nome="nome_razao_social" valor={valor("nome_razao_social")} erro={erro("nome_razao_social")} rotulo={juridica ? "Razão social" : "Nome completo"} obrigatorio className="sm:col-span-2 lg:col-span-5" />
          {receita && (
            <p className={`aviso ${receita.tom} sm:col-span-2 lg:col-span-12`} role="status" style={{ marginBottom: 0 }}>
              {receita.texto}
            </p>
          )}
          <Campo
            nome="nome_fantasia"
            valor={valor("nome_fantasia")}
            erro={erro("nome_fantasia")}
            rotulo={juridica ? "Nome fantasia" : "Como é conhecido"}
            className="lg:col-span-4"
            ajuda="Aparece abaixo do nome na listagem."
          />
          <Campo nome="telefone" valor={valor("telefone")} erro={erro("telefone")} rotulo="Telefone" obrigatorio className="lg:col-span-4" placeholder="(44) 99999-9999" type="tel" />
          <Campo nome="email" valor={valor("email")} erro={erro("email")} rotulo="E-mail" obrigatorio={emailObrigatorio} type="email" className="sm:col-span-2 lg:col-span-4" ajuda={erro("email") ? undefined : ajudaEmail} />
        </div>
      </section>

      <section className="cartao">
        <h2 className="cartao-titulo">Endereço</h2>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-12">
          <Campo nome="cep" valor={valor("cep")} erro={erro("cep")} rotulo="CEP" obrigatorio className="lg:col-span-3" placeholder="00000-000" ajuda={cepAviso || (erro("cep") ? undefined : "O endereço é preenchido pelo CEP.")} />
          <Campo nome="logradouro" valor={valor("logradouro")} erro={erro("logradouro")} rotulo="Logradouro" obrigatorio className="lg:col-span-6" />
          <Campo nome="numero" valor={valor("numero")} erro={erro("numero")} rotulo="Número" obrigatorio className="lg:col-span-3" />
          <Campo nome="complemento" valor={valor("complemento")} erro={erro("complemento")} rotulo="Complemento" className="lg:col-span-3" />
          <Campo nome="bairro" valor={valor("bairro")} erro={erro("bairro")} rotulo="Bairro" obrigatorio className="lg:col-span-4" />
          <div className="lg:col-span-3">
            <label htmlFor="cidade" className="rotulo">
              Cidade <span className="text-carimbo">*</span>
            </label>
            <input id="cidade" name="cidade" list="lista-cidades" defaultValue={valor("cidade")} aria-invalid={!!erro("cidade")} autoComplete="off" className={`campo ${erro("cidade") ? "campo-erro" : ""}`} />
            <datalist id="lista-cidades">
              {cidades.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {erro("cidade") && <p className="msg-erro">{erro("cidade")}</p>}
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="uf" className="rotulo">
              UF <span className="text-carimbo">*</span>
            </label>
            <select id="uf" name="uf" value={uf} onChange={(e) => setUf(e.target.value)} className={`campo ${erro("uf") ? "campo-erro" : ""}`}>
              {UFS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        {children && <div className="border-t border-regua-clara p-4">{children(erro)}</div>}
        <div className="rodape-form">
          {aoCancelar ? (
            <button type="button" onClick={aoCancelar} className="botao">Cancelar</button>
          ) : (
            voltar && <Link href={voltar} className="botao">Cancelar</Link>
          )}
          <BotaoEnviar enviando={enviando} texto={textoBotao} />
        </div>
      </section>
    </form>
  );
}
