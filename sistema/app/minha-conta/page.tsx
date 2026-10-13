import { Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { dataHoraBR } from "@/lib/formato";
import { usuarioLogado } from "@/lib/permissao";
import { FormSenha } from "./formulario";

export const metadata = { title: "Minha conta" };

const PERFIS: Record<string, string> = { administrador: "Administrador", prestador: "Prestador", cliente: "Cliente" };

export default async function MinhaConta() {
  const sessao = await usuarioLogado();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id_usuario: Number(sessao.id) } });
  return (
    <div className="w-full">
      <Titulo titulo="Minha conta" subtitulo={usuario.nome} />
      <div className="colunas">
        <FormSenha />
        <section className="cartao">
          <h2 className="cartao-titulo">Sua conta</h2>
          <dl className="grid gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-tinta2">Login</dt>
              <dd className="mt-0.5 font-medium break-all">{usuario.email}</dd>
            </div>
            <div>
              <dt className="text-tinta2">Perfil</dt>
              <dd className="mt-0.5 font-medium">{PERFIS[usuario.perfil]}</dd>
            </div>
            <div>
              <dt className="text-tinta2">Acesso atual</dt>
              <dd className="mt-0.5 font-medium">{usuario.ultimo_acesso_em ? `desde ${dataHoraBR(usuario.ultimo_acesso_em)}` : "-"}</dd>
            </div>
            <div>
              <dt className="text-tinta2">Conta criada em</dt>
              <dd className="mt-0.5 font-medium">{dataHoraBR(usuario.criado_em)}</dd>
            </div>
          </dl>
          <div className="space-y-2 border-t border-regua-clara px-5 py-4 text-sm text-tinta2">
            <p>A sessão encerra sozinha depois de 30 minutos sem uso (RNF03).</p>
            <p>Para pedir a remoção dos seus dados pessoais (LGPD), fale com o administrador do sistema.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
