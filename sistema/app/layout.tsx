import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SGP - gestão de prestadores", template: "%s | SGP" },
  description: "Sistema de gestão de prestadores de serviço terceirizados",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
