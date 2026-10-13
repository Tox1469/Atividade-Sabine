"use client";

import Link from "next/link";
import { useState } from "react";
import type { EstadoFormulario } from "@/lib/formulario";
import { UFS } from "@/lib/validacao/pessoa";
import { BotaoEnviar, Campo, MensagemFormulario, Selecao, useFormulario } from "./campos";

// prestador (T04) e cliente (T06) tem os mesmos campos de identificacao e endereco
type Props = {
  acao: (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  inicial?: Record<string, string>;
  voltar: string;
  ajudaEmail: string;
  ajudaDocumento?: string;
};

export function FormularioPessoa({ acao, inicial = {}, voltar, ajudaEmail, ajudaDocumento }: Props) {
  const { estado, enviar, enviando, valor, erro } = useFormulario(acao, inicial);
  const [tipo, setTipo] = useState(valor("tipo_pessoa") || "J");
  const juridica = tipo === "J";

  return (
    <form action={enviar} className="space-y-4" noValidate>
      <MensagemFormulario estado={estado} />

      <section className="cartao">
        <h2 className="cartao-titulo">Identificação</h2>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-12">
          <Selecao
            nome="tipo_pessoa"
            rotulo="Tipo"
            obrigatorio
            valor={tipo}
            onChange={setTipo}
            opcoes={[{ valor: "J", texto: "Pessoa jurídica" }, { valor: "F", texto: "Pessoa física" }]}
            className="lg:col-span-3"
          />
          <Campo nome="nome_razao_social" valor={valor("nome_razao_social")} erro={erro("nome_razao_social")} rotulo={juridica ? "Razão social" : "Nome completo"} obrigatorio className="sm:col-span-2 lg:col-span-5" />
          <Campo
            nome="cpf_cnpj"
            valor={valor("cpf_cnpj")}
            erro={erro("cpf_cnpj")}
            rotulo={juridica ? "CNPJ" : "CPF"}
            obrigatorio
            className="lg:col-span-4"
            placeholder={juridica ? "00.000.000/0000-00" : "000.000.000-00"}
            ajuda={erro("cpf_cnpj") ? undefined : ajudaDocumento}
          />
          <Campo
            nome="nome_fantasia"
            valor={valor("nome_fantasia")}
            erro={erro("nome_fantasia")}
            rotulo={juridica ? "Nome fantasia" : "Como é conhecido"}
            className="lg:col-span-4"
            ajuda="Aparece abaixo do nome na listagem."
          />
          <Campo nome="telefone" valor={valor("telefone")} erro={erro("telefone")} rotulo="Telefone" obrigatorio className="lg:col-span-4" placeholder="(44) 99999-9999" />
          <Campo nome="email" valor={valor("email")} erro={erro("email")} rotulo="E-mail" type="email" className="sm:col-span-2 lg:col-span-4" ajuda={erro("email") ? undefined : ajudaEmail} />
        </div>
      </section>

      <section className="cartao">
        <h2 className="cartao-titulo">Endereço</h2>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-12">
          <Campo nome="cep" valor={valor("cep")} erro={erro("cep")} rotulo="CEP" obrigatorio className="lg:col-span-3" placeholder="00000-000" />
          <Campo nome="logradouro" valor={valor("logradouro")} erro={erro("logradouro")} rotulo="Logradouro" obrigatorio className="lg:col-span-6" />
          <Campo nome="numero" valor={valor("numero")} erro={erro("numero")} rotulo="Número" obrigatorio className="lg:col-span-3" />
          <Campo nome="complemento" valor={valor("complemento")} erro={erro("complemento")} rotulo="Complemento" className="lg:col-span-3" />
          <Campo nome="bairro" valor={valor("bairro")} erro={erro("bairro")} rotulo="Bairro" obrigatorio className="lg:col-span-4" />
          <Campo nome="cidade" valor={valor("cidade")} erro={erro("cidade")} rotulo="Cidade" obrigatorio className="lg:col-span-3" />
          <Selecao
            nome="uf"
            rotulo="UF"
            obrigatorio
            valor={valor("uf") || "PR"}
            erro={erro("uf")}
            opcoes={UFS.map((uf) => ({ valor: uf, texto: uf }))}
            className="lg:col-span-2"
          />
        </div>
        <div className="rodape-form">
          <Link href={voltar} className="botao">Cancelar</Link>
          <BotaoEnviar enviando={enviando} texto="Salvar" />
        </div>
      </section>
    </form>
  );
}
