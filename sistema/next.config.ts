import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // rodando local o arquivo do documento vai junto com o formulario (ate 10 mb, RNF09).
  // publicado ele sobe direto pro storage e nem passa por aqui (lib/storage.ts)
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
};

export default nextConfig;
