"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { entrar } from "./actions";

// contas da carga de demonstracao (prisma/seed.ts). todos os dados do sistema sao ficticios
const DEMONSTRACAO = [
  { perfil: "Administrador", nome: "Luis Gustavo Boratto", email: "luis@sgp.teste" },
  { perfil: "Prestador", nome: "Elétrica Santos", email: "eletrica@sgp.teste" },
  { perfil: "Prestador", nome: "Hidráulica Três Lagoas", email: "treslagoas@sgp.teste" },
  { perfil: "Cliente", nome: "Supermercado Zanin", email: "zanin@sgp.teste" },
  { perfil: "Cliente", nome: "Padaria Dom Bosco", email: "dombosco@sgp.teste" },
];
const SENHA_DEMONSTRACAO = "sgp@2026";

// T01 - login
export default function Login() {
  const [estado, enviar, enviando] = useActionState(entrar, { erro: null, email: "" });
  const [verSenha, setVerSenha] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const erro = estado.erro;

  function usar(email: string) {
    const f = form.current!;
    (f.elements.namedItem("email") as HTMLInputElement).value = email;
    (f.elements.namedItem("senha") as HTMLInputElement).value = SENHA_DEMONSTRACAO;
    f.requestSubmit();
  }

  return (
    <main className="min-h-screen bg-papel">
      <div className="h-1.5 bg-caneta" />
      <div className="mx-auto flex min-h-[calc(100vh-6px)] max-w-5xl flex-col justify-center gap-8 px-4 py-10 md:flex-row md:items-center md:gap-14">
        <section className="md:flex-1">
          <p className="text-4xl font-bold tracking-tight">SGP</p>
          <p className="mb-4 text-lg text-tinta2">Gestão de prestadores de serviço</p>
          <p className="max-w-md text-sm leading-relaxed text-tinta2">
            Cadastro e documentação dos prestadores terceirizados, ordens de serviço do pedido à conclusão e a avaliação de quem foi atendido. Cada perfil
            entra e vê só o que é dele.
          </p>

          <div className="cartao mt-6 hidden max-w-md md:block">
            <p className="cartao-titulo">Acesso de demonstração</p>
            <ul className="divide-y divide-regua-clara text-sm">
              {DEMONSTRACAO.map((d) => (
                <li key={d.email} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span>
                    <span className="font-semibold">{d.perfil}</span> <span className="text-tinta2">{d.nome}</span>
                  </span>
                  <button type="button" onClick={() => usar(d.email)} className="botao botao-pequeno">Entrar como</button>
                </li>
              ))}
            </ul>
            <p className="border-t border-regua-clara px-4 py-2 text-xs text-tinta2">Senha de todas: {SENHA_DEMONSTRACAO}. Os dados são fictícios.</p>
          </div>
        </section>

        <section className="w-full md:max-w-sm">
          <form ref={form} action={enviar} className="cartao" noValidate>
            <h1 className="cartao-titulo text-base">Entrar</h1>
            <div className="space-y-3 p-4">
              <div>
                <label htmlFor="email" className="rotulo">E-mail</label>
                <input id="email" name="email" type="email" required autoComplete="username" autoFocus defaultValue={estado.email} className={`campo ${erro ? "campo-erro" : ""}`} />
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="senha" className="rotulo">Senha</label>
                  <button type="button" onClick={() => setVerSenha(!verSenha)} className="cursor-pointer text-xs font-semibold text-caneta hover:underline" aria-controls="senha">
                    {verSenha ? "Esconder" : "Mostrar"}
                  </button>
                </div>
                <input id="senha" name="senha" type={verSenha ? "text" : "password"} required autoComplete="current-password" className={`campo ${erro ? "campo-erro" : ""}`} />
                {erro && <p className="msg-erro" role="alert">{erro}</p>}
              </div>
              <button type="submit" disabled={enviando} className="botao-principal w-full py-2">
                {enviando ? "Entrando..." : "Entrar"}
              </button>
              <details className="text-sm">
                <summary className="cursor-pointer text-tinta2 hover:text-tinta">Esqueceu a senha?</summary>
                <p className="mt-2 text-tinta2">
                  Peça ao administrador uma senha provisória. Ele gera na tela de usuários e você troca em Minha conta no primeiro acesso.
                </p>
              </details>
            </div>
            <div className="border-t border-regua-clara px-4 py-3 text-sm">
              Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-caneta hover:underline">Criar conta</Link>
            </div>
          </form>
          <p className="mt-3 text-xs text-tinta2">
            Por segurança, cinco senhas erradas seguidas bloqueiam o e-mail por 15 minutos, e a sessão encerra depois de 30 minutos sem uso.
          </p>

          <div className="cartao mt-4 md:hidden">
            <p className="cartao-titulo">Acesso de demonstração</p>
            <div className="flex flex-wrap gap-2 p-3">
              {DEMONSTRACAO.map((d) => (
                <button key={d.email} type="button" onClick={() => usar(d.email)} className="botao botao-pequeno">
                  {d.perfil}: {d.nome}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
