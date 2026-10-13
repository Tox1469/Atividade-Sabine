import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { TIPOS_ACEITOS, validarArquivo } from "@/lib/dominio/documento";

// documentos e contratos. publicado, vai pro bucket privado "sgp" do storage do supabase.
// rodando local sem SUPABASE_URL, vai pra pasta .arquivos, pra ninguem precisar de conta pra testar.
// o banco guarda so o caminho; o arquivo so e entregue pela rota /arquivos, que confere a permissao.
//
// na vercel a requisicao pra funcao tem limite de 4,5 mb, menos que os 10 mb do RNF09. por isso,
// publicado, o navegador sobe o arquivo direto pro storage com um link assinado e o servidor
// confere depois o tamanho e o comeco do arquivo antes de gravar qualquer coisa no banco
const URL_SUPABASE = process.env.SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SECRET_KEY;
const BUCKET = "sgp";
const PASTA_LOCAL = path.join(process.cwd(), ".arquivos");

export const storageRemoto = !!URL_SUPABASE;

const cabecalhos = () => ({ apikey: CHAVE!, Authorization: `Bearer ${CHAVE}` });
const objeto = (caminho: string) => `${URL_SUPABASE}/storage/v1/object/${BUCKET}/${caminho}`;

function novoCaminho(pasta: string, tipo: string) {
  return `${pasta}/${randomUUID()}.${TIPOS_ACEITOS[tipo] ?? "bin"}`;
}

// link pro navegador subir um arquivo direto no storage. null quando o storage e local
export async function linkDeEnvio(pasta: string, tipo: string) {
  if (!URL_SUPABASE) return null;
  const caminho = novoCaminho(pasta, tipo);
  const resposta = await fetch(`${URL_SUPABASE}/storage/v1/object/upload/sign/${BUCKET}/${caminho}`, {
    method: "POST",
    headers: cabecalhos(),
  });
  if (!resposta.ok) throw new Error(`storage nao gerou o link de envio: ${resposta.status}`);
  const { url } = (await resposta.json()) as { url: string };
  return { caminho, url: `${URL_SUPABASE}/storage/v1${url}` };
}

export async function apagarArquivo(caminho: string) {
  if (URL_SUPABASE) {
    await fetch(`${URL_SUPABASE}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: { ...cabecalhos(), "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [caminho] }),
    });
  } else {
    await rm(path.join(PASTA_LOCAL, caminho), { force: true });
  }
}

type Recebido = { caminho: string; nome: string; tamanho: number } | { erro: string };

// pega o arquivo do formulario, valida (RNF09) e devolve onde ficou guardado.
// local: o arquivo vem dentro do form. publicado: vem so o caminho do que o navegador ja subiu
export async function receberArquivo(form: FormData, pasta: string, aceitos?: string[]): Promise<Recebido> {
  if (URL_SUPABASE) {
    const caminho = String(form.get("arquivo_caminho") ?? "");
    const nome = String(form.get("arquivo_nome") ?? "arquivo");
    // o caminho vem do navegador: so vale se for da pasta certa, senao alguem apontaria pro arquivo de outro
    if (!caminho.startsWith(pasta + "/") || caminho.includes("..")) return { erro: "Selecione o arquivo." };

    const resposta = await fetch(objeto(caminho), { headers: { ...cabecalhos(), Range: "bytes=0-15" } });
    if (!resposta.ok) return { erro: "O arquivo não chegou ao servidor. Tente enviar de novo." };
    const inicio = new Uint8Array(await resposta.arrayBuffer());
    const tamanho = Number(resposta.headers.get("content-range")?.split("/")[1] ?? inicio.length);

    const erro = validarArquivo(inicio, aceitos, tamanho);
    if (erro) {
      await apagarArquivo(caminho);
      return { erro };
    }
    return { caminho, nome: nome.slice(0, 255), tamanho };
  }

  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Selecione o arquivo." };
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const erro = validarArquivo(bytes, aceitos);
  if (erro) return { erro };

  const tipo = Object.keys(TIPOS_ACEITOS).find((t) => validarArquivo(bytes, [t]) === null)!;
  const caminho = novoCaminho(pasta, tipo);
  const destino = path.join(PASTA_LOCAL, caminho);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, bytes);
  return { caminho, nome: arquivo.name.slice(0, 255), tamanho: arquivo.size };
}

// gravacao direta, sem passar pelo navegador. so a carga inicial usa (prisma/seed.ts)
export async function guardarArquivo(pasta: string, bytes: Uint8Array, tipo: string) {
  const caminho = novoCaminho(pasta, tipo);
  if (URL_SUPABASE) {
    const resposta = await fetch(objeto(caminho), { method: "POST", headers: { ...cabecalhos(), "Content-Type": tipo }, body: Buffer.from(bytes) });
    if (!resposta.ok) throw new Error(`storage recusou o arquivo: ${resposta.status}`);
  } else {
    const destino = path.join(PASTA_LOCAL, caminho);
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, bytes);
  }
  return caminho;
}

// publicado: link assinado que vale 5 minutos. local: o proprio arquivo
export async function abrirArquivo(caminho: string): Promise<{ link: string } | { bytes: Buffer }> {
  if (URL_SUPABASE) {
    const resposta = await fetch(`${URL_SUPABASE}/storage/v1/object/sign/${BUCKET}/${caminho}`, {
      method: "POST",
      headers: { ...cabecalhos(), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 300 }),
    });
    if (!resposta.ok) throw new Error(`storage nao gerou o link: ${resposta.status}`);
    const { signedURL } = (await resposta.json()) as { signedURL: string };
    return { link: `${URL_SUPABASE}/storage/v1${signedURL}` };
  }
  return { bytes: await readFile(path.join(PASTA_LOCAL, caminho)) };
}
