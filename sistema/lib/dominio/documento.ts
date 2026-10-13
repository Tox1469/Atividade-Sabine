import { diasEntre } from "@/lib/formato";

// RNF09: pdf, jpg e png, ate 10 mb por arquivo
export const LIMITE_ARQUIVO = 10 * 1024 * 1024;
export const TIPOS_ACEITOS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// o tipo que o navegador manda pode ser trocado na mao. por isso o tipo vale pelo que
// esta escrito no comeco do arquivo, e nao pelo nome ou pelo content-type
export function tipoPeloConteudo(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf"; // %PDF
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  return null;
}

// devolve a mensagem de erro, ou null se o arquivo pode ser aceito. quando o arquivo esta no
// storage, so o comeco dele e lido, e o tamanho total vem a parte
export function validarArquivo(bytes: Uint8Array, aceitos = Object.keys(TIPOS_ACEITOS), tamanho = bytes.length): string | null {
  const formatos = aceitos.map((t) => TIPOS_ACEITOS[t].toUpperCase()).join(", ").replace(/, ([^,]*)$/, " ou $1");
  if (tamanho === 0) return "Selecione o arquivo.";
  if (tamanho > LIMITE_ARQUIVO) return `O arquivo passa de 10 MB. Envie em ${formatos}, com até 10 MB.`;
  const tipo = tipoPeloConteudo(bytes);
  if (!tipo || !aceitos.includes(tipo)) return `Formato não aceito. Envie o arquivo em ${formatos}, com até 10 MB.`;
  return null;
}

export type SituacaoDocumento = { tipo: "em_dia" | "vence" | "vencido"; dias: number; texto: string };

// vencido = a validade ja passou. a vencer = vence nos proximos 30 dias (RF08)
export function situacaoDocumento(validade: Date | null, hoje: Date): SituacaoDocumento {
  if (!validade) return { tipo: "em_dia", dias: 0, texto: "Em dia" };
  const dias = diasEntre(hoje, validade);
  if (dias < 0) {
    const atraso = -dias;
    return { tipo: "vencido", dias: atraso, texto: atraso === 1 ? "Vencido há 1 dia" : `Vencido há ${atraso} dias` };
  }
  if (dias === 0) return { tipo: "vence", dias, texto: "Vence hoje" };
  if (dias <= 30) return { tipo: "vence", dias, texto: dias === 1 ? "Vence amanhã" : `Vence em ${dias} dias` };
  return { tipo: "em_dia", dias, texto: "Em dia" };
}
