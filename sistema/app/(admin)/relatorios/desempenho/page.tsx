import Link from "next/link";
import { Aviso, ChipSituacao, Titulo, Vazio } from "@/app/_componentes/ui";
import { textoNota } from "@/lib/dominio/avaliacao";
import { dataHoraBR, paraCampoData } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";
import { desempenho, lerPeriodo } from "@/lib/relatorios";
import { BotaoImprimir } from "@/app/_componentes/imprimir";

export const metadata = { title: "Desempenho dos prestadores" };

const COLUNAS = [
  ["prestador", "Prestador"],
  ["concluidas", "Concluídas"],
  ["nota", "Nota média"],
  ["prazo", "No prazo"],
] as const;

// UC20 / RF17 - desempenho do prestador, ordenavel por qualquer coluna
export default async function Desempenho({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string; ordem?: string }> }) {
  await exigirPerfil("administrador");
  const params = await searchParams;
  const periodo = lerPeriodo(params.de, params.ate, 365);
  const linhas = periodo.invalido ? [] : await desempenho(periodo.inicio, periodo.fim);

  const ordem = COLUNAS.some(([c]) => c === params.ordem) ? params.ordem! : "concluidas";
  const chave = (l: (typeof linhas)[number]) =>
    ordem === "prestador" ? l.prestador : ordem === "nota" ? (l.nota ?? -1) : ordem === "prazo" ? l.percentualNoPrazo : l.concluidas;
  linhas.sort((a, b) => (ordem === "prestador" ? String(chave(a)).localeCompare(String(chave(b))) : Number(chave(b)) - Number(chave(a))));

  const filtros = `de=${paraCampoData(periodo.inicio)}&ate=${paraCampoData(periodo.fim)}`;

  return (
    <div className="w-full">
      <Titulo titulo="Desempenho dos prestadores" subtitulo={`Ordens concluídas de ${periodo.texto}. Emitido em ${dataHoraBR(new Date())}.`}>
        <div className="nao-imprimir flex gap-2">
          <a href={`/relatorios/exportar?tipo=desempenho&${filtros}`} className="botao">Exportar CSV</a>
          <BotaoImprimir />
        </div>
      </Titulo>

      <form className="cartao nao-imprimir mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="w-40">
          <label htmlFor="de" className="rotulo">De</label>
          <input id="de" name="de" type="date" defaultValue={paraCampoData(periodo.inicio)} className="campo" />
        </div>
        <div className="w-40">
          <label htmlFor="ate" className="rotulo">Até</label>
          <input id="ate" name="ate" type="date" defaultValue={paraCampoData(periodo.fim)} className="campo" />
        </div>
        <input type="hidden" name="ordem" value={ordem} />
        <button className="botao">Gerar</button>
      </form>

      {periodo.invalido && <Aviso tom="erro" titulo="A data final está antes da inicial." />}

      <div className="cartao overflow-x-auto">
        <h2 className="cartao-titulo">Por prestador</h2>
        {linhas.length === 0 ? (
          <Vazio titulo="Nenhuma ordem concluída no período." />
        ) : (
          <table className="tabela min-w-[560px]">
            <thead>
              <tr>
                {COLUNAS.map(([c, nome]) => (
                  <th key={c} className={c === "prestador" ? "" : "numerico"}>
                    <Link href={`?${filtros}&ordem=${c}`} className={ordem === c ? "text-tinta underline" : "hover:underline"}>{nome}</Link>
                  </th>
                ))}
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td><Link href={`/ordens?prestador=${l.id}&status=concluida`} className="hover:underline">{l.prestador}</Link></td>
                  <td className="numerico">{l.concluidas}</td>
                  <td className="numerico">{textoNota(l.nota)}</td>
                  <td className="numerico">{l.percentualNoPrazo}%</td>
                  <td><ChipSituacao situacao={l.situacao} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="ajuda mt-2">
        A nota média considera as avaliações dos últimos 12 meses, e quem tem menos de três aparece como sem histórico suficiente (RN09). No prazo é a parte das concluídas no
        período que foi entregue até o prazo combinado (RN12).
      </p>
    </div>
  );
}
