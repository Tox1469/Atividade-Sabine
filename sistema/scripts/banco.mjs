// sobe um postgresql local sem precisar instalar nada nem ter docker.
// o pacote embedded-postgres baixa o binario do postgres junto com o npm install.
// uso: npm run banco (deixar o terminal aberto enquanto estiver usando o sistema)
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const pasta = "./.banco";
const porta = 5433; // 5433 pra nao brigar com algum postgres que ja esteja instalado na 5432

const pg = new EmbeddedPostgres({
  databaseDir: pasta,
  user: "sgp",
  password: "sgp",
  port: porta,
  persistent: true,
  onLog: () => {}, // o postgres fala muito, deixa so os erros aparecerem
});

if (!existsSync(pasta)) {
  console.log("primeira vez: criando a pasta do banco em " + pasta);
  await pg.initialise();
}

await pg.start();

// sgp e o banco de uso. sgp_teste e so dos testes de integracao, que criam e sujam dados a vontade
for (const nome of ["sgp", "sgp_teste"]) {
  try {
    await pg.createDatabase(nome);
    console.log(`banco ${nome} criado`);
  } catch {
    // ja existe, segue
  }
}

console.log(`postgres rodando: postgresql://sgp:sgp@localhost:${porta}/sgp`);
console.log("ctrl+c para parar");

async function parar() {
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", parar);
process.on("SIGTERM", parar);
