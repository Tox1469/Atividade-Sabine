// volta o banco e os arquivos pra carga inicial, apagando tudo o que foi feito depois dela.
// roda antes de cada apresentacao: a demonstracao comeca limpa e com as datas contadas de hoje.
// apaga de verdade o banco do DATABASE_URL e os arquivos do storage. o publicado so combinando antes.
// uso: npm run db:restaurar (este script limpa, o prisma db seed que vem depois carrega de novo)
import { PrismaClient } from "@prisma/client";
import { apagarArquivo } from "../lib/storage";

const prisma = new PrismaClient();

async function main() {
  const [destino] = await prisma.$queryRaw<{ banco: string; esquema: string }[]>`select current_database() as banco, current_schema() as esquema`;
  console.log(`limpando o banco ${destino.banco}, esquema ${destino.esquema}`);

  // os arquivos primeiro: se cair no meio, o banco ainda sabe quais faltam e e so rodar de novo
  const arquivos = [...(await prisma.documento.findMany({ select: { arquivo_url: true } })), ...(await prisma.contrato.findMany({ select: { arquivo_url: true } }))]
    .map((a) => a.arquivo_url)
    .filter(Boolean);
  for (const arquivo of arquivos) await apagarArquivo(arquivo);

  // restart identity: os ids voltam a comecar do 1, entao os links da documentacao continuam valendo
  const tabelas = await prisma.$queryRaw<{ tablename: string }[]>`select tablename from pg_tables where schemaname = current_schema() and tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`truncate ${tabelas.map((t) => `"${t.tablename}"`).join(", ")} restart identity cascade`);
  console.log(`${arquivos.length} arquivos e ${tabelas.length} tabelas limpos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
