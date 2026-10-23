import { z } from "zod";
import { ACTIVE_PAYMENT_METHODS, SWITCHABLE_PAYMENT_METHODS } from "@/lib/money";
import { DELIVERY_STATUSES } from "@/models/Sale";

export const objectId = z.string().regex(/^[a-f0-9]{24}$/, "Id inválido");
const money = z.coerce.number().int().min(0).max(100_000_000);

// El cliente solo manda qué y cuánto; los precios se recalculan en el servidor.
const cartItems = z
  .array(
    z.object({
      productId: objectId,
      variant: z.string().max(60).optional(),
      addons: z.array(z.string().max(60)).max(20).default([]),
      qty: z.number().int().min(1).max(99),
    }),
  )
  .min(1, "El carrito está vacío")
.max(50);

export const saleInputSchema = z.object({
  items: cartItems,
  paymentMethod: z.enum(ACTIVE_PAYMENT_METHODS),
  cashReceived: money.optional(),
  transferAmount: money.optional(), // solo pago mixto
  containerFee: money.optional(), // porta / envase (valor total)
  containerQty: z.coerce.number().int().min(1).max(99).optional(), // cuántos portas
  delivery: z
    .object({
      customer: z.string().trim().min(2, "Escribe el nombre del cliente").max(80),
      phone: z.string().trim().max(30).optional(),
      address: z.string().trim().min(3, "Escribe la dirección").max(200),
      notes: z.string().trim().max(200).optional(),
      fee: money,
    })
    .optional(),
});
export type SaleInput = z.infer<typeof saleInputSchema>;

/** Producto que el cajero saca para él (se anota como deuda). */
export const consumptionInputSchema = z.object({ items: cartItems, note: z.string().trim().max(200).optional() });
export type ConsumptionInput = z.infer<typeof consumptionInputSchema>;

export const openShiftSchema = z.object({ openingCash: money });
export const closeShiftSchema = z.object({
  countedCash: money,
  countedTransfer: money,
  note: z.string().trim().max(300).optional(),
});

export const changeMethodSchema = z.object({ saleId: objectId, method: z.enum(SWITCHABLE_PAYMENT_METHODS) });

export const deliveryStatusSchema = z.object({ saleId: objectId, status: z.enum(DELIVERY_STATUSES) });
