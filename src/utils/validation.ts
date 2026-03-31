import { z } from "zod";

export const fareSchema = z.object({
  origen: z.string().min(2, "El origen es requerido"),
  destino: z.string().min(2, "El destino es requerido"),
});

export type FareInput = z.infer<typeof fareSchema>;
