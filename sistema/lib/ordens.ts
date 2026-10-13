import { Prisma } from "@prisma/client";
import { conferirAptidao } from "@/lib/aptidao";
import { prisma } from "@/lib/db";
import { calcularPrazo, entregueNoPrazo, foiAceita, NOME_STATUS, numeroOrdem, transicaoPermitida } from "@/lib/dominio/ordem";
import { hoje } from "@/lib/formato";
import { registrarLog } from "@/lib/log";

// todas as mudancas de status da ordem passam por aqui (RN05). cada uma grava a ordem,
// o andamento (RF13) e, quando e acao critica, o log (RF19) na mesma transacao.
// o update sempre exige o status que a ordem tinha quando a tela abriu: se outra pessoa mexeu
// antes, nada e gravado e a pessoa recebe o aviso (UC13 E7.1). quem chama ja conferiu o perfil
type Resultado = { ok: string; id?: number } | { erro: string };

export const FILTRO_ACEITE = { status_anterior: "atribuida", status_novo: "atribuida", usuario: { perfil: "prestador" } } satisfies Prisma.andamento_ordemWhereInput;

const nomeDe = (p: { nome_fantasia: string | null; nome_razao_social: string }) => p.nome_fantasia ?? p.nome_razao_social;

async function mudou(idOrdem: number) {
  const atual = await prisma.ordem_servico.findUnique({
    where: { id_ordem: idOrdem },
    include: { andamentos: { include: { usuario: true }, orderBy: { registrado_em: "desc" }, take: 1 } },
  });
  if (!atual) return "Ordem não encontrada.";
  const ultimo = atual.andamentos[0];
  return `A ordem mudou enquanto a tela estava aberta: agora está ${NOME_STATUS[atual.status].toLowerCase()}${
    ultimo ? `, por ${ultimo.usuario.nome}` : ""
  }. A tela foi atualizada.`;
}

type NovaOrdem = { idCliente: number; idServico: number; descricao: string; prioridade: string; prazoDesejado: Date | null; local: string | null; idUsuario: number };

// UC12 - abrir ordem (TA36, TA37)
export async function abrirOrdem(n: NovaOrdem): Promise<Resultado> {
  const [cliente, servico] = await Promise.all([
    prisma.cliente.findUnique({ where: { id_cliente: n.idCliente } }),
    prisma.servico.findUnique({ where: { id_servico: n.idServico }, include: { categoria: true } }),
  ]);
  if (!cliente?.ativo) return { erro: "Cliente inativo não pode abrir solicitação. Fale com o administrador." }; // E4.3
  if (!servico?.ativo || !servico.categoria.ativa) return { erro: "Esse serviço não está mais disponível no catálogo." };

  const dia = hoje();
  const prazo = calcularPrazo(dia, servico.prazo_padrao_dias, n.prazoDesejado);
  const ano = dia.getUTCFullYear();

  // o numero e sequencial no ano. duas aberturas ao mesmo tempo podem pegar o mesmo numero:
  // o unique do banco recusa a segunda, que tenta de novo com o proximo
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      const ordem = await prisma.$transaction(async (tx) => {
        const ultima = await tx.ordem_servico.findFirst({ where: { numero: { startsWith: `OS-${ano}-` } }, orderBy: { id_ordem: "desc" } });
        const sequencia = ultima ? Number(ultima.numero.split("-")[2]) + 1 : 1;
        return tx.ordem_servico.create({
          data: {
            numero: numeroOrdem(ano, sequencia),
            id_cliente: n.idCliente,
            id_servico: n.idServico,
            descricao: n.descricao,
            local_atendimento: n.local,
            prioridade: n.prioridade,
            prazo,
            aberta_por: n.idUsuario,
            andamentos: {
              create: {
                status_anterior: null,
                status_novo: "aberta",
                observacao: n.prazoDesejado ? "Prazo informado na solicitação." : `Prazo padrão do serviço: ${servico.prazo_padrao_dias} dias.`,
                id_usuario: n.idUsuario,
              },
            },
          },
        });
      });
      return { ok: ordem.numero, id: ordem.id_ordem };
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") continue;
      throw erro;
    }
  }
  return { erro: "Não foi possível gerar o número da ordem. Tente de novo." };
}

