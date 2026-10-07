"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-guard";
import { BusinessError } from "@/lib/cash";
import { changePaymentMethod, closeShift, createSaleTx, openShift, voidSaleTx } from "@/lib/sales";
import { voidSchema } from "@/lib/validations/inventory";
import { changeMethodSchema, closeShiftSchema, openShiftSchema, saleInputSchema } from "@/lib/validations/sale";
import { Sale } from "@/models/Sale";

export type FormState = { ok?: boolean; error?: string } | undefined;

export async function submitSale(raw: unknown) {
  const user = await requireRole("admin", "cashier");
  const parsed = saleInputSchema.safeParse(raw);
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };
  try {
    const id = await createSaleTx(user, parsed.data);
    const s = (await Sale.findById(id).lean())!;
    revalidatePath("/pos", "layout");
    return {
      sale: {
        id: id,
        number: s.number,
        createdAt: s.createdAt.toISOString(),
        cashierName: s.cashierName,
        items: s.items.map((i) => ({
          name: i.name,
          variant: i.variant ?? undefined,
          addons: i.addons.map((a) => a.name ?? ""),
          qty: i.qty,
          subtotal: i.subtotal,
        })),
        total: s.total,
        paymentMethod: s.paymentMethod,
        cashReceived: s.cashReceived ?? undefined,
        change: s.change ?? undefined,
      },
    };
  } catch (err) {
    if (err instanceof BusinessError) return { error: err.message };
    throw err;
  }
}
export type TicketSale = NonNullable<Awaited<ReturnType<typeof submitSale>>["sale"]>;

export async function openShiftAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("admin", "cashier");
  const parsed = openShiftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Escribe la base en efectivo" };
  try {
    await openShift(user, parsed.data.openingCash);
  } catch (err) {
    if (err instanceof BusinessError) return { error: err.message };
    throw err;
  }
  revalidatePath("/pos", "layout");
  return { ok: true };
}

export async function closeShiftAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("admin", "cashier");
  const parsed = closeShiftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Escribe el efectivo contado" };
  try {
    await closeShift(user, parsed.data.countedCash);
  } catch (err) {
    if (err instanceof BusinessError) return { error: err.message };
    throw err;
  }
  revalidatePath("/pos", "layout");
  return { ok: true };
}

/** Cambia el método de pago de una venta ya cobrada (sin tocar productos, total ni stock). */
export async function changePaymentAction(raw: unknown) {
  const user = await requireRole("admin", "cashier");
  const parsed = changeMethodSchema.safeParse(raw);
  if (!parsed.success) return { error: "Método inválido" };
  try {
    await changePaymentMethod(user, parsed.data.saleId, parsed.data.method);
  } catch (err) {
    if (err instanceof BusinessError) return { error: err.message };
    throw err;
  }
  const s = (await Sale.findById(parsed.data.saleId).lean())!;
  revalidatePath("/pos", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true, paymentMethod: s.paymentMethod, cashReceived: s.cashReceived ?? undefined, change: s.change ?? undefined };
}

/** Devolución desde Caja: el cajero solo sus ventas del turno abierto (lo valida voidSaleTx). */
export async function returnSaleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("admin", "cashier");
  const parsed = voidSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };
  try {
    await voidSaleTx(user, parsed.data.saleId, parsed.data.reason);
  } catch (err) {
    if (err instanceof BusinessError) return { error: err.message };
    throw err;
  }
  revalidatePath("/pos", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
