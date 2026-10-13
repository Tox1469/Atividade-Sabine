import Link from "next/link";
import { Chip, ChipStatus, Titulo, Vazio } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { situacaoDocumento } from "@/lib/dominio/documento";
import { emAtraso, foiAceita, semRespostaHaMaisDe24h } from "@/lib/dominio/ordem";
import { FILTRO_ACEITE } from "@/lib/ordens";
import { dataBR, diasEntre, hoje, plural, somarDias } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";

// T02 - painel do dia: o que o administrador precisa resolver hoje
export default async function Painel() {
  await exigirPerfil("administrador");
  const dia = hoje();
  const agora = new Date();
  const inicioMes = new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), 1));

  const [vencidos, aVencer, abertas, emAndamento, concluidasMes] = await Promise.all([
    prisma.documento.findMany({ where: { versao_atual: true, data_validade: { lt: dia } }, include: { tipo: true, prestador: true }, orderBy: { data_validade: "asc" } }),
    prisma.documento.findMany({ where: { versao_atual: true, data_validade: { gte: dia, lte: somarDias(dia, 30) } }, include: { tipo: true, prestador: true }, orderBy: { data_validade: "asc" } }),
    prisma.ordem_servico.findMany({ where: { status: "aberta" }, include: { cliente: true, servico: { include: { categoria: true } } }, orderBy: { prazo: "asc" } }),
    prisma.ordem_servico.findMany({
      where: { status: { in: ["atribuida", "em_execucao"] } },
      include: { cliente: true, servico: { include: { categoria: true } }, andamentos: { where: FILTRO_ACEITE } },
      orderBy: { prazo: "asc" },
    }),
    prisma.ordem_servico.findMany({ where: { status: "concluida", data_conclusao: { gte: inicioMes } }, select: { entregue_no_prazo: true } }),
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
    <div className="mx-auto max-w-6xl">
      <Titulo titulo="Painel do dia" subtitulo={`Situação em ${dataBR(dia)}`}>
        <Link href="/ordens/nova" className="botao-principal">Abrir ordem</Link>
      </Titulo>

      <div className="indicadores">
        <Link className="indicador alerta" href="/vencimentos">
          <div className="rotulo-ind">Documentos vencidos</div>
          <div className="numero">{vencidos.length}</div>
          <div className="detalhe">{vencidos.length === 0 ? "tudo em dia" : `${plural(pendentesVencidos, "pendente", "pendentes")} e ${plural(bloqueadosVencidos, "bloqueado", "bloqueados")}`}</div>
        </Link>
        <Link className="indicador atencao" href="/vencimentos">
          <div className="rotulo-ind">Vencem em 30 dias</div>
          <div className="numero">{aVencer.length}</div>
          <div className="detalhe">{aVencer.length === 0 ? "nenhum no período" : `o mais próximo em ${plural(diasEntre(dia, aVencer[0].data_validade!), "dia", "dias")}`}</div>
        </Link>
        <Link className="indicador" href="/ordens?status=aberta">
          <div className="rotulo-ind">Ordens aguardando atribuição</div>
          <div className="numero">{abertas.length}</div>
          <div className="detalhe">{prazoCurto === 0 ? "nenhuma com prazo curto" : `${plural(prazoCurto, "com prazo", "com prazo")} até amanhã`}</div>
        </Link>
        <Link className="indicador ok" href="/relatorios/desempenho">
          <div className="rotulo-ind">Concluídas no mês</div>
          <div className="numero">{concluidasMes.length}</div>
          <div className="detalhe">{concluidasMes.length === 0 ? "nenhuma ainda" : `${Math.round((noPrazo / concluidasMes.length) * 100)}% dentro do prazo`}</div>
        </Link>
      </div>

      <div className="cartao mb-4 overflow-x-auto">
        <h2 className="cartao-titulo">Ordens que precisam de ação</h2>
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
                      <Link href={`/ordens/${o.id_ordem}?janela=atribuir`} className="botao-principal botao-pequeno">Atribuir</Link>
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
        <h2 className="cartao-titulo">Documentação em risco</h2>
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
