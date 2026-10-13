import { Aviso, Chip } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { dataBR, dinheiro, hoje } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";
import { FormContrato } from "../../formularios";

// contratos do prestador (UC10, TA50). a vigencia entra na aptidao pela RN03 (TA51)
export default async function ContratosPrestador({ params }: { params: Promise<{ id: string }> }) {
  await exigirPerfil("administrador");
  const id = Number((await params).id);
  const dia = hoje();
  const contratos = await prisma.contrato.findMany({ where: { id_prestador: id }, orderBy: { data_inicio: "desc" } });
  const vigente = contratos.find((c) => c.data_inicio <= dia && c.data_fim >= dia);

  return (
    <>
      {!vigente && (
        <Aviso tom="atencao" titulo="Sem contrato dentro da vigência hoje.">
          Pela RN03 o prestador não recebe nova atribuição até ter um contrato vigente. As ordens que ele já está executando continuam normalmente.
        </Aviso>
      )}
      <div className="colunas">
        <div className="cartao overflow-x-auto" style={{ flexGrow: 2 }}>
          <h2 className="cartao-titulo">Contratos</h2>
          {contratos.length === 0 ? (
            <p className="px-4 py-6 text-sm text-tinta2">Nenhum contrato cadastrado.</p>
          ) : (
            <table className="tabela min-w-[520px]">
              <thead>
                <tr><th>Número</th><th>Vigência</th><th className="numerico">Valor</th><th>Situação</th><th className="acoes"></th></tr>
              </thead>
              <tbody>
                {contratos.map((c) => (
                  <tr key={c.id_contrato}>
                    <td>{c.numero}</td>
                    <td>{dataBR(c.data_inicio)} a {dataBR(c.data_fim)}</td>
                    <td className="numerico">{c.valor === null ? "-" : dinheiro(c.valor)}</td>
                    <td>
                      {c === vigente ? <Chip tom="ativo">Vigente</Chip> : c.data_fim < dia ? <Chip tom="neutro">Encerrado</Chip> : <Chip tom="aberta">Futuro</Chip>}
                    </td>
                    <td className="acoes"><a href={`/arquivos/contrato/${c.id_contrato}`} className="botao botao-pequeno">Baixar</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <FormContrato id={id} />
      </div>
    </>
  );
}
