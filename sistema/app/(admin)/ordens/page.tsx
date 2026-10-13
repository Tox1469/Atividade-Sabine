import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Chip, ChipStatus, Paginacao, paginaAtual, Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { emAtraso, NOME_STATUS, STATUS } from "@/lib/dominio/ordem";
import { dataBR, hoje, lerData, plural, somarDias } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";

export const metadata = { title: "Ordens de serviço" };

const POR_PAGINA = 20;

type Busca = { busca?: string; status?: string; de?: string; ate?: string; categoria?: string; prestador?: string; cliente?: string; pagina?: string };

// T11 - ordens de servico. os mesmos filtros servem de historico por prestador e por cliente (RF16, UC19)
export default async function Ordens({ searchParams }: { searchParams: Promise<Busca> }) {
  await exigirPerfil("administrador");
  const params = await searchParams;
  const dia = hoje();
  const busca = (params.busca ?? "").trim();
  const status = STATUS.includes(params.status as never) ? params.status! : "";
  const de = lerData(params.de);
  const ate = lerData(params.ate);
  const categoria = Number(params.categoria) || 0;
  const idPrestador = Number(params.prestador) || 0;
  const idCliente = Number(params.cliente) || 0;
  const pagina = paginaAtual(params.pagina);

  const filtro: Prisma.ordem_servicoWhereInput = {};
  if (status) filtro.status = status;
  if (categoria) filtro.servico = { id_categoria: categoria };
  if (idPrestador) filtro.id_prestador = idPrestador;
  if (idCliente) filtro.id_cliente = idCliente;
  if (de || ate) filtro.data_abertura = { ...(de && { gte: de }), ...(ate && { lt: somarDias(ate, 1) }) };
  if (busca) {
    filtro.OR = [
      { numero: { contains: busca, mode: "insensitive" } },
      { cliente: { nome_razao_social: { contains: busca, mode: "insensitive" } } },
      { cliente: { nome_fantasia: { contains: busca, mode: "insensitive" } } },
      { servico: { nome: { contains: busca, mode: "insensitive" } } },
    ];
  }

  const [total, ordens, categorias, prestador, cliente] = await Promise.all([
    prisma.ordem_servico.count({ where: filtro }),
    prisma.ordem_servico.findMany({
      where: filtro,
      include: { cliente: true, prestador: true, servico: { include: { categoria: true } } },
      orderBy: { id_ordem: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.categoria_servico.findMany({ orderBy: { nome: "asc" } }),
    idPrestador ? prisma.prestador.findUnique({ where: { id_prestador: idPrestador } }) : null,
    idCliente ? prisma.cliente.findUnique({ where: { id_cliente: idCliente } }) : null,
  ]);
  const nome = (p: { nome_fantasia: string | null; nome_razao_social: string }) => p.nome_fantasia ?? p.nome_razao_social;
  const recorte = prestador ? `do prestador ${nome(prestador)}` : cliente ? `do cliente ${nome(cliente)}` : "";

  return (
    <div className="mx-auto max-w-6xl">
      <Titulo titulo="Ordens de serviço" subtitulo={recorte ? `Histórico ${recorte}` : "Do pedido à conclusão"}>
        <Link href="/ordens/nova" className="botao-principal">Abrir ordem</Link>
      </Titulo>

      <form className="cartao mb-4 flex flex-wrap items-end gap-3 p-4">
        {idPrestador > 0 && <input type="hidden" name="prestador" value={idPrestador} />}
        {idCliente > 0 && <input type="hidden" name="cliente" value={idCliente} />}
        <div className="min-w-56 flex-1">
          <label htmlFor="busca" className="rotulo">Buscar</label>
          <input id="busca" name="busca" defaultValue={busca} placeholder="Número da ordem, cliente ou serviço" className="campo" />
        </div>
        <div className="w-36">
          <label htmlFor="status" className="rotulo">Situação</label>
          <select id="status" name="status" defaultValue={status} className="campo">
            <option value="">Todas</option>
            {STATUS.map((s) => <option key={s} value={s}>{NOME_STATUS[s]}</option>)}
          </select>
        </div>
        <div className="w-40">
          <label htmlFor="categoria" className="rotulo">Categoria</label>
          <select id="categoria" name="categoria" defaultValue={categoria || ""} className="campo">
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>)}
          </select>
        </div>
        <div className="w-36">
          <label htmlFor="de" className="rotulo">Aberta de</label>
          <input id="de" name="de" type="date" defaultValue={params.de ?? ""} className="campo" />
        </div>
        <div className="w-36">
          <label htmlFor="ate" className="rotulo">até</label>
          <input id="ate" name="ate" type="date" defaultValue={params.ate ?? ""} className="campo" />
        </div>
        <button className="botao">Filtrar</button>
        {recorte && <Link href="/ordens" className="botao">Ver todas</Link>}
      </form>

      <div className="cartao overflow-x-auto">
        <p className="cartao-titulo">{plural(total, "ordem encontrada", "ordens encontradas")}</p>
        {ordens.length === 0 ? (
          <p className="px-4 py-6 text-sm text-tinta2">Nenhuma ordem com esse filtro.</p>
        ) : (
          <table className="tabela min-w-[820px]">
            <thead>
              <tr><th>Número</th><th>Cliente</th><th>Serviço</th><th>Prestador</th><th>Prazo</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {ordens.map((o) => (
                <tr key={o.id_ordem}>
                  <td className="whitespace-nowrap">{o.numero}</td>
                  <td>{nome(o.cliente)}</td>
                  <td>
                    {o.servico.nome}
                    <span className="secundario">{o.servico.categoria.nome}</span>
                  </td>
                  <td>{o.prestador ? nome(o.prestador) : <span className="text-tinta2">Não atribuída</span>}</td>
                  <td className="whitespace-nowrap">{dataBR(o.prazo)}</td>
                  <td className="whitespace-nowrap">
                    <ChipStatus status={o.status} /> {emAtraso(o.status, o.prazo, dia) && <Chip tom="atraso">Atrasada</Chip>}
                  </td>
                  <td className="acoes">
                    {o.status === "aberta" ? (
                      <Link href={`/ordens/${o.id_ordem}?janela=atribuir`} className="botao-principal botao-pequeno">Atribuir</Link>
                    ) : (
                      <Link href={`/ordens/${o.id_ordem}`} className="botao botao-pequeno">Abrir</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} base="/ordens" params={params} />
    </div>
  );
}
