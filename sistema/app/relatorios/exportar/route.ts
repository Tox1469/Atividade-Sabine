import { auth } from "@/auth";
import { contaValida } from "@/lib/permissao";
import { textoNota } from "@/lib/dominio/avaliacao";
import { dataHoraBR, paraCampoData } from "@/lib/formato";
import { desempenho, lerPeriodo, servicosPorPeriodo } from "@/lib/relatorios";

// UC24: csv com os mesmos filtros da tela. separador ";" e BOM pra abrir certo no excel em portugues.
// o cabecalho do arquivo leva o periodo e a data de emissao
const celula = (v: string | number) => {
  const t = String(v);
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export async function GET(req: Request) {
  const sessao = await auth();
  if (sessao?.user?.perfil !== "administrador") return new Response("não autorizado", { status: 403 });
  if (!(await contaValida(sessao.user))) return new Response("não autorizado", { status: 403 });

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const periodo = lerPeriodo(url.searchParams.get("de") ?? undefined, url.searchParams.get("ate") ?? undefined, tipo === "periodo" ? 30 : 365);
  if (periodo.invalido) return new Response("a data final esta antes da inicial", { status: 400 });

  let titulo: string;
  let linhas: (string | number)[][];
  if (tipo === "desempenho") {
    titulo = "Desempenho dos prestadores";
    const dados = (await desempenho(periodo.inicio, periodo.fim)).sort((a, b) => b.concluidas - a.concluidas);
    linhas = [["Prestador", "Situação", "Concluídas", "Nota média", "No prazo (%)"], ...dados.map((d) => [d.prestador, d.situacao, d.concluidas, textoNota(d.nota), d.percentualNoPrazo])];
  } else if (tipo === "periodo") {
    titulo = "Serviços por período";
    const dados = await servicosPorPeriodo(periodo.inicio, periodo.fim);
    linhas = [["Categoria", "Abertas", "Concluídas", "Canceladas"], ...dados.map((d) => [d.categoria, d.abertas, d.concluidas, d.canceladas])];
  } else {
    return new Response("tipo de relatório desconhecido", { status: 400 });
  }

  const texto = [[`SGP - ${titulo}`], [`Período: ${periodo.texto}`], [`Emitido em: ${dataHoraBR(new Date())}`], [], ...linhas]
    .map((l) => l.map(celula).join(";"))
    .join("\r\n");
  const arquivo = `${tipo}-${paraCampoData(periodo.inicio)}-a-${paraCampoData(periodo.fim)}.csv`;
  return new Response("﻿" + texto, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${arquivo}"` },
  });
}
