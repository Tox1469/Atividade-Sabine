import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // rodando local o arquivo do documento vai junto com o formulario (ate 10 mb, RNF09).
  // publicado ele sobe direto pro storage e nem passa por aqui (lib/storage.ts)
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  // cabecalhos de seguranca em todas as respostas: o sgp nao abre dentro de iframe de outro site,
  // o navegador respeita o tipo declarado dos arquivos e o endereco nao vaza pra links externos
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
