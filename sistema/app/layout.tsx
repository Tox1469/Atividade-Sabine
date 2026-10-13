import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// ibm plex sans: letra de ferramenta de trabalho, com numeros alinhados pras colunas de data e valor
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--fonte-plex", display: "swap" });

export const metadata: Metadata = {
  title: { default: "SGP - gestão de prestadores", template: "%s | SGP" },
  description: "Sistema de gestão de prestadores de serviço terceirizados",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={plex.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
