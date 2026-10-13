import { dataBR } from "@/lib/formato";

// UC22: tudo que decide se o prestador pode receber a ordem fica aqui, num lugar so.
// a tela de atribuicao usa pra montar as duas listas e a action usa de novo na hora de gravar
export type Candidato = {
  situacao: string;
  habilitado: boolean;
  documentosVencidos: { tipo: string; validade: Date }[];
  contratoVigente: boolean;
  recusouEstaOrdem: boolean;
};

export type Impedimento = { chip: string; tom: string; texto: string };

const NOME_SITUACAO: Record<string, string> = { pendente: "Pendente", bloqueado: "Bloqueado", inativo: "Inativo" };

// verifica na ordem do UC22 e devolve o primeiro impedimento, ou null se esta apto
export function impedimento(c: Candidato, categoria: string): Impedimento | null {
  if (!c.habilitado) return { chip: "Categoria", tom: "neutro", texto: `Não está habilitado em ${categoria}` }; // RN04
  if (c.situacao !== "ativo") {
    return { chip: NOME_SITUACAO[c.situacao] ?? c.situacao, tom: c.situacao, texto: "Situação cadastral não permite atribuição" }; // RN01
  }
  if (c.documentosVencidos.length > 0) {
    const doc = c.documentosVencidos[0];
    return { chip: "Documento vencido", tom: "vencido", texto: `${doc.tipo} venceu em ${dataBR(doc.validade)}` }; // RN02
  }
  if (!c.contratoVigente) return { chip: "Contrato", tom: "neutro", texto: "Sem contrato dentro da vigência" }; // RN03
  if (c.recusouEstaOrdem) return { chip: "Recusou", tom: "neutro", texto: "Já recusou esta ordem" }; // UC14 A3.1
  return null;
}
