"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-guard";
import { createUserSchema, updateUserSchema } from "@/lib/validations/user";
import { User } from "@/models/User";

export type FormState = { ok?: boolean; error?: string } | undefined;

const isDuplicate = (err: unknown) => (err as { code?: number })?.code === 11000;

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };
  const { password, ...data } = parsed.data;
  try {
    await User.create({ ...data, passwordHash: await bcrypt.hash(password, 10) });
  } catch (err) {
    if (isDuplicate(err)) return { error: "Ese usuario ya existe" };
    throw err;
  }
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function updateUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireRole("admin");
  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };
  const { id, password, ...data } = parsed.data;
  if (id === me.id && data.role !== "admin") return { error: "No puedes quitarte el rol de admin" };
  const update = password ? { ...data, passwordHash: await bcrypt.hash(password, 10) } : data;
  try {
    await User.updateOne({ _id: id }, update);
  } catch (err) {
    if (isDuplicate(err)) return { error: "Ese usuario ya existe" };
    throw err;
  }
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

const toggleSchema = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/), active: z.enum(["true", "false"]) });

// Desactivar, nunca borrar.
export async function setUserActive(formData: FormData) {
  const me = await requireRole("admin");
  const { id, active } = toggleSchema.parse(Object.fromEntries(formData));
  if (id === me.id) return;
  await User.updateOne({ _id: id }, { active: active === "true" });
  revalidatePath("/admin/usuarios");
}
