import { z } from "zod";
import { objectId } from "@/lib/validations/sale";

export const adjustSchema = z.object({
  productId: objectId,
  type: z.enum(["in", "out", "adjust"]),
  qty: z.coerce.number().int().min(0).max(100_000),
  reason: z.string().trim().min(3, "Escribe el motivo").max(200),
});

export const voidSchema = z.object({
  saleId: objectId,
  reason: z.string().trim().min(3, "Escribe el motivo").max(200),
});
