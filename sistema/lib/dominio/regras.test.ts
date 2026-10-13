import { describe, expect, it } from "vitest";
import { impedimento, type Candidato } from "./aptidao";
import { notaMedia, textoNota } from "./avaliacao";
import { situacaoDocumento, validarArquivo } from "./documento";
import { calcularPrazo, emAtraso, entregueNoPrazo, numeroOrdem, semRespostaHaMaisDe24h, transicaoPermitida } from "./ordem";
import { hoje } from "@/lib/formato";

const d = (s: string) => new Date(s + "T00:00:00Z");

describe("sequencia de status da ordem (RN05, RN06, RN07)", () => {
  it("anda so um passo pra frente", () => {
    expect(transicaoPermitida("aberta", "atribuida")).toBe(true);
    expect(transicaoPermitida("atribuida", "em_execucao")).toBe(true);
    expect(transicaoPermitida("em_execucao", "concluida")).toBe(true);
  });

  it("nao pula etapa nem volta", () => {
    expect(transicaoPermitida("aberta", "em_execucao")).toBe(false);
    expect(transicaoPermitida("aberta", "concluida")).toBe(false);
    expect(transicaoPermitida("em_execucao", "atribuida")).toBe(false);
    expect(transicaoPermitida("concluida", "em_execucao")).toBe(false);
  });

  it("a recusa do prestador devolve a atribuida pra aberta (UC14)", () => {
    expect(transicaoPermitida("atribuida", "aberta")).toBe(true);
    expect(transicaoPermitida("em_execucao", "aberta")).toBe(false);
  });

  it("cancela qualquer uma antes da conclusao, nunca depois", () => {
    expect(transicaoPermitida("aberta", "cancelada")).toBe(true);
    expect(transicaoPermitida("em_execucao", "cancelada")).toBe(true);
    expect(transicaoPermitida("concluida", "cancelada")).toBe(false);
    expect(transicaoPermitida("cancelada", "cancelada")).toBe(false);
  });
});

describe("prazo, atraso e numero da ordem", () => {
  it("usa o prazo padrao do servico quando o cliente nao informa (UC12 A3.1)", () => {
    expect(calcularPrazo(d("2026-10-20"), 3, null)).toEqual(d("2026-10-23"));
    expect(calcularPrazo(d("2026-10-20"), 3, d("2026-10-21"))).toEqual(d("2026-10-21"));
  });

  it("concluida no dia do prazo conta como no prazo, no dia seguinte e atraso (RN12)", () => {
    // 23h em brasilia ja e o dia seguinte em utc, e mesmo assim tem que contar o dia de brasilia
    expect(entregueNoPrazo(new Date("2026-10-24T02:00:00Z"), d("2026-10-23"))).toBe(true);
    expect(entregueNoPrazo(new Date("2026-10-24T12:00:00Z"), d("2026-10-23"))).toBe(false);
  });

  it("em atraso so enquanto nao concluiu nem cancelou", () => {
    expect(emAtraso("em_execucao", d("2026-10-23"), d("2026-10-24"))).toBe(true);
    expect(emAtraso("em_execucao", d("2026-10-23"), d("2026-10-23"))).toBe(false);
    expect(emAtraso("concluida", d("2026-10-23"), d("2026-10-30"))).toBe(false);
  });

  it("numera no formato OS-ano-sequencia", () => {
    expect(numeroOrdem(2026, 7)).toBe("OS-2026-0007");
    expect(numeroOrdem(2026, 147)).toBe("OS-2026-0147");
  });

  it("sinaliza atribuida sem resposta depois de 24 horas (UC14 E3.1)", () => {
    const atribuida = new Date("2026-10-20T10:00:00Z");
    expect(semRespostaHaMaisDe24h("atribuida", atribuida, false, new Date("2026-10-21T11:00:00Z"))).toBe(true);
    expect(semRespostaHaMaisDe24h("atribuida", atribuida, false, new Date("2026-10-21T09:00:00Z"))).toBe(false);
    expect(semRespostaHaMaisDe24h("atribuida", atribuida, true, new Date("2026-10-22T09:00:00Z"))).toBe(false);
  });
});

