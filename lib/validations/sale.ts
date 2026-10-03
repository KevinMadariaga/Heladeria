import { z } from "zod";
import { PAYMENT_METHODS } from "@/models/Sale";

export const objectId = z.string().regex(/^[a-f0-9]{24}$/, "Id inválido");
const money = z.coerce.number().int().min(0).max(100_000_000);

// El cliente solo manda qué y cuánto; los precios se recalculan en el servidor.
export const saleInputSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        variant: z.string().max(60).optional(),
        addons: z.array(z.string().max(60)).max(20).default([]),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1, "El carrito está vacío")
    .max(50),
  paymentMethod: z.enum(PAYMENT_METHODS),
  cashReceived: money.optional(),
});
export type SaleInput = z.infer<typeof saleInputSchema>;

export const openShiftSchema = z.object({ openingCash: money });
export const closeShiftSchema = z.object({ countedCash: money });
