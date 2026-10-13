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
    <nav aria-label="Menu" className="flex min-w-0 gap-1 overflow-x-auto px-3 pb-2 md:block md:space-y-5 md:overflow-visible md:px-3 md:pb-0">
      {grupos.map((grupo) => (
        <div key={grupo.titulo} className="flex shrink-0 gap-1 md:block md:space-y-0.5">
          <p className="hidden px-3 pb-1.5 text-xs font-medium text-[#8a938f] md:block">{grupo.titulo}</p>
          {grupo.itens.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo === item.href ? "page" : undefined}
              className={`block rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                ativo === item.href ? "bg-caneta-clara font-medium text-caneta" : "text-tinta hover:bg-[#f2f4f3]"
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
