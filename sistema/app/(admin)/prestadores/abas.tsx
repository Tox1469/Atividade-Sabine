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
    <div className="mb-6 flex gap-6 border-b border-regua text-sm max-md:overflow-x-auto">
      {abas.map(([sufixo, nome]) => {
        const href = `/prestadores/${id}${sufixo}`;
        return caminho === href ? (
          <span key={href} aria-current="page" className="-mb-px border-b-2 border-caneta pb-2.5 font-medium whitespace-nowrap text-caneta">
            {nome}
          </span>
        ) : (
          <Link key={href} href={href} className="-mb-px border-b-2 border-transparent pb-2.5 whitespace-nowrap text-tinta2 transition-colors hover:border-regua hover:text-tinta">
            {nome}
          </Link>
        );
      })}
    </div>
  );
}
