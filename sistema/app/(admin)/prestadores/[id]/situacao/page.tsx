import { ChipSituacao, Tempo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { dataHoraBR } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";
import { FormSituacao } from "../../formularios";

const nome = (s: string) => s[0].toUpperCase() + s.slice(1);

// T04d - situacao cadastral com motivo e historico (UC11, TA33)
export default async function SituacaoPrestador({ params }: { params: Promise<{ id: string }> }) {
  await exigirPerfil("administrador");
  const id = Number((await params).id);
  const [prestador, historico] = await Promise.all([
    prisma.prestador.findUniqueOrThrow({ where: { id_prestador: id } }),
    prisma.historico_situacao.findMany({ where: { id_prestador: id }, include: { usuario: true }, orderBy: { alterado_em: "desc" } }),
  ]);

  return (
    <div className="colunas">
      <div>
        <p className="mb-3 text-sm">
          Situação atual: <ChipSituacao situacao={prestador.situacao} />
        </p>
        <FormSituacao id={id} atual={prestador.situacao} />
      </div>

      <div className="cartao">
        <h2 className="cartao-titulo">Histórico de situação</h2>
        <div className="p-4">
          <Tempo
            itens={historico.map((h) => ({
              titulo: h.situacao_anterior ? `${nome(h.situacao_anterior)} para ${h.situacao_nova}` : `Cadastro criado como ${h.situacao_nova}`,
              // usuario nulo = mudanca feita pela rotina do RN02
              quando: `${dataHoraBR(h.alterado_em)}, ${h.usuario ? `por ${h.usuario.nome}` : "pelo sistema"}`,
              texto: h.motivo,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
