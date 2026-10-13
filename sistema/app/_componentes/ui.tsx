import Link from "next/link";
import { NOME_STATUS } from "@/lib/dominio/ordem";

// pecas de tela repetidas em quase todas as paginas, no mesmo visual do prototipo

export function Chip({ tom, children }: { tom: string; children: React.ReactNode }) {
  return <span className={`chip chip-${tom}`}>{children}</span>;
}

export function ChipStatus({ status }: { status: string }) {
  return <Chip tom={status}>{NOME_STATUS[status] ?? status}</Chip>;
}

export function ChipSituacao({ situacao }: { situacao: string }) {
  return <Chip tom={situacao}>{situacao[0].toUpperCase() + situacao.slice(1)}</Chip>;
}

export function Aviso({ tom, titulo, children }: { tom?: "ok" | "atencao" | "erro"; titulo: string; children?: React.ReactNode }) {
  return (
    <div className={`aviso ${tom ?? ""}`} role={tom === "erro" ? "alert" : "status"}>
      <strong>{titulo}</strong>
      {children}
    </div>
  );
}

export function Titulo({ titulo, subtitulo, voltar, children }: { titulo: string; subtitulo?: React.ReactNode; voltar?: [string, string]; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:flex-nowrap">
      <div className="min-w-0 flex-1">
        {voltar && (
          <Link href={voltar[0]} className="nao-imprimir mb-2 inline-block text-sm text-tinta2 hover:text-caneta">
            Voltar para {voltar[1]}
          </Link>
        )}
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.01em]">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-tinta2">{subtitulo}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="vazio">
      <strong>{titulo}</strong>
      {children}
    </div>
  );
}

const PASSOS = ["aberta", "atribuida", "em_execucao", "concluida"];

// RN05: a trilha mostra onde a ordem esta na sequencia. cancelada vira a ultima etapa, em vermelho
export function Trilha({ status }: { status: string }) {
  const cancelada = status === "cancelada";
  const atual = PASSOS.indexOf(status);
  const etapas = cancelada ? [...PASSOS.slice(0, 1), "cancelada"] : PASSOS;
  return (
    <ol className="trilha" aria-label="Situação da ordem">
      {etapas.map((p, i) => {
        const classe = p === "cancelada" ? "cancelado" : cancelada ? "feito" : i < atual ? "feito" : i === atual ? "atual" : "";
        return (
          <li key={p} className={`passo ${classe}`} aria-current={classe === "atual" ? "step" : undefined}>
            <span className="marca">{classe === "feito" ? "✓" : p === "cancelada" ? "✕" : i + 1}</span>
            {NOME_STATUS[p]}
          </li>
        );
      })}
    </ol>
  );
}

export function Tempo({ itens }: { itens: { titulo: string; quando: string; texto?: string | null }[] }) {
  return (
    <ul className="tempo">
      {itens.map((item, i) => (
        <li key={i}>
          <strong>{item.titulo}</strong>
          <span className="quando">{item.quando}</span>
          {item.texto}
        </li>
      ))}
    </ul>
  );
}

// RNF06: toda listagem pagina no banco. o link mantem os filtros que estao no endereco
export function Paginacao({ pagina, total, porPagina, base, params }: { pagina: number; total: number; porPagina: number; base: string; params: Record<string, string | undefined> }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  const link = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "pagina" && k !== "ok") q.set(k, v);
    q.set("pagina", String(p));
    return `${base}?${q}`;
  };
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      {pagina > 1 && <Link href={link(pagina - 1)} className="botao py-1">Anterior</Link>}
      <span className="text-tinta2">Página {pagina} de {paginas}</span>
      {pagina < paginas && <Link href={link(pagina + 1)} className="botao py-1">Próxima</Link>}
    </div>
  );
}

export function paginaAtual(valor: string | undefined) {
  return Math.max(1, Number(valor) || 1);
}
