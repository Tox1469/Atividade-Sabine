import { notasDosPrestadores } from "@/lib/aptidao";
import { prisma } from "@/lib/db";
import { dataBR, hoje, lerData, somarDias } from "@/lib/formato";

// periodo dos relatorios: de/ate vindos do endereco, com um padrao quando faltam.
// UC21: data final antes da inicial e recusada
export function lerPeriodo(de: string | undefined, ate: string | undefined, diasPadrao: number) {
  const fim = lerData(ate) ?? hoje();
  const inicio = lerData(de) ?? somarDias(fim, -diasPadrao);
  return { inicio, fim, invalido: fim < inicio, texto: `${dataBR(inicio)} a ${dataBR(fim)}` };
}

// UC20 / RF17: por prestador, concluidas no periodo, nota media (RN09) e % no prazo (RN12).
// entram so os prestadores com pelo menos uma ordem concluida no periodo
export async function desempenho(inicio: Date, fim: Date) {
  const noPeriodo = { status: "concluida", data_conclusao: { gte: inicio, lt: somarDias(fim, 1) } };
  const [concluidas, noPrazo] = await Promise.all([
    prisma.ordem_servico.groupBy({ by: ["id_prestador"], where: noPeriodo, _count: true }),
    prisma.ordem_servico.groupBy({ by: ["id_prestador"], where: { ...noPeriodo, entregue_no_prazo: true }, _count: true }),
  ]);
  const ids = concluidas.map((c) => c.id_prestador!).filter(Boolean);
  const [prestadores, notas] = await Promise.all([
    prisma.prestador.findMany({ where: { id_prestador: { in: ids } } }),
    notasDosPrestadores(ids),
  ]);

  return concluidas.map((c) => {
    const p = prestadores.find((x) => x.id_prestador === c.id_prestador)!;
    const prazo = noPrazo.find((n) => n.id_prestador === c.id_prestador)?._count ?? 0;
    return {
      id: p.id_prestador,
      prestador: p.nome_fantasia ?? p.nome_razao_social,
      situacao: p.situacao,
      concluidas: c._count,
      nota: notas.get(p.id_prestador) ?? null,
      percentualNoPrazo: Math.round((prazo / c._count) * 100),
    };
  });
}

// UC21 / RF18: abertas, concluidas e canceladas no intervalo, agrupadas por categoria.
// a ordem nao guarda a data do cancelamento, entao ela sai do historico (andamento_ordem)
export async function servicosPorPeriodo(inicio: Date, fim: Date) {
  const intervalo = { gte: inicio, lt: somarDias(fim, 1) };
  const [categorias, abertas, concluidas, canceladas] = await Promise.all([
    prisma.categoria_servico.findMany({ orderBy: { nome: "asc" } }),
    prisma.ordem_servico.findMany({ where: { data_abertura: intervalo }, select: { servico: { select: { id_categoria: true } } } }),
    prisma.ordem_servico.findMany({ where: { status: "concluida", data_conclusao: intervalo }, select: { servico: { select: { id_categoria: true } } } }),
    prisma.andamento_ordem.findMany({ where: { status_novo: "cancelada", registrado_em: intervalo }, select: { ordem: { select: { servico: { select: { id_categoria: true } } } } } }),
  ]);
  const conta = (lista: { id_categoria: number }[], id: number) => lista.filter((x) => x.id_categoria === id).length;
  const a = abertas.map((o) => o.servico);
  const c = concluidas.map((o) => o.servico);
  const x = canceladas.map((o) => o.ordem.servico);

  return categorias
    .map((cat) => ({ categoria: cat.nome, abertas: conta(a, cat.id_categoria), concluidas: conta(c, cat.id_categoria), canceladas: conta(x, cat.id_categoria) }))
    .filter((l) => l.abertas + l.concluidas + l.canceladas > 0);
}
