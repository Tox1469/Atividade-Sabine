"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// abas da T04. contratos entrou depois do mvp (TA50)
const abas = [
  ["", "Dados cadastrais"],
  ["/categorias", "Categorias"],
  ["/documentos", "Documentos"],
  ["/situacao", "Situação cadastral"],
  ["/contratos", "Contratos"],
];

export function AbasPrestador({ id }: { id: number }) {
  const caminho = usePathname();
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-regua text-sm">
      {abas.map(([sufixo, nome]) => {
        const href = `/prestadores/${id}${sufixo}`;
        return caminho === href ? (
          <span key={href} className="-mb-px whitespace-nowrap rounded-t border border-b-0 border-regua border-t-2 border-t-caneta bg-white px-4 py-2 font-semibold">
            {nome}
          </span>
        ) : (
          <Link key={href} href={href} className="whitespace-nowrap px-4 py-2 text-tinta2 hover:text-tinta">
            {nome}
          </Link>
        );
      })}
    </div>
  );
}
