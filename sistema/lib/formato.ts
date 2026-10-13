// as colunas @db.Date (prazo, validade, emissao) chegam do prisma como meia-noite em utc,
// entao sao formatadas em utc. horario de evento (timestamp) formata no fuso de brasilia
const FUSO = "America/Sao_Paulo";
const DIA = 24 * 60 * 60 * 1000;

export function dataBR(data: Date | null | undefined) {
  return data ? data.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "";
}

export function dataHoraBR(data: Date) {
  const texto = data.toLocaleString("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return texto.replace(", ", " às ");
}

// dia de hoje em brasilia, no mesmo formato das colunas date (meia-noite utc)
export function hoje(agora = new Date()) {
  return new Date(agora.toLocaleDateString("en-CA", { timeZone: FUSO }) + "T00:00:00Z");
}

// o dia (em brasilia) em que um timestamp aconteceu, pra comparar com coluna date
export function diaDe(instante: Date) {
  return hoje(instante);
}

export function somarDias(data: Date, dias: number) {
  return new Date(data.getTime() + dias * DIA);
}

export function diasEntre(de: Date, ate: Date) {
  return Math.round((ate.getTime() - de.getTime()) / DIA);
}

// valor do <input type="date"> (aaaa-mm-dd) para Date e de volta
export function lerData(texto: string | null | undefined) {
  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const data = new Date(texto + "T00:00:00Z");
  return Number.isNaN(data.getTime()) ? null : data;
}

export function paraCampoData(data: Date | null | undefined) {
  return data ? data.toISOString().slice(0, 10) : "";
}

export function dinheiro(valor: number | string | { toString(): string } | null | undefined) {
  if (valor === null || valor === undefined) return "";
  return Number(valor.toString()).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function tamanhoArquivo(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}
