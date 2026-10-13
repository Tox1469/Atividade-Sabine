import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { impedimento, type Impedimento } from "@/lib/dominio/aptidao";
import { inicioJanelaNota, notaMedia } from "@/lib/dominio/avaliacao";
import { EM_ANDAMENTO } from "@/lib/dominio/ordem";
import { hoje } from "@/lib/formato";

type Banco = Prisma.TransactionClient | typeof prisma;

// o que precisa vir junto do prestador pra decidir a aptidao no dia de hoje
function incluirParaAptidao(dia: Date) {
  return {
    documentos: {
      where: { versao_atual: true, data_validade: { lt: dia }, tipo: { obrigatorio: true } },
      include: { tipo: true },
      orderBy: { data_validade: "asc" as const },
    },
    contratos: { where: { data_inicio: { lte: dia }, data_fim: { gte: dia } }, take: 1 },
    categorias: { where: { ativa: true }, select: { id_categoria: true } },
  };
}

type PrestadorComAptidao = Prisma.prestadorGetPayload<{ include: ReturnType<typeof incluirParaAptidao> }>;

function avaliar(p: PrestadorComAptidao, idCategoria: number, categoria: string, recusaram: Set<number>) {
  return impedimento(
    {
      situacao: p.situacao,
      habilitado: p.categorias.some((c) => c.id_categoria === idCategoria),
      documentosVencidos: p.documentos.map((d) => ({ tipo: d.tipo.nome, validade: d.data_validade! })),
      contratoVigente: p.contratos.length > 0,
      recusouEstaOrdem: recusaram.has(p.id_prestador),
    },
    categoria,
  );
}

// UC14 A3.1: quem recusou a ordem nao volta a aparecer pra ela. a recusa fica no historico
// da ordem como a volta de "atribuida" pra "aberta", gravada pelo usuario do prestador
async function prestadoresQueRecusaram(db: Banco, idOrdem: number) {
  const recusas = await db.andamento_ordem.findMany({
    where: { id_ordem: idOrdem, status_anterior: "atribuida", status_novo: "aberta" },
    select: { usuario: { select: { prestador: { select: { id_prestador: true } } } } },
  });
  return new Set(recusas.map((r) => r.usuario.prestador?.id_prestador).filter((id): id is number => !!id));
}

export async function notasDosPrestadores(ids: number[], db: Banco = prisma) {
  const avaliacoes = await db.avaliacao.findMany({
    where: { avaliado_em: { gte: inicioJanelaNota() }, ordem: { id_prestador: { in: ids } } },
    select: { nota: true, ordem: { select: { id_prestador: true } } },
  });
  const porPrestador = new Map<number, number[]>();
  for (const a of avaliacoes) {
    const id = a.ordem.id_prestador!;
    porPrestador.set(id, [...(porPrestador.get(id) ?? []), a.nota]);
  }
  return new Map(ids.map((id) => [id, notaMedia(porPrestador.get(id) ?? [])]));
}

// T12b: os aptos (com nota, ordens em andamento e ultimo atendimento) e os inaptos com o motivo
export async function candidatosDaOrdem(idOrdem: number, idCategoria: number, categoria: string) {
  const dia = hoje();
  const incluir = incluirParaAptidao(dia);
  const recusaram = await prestadoresQueRecusaram(prisma, idOrdem);

  const [habilitados, naoHabilitados, totalNaoHabilitados] = await Promise.all([
    prisma.prestador.findMany({
      where: { categorias: { some: { id_categoria: idCategoria, ativa: true } } },
      include: incluir,
      orderBy: { nome_razao_social: "asc" },
    }),
    // ativos de outras categorias aparecem so pra explicar por que nao estao na lista
    prisma.prestador.findMany({
      where: { situacao: "ativo", categorias: { none: { id_categoria: idCategoria, ativa: true } } },
      include: incluir,
      orderBy: { nome_razao_social: "asc" },
      take: 8,
    }),
    prisma.prestador.count({ where: { situacao: "ativo", categorias: { none: { id_categoria: idCategoria, ativa: true } } } }),
  ]);

  const aptos: PrestadorComAptidao[] = [];
  const inaptos: { prestador: PrestadorComAptidao; motivo: Impedimento }[] = [];
  for (const p of [...habilitados, ...naoHabilitados]) {
    const motivo = avaliar(p, idCategoria, categoria, recusaram);
    if (motivo) inaptos.push({ prestador: p, motivo });
    else aptos.push(p);
  }

  const ids = aptos.map((p) => p.id_prestador);
  const [notas, andamento, ultimos] = await Promise.all([
    notasDosPrestadores(ids),
    prisma.ordem_servico.groupBy({ by: ["id_prestador"], where: { id_prestador: { in: ids }, status: { in: EM_ANDAMENTO } }, _count: true }),
    prisma.ordem_servico.groupBy({ by: ["id_prestador"], where: { id_prestador: { in: ids }, status: "concluida" }, _max: { data_conclusao: true } }),
  ]);

  return {
    aptos: aptos.map((p) => ({
      prestador: p,
      nota: notas.get(p.id_prestador) ?? null,
      emAndamento: andamento.find((a) => a.id_prestador === p.id_prestador)?._count ?? 0,
      ultimoAtendimento: ultimos.find((u) => u.id_prestador === p.id_prestador)?._max.data_conclusao ?? null,
    })),
    inaptos,
    outrosNaoHabilitados: Math.max(0, totalNaoHabilitados - naoHabilitados.length),
  };
}

// UC13 passo 6: na hora de gravar a aptidao e conferida de novo, dentro da mesma transacao
export async function conferirAptidao(tx: Prisma.TransactionClient, idPrestador: number, idOrdem: number, idCategoria: number, categoria: string) {
  const p = await tx.prestador.findUnique({ where: { id_prestador: idPrestador }, include: incluirParaAptidao(hoje()) });
  if (!p) return { chip: "", tom: "neutro", texto: "Prestador não encontrado" };
  return avaliar(p, idCategoria, categoria, await prestadoresQueRecusaram(tx, idOrdem));
}

// RN02: quem esta ativo e tem documento obrigatorio vencido passa pra pendente, registrado
// como alteracao do sistema (usuario nulo no historico). roda todo dia pela rotina agendada
export async function aplicarVencimentos() {
  const dia = hoje();
  const vencidos = await prisma.prestador.findMany({
    where: {
      situacao: "ativo",
      documentos: { some: { versao_atual: true, data_validade: { lt: dia }, tipo: { obrigatorio: true } } },
    },
    include: incluirParaAptidao(dia),
  });

  // so muda quem ainda esta ativo na hora de gravar: se o administrador bloqueou ou inativou
  // o prestador entre a busca e a gravacao, a rotina nao desfaz a decisao dele
  let alterados = 0;
  for (const p of vencidos) {
    const doc = p.documentos[0];
    const mudou = await prisma.$transaction(async (tx) => {
      const r = await tx.prestador.updateMany({ where: { id_prestador: p.id_prestador, situacao: "ativo" }, data: { situacao: "pendente" } });
      if (r.count === 0) return false;
      await tx.historico_situacao.create({
        data: {
          id_prestador: p.id_prestador,
          situacao_anterior: "ativo",
          situacao_nova: "pendente",
          motivo: `Documento obrigatório vencido: ${doc.tipo.nome.toLowerCase()} (RN02).`,
          id_usuario: null,
        },
      });
      return true;
    });
    if (mudou) alterados++;
  }
  return alterados;
}
