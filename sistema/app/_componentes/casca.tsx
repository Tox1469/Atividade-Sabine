import { signOut } from "@/auth";
import type { Perfil } from "@/lib/permissao";
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
        { nome: "Nova solicitação", href: "/minhas-solicitacoes/nova" },
      ],
    },
    { titulo: "Conta", itens: [{ nome: "Minha conta", href: "/minha-conta" }] },
  ],
};

const NOME_PERFIL: Record<Perfil, string> = { administrador: "Administrador", prestador: "Prestador", cliente: "Cliente" };

export function Casca({ perfil, nome, children }: { perfil: Perfil; nome: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b-3 border-caneta bg-caneta-escura px-4 py-2 text-white">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold">SGP</span>
          <span className="hidden text-sm text-[#aab0b6] sm:inline">gestão de prestadores</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <p className="text-sm font-semibold">{nome}</p>
            <p className="text-xs text-[#aab0b6]">{NOME_PERFIL[perfil]}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="border-l border-[#555b61] pl-3"
          >
            <button className="cursor-pointer text-sm hover:underline">Sair</button>
          </form>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        <MenuLateral grupos={MENUS[perfil]} />
        <main className="min-w-0 flex-1 px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}
