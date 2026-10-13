import { Aviso, Chip, Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { documentosDoPrestador } from "@/lib/documentos";
import { situacaoDocumento } from "@/lib/dominio/documento";
import { dataBR, hoje } from "@/lib/formato";
import { exigirPrestador } from "@/lib/permissao";
import { FormMeuDocumento } from "./formulario";

// T15 - meus documentos (UC08 pelo prestador, TA29)
export default async function MeusDocumentos() {
  const { prestador } = await exigirPrestador();
  const dia = hoje();
  const [documentos, tipos] = await Promise.all([
    documentosDoPrestador(prestador.id_prestador),
    prisma.tipo_documento.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);
  const atuais = documentos.filter((d) => d.versao_atual);
  const problemas = atuais
    .filter((d) => d.tipo.obrigatorio)
    .map((d) => ({ d, s: situacaoDocumento(d.data_validade, dia) }))
    .filter(({ s }) => s.tipo !== "em_dia");
  const vencido = problemas.find(({ s }) => s.tipo === "vencido");
  const vence = problemas.find(({ s }) => s.tipo === "vence");

  return (
    <div className="mx-auto max-w-6xl">
      <Titulo titulo="Meus documentos" subtitulo="Documento obrigatório em dia é o que mantém você recebendo ordens" />

      {vencido ? (
        <Aviso tom="erro" titulo={`${vencido.d.tipo.nome} venceu em ${dataBR(vencido.d.data_validade)}.`}>
          Enquanto não for renovado, você fica pendente e não recebe ordem nova (RN02). Envie a versão nova ao lado.
        </Aviso>
      ) : (
        vence && (
          <Aviso tom="atencao" titulo="Um documento obrigatório está para vencer.">
            {vence.d.tipo.nome} vence em {dataBR(vence.d.data_validade)}. Documento vencido tira o prestador da lista de atribuição até a regularização (RN02).
          </Aviso>
        )
      )}

      <div className="colunas">
        <div className="cartao overflow-x-auto" style={{ flexGrow: 2 }}>
          <h2 className="cartao-titulo">Documentos enviados</h2>
          {atuais.length === 0 ? (
            <p className="px-4 py-6 text-sm text-tinta2">Você ainda não enviou nenhum documento.</p>
          ) : (
            <table className="tabela min-w-[420px]">
              <thead>
                <tr><th>Tipo</th><th>Validade</th><th>Situação</th><th></th></tr>
              </thead>
              <tbody>
                {atuais.map((d) => {
                  const s = situacaoDocumento(d.data_validade, dia);
                  return (
                    <tr key={d.id_documento}>
                      <td>
                        {d.tipo.nome}
                        <span className="secundario">{d.tipo.obrigatorio ? "Obrigatório" : "Opcional"}</span>
                      </td>
                      <td>{d.data_validade ? dataBR(d.data_validade) : "Não expira"}</td>
                      <td><Chip tom={s.tipo}>{s.texto}</Chip></td>
                      <td className="acoes">{d.arquivo_url && <a href={`/arquivos/documento/${d.id_documento}`} className="botao botao-pequeno">Ver</a>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <FormMeuDocumento tipos={tipos.map((t) => ({ id: t.id_tipo_documento, nome: t.nome, exige_validade: t.exige_validade }))} />
      </div>
    </div>
  );
}
