import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Aviso, ChipSituacao, Paginacao, paginaAtual, Titulo } from "@/app/_componentes/ui";
import { notasDosPrestadores } from "@/lib/aptidao";
import { prisma } from "@/lib/db";
import { textoNota } from "@/lib/dominio/avaliacao";
import { formatarCpfCnpj, soDigitos } from "@/lib/dominio/cpf-cnpj";
import { exigirPerfil } from "@/lib/permissao";
import { SITUACOES } from "@/lib/validacao/pessoa";

export const metadata = { title: "Prestadores" };

// RNF06: a listagem e paginada no banco, nunca trazendo tudo de uma vez
const POR_PAGINA = 20;

type Busca = { busca?: string; situacao?: string; categoria?: string; pagina?: string; ok?: string };

// T03 - prestadores
export default async function Prestadores({ searchParams }: { searchParams: Promise<Busca> }) {
  await exigirPerfil("administrador");
  const params = await searchParams;

  const busca = (params.busca ?? "").trim();
  const situacao = SITUACOES.includes(params.situacao as never) ? params.situacao : "";
  const categoria = Number(params.categoria) || 0;
  const pagina = paginaAtual(params.pagina);

  const filtro: Prisma.prestadorWhereInput = {};
  if (situacao) filtro.situacao = situacao;
  if (categoria) filtro.categorias = { some: { id_categoria: categoria, ativa: true } };
  if (busca) {
    const digitos = soDigitos(busca);
    filtro.OR = [
      { nome_razao_social: { contains: busca, mode: "insensitive" } },
      { nome_fantasia: { contains: busca, mode: "insensitive" } },
      ...(digitos.length >= 3 ? [{ cpf_cnpj: { contains: digitos } }] : []),
    ];
  }

  const [total, prestadores, categorias] = await Promise.all([
    prisma.prestador.count({ where: filtro }),
    prisma.prestador.findMany({
      where: filtro,
      include: { categorias: { where: { ativa: true }, include: { categoria: true } } },
      orderBy: { nome_razao_social: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.categoria_servico.findMany({ orderBy: { nome: "asc" } }),
  ]);
  const notas = await notasDosPrestadores(prestadores.map((p) => p.id_prestador));

  return (
    <div className="mx-auto max-w-6xl">
      <Titulo titulo="Prestadores" subtitulo="Cadastro da rede de terceirizados">
        <Link href="/prestadores/novo" className="botao-principal">Novo prestador</Link>
      </Titulo>

      {params.ok && (
        <Aviso tom="ok" titulo={params.ok === "novo" ? "Prestador cadastrado." : "Alterações salvas."}>
          {params.ok === "novo" && "Ele entra como pendente até a documentação ser conferida."}
        </Aviso>
      )}

      <form className="cartao mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="busca" className="rotulo">Buscar</label>
          <input id="busca" name="busca" defaultValue={busca} placeholder="Nome, razão social, CPF ou CNPJ" className="campo" />
        </div>
        <div className="w-40">
          <label htmlFor="situacao" className="rotulo">Situação</label>
          <select id="situacao" name="situacao" defaultValue={situacao} className="campo">
            <option value="">Todas</option>
            {SITUACOES.map((s) => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label htmlFor="categoria" className="rotulo">Categoria</label>
          <select id="categoria" name="categoria" defaultValue={categoria || ""} className="campo">
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
            ))}
          </select>
        </div>
        <button className="botao">Filtrar</button>
      </form>

      <div className="cartao overflow-x-auto">
        <p className="cartao-titulo">{total === 1 ? "1 prestador encontrado" : `${total.toLocaleString("pt-BR")} prestadores encontrados`}</p>
        {prestadores.length === 0 ? (
          <p className="px-4 py-6 text-sm text-tinta2">
            Nenhum prestador com esse filtro. {!busca && !situacao && !categoria && "Use o botão Novo prestador para cadastrar o primeiro."}
          </p>
        ) : (
          <table className="tabela min-w-[760px]">
            <thead>
              <tr><th>Prestador</th><th>CPF / CNPJ</th><th>Categorias</th><th>Situação</th><th className="numerico">Nota</th><th></th></tr>
            </thead>
            <tbody>
              {prestadores.map((p) => (
                <tr key={p.id_prestador}>
                  <td>
                    {p.nome_razao_social}
                    <span className="secundario">{p.nome_fantasia ?? (p.tipo_pessoa === "F" ? "autônomo" : "sem nome fantasia")}, {p.telefone}</span>
                  </td>
                  <td className="whitespace-nowrap tabular-nums">{formatarCpfCnpj(p.cpf_cnpj)}</td>
                  <td>{p.categorias.map((c) => c.categoria.nome).join(", ") || <span className="text-tinta2">Nenhuma</span>}</td>
                  <td><ChipSituacao situacao={p.situacao} /></td>
                  <td className="numerico">{textoNota(notas.get(p.id_prestador) ?? null).replace(" suficiente", "")}</td>
                  <td className="acoes"><Link href={`/prestadores/${p.id_prestador}`} className="botao botao-pequeno">Abrir</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} base="/prestadores" params={params} />
    </div>
  );
}
