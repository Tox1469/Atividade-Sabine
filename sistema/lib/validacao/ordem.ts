import { z } from "zod";
import { PRIORIDADES } from "@/lib/dominio/ordem";
import { lerData } from "@/lib/formato";

// o menor prazo aceito e o dia de hoje em utc, que e o que o check do banco usa (prazo >= data de abertura).
// depois das 21h de brasilia isso ja e amanha, e a mensagem continua valendo
export const prazoMinimo = () => new Date().toISOString().slice(0, 10);

// RF11 / UC12. o mesmo esquema vale pra abertura pelo cliente e pelo administrador
export const ordemSchema = z.object({
  id_servico: z.coerce.number({ message: "Escolha o serviço." }).int().positive("Escolha o serviço."),
  prioridade: z.enum(PRIORIDADES, { message: "Escolha a prioridade." }),
  descricao: z
    .string()
    .trim()
    .min(20, "Descreva com mais detalhe: são necessários pelo menos 20 caracteres.") // E4.2
    .max(4000, "Máximo de 4000 caracteres."),
  prazo: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : lerData(v)))
    .refine((v) => v === null || v >= lerData(prazoMinimo())!, "O prazo não pode ser anterior a hoje."), // E4.1
  local_atendimento: z.string().trim().max(200, "Máximo de 200 caracteres.").transform((v) => (v === "" ? null : v)),
});
