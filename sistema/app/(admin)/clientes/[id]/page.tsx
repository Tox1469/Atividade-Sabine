import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip, Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { formatarCpfCnpj } from "@/lib/dominio/cpf-cnpj";
import { dataHoraBR } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";
import { BotaoLiberarAcesso, FormAnonimizar, FormAtivo, FormCliente } from "../formularios";

export const metadata = { title: "Ficha do cliente" };

// T06 - ficha do cliente
export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  await exigirPerfil("administrador");
  const cliente = await prisma.cliente.findUnique({ where: { id_cliente: Number((await params).id) || 0 }, include: { usuario: true } });
  if (!cliente) notFound();
  const ordens = await prisma.ordem_servico.count({ where: { id_cliente: cliente.id_cliente } });
  const anonimizado = cliente.cpf_cnpj.startsWith("ANON");

  const inicial: Record<string, string> = {};
  for (const [campo, valor] of Object.entries(cliente)) inicial[campo] = valor === null ? "" : String(valor);
  inicial.cpf_cnpj = formatarCpfCnpj(cliente.cpf_cnpj);
  inicial.cep = cliente.cep.replace(/(\d{5})(\d{3})/, "$1-$2");

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Titulo voltar={["/clientes", "clientes"]} titulo={cliente.nome_fantasia ?? cliente.nome_razao_social} subtitulo={`Cadastro do cliente, ${formatarCpfCnpj(cliente.cpf_cnpj)}`}>
        {cliente.ativo ? <Chip tom="ativo">Ativo</Chip> : <Chip tom="inativo">Inativo</Chip>}
      </Titulo>

      <FormCliente id={cliente.id_cliente} inicial={inicial} />

      <div className="colunas">
        <section className="cartao">
          <h2 className="cartao-titulo">Acesso ao sistema</h2>
          <div className="p-4 text-sm">
            {cliente.usuario ? (
              <p>
                Entra com <strong>{cliente.usuario.email}</strong>
                {cliente.usuario.ativo ? "" : " (acesso desativado)"}.{" "}
                {cliente.usuario.ultimo_acesso_em ? `Último acesso em ${dataHoraBR(cliente.usuario.ultimo_acesso_em)}.` : "Ainda não entrou."}
              </p>
            ) : (
              <>
                <p className="mb-3 text-tinta2">Com login, o próprio cliente abre as solicitações, acompanha e avalia o atendimento.</p>
                <BotaoLiberarAcesso id={cliente.id_cliente} />
              </>
            )}
          </div>
        </section>

        <section className="cartao">
          <h2 className="cartao-titulo">Ordens e situação</h2>
          <div className="space-y-3 p-4 text-sm">
            <p>{ordens === 0 ? "Nenhuma ordem aberta para este cliente até agora." : `${ordens} ${ordens === 1 ? "ordem" : "ordens"} no histórico.`}</p>
            <div className="flex flex-wrap gap-2">
              {ordens > 0 && <Link href={`/ordens?cliente=${cliente.id_cliente}`} className="botao">Ver ordens do cliente</Link>}
              {cliente.ativo && <Link href={`/ordens/nova?cliente=${cliente.id_cliente}`} className="botao">Abrir ordem para este cliente</Link>}
            </div>
            {!anonimizado && <FormAtivo id={cliente.id_cliente} ativo={cliente.ativo} />}
          </div>
        </section>
      </div>

      {!anonimizado && (
        <section className="cartao">
          <h2 className="cartao-titulo">Remover dados pessoais (LGPD)</h2>
          <div className="p-4 text-sm">
            <p className="mb-3 text-tinta2">
              Só a pedido do titular. Nome, documento, contato e endereço são apagados e o login é desativado. As ordens continuam no histórico, ligadas a um
              cadastro sem identificação (RNF10).
            </p>
            <FormAnonimizar id={cliente.id_cliente} />
          </div>
        </section>
      )}
    </div>
  );
}
