import Link from "next/link";
import { Aviso, Chip } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { documentosDoPrestador } from "@/lib/documentos";
import { situacaoDocumento } from "@/lib/dominio/documento";
import { dataBR, hoje, tamanhoArquivo } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";
import { FormDocumentoAdmin } from "../../formularios";

export const metadata = { title: "Documentos do prestador" };

// T04c - documentos do prestador, com validade e versoes anteriores (UC08, TA28 a TA30)
export default async function DocumentosPrestador({ params }: { params: Promise<{ id: string }> }) {
  await exigirPerfil("administrador");
  const id = Number((await params).id);
  const dia = hoje();

  const [prestador, documentos, tipos] = await Promise.all([
    prisma.prestador.findUniqueOrThrow({ where: { id_prestador: id } }),
    documentosDoPrestador(id),
    prisma.tipo_documento.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);
  const vencidosObrigatorios = documentos.filter((d) => d.versao_atual && d.tipo.obrigatorio && situacaoDocumento(d.data_validade, dia).tipo === "vencido");

  return (
    <>
      {vencidosObrigatorios.length > 0 ? (
        <Aviso
          tom="atencao"
          titulo={`Este prestador tem ${vencidosObrigatorios.length === 1 ? "1 documento obrigatório vencido" : `${vencidosObrigatorios.length} documentos obrigatórios vencidos`}.`}
        >
          Enquanto não for regularizado, ele fica com situação pendente e não aparece na lista de atribuição (RN02).
        </Aviso>
      ) : (
        prestador.situacao === "pendente" &&
        documentos.length > 0 && (
          // UC11 A2.2: o sistema sugere, mas a volta pra ativo continua sendo decisao do administrador
          <Aviso tom="ok" titulo="Não resta documento obrigatório vencido.">
            O prestador continua pendente até alguém confirmar a volta para ativo na aba{" "}
            <Link href={`/prestadores/${id}/situacao`} className="underline">
              Situação cadastral
            </Link>
            .
          </Aviso>
        )
      )}

      <div className="space-y-4">
        <div className="cartao overflow-x-auto">
          <h2 className="cartao-titulo">Documentos enviados</h2>
          {documentos.length === 0 ? (
            <p className="px-4 py-6 text-sm text-tinta2">Nenhum documento enviado ainda.</p>
          ) : (
            <table className="tabela min-w-[620px]">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Arquivo</th>
                  <th>Emissão</th>
                  <th>Validade</th>
                  <th>Situação</th>
                  <th className="acoes"></th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((d) => {
                  const s = situacaoDocumento(d.data_validade, dia);
                  return (
                    <tr key={d.id_documento}>
                      <td>
                        {d.tipo.nome}
                        <span className="secundario">{d.versao_atual ? (d.tipo.obrigatorio ? "Obrigatório" : "Opcional") : "Versão anterior"}</span>
                      </td>
                      <td className="break-words">
                        {d.nome_arquivo}
                        <span className="secundario">{tamanhoArquivo(d.tamanho_bytes)}</span>
                      </td>
                      <td>{dataBR(d.data_emissao)}</td>
                      <td>{d.data_validade ? dataBR(d.data_validade) : "Não expira"}</td>
                      <td>{d.versao_atual ? <Chip tom={s.tipo}>{s.texto}</Chip> : <Chip tom="neutro">Substituído</Chip>}</td>
                      <td className="acoes">
                        {d.arquivo_url && (
                          <a href={`/arquivos/documento/${d.id_documento}`} className="botao botao-pequeno">
                            Baixar
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="colunas">
          <FormDocumentoAdmin id={id} tipos={tipos.map((t) => ({ id: t.id_tipo_documento, nome: t.nome, exige_validade: t.exige_validade }))} />
          <section className="cartao overflow-x-auto">
            <h2 className="cartao-titulo">Tipos de documento</h2>
            <table className="tabela">
              <thead>
                <tr><th>Tipo</th><th>Obrigatório</th><th>Tem validade</th></tr>
              </thead>
              <tbody>
                {tipos.map((t) => (
                  <tr key={t.id_tipo_documento}>
                    <td>{t.nome}</td>
                    <td>{t.obrigatorio ? "Sim" : "Não"}</td>
                    <td>{t.exige_validade ? "Sim" : "Não expira"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-regua-clara px-5 py-3 text-xs text-tinta2">Obrigatório vencido deixa o prestador pendente e fora da atribuição (RN02).</p>
          </section>
        </div>
      </div>
    </>
  );
}
