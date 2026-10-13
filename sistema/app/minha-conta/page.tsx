import { Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { dataHoraBR } from "@/lib/formato";
import { usuarioLogado } from "@/lib/permissao";
import { FormSenha } from "./formulario";

export default async function MinhaConta() {
  const sessao = await usuarioLogado();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id_usuario: Number(sessao.id) } });
  return (
    <div className="mx-auto max-w-xl">
      <Titulo titulo="Minha conta" subtitulo={`${usuario.nome}, ${usuario.email}`} />
      <p className="mb-4 text-sm text-tinta2">
        {usuario.ultimo_acesso_em ? `Acesso atual iniciado em ${dataHoraBR(usuario.ultimo_acesso_em)}.` : ""} A sessão encerra sozinha depois de 30 minutos sem uso (RNF03).
      </p>
      <FormSenha />
    </div>
  );
}
