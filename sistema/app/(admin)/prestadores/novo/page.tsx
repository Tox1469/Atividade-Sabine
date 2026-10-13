import { Titulo } from "@/app/_componentes/ui";
import { exigirPerfil } from "@/lib/permissao";
import { FormPrestador } from "../formularios";

// T04 - cadastro do prestador (novo). as outras abas abrem depois de salvar
export default async function NovoPrestador() {
  await exigirPerfil("administrador");
  return (
    <div className="mx-auto max-w-5xl">
      <Titulo titulo="Novo prestador" subtitulo="Categorias, documentos e contrato ficam liberados depois de salvar o cadastro" />
      <FormPrestador id={null} />
    </div>
  );
}
