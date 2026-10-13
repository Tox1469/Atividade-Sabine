import { notFound } from "next/navigation";
import { ChipSituacao, Titulo } from "@/app/_componentes/ui";
import { prisma } from "@/lib/db";
import { formatarCpfCnpj } from "@/lib/dominio/cpf-cnpj";
import { exigirPerfil } from "@/lib/permissao";
import { AbasPrestador } from "../abas";

// T04 - ficha do prestador. o cabecalho e as abas sao os mesmos em todas as abas
export default async function FichaPrestador({ params, children }: { params: Promise<{ id: string }>; children: React.ReactNode }) {
  await exigirPerfil("administrador");
  const { id } = await params;
  const prestador = await prisma.prestador.findUnique({ where: { id_prestador: Number(id) || 0 } });
  if (!prestador) notFound();

  return (
    <div className="w-full">
      <Titulo
        voltar={["/prestadores", "prestadores"]}
        titulo={prestador.nome_fantasia ?? prestador.nome_razao_social}
        subtitulo={`${prestador.nome_fantasia ? prestador.nome_razao_social + ", " : ""}${formatarCpfCnpj(prestador.cpf_cnpj)}`}
      >
        <ChipSituacao situacao={prestador.situacao} />
      </Titulo>
      <AbasPrestador id={prestador.id_prestador} />
      {children}
    </div>
  );
}
