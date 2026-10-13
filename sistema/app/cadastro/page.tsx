import Link from "next/link";
import { FormCadastro } from "./formulario";

export const metadata = { title: "Criar conta" };

// cadastro pela propria pessoa, escolhendo se vai pedir servico ou prestar servico
export default async function Cadastro({ searchParams }: { searchParams: Promise<{ perfil?: string }> }) {
  const perfil = (await searchParams).perfil === "prestador" ? "prestador" : "cliente";
  const opcoes = [
    { valor: "cliente", titulo: "Preciso de um serviço", texto: "Abra solicitações, acompanhe o andamento e avalie o atendimento." },
    { valor: "prestador", titulo: "Quero prestar serviços", texto: "Envie seus documentos e receba ordens depois da conferência." },
  ];

  return (
    <main className="min-h-screen bg-papel">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/login" className="text-sm text-tinta2 hover:text-tinta hover:underline">Voltar para o login</Link>
        <h1 className="mt-2 text-2xl font-semibold">Criar conta no SGP</h1>
        <p className="mb-5 text-sm text-tinta2">Leva uns dois minutos. Com CNPJ, os dados da empresa vêm da Receita Federal.</p>

        <div className="mb-5 grid gap-3 sm:grid-cols-2" role="tablist">
          {opcoes.map((o) => (
            <Link
              key={o.valor}
              href={`/cadastro?perfil=${o.valor}`}
              role="tab"
              aria-selected={perfil === o.valor}
              className={`rounded border bg-white p-4 ${perfil === o.valor ? "border-caneta border-l-4" : "border-regua hover:border-tinta2"}`}
            >
              <p className="font-semibold">{o.titulo}</p>
              <p className="text-sm text-tinta2">{o.texto}</p>
            </Link>
          ))}
        </div>

        {perfil === "prestador" && (
          <p className="aviso atencao">
            <strong>O cadastro de prestador começa pendente.</strong>
            Depois de entrar, envie os documentos obrigatórios em Meus documentos. O administrador confere, habilita as categorias em que você atua e libera o
            recebimento de ordens.
          </p>
        )}
        <FormCadastro perfil={perfil} />
      </div>
    </main>
  );
}
