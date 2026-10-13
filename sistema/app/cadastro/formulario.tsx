"use client";

import { useState } from "react";
import { FormularioPessoa } from "@/app/_componentes/formulario-pessoa";
import { criarConta } from "./actions";

export function FormCadastro({ perfil }: { perfil: "cliente" | "prestador" }) {
  const [verSenha, setVerSenha] = useState(false);
  return (
    <FormularioPessoa
      key={perfil}
      acao={criarConta.bind(null, perfil)}
      emailObrigatorio
      ajudaEmail="É o seu login no sistema."
      ajudaDocumento="O número é conferido pelo dígito verificador."
      textoBotao="Criar conta"
      voltar="/login"
    >
      {(erro) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="senha" className="rotulo">
                  Senha <span className="text-carimbo">*</span>
                </label>
                <button type="button" onClick={() => setVerSenha(!verSenha)} className="cursor-pointer text-xs font-semibold text-caneta hover:underline">
                  {verSenha ? "Esconder" : "Mostrar"}
                </button>
              </div>
              <input
                id="senha"
                name="senha"
                type={verSenha ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={!!erro("senha")}
                className={`campo ${erro("senha") ? "campo-erro" : ""}`}
              />
              {erro("senha") ? <p className="msg-erro">{erro("senha")}</p> : <p className="ajuda">Pelo menos 8 caracteres.</p>}
            </div>
            <div>
              <label htmlFor="confirmacao" className="rotulo">
                Repita a senha <span className="text-carimbo">*</span>
              </label>
              <input
                id="confirmacao"
                name="confirmacao"
                type={verSenha ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={!!erro("confirmacao")}
                className={`campo ${erro("confirmacao") ? "campo-erro" : ""}`}
              />
              {erro("confirmacao") && <p className="msg-erro">{erro("confirmacao")}</p>}
            </div>
          </div>
          <label className="marcador mt-4 items-start text-sm">
            <input type="checkbox" name="consentimento" value="sim" className="mt-1" />
            <span>
              Concordo que os dados informados sejam usados para o atendimento das ordens de serviço
              {perfil === "prestador" ? " e para a conferência da minha documentação" : ""}. Eles ficam visíveis só para quem precisa deles e posso pedir a
              remoção a qualquer momento (LGPD).
            </span>
          </label>
          {erro("consentimento") && <p className="msg-erro">{erro("consentimento")}</p>}
        </>
      )}
    </FormularioPessoa>
  );
}
