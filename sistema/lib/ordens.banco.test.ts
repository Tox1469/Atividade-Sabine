import { execSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";

// testes de integracao das regras das ordens contra um postgres de verdade.
// rodam num banco separado (DATABASE_URL_TESTE no .env), nunca no banco de uso, e cada
// execucao cria os proprios dados com um sufixo novo, entao pode rodar quantas vezes quiser.
// sem DATABASE_URL_TESTE eles sao pulados e os outros testes rodam normal
const URL_TESTE = process.env.DATABASE_URL_TESTE;

describe.skipIf(!URL_TESTE)("regras das ordens no banco", () => {
  let prisma: PrismaClient;
  let ordens: typeof import("./ordens");
  let aptidao: typeof import("./aptidao");
  const sufixo = Date.now().toString().slice(-8);
  const ids = {} as Record<string, number>;

  // cpf e cnpj validos gerados na hora, pra cada execucao ter os seus
  function documento(base: string) {
    const d = base.split("").map(Number);
    const dv = (pesos: number[]) => {
      const r = d.reduce((s, n, i) => s + n * pesos[i], 0) % 11;
      return r < 2 ? 0 : 11 - r;
    };
    d.push(dv([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
    d.push(dv([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
    return d.join("");
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TESTE;
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: URL_TESTE, DIRECT_URL: URL_TESTE }, stdio: "ignore" });
    ({ prisma } = await import("./db"));
    ordens = await import("./ordens");
    aptidao = await import("./aptidao");

    const usuario = (perfil: string, nome: string) =>
      prisma.usuario.create({ data: { nome, email: `${nome}-${sufixo}@teste.sgp`, perfil, senha_hash: "x" } });
    const dia = (n: number) => new Date(Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00Z") + n * 86400000);
    const endereco = { logradouro: "Rua A", numero: "1", bairro: "Centro", cidade: "Maringá", uf: "PR", cep: "87000000", telefone: "(44) 99999-0000" };

    ids.admin = (await usuario("administrador", "admin")).id_usuario;
    const categoria = await prisma.categoria_servico.create({ data: { nome: `Teste ${sufixo}` } });
    ids.categoria = categoria.id_categoria;
    ids.servico = (await prisma.servico.create({ data: { id_categoria: categoria.id_categoria, nome: "Servico de teste", prazo_padrao_dias: 3 } })).id_servico;
    const certidao = await prisma.tipo_documento.upsert({ where: { nome: "Certidão negativa de débitos" }, update: {}, create: { nome: "Certidão negativa de débitos", obrigatorio: true, exige_validade: true } });

    // tres prestadores: apto, apto e um com certidao vencida (RN02)
    for (const [chave, base] of [["apto", "1" + sufixo.slice(-7) + "0001"], ["outro", "2" + sufixo.slice(-7) + "0001"], ["vencido", "3" + sufixo.slice(-7) + "0001"]] as const) {
      const u = await usuario("prestador", chave);
      const p = await prisma.prestador.create({
        data: { tipo_pessoa: "J", nome_razao_social: `PRESTADOR ${chave} ${sufixo}`, cpf_cnpj: documento(base), situacao: "ativo", id_usuario: u.id_usuario, ...endereco },
      });
      ids[chave] = p.id_prestador;
      ids[`u_${chave}`] = u.id_usuario;
      await prisma.prestador_categoria.create({ data: { id_prestador: p.id_prestador, id_categoria: categoria.id_categoria, habilitado_em: dia(-10) } });
      await prisma.contrato.create({ data: { id_prestador: p.id_prestador, numero: `CT-${chave}`, data_inicio: dia(-30), data_fim: dia(300), arquivo_url: "teste" } });
      await prisma.documento.create({
        data: {
          id_prestador: p.id_prestador,
          id_tipo_documento: certidao.id_tipo_documento,
          nome_arquivo: "c.pdf",
          arquivo_url: "teste",
          tamanho_bytes: 10,
          data_emissao: dia(-100),
          data_validade: chave === "vencido" ? dia(-1) : dia(100),
          enviado_por: ids.admin,
        },
      });
    }

    for (const [chave, base] of [["cliente", "4" + sufixo.slice(-7) + "0001"], ["intruso", "5" + sufixo.slice(-7) + "0001"]] as const) {
      const u = await usuario("cliente", chave);
      const c = await prisma.cliente.create({ data: { tipo_pessoa: "J", nome_razao_social: `CLIENTE ${chave}`, cpf_cnpj: documento(base), id_usuario: u.id_usuario, ...endereco } });
      ids[chave] = c.id_cliente;
      ids[`u_${chave}`] = u.id_usuario;
    }
  }, 120000);

  const nova = () =>
    ordens.abrirOrdem({ idCliente: ids.cliente, idServico: ids.servico, descricao: "descricao com mais de vinte caracteres", prioridade: "normal", prazoDesejado: null, local: null, idUsuario: ids.u_cliente });
  const doPrestador = (idOrdem: number, chave = "apto") => ({ idOrdem, idPrestador: ids[chave], idUsuario: ids[`u_${chave}`] });

  it("numera em sequencia no ano e aplica o prazo padrao do servico (RF11, UC12 A3.1)", async () => {
    const a = await nova();
    const b = await nova();
    if (!("id" in a) || !("id" in b) || !a.id || !b.id) throw new Error(JSON.stringify([a, b]));
    const [oa, ob] = await Promise.all([prisma.ordem_servico.findUniqueOrThrow({ where: { id_ordem: a.id } }), prisma.ordem_servico.findUniqueOrThrow({ where: { id_ordem: b.id } })]);
    expect(Number(ob.numero.split("-")[2])).toBe(Number(oa.numero.split("-")[2]) + 1);
    expect(oa.status).toBe("aberta");
    const esperado = new Date(Date.parse(new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) + "T00:00:00Z") + 3 * 86400000);
    expect(oa.prazo).toEqual(esperado);
  });

  it("nao atribui pra quem tem documento obrigatorio vencido (RN02) e grava log ao atribuir (RF19)", async () => {
    const o = (await nova()) as { id: number };
    expect(await ordens.atribuir(o.id, ids.vencido, ids.admin)).toMatchObject({ erro: expect.stringContaining("deixou de estar apto") });
    expect(await ordens.atribuir(o.id, ids.apto, ids.admin)).toHaveProperty("ok");
    expect(await prisma.log_acao.count({ where: { entidade: "ordem_servico", entidade_id: o.id, acao: "atribuicao" } })).toBe(1);
  });

  it("duas atribuicoes ao mesmo tempo: so uma grava (UC13 E7.1)", async () => {
    const o = (await nova()) as { id: number };
    const resultados = await Promise.all([ordens.atribuir(o.id, ids.apto, ids.admin), ordens.atribuir(o.id, ids.outro, ids.admin)]);
    expect(resultados.filter((r) => "ok" in r)).toHaveLength(1);
    expect(await prisma.andamento_ordem.count({ where: { id_ordem: o.id, status_novo: "atribuida" } })).toBe(1);
  });

  it("segue a sequencia: sem aceite nao inicia, concluida nao muda mais (RN05, RN06, UC14)", async () => {
    const o = (await nova()) as { id: number };
    await ordens.atribuir(o.id, ids.apto, ids.admin);
    expect(await ordens.concluir(doPrestador(o.id), "relato do servico feito")).toHaveProperty("erro");
    expect(await ordens.iniciar(doPrestador(o.id))).toMatchObject({ erro: expect.stringContaining("Aceite") });
    expect(await ordens.aceitar(doPrestador(o.id))).toHaveProperty("ok");
    expect(await ordens.iniciar(doPrestador(o.id))).toHaveProperty("ok");
    expect(await ordens.concluir(doPrestador(o.id), "curto")).toHaveProperty("erro");
    expect(await ordens.concluir(doPrestador(o.id), "troquei a peca e testei com o cliente")).toHaveProperty("ok");
    const concluida = await prisma.ordem_servico.findUniqueOrThrow({ where: { id_ordem: o.id } });
    expect(concluida.status).toBe("concluida");
    expect(concluida.entregue_no_prazo).toBe(true);
    expect(await ordens.cancelar(o.id, ids.admin, "tentando cancelar depois de concluida")).toMatchObject({ erro: expect.stringContaining("RN06") });
    expect(await ordens.registrarAndamento(doPrestador(o.id), "mais uma observacao")).toHaveProperty("erro");
  });

  it("dois cliques em aceitar ao mesmo tempo gravam um aceite so (UC14)", async () => {
    const o = (await nova()) as { id: number };
    await ordens.atribuir(o.id, ids.apto, ids.admin);
    const resultados = await Promise.all([ordens.aceitar(doPrestador(o.id)), ordens.aceitar(doPrestador(o.id))]);
    expect(resultados.filter((r) => "ok" in r)).toHaveLength(1);
    expect(await prisma.andamento_ordem.count({ where: { id_ordem: o.id, ...ordens.FILTRO_ACEITE } })).toBe(1);
    expect(await ordens.aceitar(doPrestador(o.id))).toMatchObject({ erro: expect.stringContaining("já foi aceita") });
  });

  it("outro prestador nao mexe na ordem que nao e dele (RNF02, UC15 E2.2)", async () => {
    const o = (await nova()) as { id: number };
    await ordens.atribuir(o.id, ids.apto, ids.admin);
    expect(await ordens.aceitar(doPrestador(o.id, "outro"))).toEqual({ erro: "Ordem não encontrada." });
  });

  it("avaliacao so pelo cliente titular, depois de concluida e uma vez so (RN08)", async () => {
    const o = (await nova()) as { id: number };
    expect(await ordens.avaliar(o.id, ids.cliente, 5, "")).toMatchObject({ erro: expect.stringContaining("depois que o serviço for concluído") });
    await ordens.atribuir(o.id, ids.apto, ids.admin);
    await ordens.aceitar(doPrestador(o.id));
    await ordens.iniciar(doPrestador(o.id));
    await ordens.concluir(doPrestador(o.id), "servico concluido com sucesso");
    expect(await ordens.avaliar(o.id, ids.intruso, 1, "nao fui eu que pedi")).toEqual({ erro: "Ordem não encontrada." });
    expect(await ordens.avaliar(o.id, ids.cliente, 6, "")).toHaveProperty("erro");
    expect(await ordens.avaliar(o.id, ids.cliente, 4, "bom")).toHaveProperty("ok");
    expect(await ordens.avaliar(o.id, ids.cliente, 5, "de novo")).toEqual({ erro: "Esta ordem já foi avaliada." });
  });

  it("cancelamento exige motivo de 10 caracteres e vai pro log (RN07, RF19)", async () => {
    const o = (await nova()) as { id: number };
    expect(await ordens.cancelar(o.id, ids.admin, "curto")).toMatchObject({ erro: expect.stringContaining("Faltam 5") });
    expect(await ordens.cancelar(o.id, ids.admin, "cliente desistiu do servico")).toHaveProperty("ok");
    expect(await prisma.log_acao.count({ where: { entidade_id: o.id, acao: "cancelamento" } })).toBe(1);
  });

  it("quem recusa devolve a ordem pra fila e nao aparece mais pra ela (UC14 A3.1)", async () => {
    const o = (await nova()) as { id: number };
    await ordens.atribuir(o.id, ids.outro, ids.admin);
    expect(await ordens.recusar(doPrestador(o.id, "outro"), "curto")).toHaveProperty("erro");
    expect(await ordens.recusar(doPrestador(o.id, "outro"), "estou sem agenda essa semana")).toHaveProperty("ok");
    expect((await prisma.ordem_servico.findUniqueOrThrow({ where: { id_ordem: o.id } })).status).toBe("aberta");
    const { aptos, inaptos } = await aptidao.candidatosDaOrdem(o.id, ids.categoria, "Teste");
    expect(aptos.map((a) => a.prestador.id_prestador)).not.toContain(ids.outro);
    expect(inaptos.find((i) => i.prestador.id_prestador === ids.outro)?.motivo.chip).toBe("Recusou");
  });

  it("a rotina diaria passa pra pendente quem esta ativo com documento obrigatorio vencido (RN02)", async () => {
    await aptidao.aplicarVencimentos();
    const p = await prisma.prestador.findUniqueOrThrow({ where: { id_prestador: ids.vencido }, include: { historicos: true } });
    expect(p.situacao).toBe("pendente");
    expect(p.historicos.some((h) => h.id_usuario === null && h.situacao_nova === "pendente")).toBe(true);
    expect((await prisma.prestador.findUniqueOrThrow({ where: { id_prestador: ids.apto } })).situacao).toBe("ativo");
  });

  it("a rotina diaria nao mexe em quem ja saiu de ativo e nao grava historico repetido (RN02)", async () => {
    await prisma.prestador.update({ where: { id_prestador: ids.vencido }, data: { situacao: "bloqueado" } });
    const antes = await prisma.historico_situacao.count({ where: { id_prestador: ids.vencido } });
    await aptidao.aplicarVencimentos();
    expect((await prisma.prestador.findUniqueOrThrow({ where: { id_prestador: ids.vencido } })).situacao).toBe("bloqueado");
    expect(await prisma.historico_situacao.count({ where: { id_prestador: ids.vencido } })).toBe(antes);
  });
});
