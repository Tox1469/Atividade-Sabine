import { Janela } from "@/app/_componentes/janela";
import { Chip } from "@/app/_componentes/ui";
import { candidatosDaOrdem } from "@/lib/aptidao";
import { prisma } from "@/lib/db";
import { textoNota } from "@/lib/dominio/avaliacao";
import { dataBR, plural } from "@/lib/formato";
import { FormAtribuir } from "./formularios";

// T12b - abre por cima do painel, da lista de ordens ou da propria ordem. "fechar" e a tela de baixo
export async function JanelaAtribuir({ idOrdem, fechar }: { idOrdem: number; fechar: string }) {
  const ordem = await prisma.ordem_servico.findUnique({
    where: { id_ordem: idOrdem },
    include: { cliente: true, servico: { include: { categoria: true } } },
  });
  if (!ordem || (ordem.status !== "aberta" && ordem.status !== "atribuida")) return null;

  const troca = ordem.status === "atribuida";
  const categoria = ordem.servico.categoria.nome;
  const { aptos, inaptos, outrosNaoHabilitados } = await candidatosDaOrdem(ordem.id_ordem, ordem.servico.id_categoria, categoria);
  const nome = (p: { nome_fantasia: string | null; nome_razao_social: string }) => p.nome_fantasia ?? p.nome_razao_social;

  return (
    <Janela titulo={`${troca ? "Trocar o prestador da" : "Atribuir a"} ordem ${ordem.numero}`} fechar={fechar}>
      <FormAtribuir
        idOrdem={ordem.id_ordem}
        troca={troca}
        voltar={fechar}
        aptos={aptos
          .filter((a) => a.prestador.id_prestador !== ordem.id_prestador)
          .map((a) => ({
            id: a.prestador.id_prestador,
            nome: a.prestador.nome_razao_social,
            detalhe: a.prestador.nome_fantasia ?? `cadastrado em ${dataBR(a.prestador.criado_em)}`,
            nota: textoNota(a.nota),
            emAndamento: a.emAndamento,
            ultimo: a.ultimoAtendimento ? dataBR(a.ultimoAtendimento) : "Nenhum ainda",
          }))}
      >
        <p className="mb-3 text-sm text-tinta2">
          {ordem.servico.nome} para {nome(ordem.cliente)}, prazo {dataBR(ordem.prazo)}.
        </p>
        <p className="aviso">
          <strong>Aparecem apenas os prestadores aptos para esta ordem.</strong>
          Aptidão é estar ativo, estar habilitado na categoria {categoria}, não ter documento obrigatório vencido e ter contrato vigente (RN01 a RN04).
        </p>
      </FormAtribuir>

      {inaptos.length > 0 && (
        <div className="modal-corpo border-t border-regua-clara">
          <h3 className="mb-1 text-sm font-semibold">Não disponíveis para esta ordem</h3>
          <p className="ajuda mb-2">A lista evita a dúvida de por que um prestador conhecido não aparece. Nenhum deles pode ser selecionado.</p>
          <div className="overflow-x-auto">
            <table className="tabela min-w-[520px]">
              <thead>
                <tr><th>Prestador</th><th>Motivo do impedimento</th></tr>
              </thead>
              <tbody>
                {inaptos.map(({ prestador, motivo }) => (
                  <tr key={prestador.id_prestador}>
                    <td>{nome(prestador)}</td>
                    <td>
                      <Chip tom={motivo.tom}>{motivo.chip}</Chip> {motivo.texto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {outrosNaoHabilitados > 0 && (
            <p className="ajuda mt-2">
              E mais {plural(outrosNaoHabilitados, "prestador ativo", "prestadores ativos")} sem habilitação em {categoria}.
            </p>
          )}
        </div>
      )}
    </Janela>
  );
}