// UC13 - atribuir (TA40) e A5.1 - trocar o prestador antes da execucao, com motivo
export async function atribuir(idOrdem: number, idPrestador: number, idAdmin: number, motivoTroca?: string): Promise<Resultado> {
  const ordem = await prisma.ordem_servico.findUniqueOrThrow({
    where: { id_ordem: idOrdem },
    include: { servico: { include: { categoria: true } }, prestador: true },
  });
  const troca = ordem.status === "atribuida";
  if (!troca && ordem.status !== "aberta") return { erro: `Ordem ${NOME_STATUS[ordem.status].toLowerCase()} não pode ser atribuída (RN05).` };
  if (troca && ordem.id_prestador === idPrestador) return { erro: "A ordem já está com esse prestador." };
  if (troca && (motivoTroca ?? "").trim().length < 10) return { erro: "Para trocar o prestador, informe o motivo com no mínimo 10 caracteres." };

  const resultado = await prisma.$transaction(async (tx) => {
    // UC13 passo 6: a aptidao e conferida de novo na hora de gravar (E6.1)
    const impedimento = await conferirAptidao(tx, idPrestador, idOrdem, ordem.servico.id_categoria, ordem.servico.categoria.nome);
    if (impedimento) return { erro: `O prestador deixou de estar apto: ${impedimento.texto.toLowerCase()}. A lista foi atualizada.` };

    const prestador = await tx.prestador.findUniqueOrThrow({ where: { id_prestador: idPrestador } });
    const gravou = await tx.ordem_servico.updateMany({
      where: { id_ordem: idOrdem, status: ordem.status, id_prestador: ordem.id_prestador },
      data: { status: "atribuida", id_prestador: idPrestador, data_atribuicao: new Date() },
    });
    if (gravou.count === 0) return null;

    const texto = troca ? `De ${nomeDe(ordem.prestador!)} para ${nomeDe(prestador)}: ${motivoTroca!.trim()}` : `Atribuída a ${nomeDe(prestador)}.`;
    await tx.andamento_ordem.create({ data: { id_ordem: idOrdem, status_anterior: ordem.status, status_novo: "atribuida", observacao: texto, id_usuario: idAdmin } });
    await registrarLog(tx, idAdmin, "atribuicao", "ordem_servico", idOrdem, `${ordem.numero}: ${texto}`);
    return { ok: troca ? `Ordem ${ordem.numero} passou para ${nomeDe(prestador)}.` : `Ordem ${ordem.numero} atribuída a ${nomeDe(prestador)}.` };
  });
  return resultado ?? { erro: await mudou(idOrdem) };
}

type DoPrestador = { idOrdem: number; idPrestador: number; idUsuario: number };

async function ordemDoPrestador({ idOrdem, idPrestador }: DoPrestador) {
  // UC15 E2.2: ordem de outro prestador e recusada mesmo se a tela foi manipulada (RNF02)
  return prisma.ordem_servico.findFirst({ where: { id_ordem: idOrdem, id_prestador: idPrestador } });
}

