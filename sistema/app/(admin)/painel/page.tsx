import Link from "next/link";
import { Aviso, Chip, ChipStatus, Titulo, Vazio } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { situacaoDocumento } from "@/lib/dominio/documento";
import { emAtraso, foiAceita, semRespostaHaMaisDe24h } from "@/lib/dominio/ordem";
import { dadosNovaOrdem, FILTRO_ACEITE } from "@/lib/ordens";
import { BotaoAtribuir, BotaoNovaOrdem } from "../ordens/formularios";
import { dataBR, diasEntre, hoje, plural, somarDias } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";

export const metadata = { title: "Painel do dia" };

// T02 - painel do dia: o que o administrador precisa resolver hoje
export default async function Painel() {
  await exigirPerfil("administrador");
  const dia = hoje();
  const agora = new Date();
  const inicioMes = new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), 1));

  const [vencidos, aVencer, abertas, emAndamento, concluidasMes, pendentes, novaOrdem] = await Promise.all([
    prisma.documento.findMany({ where: { versao_atual: true, data_validade: { lt: dia } }, include: { tipo: true, prestador: true }, orderBy: { data_validade: "asc" } }),
    prisma.documento.findMany({ where: { versao_atual: true, data_validade: { gte: dia, lte: somarDias(dia, 30) } }, include: { tipo: true, prestador: true }, orderBy: { data_validade: "asc" } }),
    prisma.ordem_servico.findMany({ where: { status: "aberta" }, include: { cliente: true, servico: { include: { categoria: true } } }, orderBy: { prazo: "asc" } }),
    prisma.ordem_servico.findMany({
      where: { status: { in: ["atribuida", "em_execucao"] } },
      include: { cliente: true, servico: { include: { categoria: true } }, andamentos: { where: FILTRO_ACEITE } },
      orderBy: { prazo: "asc" },
    }),
    prisma.ordem_servico.findMany({ where: { status: "concluida", data_conclusao: { gte: inicioMes } }, select: { entregue_no_prazo: true } }),
    // prestador pendente que ja mandou documento: esta esperando alguem conferir
    prisma.prestador.count({ where: { situacao: "pendente", documentos: { some: { versao_atual: true } } } }),
    dadosNovaOrdem(),
  ]);

  // precisa de acao: aberta (atribuir), atrasada, ou atribuida sem resposta ha mais de 24h (UC14 E3.1)
  const precisamAcao = [
    ...abertas.map((o) => ({ o, motivo: emAtraso(o.status, o.prazo, dia) ? "Atrasada" : "" })),
    ...emAndamento
      .map((o) => ({
        o,
        motivo: emAtraso(o.status, o.prazo, dia)
          ? "Atrasada"
          : semRespostaHaMaisDe24h(o.status, o.data_atribuicao, foiAceita(o.data_atribuicao, o.andamentos), agora)
            ? "Sem resposta há mais de 24h"
            : "",
      }))
      .filter((x) => x.motivo),
  ].sort((a, b) => a.o.prazo.getTime() - b.o.prazo.getTime());

  const pendentesVencidos = new Set(vencidos.filter((d) => d.prestador.situacao === "pendente").map((d) => d.id_prestador)).size;
  const bloqueadosVencidos = new Set(vencidos.filter((d) => d.prestador.situacao === "bloqueado").map((d) => d.id_prestador)).size;
  const prazoCurto = abertas.filter((o) => diasEntre(dia, o.prazo) <= 1).length;
  const noPrazo = concluidasMes.filter((o) => o.entregue_no_prazo).length;
  const emRisco = [...vencidos, ...aVencer.filter((d) => diasEntre(dia, d.data_validade!) <= 15)].slice(0, 8);
  const nome = (p: { nome_fantasia: string | null; nome_razao_social: string }) => p.nome_fantasia ?? p.nome_razao_social;

  return (
    <div className="w-full">
      <Titulo
        titulo="Painel do dia"
        subtitulo={
          <>
            {dataBR(dia)}.{" "}
            <Link href="/vencimentos" className={vencidos.length ? "font-medium text-carimbo hover:underline" : "hover:underline"}>
              {vencidos.length === 0 ? "Nenhum documento vencido" : plural(vencidos.length, "documento vencido", "documentos vencidos")}
            </Link>
            {vencidos.length > 0 && ` (${plural(pendentesVencidos, "prestador pendente", "prestadores pendentes")}, ${plural(bloqueadosVencidos, "bloqueado", "bloqueados")})`},{" "}
            <Link href="/vencimentos" className="hover:underline">{aVencer.length === 0 ? "nenhum vence" : `${aVencer.length} ${aVencer.length === 1 ? "vence" : "vencem"}`} nos próximos 30 dias</Link>
            {" e "}
            <Link href="/relatorios/desempenho" className="hover:underline">
              {concluidasMes.length === 0 ? "nenhuma ordem concluída no mês" : `${plural(concluidasMes.length, "ordem concluída", "ordens concluídas")} no mês, ${noPrazo === concluidasMes.length ? "todas no prazo" : `${Math.round((noPrazo / concluidasMes.length) * 100)}% no prazo`}`}
            </Link>
            .
          </>
        }
      >
        <BotaoNovaOrdem {...novaOrdem} />
      </Titulo>

      {pendentes > 0 && (
        <Aviso titulo={`${plural(pendentes, "prestador pendente já enviou documentos", "prestadores pendentes já enviaram documentos")} e espera conferência.`}>
          <Link href="/prestadores?situacao=pendente" className="underline">Ver os pendentes</Link> e, com a documentação em dia, mudar a situação para ativo.
        </Aviso>
      )}

      <div className="cartao mb-4 overflow-x-auto">
        <h2 className="cartao-titulo">
          Ordens que precisam de ação <span className="font-normal text-tinta2">{precisamAcao.length}</span>
          {prazoCurto > 0 && <span className="ml-2 text-sm font-normal text-carimbo">{plural(prazoCurto, "com prazo", "com prazo")} até amanhã</span>}
        </h2>
        {precisamAcao.length === 0 ? (
          <Vazio titulo="Nenhuma ordem esperando atribuição ou atrasada." />
        ) : (
          <table className="tabela min-w-[720px]">
            <thead>
              <tr><th>Número</th><th>Cliente</th><th>Serviço</th><th>Prazo</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {precisamAcao.map(({ o, motivo }) => (
                <tr key={o.id_ordem}>
                  <td className="whitespace-nowrap">{o.numero}</td>
                  <td>{o.cliente.nome_fantasia ?? o.cliente.nome_razao_social}</td>
                  <td>
                    {o.servico.nome}
                    <span className="secundario">{o.servico.categoria.nome}</span>
                  </td>
                  <td className="whitespace-nowrap">{dataBR(o.prazo)}</td>
                  <td>
                    <ChipStatus status={o.status} /> {motivo && <Chip tom="atraso">{motivo}</Chip>}
                  </td>
                  <td className="acoes">
                    {o.status === "aberta" ? (
                      <BotaoAtribuir idOrdem={o.id_ordem} />
                    ) : (
                      <Link href={`/ordens/${o.id_ordem}`} className="botao botao-pequeno">Abrir</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="cartao overflow-x-auto">
        <h2 className="cartao-titulo">
          Documentação em risco <span className="font-normal text-tinta2">{emRisco.length}</span>
        </h2>
        {emRisco.length === 0 ? (
          <Vazio titulo="Nenhum documento vencido nem vencendo nos próximos 15 dias." />
        ) : (
          <table className="tabela min-w-[620px]">
            <thead>
              <tr><th>Prestador</th><th>Documento</th><th>Validade</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {emRisco.map((d) => {
                const s = situacaoDocumento(d.data_validade, dia);
                return (
                  <tr key={d.id_documento}>
                    <td>{nome(d.prestador)}</td>
                    <td>{d.tipo.nome}</td>
                    <td>{dataBR(d.data_validade)}</td>
                    <td><Chip tom={s.tipo}>{s.texto}</Chip></td>
                    <td className="acoes"><Link href={`/prestadores/${d.id_prestador}/documentos`} className="botao botao-pequeno">Ver cadastro</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
