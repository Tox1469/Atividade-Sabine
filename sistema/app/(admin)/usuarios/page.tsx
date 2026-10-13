import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Chip, Paginacao, paginaAtual, Titulo } from "@/app/_componentes/ui";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { dataHoraBR, plural } from "@/lib/formato";
import { exigirPerfil } from "@/lib/permissao";
import { AcoesUsuario, FormAdministrador } from "./formularios";

export const metadata = { title: "Usuários" };

const POR_PAGINA = 20;
const PERFIS: Record<string, string> = { administrador: "Administrador", prestador: "Prestador", cliente: "Cliente" };

// todos os logins do sistema: quem e, de que cadastro, ultimo acesso e se esta bloqueado (RNF12)
export default async function Usuarios({ searchParams }: { searchParams: Promise<{ busca?: string; perfil?: string; pagina?: string }> }) {
  await exigirPerfil("administrador");
  const eu = (await auth())!.user;
  const params = await searchParams;
  const busca = (params.busca ?? "").trim();
  const perfil = PERFIS[params.perfil ?? ""] ? params.perfil! : "";
  const pagina = paginaAtual(params.pagina);
  const agora = new Date();

  const filtro: Prisma.usuarioWhereInput = {};
  if (perfil) filtro.perfil = perfil;
  if (busca) filtro.OR = [{ nome: { contains: busca, mode: "insensitive" } }, { email: { contains: busca, mode: "insensitive" } }];

  const [total, usuarios] = await Promise.all([
    prisma.usuario.count({ where: filtro }),
    prisma.usuario.findMany({
      where: filtro,
      include: { prestador: { select: { id_prestador: true } }, cliente: { select: { id_cliente: true } } },
      orderBy: [{ perfil: "asc" }, { nome: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Titulo titulo="Usuários" subtitulo="Quem entra no sistema e com qual perfil" />
      <div className="colunas">
        <div style={{ flexGrow: 3 }}>
          <form className="cartao mb-4 flex flex-wrap items-end gap-3 p-4">
            <div className="min-w-48 flex-1">
              <label htmlFor="busca" className="rotulo">Buscar</label>
              <input id="busca" name="busca" defaultValue={busca} placeholder="Nome ou e-mail" className="campo" />
            </div>
            <div className="w-40">
              <label htmlFor="perfil" className="rotulo">Perfil</label>
              <select id="perfil" name="perfil" defaultValue={perfil} className="campo">
                <option value="">Todos</option>
                {Object.entries(PERFIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <button className="botao">Filtrar</button>
          </form>

          <div className="cartao overflow-x-auto">
            <p className="cartao-titulo">{plural(total, "usuário", "usuários")}</p>
            <table className="tabela min-w-[760px]">
              <thead>
                <tr><th>Usuário</th><th>Perfil</th><th>Último acesso</th><th>Situação</th><th></th></tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const bloqueado = u.bloqueado_ate && u.bloqueado_ate > agora;
                  const ficha = u.prestador ? `/prestadores/${u.prestador.id_prestador}` : u.cliente ? `/clientes/${u.cliente.id_cliente}` : null;
                  return (
                    <tr key={u.id_usuario}>
                      <td>
                        {ficha ? <Link href={ficha} className="hover:underline">{u.nome}</Link> : u.nome}
                        <span className="secundario">{u.email}</span>
                      </td>
                      <td>{PERFIS[u.perfil]}</td>
                      <td className="whitespace-nowrap">{u.ultimo_acesso_em ? dataHoraBR(u.ultimo_acesso_em) : <span className="text-tinta2">Nunca entrou</span>}</td>
                      <td className="whitespace-nowrap">
                        {!u.ativo ? <Chip tom="inativo">Desativado</Chip> : bloqueado ? <Chip tom="bloqueado">Bloqueado até {dataHoraBR(u.bloqueado_ate!).split(" às ")[1]}</Chip> : <Chip tom="ativo">Ativo</Chip>}
                      </td>
                      <td className="acoes">
                        <AcoesUsuario id={u.id_usuario} ativo={u.ativo} proprio={String(u.id_usuario) === eu.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} base="/usuarios" params={params} />
        </div>
        <FormAdministrador />
      </div>
      <p className="ajuda mt-2">Gerar senha provisória também desbloqueia quem errou a senha cinco vezes seguidas (RNF12).</p>
    </div>
  );
}