// UC14 - aceitar (TA52)
export async function aceitar(p: DoPrestador): Promise<Resultado> {
  const ordem = await ordemDoPrestador(p);
  if (!ordem) return { erro: "Ordem não encontrada." };
  if (ordem.status !== "atribuida") return { erro: await mudou(p.idOrdem) };

  // a linha da ordem fica travada ate o fim da transacao: dois cliques seguidos em Aceitar
  // esperam um pelo outro e o segundo ja encontra o aceite gravado
  const resultado = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id_ordem FROM ordem_servico WHERE id_ordem = ${p.idOrdem} FOR UPDATE`;
    const atual = await tx.ordem_servico.findFirst({
      where: { id_ordem: p.idOrdem, id_prestador: p.idPrestador, status: "atribuida" },
      include: { andamentos: { where: FILTRO_ACEITE } },
    });
    if (!atual) return null;
    if (foiAceita(atual.data_atribuicao, atual.andamentos)) return "ja aceita";
    await tx.andamento_ordem.create({
      data: { id_ordem: p.idOrdem, status_anterior: "atribuida", status_novo: "atribuida", observacao: "O prestador aceitou a ordem.", id_usuario: p.idUsuario },
    });
    return "aceita";
  });
  if (resultado === null) return { erro: await mudou(p.idOrdem) };
  if (resultado === "ja aceita") return { erro: "Esta ordem já foi aceita. Quando começar o serviço, use Iniciar execução." };
  return { ok: "Ordem aceita. Quando começar o serviço, use Iniciar execução." };
}

// UC14 A3.1 - recusar: a ordem volta pra fila e esse prestador nao aparece mais pra ela
export async function recusar(p: DoPrestador, motivo: string): Promise<Resultado> {
  if (motivo.trim().length < 10) return { erro: "Informe o motivo da recusa com no mínimo 10 caracteres." };
  const ordem = await ordemDoPrestador(p);
  if (!ordem) return { erro: "Ordem não encontrada." };
  if (!transicaoPermitida(ordem.status, "aberta")) return { erro: "Só dá para recusar antes de iniciar a execução." };

  const gravou = await prisma.$transaction(async (tx) => {
    const r = await tx.ordem_servico.updateMany({
      where: { id_ordem: p.idOrdem, id_prestador: p.idPrestador, status: "atribuida" },
      data: { status: "aberta", id_prestador: null, data_atribuicao: null },
    });
    if (r.count === 0) return false;
    await tx.andamento_ordem.create({ data: { id_ordem: p.idOrdem, status_anterior: "atribuida", status_novo: "aberta", observacao: motivo.trim(), id_usuario: p.idUsuario } });
    return true;
  });
  return gravou ? { ok: `Ordem ${ordem.numero} devolvida para a fila do administrador.` } : { erro: await mudou(p.idOrdem) };
}

// UC15 - iniciar a execucao, depois do aceite
export async function iniciar(p: DoPrestador): Promise<Resultado> {
  const ordem = await prisma.ordem_servico.findFirst({
    where: { id_ordem: p.idOrdem, id_prestador: p.idPrestador },
    include: { andamentos: { where: FILTRO_ACEITE } },
  });
  if (!ordem) return { erro: "Ordem não encontrada." };
  if (!transicaoPermitida(ordem.status, "em_execucao")) return { erro: `A ordem está ${NOME_STATUS[ordem.status].toLowerCase()} e não pode entrar em execução (RN05).` };
  if (!foiAceita(ordem.data_atribuicao, ordem.andamentos)) return { erro: "Aceite a ordem antes de iniciar a execução." };

  const gravou = await prisma.$transaction(async (tx) => {
    const r = await tx.ordem_servico.updateMany({
      where: { id_ordem: p.idOrdem, id_prestador: p.idPrestador, status: "atribuida" },
      data: { status: "em_execucao", data_inicio_execucao: new Date() },
    });
    if (r.count === 0) return false;
    await tx.andamento_ordem.create({ data: { id_ordem: p.idOrdem, status_anterior: "atribuida", status_novo: "em_execucao", id_usuario: p.idUsuario } });
    return true;
  });
  return gravou ? { ok: "Execução iniciada." } : { erro: await mudou(p.idOrdem) };
}

// UC15 passo 4 - observacao de andamento, visivel pro cliente e pro administrador
export async function registrarAndamento(p: DoPrestador, observacao: string): Promise<Resultado> {
  if (observacao.trim().length < 3) return { erro: "Escreva o que foi feito até agora." };
  const ordem = await ordemDoPrestador(p);
  if (!ordem) return { erro: "Ordem não encontrada." };
  if (ordem.status !== "em_execucao") return { erro: "Andamento só pode ser registrado com a ordem em execução." };
  await prisma.andamento_ordem.create({
    data: { id_ordem: p.idOrdem, status_anterior: "em_execucao", status_novo: "em_execucao", observacao: observacao.trim(), id_usuario: p.idUsuario },
  });
  return { ok: "Andamento registrado." };
}

// UC16 - concluir (TA43, TA44). grava se foi no prazo (RN12) e trava a ordem (RN06)
export async function concluir(p: DoPrestador, relato: string): Promise<Resultado> {
  if (relato.trim().length < 10) return { erro: "Descreva o que foi executado antes de concluir a ordem (mínimo de 10 caracteres)." };
  const ordem = await ordemDoPrestador(p);
  if (!ordem) return { erro: "Ordem não encontrada." };
  if (ordem.status === "concluida") return { erro: "A ordem já está concluída e não pode mais ser alterada (RN06)." };
  if (!transicaoPermitida(ordem.status, "concluida")) return { erro: "Inicie a execução antes de concluir (RN05)." };

  const agora = new Date();
  const gravou = await prisma.$transaction(async (tx) => {
    const r = await tx.ordem_servico.updateMany({
      where: { id_ordem: p.idOrdem, id_prestador: p.idPrestador, status: "em_execucao" },
      data: { status: "concluida", data_conclusao: agora, relato_conclusao: relato.trim(), entregue_no_prazo: entregueNoPrazo(agora, ordem.prazo) },
    });
    if (r.count === 0) return false;
    await tx.andamento_ordem.create({ data: { id_ordem: p.idOrdem, status_anterior: "em_execucao", status_novo: "concluida", observacao: relato.trim(), id_usuario: p.idUsuario } });
    return true;
  });
  return gravou ? { ok: `Ordem ${ordem.numero} concluída. A avaliação fica liberada para o cliente.` } : { erro: await mudou(p.idOrdem) };
}

// UC17 - cancelar (TA45): antes da conclusao, com motivo, no historico e no log
export async function cancelar(idOrdem: number, idAdmin: number, motivo: string): Promise<Resultado> {
  const texto = motivo.trim();
  if (texto.length < 10) return { erro: `O motivo precisa ter no mínimo 10 caracteres. Faltam ${10 - texto.length}.` }; // RN07
  const ordem = await prisma.ordem_servico.findUniqueOrThrow({ where: { id_ordem: idOrdem } });
  if (ordem.status === "concluida") return { erro: "Ordem concluída não pode ser cancelada. Para corrigir, abra uma nova ordem (RN06)." };
  if (!transicaoPermitida(ordem.status, "cancelada")) return { erro: "A ordem já está cancelada." };

  const gravou = await prisma.$transaction(async (tx) => {
    const r = await tx.ordem_servico.updateMany({ where: { id_ordem: idOrdem, status: ordem.status }, data: { status: "cancelada", motivo_cancelamento: texto.slice(0, 255) } });
    if (r.count === 0) return false;
    await tx.andamento_ordem.create({ data: { id_ordem: idOrdem, status_anterior: ordem.status, status_novo: "cancelada", observacao: texto, id_usuario: idAdmin } });
    await registrarLog(tx, idAdmin, "cancelamento", "ordem_servico", idOrdem, `${ordem.numero}: ${texto}`);
    return true;
  });
  return gravou ? { ok: `Ordem ${ordem.numero} cancelada.` } : { erro: await mudou(idOrdem) };
}

// UC18 - avaliar (TA46, TA47): so o cliente titular, so depois de concluida, uma vez (RN08)
export async function avaliar(idOrdem: number, idCliente: number, nota: number, comentario: string): Promise<Resultado> {
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) return { erro: "Escolha uma nota de 1 a 5." };
  const ordem = await prisma.ordem_servico.findFirst({ where: { id_ordem: idOrdem, id_cliente: idCliente }, include: { avaliacao: true } });
  if (!ordem) return { erro: "Ordem não encontrada." }; // E1.3
  if (ordem.status !== "concluida") return { erro: "A avaliação fica disponível depois que o serviço for concluído." }; // E1.1
  if (ordem.avaliacao) return { erro: "Esta ordem já foi avaliada." }; // E1.2

  try {
    await prisma.avaliacao.create({ data: { id_ordem: idOrdem, nota, comentario: comentario.trim().slice(0, 500) || null } });
  } catch (erro) {
    // o unique em id_ordem segura duas avaliacoes enviadas ao mesmo tempo
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") return { erro: "Esta ordem já foi avaliada." };
    throw erro;
  }
  return { ok: "Obrigado pela avaliação." };
}

// categorias e servicos ativos, no formato do formulario de abertura (T17)
export async function catalogoAtivo() {
  const categorias = await prisma.categoria_servico.findMany({
    where: { ativa: true, servicos: { some: { ativo: true } } },
    include: { servicos: { where: { ativo: true }, orderBy: { nome: "asc" } } },
    orderBy: { nome: "asc" },
  });
  return categorias.map((c) => ({
    id: c.id_categoria,
    nome: c.nome,
    servicos: c.servicos.map((s) => ({ id: s.id_servico, nome: s.nome, valor: s.valor_referencia?.toString() ?? null, prazo: s.prazo_padrao_dias })),
  }));
}

export function enderecoDe(p: { logradouro: string; numero: string; complemento: string | null; bairro: string; cidade: string }) {
  return `${p.logradouro}, ${p.numero}${p.complemento ? ` ${p.complemento}` : ""} - ${p.bairro}, ${p.cidade}`;
}
