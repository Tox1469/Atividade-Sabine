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

export function Titulo({ titulo, subtitulo, children }: { titulo: string; subtitulo?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-regua pb-3">
      <div>
        <h1 className="text-xl font-semibold">{titulo}</h1>
        {subtitulo && <p className="text-sm text-tinta2">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
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

// RN05: a trilha mostra onde a ordem esta na sequencia
export function Trilha({ status }: { status: string }) {
  const atual = PASSOS.indexOf(status);
  return (
    <div className="trilha">
      {PASSOS.map((p, i) => (
        <span key={p} className={`passo ${i < atual ? "feito" : i === atual ? "atual" : ""}`}>
          {NOME_STATUS[p]}
        </span>
      ))}
      {status === "cancelada" && <span className="passo cancelado">Cancelada</span>}
    </div>
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
    <div className="mt-3 flex items-center justify-end gap-2 text-sm">
      {pagina > 1 && <Link href={link(pagina - 1)} className="botao py-1">Anterior</Link>}
      <span className="text-tinta2">Página {pagina} de {paginas}</span>
      {pagina < paginas && <Link href={link(pagina + 1)} className="botao py-1">Próxima</Link>}
    </div>
  );
}

export function paginaAtual(valor: string | undefined) {
  return Math.max(1, Number(valor) || 1);
}
