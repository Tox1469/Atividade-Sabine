import { Titulo } from "@/app/_componentes/ui";
import { exigirPerfil } from "@/lib/permissao";
import { FormCliente } from "../formularios";

// T06 - cadastro do cliente (novo)
export default async function NovoCliente() {
  await exigirPerfil("administrador");
  return (
    <div className="mx-auto max-w-5xl">
      <Titulo titulo="Novo cliente" subtitulo="Dados e endereço" />
      <FormCliente id={null} />
    </div>
  );
}
