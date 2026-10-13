"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type GrupoMenu = { titulo: string; itens: { nome: string; href: string }[] };

export function MenuLateral({ grupos }: { grupos: GrupoMenu[] }) {
  const caminho = usePathname();
  // o item ativo e o de endereco mais comprido que casa, pra "nova solicitacao" nao acender junto com "minhas solicitacoes"
  const ativo = grupos
    .flatMap((g) => g.itens)
    .filter((i) => caminho === i.href || caminho.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex min-w-0 gap-4 overflow-x-auto border-b border-regua bg-white px-3 py-2 md:block md:w-52 md:shrink-0 md:overflow-visible md:border-r md:border-b-0 md:px-0 md:py-4">
      {grupos.map((grupo) => (
        <div key={grupo.titulo} className="flex shrink-0 items-center gap-1 md:mb-4 md:block">
          <p className="hidden px-4 pb-1 text-xs font-semibold text-tinta2 md:block">{grupo.titulo}</p>
          {grupo.itens.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block whitespace-nowrap px-4 py-1.5 text-sm ${
                ativo === item.href ? "border-l-3 border-caneta bg-caneta-clara font-semibold" : "hover:bg-papel"
              }`}
            >
              {item.nome}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
