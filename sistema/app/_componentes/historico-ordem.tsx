import { tituloAndamento } from "@/lib/dominio/ordem";
import { dataHoraBR } from "@/lib/formato";
import { Tempo } from "./ui";

type Andamento = {
  status_anterior: string | null;
  status_novo: string;
  observacao: string | null;
  registrado_em: Date;
  usuario: { nome: string; perfil: string };
};

// linha do tempo da ordem (RF13): cada mudanca com data, hora, quem fez e a observacao
export function HistoricoOrdem({ andamentos }: { andamentos: Andamento[] }) {
  return (
    <Tempo
      itens={[...andamentos]
        .sort((a, b) => b.registrado_em.getTime() - a.registrado_em.getTime())
        .map((a) => ({
          titulo: tituloAndamento({ ...a, perfil: a.usuario.perfil }),
          quando: `${dataHoraBR(a.registrado_em)}, por ${a.usuario.nome}`,
          texto: a.observacao,
        }))}
    />
  );
}
