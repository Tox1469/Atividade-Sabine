"use client";

import { FormDocumento } from "@/app/(admin)/prestadores/formularios";
import { enviarMeuDocumento, prepararMeuEnvio } from "./actions";

export function FormMeuDocumento({ tipos }: { tipos: { id: number; nome: string; exige_validade: boolean }[] }) {
  return <FormDocumento tipos={tipos} acao={enviarMeuDocumento} preparar={prepararMeuEnvio} />;
}
