"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-guard";
import { BusinessError } from "@/lib/cash";
import { voidSaleTx } from "@/lib/sales";
import { voidSchema } from "@/lib/validations/inventory";

export type FormState = { ok?: boolean; error?: string } | undefined;

export async function voidSaleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const parsed = voidSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };
  try {
    await voidSaleTx(admin, parsed.data.saleId, parsed.data.reason);
  } catch (err) {
    if (err instanceof BusinessError) return { error: err.message };
    throw err;
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/pos", "layout");
  return { ok: true };
}
