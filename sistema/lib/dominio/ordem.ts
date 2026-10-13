import { diaDe, somarDias } from "@/lib/formato";

export const STATUS = ["aberta", "atribuida", "em_execucao", "concluida", "cancelada"] as const;
export type Status = (typeof STATUS)[number];

export const NOME_STATUS: Record<string, string> = {
  aberta: "Aberta",
  atribuida: "Atribuída",
  em_execucao: "Em execução",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const PRIORIDADES = ["baixa", "normal", "alta", "urgente"] as const;

// ordem que ainda prende o prestador, o cliente ou o servico (RN11 e UC04/UC06)
export const EM_ANDAMENTO: Status[] = ["atribuida", "em_execucao"];
export const EM_ABERTO: Status[] = ["aberta", "atribuida", "em_execucao"];

const SEGUINTE: Record<string, Status> = { aberta: "atribuida", atribuida: "em_execucao", em_execucao: "concluida" };

// RN05: so anda pra frente, um passo por vez. as excecoes sao o cancelamento antes da
// conclusao (RN06 e RN07) e a recusa do prestador, que devolve a ordem pra fila (UC14)
export function transicaoPermitida(de: string, para: string) {
  if (para === "cancelada") return de !== "concluida" && de !== "cancelada";
  if (de === "atribuida" && para === "aberta") return true;
  return SEGUINTE[de] === para;
}

// UC12 A3.1: sem prazo informado vale o prazo padrao do servico, contado a partir de hoje
export function calcularPrazo(hoje: Date, prazoPadraoDias: number, desejado: Date | null) {
  return desejado ?? somarDias(hoje, prazoPadraoDias);
}

// RN12: no prazo quando o dia da conclusao (em brasilia) nao passa do prazo combinado
export function entregueNoPrazo(conclusao: Date, prazo: Date) {
  return diaDe(conclusao) <= prazo;
}

export function emAtraso(status: string, prazo: Date, hoje: Date) {
  return status !== "concluida" && status !== "cancelada" && hoje > prazo;
}

export function numeroOrdem(ano: number, sequencia: number) {
  return `OS-${ano}-${String(sequencia).padStart(4, "0")}`;
}

type Andamento = { status_anterior: string | null; status_novo: string; perfil: string };

// o historico da ordem (andamento_ordem) so guarda de que status pra que status foi e quem fez.
// daqui sai o titulo que aparece na linha do tempo das telas T12, T14 e T18
export function tituloAndamento(a: Andamento) {
  const { status_anterior: de, status_novo: para } = a;
  if (de === null) return "Ordem aberta";
  if (para === "cancelada") return "Ordem cancelada";
  if (de === "aberta" && para === "atribuida") return "Ordem atribuída";
  if (de === "atribuida" && para === "atribuida") return a.perfil === "prestador" ? "Atribuição aceita" : "Prestador trocado";
  if (de === "atribuida" && para === "aberta") return "Atribuição recusada";
  if (para === "em_execucao" && de === "atribuida") return "Execução iniciada";
  if (de === "em_execucao" && para === "em_execucao") return "Andamento registrado";
  if (para === "concluida") return "Serviço concluído";
  return `${NOME_STATUS[de] ?? de} para ${NOME_STATUS[para] ?? para}`;
}

// aceite = o proprio prestador registrou atribuida -> atribuida depois da atribuicao atual
// (se o administrador trocar o prestador, a data de atribuicao muda e o aceite antigo nao vale)
export function foiAceita(atribuidaEm: Date | null, aceites: { registrado_em: Date }[]) {
  return !!atribuidaEm && aceites.some((a) => a.registrado_em >= atribuidaEm);
}

// UC14 E3.1: atribuida e sem resposta do prestador ha mais de 24 horas
export function semRespostaHaMaisDe24h(status: string, atribuidaEm: Date | null, aceita: boolean, agora: Date) {
  return status === "atribuida" && !aceita && !!atribuidaEm && agora.getTime() - atribuidaEm.getTime() > 24 * 60 * 60 * 1000;
}
