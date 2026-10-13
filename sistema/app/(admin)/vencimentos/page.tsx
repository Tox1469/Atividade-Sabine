import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Janela } from "@/app/_componentes/janela";
import { Aviso, Chip, ChipSituacao, Titulo, Vazio } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { situacaoDocumento } from "@/lib/dominio/documento";
import { dataBR, hoje, plural, somarDias } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";
import { FormSituacao } from "../prestadores/formularios";
import { BotaoRotina } from "./botao";

export const metadata = { title: "Vencimentos" };

type Busca = { categoria?: string; situacao?: string; ordem?: string; situacao_de?: string; ok?: string };

// T10 - painel de vencimentos (UC09, TA31): vencidos e os que vencem nos proximos 30 dias
export default async function Vencimentos({ searchParams }: { searchParams: Promise<Busca> }) {
  await exigirPerfil("administrador");
  const params = await searchParams;
  const dia = hoje();
  const categoria = Number(params.categoria) || 0;
  const situacao = ["ativo", "pendente", "bloqueado", "inativo"].includes(params.situacao ?? "") ? params.situacao! : "";
  const porPrestador = params.ordem === "prestador";

  const doPrestador: Prisma.prestadorWhereInput = {};
  if (situacao) doPrestador.situacao = situacao;
  if (categoria) doPrestador.categorias = { some: { id_categoria: categoria, ativa: true } };

  const consulta = (validade: Prisma.DateTimeNullableFilter) =>
    prisma.documento.findMany({
      where: { versao_atual: true, data_validade: validade, prestador: doPrestador },
      include: { tipo: true, prestador: true },
      orderBy: porPrestador ? [{ prestador: { nome_razao_social: "asc" } }, { data_validade: "asc" }] : { data_validade: "asc" },
      take: 200,
    });

  const [vencidos, aVencer, categorias] = await Promise.all([
    consulta({ lt: dia }),
    consulta({ gte: dia, lte: somarDias(dia, 30) }),
    prisma.categoria_servico.findMany({ orderBy: { nome: "asc" } }),
  ]);
  const nome = (p: { nome_fantasia: string | null; nome_razao_social: string }) => p.nome_fantasia ?? p.nome_razao_social;

  // endereco do painel com os filtros de agora, pra janela de situacao abrir por cima dele
  const painel = (extra: Record<string, string> = {}) => {
    const q = new URLSearchParams();
    for (const [k, val] of Object.entries(params)) if (val && k !== "situacao_de" && k !== "ok") q.set(k, val);
    for (const [k, val] of Object.entries(extra)) q.set(k, val);
    return `/vencimentos${q.size ? "?" + q : ""}`;
  };
  const alvo = params.situacao_de ? vencidos.find((d) => d.id_prestador === Number(params.situacao_de)) : undefined;

  return (
    <div className="mx-auto max-w-6xl">
      <Titulo titulo="Vencimentos" subtitulo="Documentos vencidos e os que vencem nos próximos 30 dias">
        <BotaoRotina />
      </Titulo>

      {params.ok && <Aviso tom="ok" titulo={params.ok} />}

      <form className="cartao mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="w-44">
          <label htmlFor="categoria" className="rotulo">Categoria</label>
          <select id="categoria" name="categoria" defaultValue={categoria || ""} className="campo">
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>)}
          </select>
        </div>
        <div className="w-44">
          <label htmlFor="situacao" className="rotulo">Situação do prestador</label>
          <select id="situacao" name="situacao" defaultValue={situacao} className="campo">
            <option value="">Todas</option>
            <option value="ativo">Ativo</option>
            <option value="pendente">Pendente</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
        <div className="w-44">
          <label htmlFor="ordem" className="rotulo">Ordenar por</label>
          <select id="ordem" name="ordem" defaultValue={porPrestador ? "prestador" : ""} className="campo">
            <option value="">Data de validade</option>
            <option value="prestador">Prestador</option>
          </select>
        </div>
        <button className="botao">Filtrar</button>
      </form>

      {vencidos.length === 0 && aVencer.length === 0 ? (
        <div className="cartao">
          <Vazio titulo="Nada vencido e nada vencendo nos próximos 30 dias.">Com esse filtro, toda a documentação está em dia.</Vazio>
        </div>
      ) : (
        <>
          <div className="cartao mb-4 overflow-x-auto">
            <h2 className="cartao-titulo">Vencidos ({vencidos.length})</h2>
            {vencidos.length === 0 ? (
              <p className="px-4 py-4 text-sm text-tinta2">Nenhum documento vencido.</p>
            ) : (
              <table className="tabela min-w-[720px]">
                <thead>
                  <tr><th>Prestador</th><th>Documento</th><th>Validade</th><th>Atraso</th><th>Situação do prestador</th><th></th></tr>
                </thead>
                <tbody>
                  {vencidos.map((d) => (
                    <tr key={d.id_documento}>
                      <td>{nome(d.prestador)}</td>
                      <td>
                        {d.tipo.nome}
                        <span className="secundario">{d.tipo.obrigatorio ? "Obrigatório" : "Opcional"}</span>
                      </td>
                      <td>{dataBR(d.data_validade)}</td>
                      <td>{plural(situacaoDocumento(d.data_validade, dia).dias, "dia", "dias")}</td>
                      <td><ChipSituacao situacao={d.prestador.situacao} /></td>
                      <td className="acoes">
                        <Link href={painel({ situacao_de: String(d.id_prestador) })} scroll={false} className="botao botao-pequeno">Alterar situação</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="cartao overflow-x-auto">
            <h2 className="cartao-titulo">Vencem nos próximos 30 dias ({aVencer.length})</h2>
            {aVencer.length === 0 ? (
              <p className="px-4 py-4 text-sm text-tinta2">Nenhum documento vence nos próximos 30 dias.</p>
            ) : (
              <table className="tabela min-w-[620px]">
                <thead>
                  <tr><th>Prestador</th><th>Documento</th><th>Validade</th><th>Faltam</th><th></th></tr>
                </thead>
                <tbody>
                  {aVencer.map((d) => {
                    const s = situacaoDocumento(d.data_validade, dia);
                    return (
                      <tr key={d.id_documento}>
                        <td>{nome(d.prestador)}</td>
                        <td>{d.tipo.nome}</td>
                        <td>{dataBR(d.data_validade)}</td>
                        <td><Chip tom="vence">{s.dias === 0 ? "Vence hoje" : plural(s.dias, "dia", "dias")}</Chip></td>
                        <td className="acoes">
                          <Link href={`/prestadores/${d.id_prestador}/documentos`} className="botao botao-pequeno">Ver documentos</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {alvo && (
        <Janela titulo={`Situação cadastral de ${nome(alvo.prestador)}`} fechar={painel()} largura={560}>
          <p className="px-4 pt-4 text-sm">
            Situação atual: <ChipSituacao situacao={alvo.prestador.situacao} />. {alvo.tipo.nome} vencido em {dataBR(alvo.data_validade)}.
          </p>
          <FormSituacao id={alvo.id_prestador} atual={alvo.prestador.situacao} voltar={painel()} />
        </Janela>
      )}
    </div>
  );
}
