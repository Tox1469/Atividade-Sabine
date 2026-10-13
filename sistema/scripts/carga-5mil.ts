// RNF06: as listagens tem que responder em ate 3 segundos com 5 mil registros.
// esta carga cria 5 mil prestadores ficticios pra medir isso. eles entram pendentes, sem
// categoria e sem documento, como uma base importada esperando conferencia, entao nao
// aparecem na atribuicao de ordem nem mexem na demonstracao.
// rodar:  npx tsx scripts/carga-5mil.ts          (cria)
//         npx tsx scripts/carga-5mil.ts --apagar (tira todos de novo)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MARCA = "@carga.sgp.teste"; // o e-mail marca quem veio desta carga
const TOTAL = 5000;

const nomes = ["Ana", "Bruno", "Carla", "Diego", "Elaine", "Fabio", "Gisele", "Henrique", "Isabela", "Joao", "Karina", "Leandro", "Marcia", "Nelson", "Olivia", "Paulo", "Renata", "Sergio", "Tatiane", "Vitor"];
const sobrenomes = ["Almeida", "Barbosa", "Cardoso", "Dias", "Esteves", "Ferreira", "Gomes", "Hoffmann", "Lima", "Moraes", "Nogueira", "Oliveira", "Pereira", "Queiroz", "Ribeiro", "Santos", "Teixeira", "Vieira", "Zanella", "Costa"];
const ramos = ["ELETRICA", "HIDRAULICA", "LIMPEZA", "REFRIGERACAO", "PINTURAS", "REFORMAS", "SERVICOS", "MANUTENCAO", "INSTALACOES", "CLIMATIZACAO"];

// digito verificador de cpf (9 digitos) e cnpj (12 digitos), pra base passar na validacao
function comDigitos(base: string, pesos1: number[], pesos2: number[]) {
  const d = base.split("").map(Number);
  for (const pesos of [pesos1, pesos2]) {
    const r = d.reduce((s, n, i) => s + n * pesos[i], 0) % 11;
    d.push(r < 2 ? 0 : 11 - r);
  }
  return d.join("");
}
const cpf = (n: number) => comDigitos(String(700000000 + n).slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
const cnpj = (n: number) => comDigitos(String(60000000 + n).padStart(8, "0") + "0001", [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

async function main() {
  if (process.argv.includes("--apagar")) {
    const r = await prisma.prestador.deleteMany({ where: { email: { endsWith: MARCA } } });
    console.log(`${r.count} prestadores da carga apagados`);
    return;
  }
  const ja = await prisma.prestador.count({ where: { email: { endsWith: MARCA } } });
  if (ja > 0) {
    console.log(`a carga ja esta no banco (${ja} prestadores). use --apagar antes pra refazer`);
    return;
  }

  const lote = Array.from({ length: TOTAL }, (_, i) => {
    const juridica = i % 3 !== 0;
    const nome = nomes[i % 20];
    const sobrenome = sobrenomes[Math.floor(i / 20) % 20];
    return {
      tipo_pessoa: juridica ? "J" : "F",
      nome_razao_social: juridica ? `${ramos[i % 10]} ${sobrenome.toUpperCase()} ${String(i).padStart(4, "0")} LTDA` : `${nome} ${sobrenome} ${sobrenomes[(i + 7) % 20]}`.toUpperCase(),
      nome_fantasia: juridica ? `${ramos[i % 10][0]}${ramos[i % 10].slice(1).toLowerCase()} ${sobrenome}` : null,
      cpf_cnpj: juridica ? cnpj(i) : cpf(i),
      telefone: `(44) 9${String(80000000 + i).slice(0, 4)}-${String(i).padStart(4, "0")}`,
      email: `prestador${i}${MARCA}`,
      logradouro: "Rua das Flores",
      numero: String((i % 900) + 10),
      bairro: "Centro",
      cidade: "Maringá",
      uf: "PR",
      cep: "87013000",
      situacao: "pendente",
    };
  });

  const inicio = Date.now();
  for (let i = 0; i < lote.length; i += 1000) await prisma.prestador.createMany({ data: lote.slice(i, i + 1000), skipDuplicates: true });
  console.log(`${TOTAL} prestadores criados em ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
