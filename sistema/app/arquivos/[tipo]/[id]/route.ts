import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { contaValida } from "@/lib/permissao";
import { abrirArquivo } from "@/lib/storage";

// unica porta de saida dos arquivos. documento: o administrador ou o proprio prestador.
// contrato: so o administrador. qualquer outro recebe 404, sem dizer se o arquivo existe (RNF10)
export async function GET(_req: Request, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  const sessao = await auth();
  if (!sessao?.user) return new Response("faça login", { status: 401 });
  const { tipo, id } = await params;
  const admin = sessao.user.perfil === "administrador";

  let arquivo: { caminho: string; nome: string } | null = null;
  if (tipo === "documento") {
    const d = await prisma.documento.findUnique({ where: { id_documento: Number(id) || 0 }, include: { prestador: true } });
    if (d && d.arquivo_url && (admin || d.prestador.id_usuario === Number(sessao.user.id))) arquivo = { caminho: d.arquivo_url, nome: d.nome_arquivo };
  } else if (tipo === "contrato" && admin) {
    const c = await prisma.contrato.findUnique({ where: { id_contrato: Number(id) || 0 } });
    if (c) arquivo = { caminho: c.arquivo_url, nome: `contrato-${c.numero}.pdf` };
  }
  if (!arquivo) return new Response("não encontrado", { status: 404 });
  if (!(await contaValida(sessao.user))) return new Response("faça login", { status: 401 });

  const aberto = await abrirArquivo(arquivo.caminho);
  if ("link" in aberto) return Response.redirect(aberto.link, 302);
  const tipoMime = arquivo.caminho.endsWith(".pdf") ? "application/pdf" : arquivo.caminho.endsWith(".png") ? "image/png" : "image/jpeg";
  return new Response(new Uint8Array(aberto.bytes), {
    headers: { "Content-Type": tipoMime, "Content-Disposition": `inline; filename="${encodeURIComponent(arquivo.nome)}"` },
  });
}
