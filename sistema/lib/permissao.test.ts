import { beforeEach, describe, expect, it, vi } from "vitest";

// a sessao continua valida no cookie, mas a conta mudou no banco depois do login.
// o banco e falso e devolve a conta que cada teste definir
type Conta = { ativo: boolean; perfil: string } | null;
const estado = vi.hoisted(() => ({ conta: null as Conta, perfil: "administrador" }));

vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "7", perfil: estado.perfil, name: "Teste", email: "teste@sgp.teste" } }) }));
vi.mock("@/lib/db", () => ({ prisma: { usuario: { findUnique: async () => estado.conta } } }));

async function destino(promessa: Promise<unknown>) {
  try {
    await promessa;
    return "liberou";
  } catch (erro) {
    const digest = String((erro as { digest?: string }).digest ?? erro);
    return digest.includes("/sair") ? "/sair" : digest.includes("/sem-permissao") ? "/sem-permissao" : digest;
  }
}

beforeEach(() => {
  estado.perfil = "administrador";
  estado.conta = { ativo: true, perfil: "administrador" };
});

describe("conta conferida no banco a cada requisicao", () => {
  it("conta ativa com o mesmo perfil passa", async () => {
    const { exigirPerfil } = await import("./permissao");
    expect(await destino(exigirPerfil("administrador"))).toBe("liberou");
  });

  it("conta desativada depois do login e mandada pra sair", async () => {
    const { exigirPerfil, usuarioLogado } = await import("./permissao");
    estado.conta = { ativo: false, perfil: "administrador" };
    expect(await destino(exigirPerfil("administrador"))).toBe("/sair");
    expect(await destino(usuarioLogado())).toBe("/sair");
  });

  it("perfil trocado no banco nao vale com o cookie antigo", async () => {
    const { exigirPerfil } = await import("./permissao");
    estado.conta = { ativo: true, perfil: "cliente" };
    expect(await destino(exigirPerfil("administrador"))).toBe("/sair");
  });

  it("usuario apagado do banco e mandado pra sair", async () => {
    const { exigirPerfil } = await import("./permissao");
    estado.conta = null;
    expect(await destino(exigirPerfil("administrador"))).toBe("/sair");
  });

  it("perfil errado no cookie continua indo pra sem permissao", async () => {
    const { exigirPerfil } = await import("./permissao");
    estado.perfil = "prestador";
    expect(await destino(exigirPerfil("administrador"))).toBe("/sem-permissao");
  });
});
