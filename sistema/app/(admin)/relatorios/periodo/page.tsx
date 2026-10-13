import { Aviso, Titulo, Vazio } from "@/app/_componentes/ui";
import { dataHoraBR, paraCampoData } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";
import { lerPeriodo, servicosPorPeriodo } from "@/lib/relatorios";
import { BotaoImprimir } from "@/app/_componentes/imprimir";

export const metadata = { title: "Serviços por período" };

// UC21 / RF18 - servicos por periodo, agrupados por categoria
export default async function ServicosPorPeriodo({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  await exigirPerfil("administrador");
  const params = await searchParams;
  const periodo = lerPeriodo(params.de, params.ate, 30);
  const linhas = periodo.invalido ? [] : await servicosPorPeriodo(periodo.inicio, periodo.fim);
  const soma = (k: "abertas" | "concluidas" | "canceladas") => linhas.reduce((t, l) => t + l[k], 0);
  const filtros = `de=${paraCampoData(periodo.inicio)}&ate=${paraCampoData(periodo.fim)}`;

  return (
    <div className="mx-auto max-w-4xl">
      <Titulo titulo="Serviços por período" subtitulo={`De ${periodo.texto}. Emitido em ${dataHoraBR(new Date())}.`}>
        <div className="nao-imprimir flex gap-2">
          <a href={`/relatorios/exportar?tipo=periodo&${filtros}`} className="botao">Exportar CSV</a>
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
        <button className="botao">Gerar</button>
      </form>

      {periodo.invalido && <Aviso tom="erro" titulo="A data final está antes da inicial." >Ajuste o intervalo e gere de novo (UC21).</Aviso>}

      <div className="cartao overflow-x-auto">
        <h2 className="cartao-titulo">Por categoria</h2>
        {linhas.length === 0 ? (
          <Vazio titulo="Nenhuma ordem aberta, concluída ou cancelada no período." />
        ) : (
          <table className="tabela min-w-[480px]">
            <thead>
              <tr><th>Categoria</th><th className="numerico">Abertas</th><th className="numerico">Concluídas</th><th className="numerico">Canceladas</th></tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.categoria}>
                  <td>{l.categoria}</td>
                  <td className="numerico">{l.abertas}</td>
                  <td className="numerico">{l.concluidas}</td>
                  <td className="numerico">{l.canceladas}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td>Total</td>
                <td className="numerico">{soma("abertas")}</td>
                <td className="numerico">{soma("concluidas")}</td>
                <td className="numerico">{soma("canceladas")}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
      <p className="ajuda mt-2">Abertas contam pela data de abertura, concluídas pela data de conclusão e canceladas pela data em que o cancelamento foi registrado.</p>
    </div>
  );
}
