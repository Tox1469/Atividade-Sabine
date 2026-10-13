import { aplicarVencimentos } from "@/lib/aptidao";

// RN02 (TA32): a vercel chama esta rota todo dia as 00:05 de brasilia (vercel.json) e manda
// o CRON_SECRET no cabecalho. sem o segredo certo ninguem dispara a rotina de fora
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("nao autorizado", { status: 401 });
  }
  const alterados = await aplicarVencimentos();
  return Response.json({ alterados });
}
