import { FormularioOrdem } from "@/app/_componentes/formulario-ordem";
import { Aviso, Titulo } from "@/app/_componentes/ui";
import { catalogoAtivo, enderecoDe } from "@/lib/ordens";
import { exigirCliente } from "@/lib/permissao";
import { prazoMinimo } from "@/lib/validacao/ordem";
import { abrirSolicitacao } from "../actions";

export const metadata = { title: "Nova solicitação" };

// T17 - nova solicitacao (UC12)
export default async function NovaSolicitacao() {
  const { cliente } = await exigirCliente();
  const categorias = await catalogoAtivo();

  return (
    <div className="mx-auto max-w-4xl">
      <Titulo voltar={["/minhas-solicitacoes", "minhas solicitações"]} titulo="Nova solicitação" subtitulo="Escolha o serviço e descreva o que precisa" />
      {cliente.ativo ? (
        <FormularioOrdem acao={abrirSolicitacao} categorias={categorias} voltar="/minhas-solicitacoes" prazoMinimo={prazoMinimo()} localPadrao={enderecoDe(cliente)} />
      ) : (
        <Aviso tom="erro" titulo="Seu cadastro está inativo.">Para abrir uma solicitação, fale com o administrador (UC12 E4.3).</Aviso>
      )}
    </div>
  );
}
