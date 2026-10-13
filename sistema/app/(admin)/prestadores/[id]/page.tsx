import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatarCpfCnpj } from "@/lib/dominio/cpf-cnpj";
import { dataHoraBR } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";
import { BotaoLiberarAcesso, FormAnonimizar, FormPrestador } from "../formularios";

// T04 - dados cadastrais (o layout ja garantiu que o prestador existe)
export default async function DadosPrestador({ params }: { params: Promise<{ id: string }> }) {
  await exigirPerfil("administrador");
  const id = Number((await params).id);
  const prestador = await prisma.prestador.findUniqueOrThrow({ where: { id_prestador: id }, include: { usuario: true } });
  const ordens = await prisma.ordem_servico.count({ where: { id_prestador: id } });

  // o formulario trabalha com texto. campos nulos viram vazio
  const inicial: Record<string, string> = {};
  for (const [campo, valor] of Object.entries(prestador)) inicial[campo] = valor === null ? "" : String(valor);
  inicial.cpf_cnpj = formatarCpfCnpj(prestador.cpf_cnpj);
  inicial.cep = prestador.cep.replace(/(\d{5})(\d{3})/, "$1-$2");

  return (
    <div className="space-y-4">
      <FormPrestador id={id} inicial={inicial} />

      <div className="colunas">
        <section className="cartao">
          <h2 className="cartao-titulo">Acesso ao sistema</h2>
          <div className="p-4 text-sm">
            {prestador.usuario ? (
              <p>
                Entra com <strong>{prestador.usuario.email}</strong>
                {prestador.usuario.ativo ? "" : " (acesso desativado)"}.{" "}
                {prestador.usuario.ultimo_acesso_em ? `Último acesso em ${dataHoraBR(prestador.usuario.ultimo_acesso_em)}.` : "Ainda não entrou."}
              </p>
            ) : (
              <>
                <p className="mb-3 text-tinta2">
                  O prestador ainda não tem login. O acesso usa o e-mail do cadastro e serve para ele ver as ordens atribuídas e enviar documentos.
                </p>
                <BotaoLiberarAcesso id={id} />
              </>
            )}
          </div>
        </section>

        <section className="cartao">
          <h2 className="cartao-titulo">Histórico de atendimentos</h2>
          <div className="p-4 text-sm">
            <p className="mb-3">{ordens === 0 ? "Nenhuma ordem atribuída a este prestador até agora." : `${ordens} ${ordens === 1 ? "ordem" : "ordens"} no histórico.`}</p>
            {ordens > 0 && <Link href={`/ordens?prestador=${id}`} className="botao">Ver ordens do prestador</Link>}
          </div>
        </section>
      </div>

      {!prestador.cpf_cnpj.startsWith("ANON") && (
        <section className="cartao">
          <h2 className="cartao-titulo">Remover dados pessoais (LGPD)</h2>
          <div className="p-4 text-sm">
            <p className="mb-3 text-tinta2">
              Só a pedido do titular. Nome, documento, contato e endereço são apagados, os arquivos de documento saem do armazenamento e o login é desativado.
              As ordens e as avaliações continuam no histórico, ligadas a um cadastro sem identificação (RNF10).
            </p>
            <FormAnonimizar id={id} />
          </div>
        </section>
      )}
    </div>
  );
}
