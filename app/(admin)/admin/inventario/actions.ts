"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-guard";
import { BusinessError } from "@/lib/cash";
import { adjustStock } from "@/lib/inventory";
import { adjustSchema } from "@/lib/validations/inventory";

export type FormState = { ok?: boolean; error?: string } | undefined;

export async function adjustStockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const parsed = adjustSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };
  if (parsed.data.type !== "adjust" && parsed.data.qty === 0) return { error: "La cantidad debe ser mayor a 0" };
  try {
    await adjustStock(admin, parsed.data);
  } catch (err) {
    if (err instanceof BusinessError) return { error: err.message };
    throw err;
  }
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/productos");
  revalidatePath("/pos", "layout");
  return { ok: true };
}
