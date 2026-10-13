import { prisma } from "@/lib/db";
import { lerData, hoje, dataBR } from "@/lib/formato";
import { valoresDo, type EstadoFormulario } from "@/lib/formulario";
import { apagarArquivo, receberArquivo } from "@/lib/storage";

// UC08: o mesmo envio serve pro prestador (T15) e pro administrador em nome dele (T04c).
// quem chama ja conferiu a permissao e passa o prestador certo
export async function gravarDocumento(idPrestador: number, idUsuario: number, form: FormData): Promise<EstadoFormulario> {
  const valores = valoresDo(form);
  const erros: Record<string, string[]> = {};

  const tipo = await prisma.tipo_documento.findFirst({ where: { id_tipo_documento: Number(valores.id_tipo_documento) || 0, ativo: true } });
  if (!tipo) erros.id_tipo_documento = ["Escolha o tipo do documento."];

  const emissao = lerData(valores.data_emissao);
  if (!emissao) erros.data_emissao = ["Informe a data de emissão."];
  else if (emissao > hoje()) erros.data_emissao = ["A data de emissão não pode ser futura."];

  // A3.2: tipo sem vencimento (rg, cpf) nao tem validade e vale sempre
  const validade = tipo?.exige_validade ? lerData(valores.data_validade) : null;
  if (tipo?.exige_validade && !validade) erros.data_validade = ["Este tipo de documento tem validade. Informe a data."];
  if (emissao && validade && emissao > validade) {
    // E6.4: destaca os dois campos
    erros.data_emissao = ["A emissão não pode ser depois da validade."];
    erros.data_validade = ["A validade não pode ser antes da emissão."];
  }

  const arquivo = await receberArquivo(form, `documentos/${idPrestador}`);
  if ("erro" in arquivo) erros.arquivo = [arquivo.erro];

  if (Object.keys(erros).length > 0) {
    if (!("erro" in arquivo)) await apagarArquivo(arquivo.caminho);
    return { erros, mensagem: "Confira os campos destacados.", valores };
  }
  if ("erro" in arquivo || !tipo || !emissao) throw new Error("inalcancavel");

  // TA30: a versao nova vira a atual e a anterior continua guardada, marcada como substituida
  await prisma.$transaction([
    prisma.documento.updateMany({
      where: { id_prestador: idPrestador, id_tipo_documento: tipo.id_tipo_documento, versao_atual: true },
      data: { versao_atual: false },
    }),
    prisma.documento.create({
      data: {
        id_prestador: idPrestador,
        id_tipo_documento: tipo.id_tipo_documento,
        nome_arquivo: arquivo.nome,
        arquivo_url: arquivo.caminho,
        tamanho_bytes: arquivo.tamanho,
        data_emissao: emissao,
        data_validade: validade,
        enviado_por: idUsuario,
      },
    }),
  ]);

  // E6.3: aceita, mas avisa que ja entrou vencido
  if (validade && validade < hoje()) {
    return { ok: `Documento enviado: ${tipo.nome}. A validade (${dataBR(validade)}) já passou, então ele entra como vencido.` };
  }
  return { ok: `Documento enviado: ${tipo.nome}.` };
}

// T04c e T15: a versao atual de cada tipo e as substituidas, mais recentes primeiro
export function documentosDoPrestador(idPrestador: number) {
  return prisma.documento.findMany({
    where: { id_prestador: idPrestador },
    include: { tipo: true },
    orderBy: [{ versao_atual: "desc" }, { tipo: { nome: "asc" } }, { enviado_em: "desc" }],
  });
}
