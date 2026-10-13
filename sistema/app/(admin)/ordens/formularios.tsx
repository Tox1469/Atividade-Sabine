"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { avisar } from "@/app/_componentes/aviso-flutuante";
import { BotaoEnviar, CampoTexto, MensagemFormulario, useFormulario } from "@/app/_componentes/campos";
import { FormularioOrdem } from "@/app/_componentes/formulario-ordem";
import { Janela } from "@/app/_componentes/janela";
import { abrirPeloAdmin, atribuirOrdem, cancelarOrdem, carregarCandidatos, type Candidatos } from "./actions";

// depois de uma acao que deu certo: fecha a janela, avisa e atualiza a tela de tras
export function useConcluir(fechar: () => void) {
  const router = useRouter();
  return (ok: string) => {
    fechar();
    avisar(ok);
    router.refresh();
  };
}

// T12b - abre na hora e busca os prestadores aptos (UC22) com a janela ja aberta
export function BotaoAtribuir({ idOrdem, texto = "Atribuir", classe = "botao-principal botao-pequeno" }: { idOrdem: number; texto?: string; classe?: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className={classe}>{texto}</button>
      {aberta && <JanelaAtribuir idOrdem={idOrdem} fechar={() => setAberta(false)} />}
    </>
  );
}

function JanelaAtribuir({ idOrdem, fechar }: { idOrdem: number; fechar: () => void }) {
  const [dados, setDados] = useState<Candidatos | null | undefined>(undefined);
  const { estado, enviar, enviando, valor } = useFormulario(atribuirOrdem.bind(null, idOrdem), {}, undefined, useConcluir(fechar));

  useEffect(() => {
    carregarCandidatos(idOrdem).then(setDados);
  }, [idOrdem]);

  const titulo = dados ? `${dados.troca ? "Trocar o prestador da" : "Atribuir a"} ordem ${dados.numero}` : "Atribuir ordem";
  return (
    <Janela titulo={titulo} aoFechar={fechar} largura={960}>
      {dados === undefined && (
        <div className="modal-corpo animate-pulse space-y-3" aria-busy="true">
          <p className="text-sm text-tinta2">Conferindo quem está apto para esta ordem...</p>
          {[0, 1, 2].map((i) => <div key={i} className="h-9 rounded bg-papel" />)}
        </div>
      )}
      {dados === null && <p className="modal-corpo text-sm">Esta ordem não está mais aberta para atribuição. Atualize a tela.</p>}
      {dados && (
        <form onSubmit={enviar}>
          <div className="modal-corpo">
            <MensagemFormulario estado={estado} />
            <p className="mb-3 text-sm text-tinta2">{dados.resumo}</p>
            <p className="aviso">
              <strong>Aparecem apenas os prestadores aptos para esta ordem.</strong>
              Aptidão é estar ativo, estar habilitado na categoria {dados.categoria}, não ter documento obrigatório vencido e ter contrato vigente (RN01 a RN04).
            </p>
            {dados.troca && (
              <CampoTexto nome="motivo" rotulo="Motivo da troca" obrigatorio valor={valor("motivo")} ajuda="Mínimo de 10 caracteres. As duas atribuições ficam no histórico da ordem." className="mb-3" />
            )}
            {dados.aptos.length === 0 ? (
              <p className="aviso atencao">
                <strong>Nenhum prestador apto para esta ordem.</strong>
                Habilite um prestador na categoria ou regularize a documentação de quem está pendente (UC13 A3.1).
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="tabela min-w-[600px]">
                  <thead>
                    <tr><th>Prestador</th><th className="numerico">Nota média</th><th className="numerico">Em andamento</th><th>Último atendimento</th><th></th></tr>
                  </thead>
                  <tbody>
                    {dados.aptos.map((a) => (
                      <tr key={a.id}>
                        <td>
                          {a.nome}
                          <span className="secundario">{a.detalhe}</span>
                        </td>
                        <td className="numerico">{a.nota}</td>
                        <td className="numerico">{a.emAndamento}</td>
                        <td>{a.ultimo}</td>
                        <td className="acoes">
                          <button type="submit" name="id_prestador" value={a.id} disabled={enviando} className="botao-principal botao-pequeno">
                            {dados.troca ? "Passar para ele" : "Atribuir"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {dados.inaptos.length > 0 && (
            <div className="modal-corpo border-t border-regua-clara">
              <h3 className="mb-1 text-sm font-semibold">Não disponíveis para esta ordem</h3>
              <p className="ajuda mb-2">A lista evita a dúvida de por que um prestador conhecido não aparece. Nenhum deles pode ser selecionado.</p>
              <div className="overflow-x-auto">
                <table className="tabela min-w-[520px]">
                  <thead>
                    <tr><th>Prestador</th><th>Motivo do impedimento</th></tr>
                  </thead>
                  <tbody>
                    {dados.inaptos.map((i) => (
                      <tr key={i.id}>
                        <td>{i.nome}</td>
                        <td>
                          <span className={`chip chip-${i.tom}`}>{i.chip}</span> {i.texto}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dados.outrosNaoHabilitados > 0 && <p className="ajuda mt-2">E mais {dados.outrosNaoHabilitados} prestadores ativos sem habilitação em {dados.categoria}.</p>}
            </div>
          )}
          <div className="rodape-form">
            <button type="button" onClick={fechar} className="botao">Fechar</button>
          </div>
        </form>
      )}
    </Janela>
  );
}

// T12c - cancelar com motivo
export function BotaoCancelar({ idOrdem, numero }: { idOrdem: number; numero: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className="botao-perigo">Cancelar ordem</button>
      {aberta && <JanelaCancelar idOrdem={idOrdem} numero={numero} fechar={() => setAberta(false)} />}
    </>
  );
}

function JanelaCancelar({ idOrdem, numero, fechar }: { idOrdem: number; numero: string; fechar: () => void }) {
  const { estado, enviar, enviando, valor, erro } = useFormulario(cancelarOrdem.bind(null, idOrdem), {}, undefined, useConcluir(fechar));
  return (
    <Janela titulo={`Cancelar a ordem ${numero}`} aoFechar={fechar} largura={560}>
      <form onSubmit={enviar} noValidate>
        <div className="modal-corpo">
          <p className="aviso atencao">
            <strong>O cancelamento não apaga a ordem.</strong>
            Ela continua no histórico com o motivo registrado, e o evento vai para o log de auditoria (RF19).
          </p>
          <MensagemFormulario estado={estado} />
          <CampoTexto nome="motivo" rotulo="Motivo do cancelamento" obrigatorio valor={valor("motivo")} erro={erro("motivo")} ajuda="Regra RN07. Ordens já concluídas não podem ser canceladas (RN06)." />
        </div>
        <div className="rodape-form">
          <button type="button" onClick={fechar} className="botao">Voltar</button>
          <BotaoEnviar enviando={enviando} texto="Confirmar cancelamento" enviandoTexto="Cancelando..." perigo confirmar="Cancelar a ordem? O cancelamento não pode ser desfeito." />
        </div>
      </form>
    </Janela>
  );
}

type PropsOrdem = Parameters<typeof FormularioOrdem>[0];

// UC12 A1.1 - abrir ordem pelo administrador, por cima da tela em que ele esta
export function BotaoNovaOrdem({
  categorias,
  clientes,
  prazoMinimo,
  clienteInicial,
  texto = "Abrir ordem",
  classe = "botao-principal",
}: {
  categorias: PropsOrdem["categorias"];
  clientes: NonNullable<PropsOrdem["clientes"]>;
  prazoMinimo: string;
  clienteInicial?: string;
  texto?: string;
  classe?: string;
}) {
  const [aberta, setAberta] = useState(false);
  const fechar = () => setAberta(false);
  const concluir = useConcluir(fechar);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className={classe}>{texto}</button>
      {aberta && (
        <Janela titulo="Abrir ordem de serviço" aoFechar={fechar} largura={880}>
          <FormularioOrdem
            emJanela
            acao={abrirPeloAdmin}
            aoConcluir={concluir}
            aoCancelar={fechar}
            categorias={categorias}
            clientes={clientes}
            clienteInicial={clienteInicial}
            prazoMinimo={prazoMinimo}
            voltar=""
          />
        </Janela>
      )}
    </>
  );
}