describe("aptidao do prestador (UC22)", () => {
  const apto: Candidato = { situacao: "ativo", habilitado: true, documentosVencidos: [], contratoVigente: true, recusouEstaOrdem: false };

  it("ativo, habilitado, com documento e contrato em dia esta apto", () => {
    expect(impedimento(apto, "Hidráulica")).toBeNull();
  });

  it("cada regra barra com o motivo certo", () => {
    expect(impedimento({ ...apto, habilitado: false }, "Hidráulica")?.texto).toBe("Não está habilitado em Hidráulica");
    expect(impedimento({ ...apto, situacao: "bloqueado" }, "Hidráulica")?.chip).toBe("Bloqueado");
    expect(impedimento({ ...apto, documentosVencidos: [{ tipo: "Certidão negativa de débitos", validade: d("2026-09-12") }] }, "Hidráulica")?.texto)
      .toBe("Certidão negativa de débitos venceu em 12/09/2026");
    expect(impedimento({ ...apto, contratoVigente: false }, "Hidráulica")?.chip).toBe("Contrato");
    expect(impedimento({ ...apto, recusouEstaOrdem: true }, "Hidráulica")?.chip).toBe("Recusou");
  });

  it("a categoria e verificada antes da situacao, como no UC22", () => {
    expect(impedimento({ ...apto, habilitado: false, situacao: "bloqueado" }, "Elétrica")?.chip).toBe("Categoria");
  });
});

describe("nota media (RN09)", () => {
  it("com menos de tres avaliacoes nao tem nota", () => {
    expect(notaMedia([5, 4])).toBeNull();
    expect(textoNota(null)).toBe("Sem histórico suficiente");
  });

  it("com tres ou mais faz a media simples", () => {
    expect(notaMedia([5, 4, 3])).toBe(4);
    expect(textoNota(notaMedia([5, 5, 4]))).toBe("4,7");
  });
});

describe("documentos (RF08 e RNF09)", () => {
  const hojeTeste = d("2026-10-20");

  it("separa vencido, a vencer em 30 dias e em dia", () => {
    expect(situacaoDocumento(d("2026-10-10"), hojeTeste)).toMatchObject({ tipo: "vencido", texto: "Vencido há 10 dias" });
    expect(situacaoDocumento(d("2026-10-20"), hojeTeste)).toMatchObject({ tipo: "vence", texto: "Vence hoje" });
    expect(situacaoDocumento(d("2026-11-19"), hojeTeste)).toMatchObject({ tipo: "vence", texto: "Vence em 30 dias" });
    expect(situacaoDocumento(d("2026-11-20"), hojeTeste).tipo).toBe("em_dia");
    expect(situacaoDocumento(null, hojeTeste).tipo).toBe("em_dia");
  });

  it("aceita pdf, jpg e png pelo conteudo e recusa o resto", () => {
    const pdf = new TextEncoder().encode("%PDF-1.4 conteudo");
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // docx e zip por dentro
    expect(validarArquivo(pdf)).toBeNull();
    expect(validarArquivo(png)).toBeNull();
    expect(validarArquivo(jpg)).toBeNull();
    expect(validarArquivo(docx)).toBe("Formato não aceito. Envie o arquivo em PDF, JPG ou PNG, com até 10 MB.");
    expect(validarArquivo(png, ["application/pdf"])).toBe("Formato não aceito. Envie o arquivo em PDF, com até 10 MB.");
  });

  it("recusa arquivo acima de 10 mb", () => {
    const grande = new Uint8Array(10 * 1024 * 1024 + 1);
    grande.set([0x25, 0x50, 0x44, 0x46]);
    expect(validarArquivo(grande)).toMatch(/passa de 10 MB/);
  });

  it("o dia de hoje e o de brasilia, mesmo depois das 21h", () => {
    expect(hoje(new Date("2026-10-21T01:30:00Z"))).toEqual(d("2026-10-20"));
  });
});
