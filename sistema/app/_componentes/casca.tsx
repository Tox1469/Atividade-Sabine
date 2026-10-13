import Link from "next/link";
import { signOut } from "@/auth";
import type { Perfil } from "@/lib/permissao";
import { AvisosFlutuantes } from "./aviso-flutuante";
import { MenuLateral, type GrupoMenu } from "./menu";

// cada perfil so enxerga no menu o que pode usar. isso e conforto: quem barra de verdade
// e a checagem de perfil no servidor de cada pagina (RNF02)
const MENUS: Record<Perfil, GrupoMenu[]> = {
  administrador: [
    {
      titulo: "Operação",
      itens: [
        { nome: "Painel do dia", href: "/painel" },
        { nome: "Ordens de serviço", href: "/ordens" },
        { nome: "Vencimentos", href: "/vencimentos" },
      ],
    },
    {
      titulo: "Cadastro",
      itens: [
        { nome: "Prestadores", href: "/prestadores" },
        { nome: "Clientes", href: "/clientes" },
        { nome: "Serviços", href: "/servicos" },
        { nome: "Categorias", href: "/categorias" },
        { nome: "Usuários", href: "/usuarios" },
      ],
    },
    {
      titulo: "Relatórios",
      itens: [
        { nome: "Desempenho", href: "/relatorios/desempenho" },
        { nome: "Serviços por período", href: "/relatorios/periodo" },
        { nome: "Log de ações", href: "/log" },
      ],
    },
    { titulo: "Conta", itens: [{ nome: "Minha conta", href: "/minha-conta" }] },
  ],
  prestador: [
    {
      titulo: "Trabalho",
      itens: [
        { nome: "Minhas ordens", href: "/minhas-ordens" },
        { nome: "Meus documentos", href: "/meus-documentos" },
      ],
    },
    { titulo: "Conta", itens: [{ nome: "Minha conta", href: "/minha-conta" }] },
  ],
  cliente: [
    {
      titulo: "Solicitações",
      itens: [
        { nome: "Minhas solicitações", href: "/minhas-solicitacoes" },
      ],
    },
    { titulo: "Conta", itens: [{ nome: "Minha conta", href: "/minha-conta" }] },
  ],
};

const NOME_PERFIL: Record<Perfil, string> = { administrador: "Administrador", prestador: "Prestador", cliente: "Cliente" };

function Sair() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button className="cursor-pointer rounded-md px-2 py-1 text-sm text-tinta2 transition-colors hover:bg-[#f2f4f3] hover:text-tinta">Sair</button>
    </form>
  );
}

export function Casca({ perfil, nome, children }: { perfil: Perfil; nome: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-regua bg-white md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <div className="flex items-center justify-between px-5 py-4 md:pt-7 md:pb-6">
          <Link href="/" className="leading-tight">
            <span className="block text-[17px] font-semibold tracking-[-0.01em] text-caneta">SGP</span>
            <span className="block text-xs text-tinta2">Gestão de prestadores</span>
          </Link>
          <div className="flex items-center gap-2 md:hidden">
            <span className="max-w-32 truncate text-sm text-tinta2">{nome}</span>
            <Sair />
          </div>
        </div>
        <div className="md:flex-1 md:overflow-y-auto">
          <MenuLateral grupos={MENUS[perfil]} />
        </div>
        <div className="hidden items-center gap-3 border-t border-regua-clara px-5 py-4 md:flex">
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-medium" title={nome}>{nome}</span>
            <span className="block text-xs text-tinta2">{NOME_PERFIL[perfil]}</span>
          </span>
          <Sair />
        </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-9">{children}</main>
      <AvisosFlutuantes />
    </div>
  );
}
