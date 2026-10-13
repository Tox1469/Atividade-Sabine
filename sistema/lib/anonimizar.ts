import { prisma } from "@/lib/db";
import { EM_ABERTO, EM_ANDAMENTO } from "@/lib/dominio/ordem";
import { registrarLog } from "@/lib/log";
import { apagarArquivo } from "@/lib/storage";

// RNF10 (TA57): a pedido da pessoa, os dados pessoais saem do cadastro mas o registro fica,
// porque as ordens, as avaliacoes e o log apontam pra ele (nada e apagado, RN06 e RF19).
// os arquivos de documento pessoal (rg, cpf, certidao) sao apagados do storage.
// contrato fica, porque e documento da empresa e tem prazo legal de guarda
const REMOVIDO = "dado removido";

function camposAnonimos(id: number) {
  return {
    nome_razao_social: `Cadastro anonimizado nº ${id}`,
    nome_fantasia: null,
    cpf_cnpj: `ANON${String(id).padStart(10, "0")}`,
    telefone: REMOVIDO,
    email: null,
    logradouro: REMOVIDO,
    numero: "-",
    complemento: null,
    bairro: REMOVIDO,
    cidade: REMOVIDO,
    cep: "00000000",
  };
}

async function desativarUsuario(idUsuario: number | null) {
  if (!idUsuario) return;
  await prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data: { ativo: false, nome: REMOVIDO, email: `anonimizado-${idUsuario}@sgp.invalido` },
  });
}

export async function anonimizarPrestador(id: number, idAdmin: number) {
  const prestador = await prisma.prestador.findUniqueOrThrow({ where: { id_prestador: id } });
  const presas = await prisma.ordem_servico.findMany({ where: { id_prestador: id, status: { in: EM_ANDAMENTO } }, select: { numero: true } });
  if (presas.length > 0) {
    return { erro: `Não dá para anonimizar com ordem em andamento: ${presas.map((o) => o.numero).join(", ")}. Conclua ou realoque antes.` };
  }

  const documentos = await prisma.documento.findMany({ where: { id_prestador: id, arquivo_url: { not: "" } } });
  for (const d of documentos) await apagarArquivo(d.arquivo_url);

  await prisma.$transaction(async (tx) => {
    await tx.prestador.update({
      where: { id_prestador: id },
      data: {
        ...camposAnonimos(id),
        situacao: "inativo",
        atualizado_em: new Date(),
        historicos: {
          create: { situacao_anterior: prestador.situacao, situacao_nova: "inativo", motivo: "Dados pessoais anonimizados a pedido do titular (RNF10).", id_usuario: idAdmin },
        },
      },
    });
    await tx.documento.updateMany({ where: { id_prestador: id }, data: { arquivo_url: "", nome_arquivo: "arquivo removido na anonimização" } });
    await registrarLog(tx, idAdmin, "anonimizacao", "prestador", id, "dados pessoais e arquivos de documento removidos a pedido do titular");
  });
  await desativarUsuario(prestador.id_usuario);
  return { ok: true };
}

export async function anonimizarCliente(id: number, idAdmin: number) {
  const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id_cliente: id } });
  const abertas = await prisma.ordem_servico.findMany({ where: { id_cliente: id, status: { in: EM_ABERTO } }, select: { numero: true } });
  if (abertas.length > 0) {
    return { erro: `Não dá para anonimizar com ordem em aberto: ${abertas.map((o) => o.numero).join(", ")}. Conclua ou cancele antes.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.cliente.update({ where: { id_cliente: id }, data: { ...camposAnonimos(id), ativo: false } });
    await registrarLog(tx, idAdmin, "anonimizacao", "cliente", id, "dados pessoais removidos a pedido do titular");
  });
  await desativarUsuario(cliente.id_usuario);
  return { ok: true };
}
