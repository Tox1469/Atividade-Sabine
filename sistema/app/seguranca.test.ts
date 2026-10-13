import { beforeEach, describe, expect, it, vi } from "vitest";

// RNF02: a permissao e decidida no servidor. aqui as actions e as rotas sao chamadas direto,
// como faria alguem mexendo na requisicao, sem passar pela tela. o banco e falso e explode se
// for tocado: o teste so passa se a recusa acontecer antes de qualquer leitura ou gravacao
type Sessao = { user: { id: string; perfil: string; name: string; email: string } } | null;
const sessao = vi.hoisted(() => ({ atual: null as Sessao }));

vi.mock("@/auth", () => ({ auth: async () => sessao.atual, signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-auth", () => ({ AuthError: class extends Error {}, CredentialsSignin: class extends Error {} }));
vi.mock("@/lib/db", () => {
  const explode = () => {
    throw new Error("tocou no banco");
  };
  const tabela = new Proxy({}, { get: () => explode });
  return { prisma: new Proxy({}, { get: (_, nome) => (nome === "$transaction" ? explode : tabela) }) };
});

const como = (perfil: string) => ({ user: { id: "1", perfil, name: "Teste", email: "teste@sgp.teste" } });

// o redirect do next vira um erro com o destino no digest
async function destino(promessa: Promise<unknown>) {
  try {
    await promessa;
    return "nao redirecionou";
  } catch (erro) {
    const digest = String((erro as { digest?: string }).digest ?? erro);
    return digest.includes("/sem-permissao") ? "/sem-permissao" : digest.includes("/login") ? "/login" : digest;
  }
}

const formulario = (campos: Record<string, string> = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};

beforeEach(() => {
  sessao.atual = null;
});

describe("actions do administrador", () => {
  it("sem sessao, manda pro login sem tocar no banco", async () => {
    const { salvarPrestador, alterarSituacao } = await import("./(admin)/prestadores/actions");
    const { cancelarOrdem, atribuirOrdem } = await import("./(admin)/ordens/actions");
    expect(await destino(salvarPrestador(null, {}, formulario()))).toBe("/login");
    expect(await destino(alterarSituacao(1, {}, formulario({ situacao: "ativo", motivo: "motivo qualquer" })))).toBe("/login");
    expect(await destino(cancelarOrdem(1, {}, formulario({ motivo: "cancelamento sem login" })))).toBe("/login");
    expect(await destino(atribuirOrdem(1, {}, formulario({ id_prestador: "1" })))).toBe("/login");
  });

  it("com perfil de prestador ou cliente, recusa", async () => {
    const { salvarPrestador } = await import("./(admin)/prestadores/actions");
    const { acaoUsuario } = await import("./(admin)/usuarios/actions");
    sessao.atual = como("prestador");
    expect(await destino(salvarPrestador(null, {}, formulario()))).toBe("/sem-permissao");
    sessao.atual = como("cliente");
    expect(await destino(acaoUsuario(1, {}, formulario({ acao: "senha" })))).toBe("/sem-permissao");
  });
});

describe("actions do prestador e do cliente", () => {
  it("o administrador nao executa ordem nem avalia no lugar de ninguem", async () => {
    const { acaoPrestador } = await import("./(prestador)/minhas-ordens/actions");
    const { avaliarAtendimento } = await import("./(cliente)/minhas-solicitacoes/actions");
    sessao.atual = como("administrador");
    expect(await destino(acaoPrestador(1, {}, formulario({ acao: "concluir", texto: "concluido pelo admin" })))).toBe("/sem-permissao");
    expect(await destino(avaliarAtendimento(1, {}, formulario({ nota: "5" })))).toBe("/sem-permissao");
  });

  it("sem sessao, nada", async () => {
    const { abrirSolicitacao } = await import("./(cliente)/minhas-solicitacoes/actions");
    const { enviarMeuDocumento } = await import("./(prestador)/meus-documentos/actions");
    expect(await destino(abrirSolicitacao({}, formulario()))).toBe("/login");
    expect(await destino(enviarMeuDocumento({}, formulario()))).toBe("/login");
  });
});

describe("cadastro pela tela de login", () => {
  it("nao deixa criar conta de administrador trocando o perfil na requisicao", async () => {
    const { criarConta } = await import("./cadastro/actions");
    // o tipo diz cliente ou prestador, mas quem manda a requisicao pode mandar qualquer coisa
    const r = await criarConta("administrador" as "cliente", {}, formulario({ email: "invasor@sgp.teste" }));
    expect(r.mensagem).toBe("Escolha se vai pedir ou prestar serviço.");
  });
});

describe("rotas de arquivo e de exportacao", () => {
  it("documento e contrato nao saem sem login", async () => {
    const { GET } = await import("./arquivos/[tipo]/[id]/route");
    const r = await GET(new Request("http://sgp/arquivos/documento/1"), { params: Promise.resolve({ tipo: "documento", id: "1" }) });
    expect(r.status).toBe(401);
  });

  it("contrato e so do administrador: prestador recebe 404 sem nem consultar", async () => {
    const { GET } = await import("./arquivos/[tipo]/[id]/route");
    sessao.atual = como("prestador");
    const r = await GET(new Request("http://sgp/arquivos/contrato/1"), { params: Promise.resolve({ tipo: "contrato", id: "1" }) });
    expect(r.status).toBe(404);
  });

  it("relatorio em csv e so do administrador", async () => {
    const { GET } = await import("./relatorios/exportar/route");
    sessao.atual = como("cliente");
    const r = await GET(new Request("http://sgp/relatorios/exportar?tipo=desempenho"));
    expect(r.status).toBe(403);
  });

  it("a rotina do RN02 nao roda sem o segredo do agendamento", async () => {
    const { GET } = await import("./api/rotinas/vencimentos/route");
    process.env.CRON_SECRET = "segredo-de-teste";
    expect((await GET(new Request("http://sgp/api/rotinas/vencimentos"))).status).toBe(401);
    expect((await GET(new Request("http://sgp/api/rotinas/vencimentos", { headers: { authorization: "Bearer chute" } }))).status).toBe(401);
  });
});
