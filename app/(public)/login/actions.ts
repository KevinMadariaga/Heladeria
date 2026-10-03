"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { connectDB } from "@/lib/db";
import { loginSchema } from "@/lib/validations/user";
import { User } from "@/models/User";

export async function login(_prev: string | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return "Escribe tu usuario y contraseña";
  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) return "Usuario o contraseña incorrectos";
    throw err;
  }
  await connectDB();
  const user = await User.findOne({ username: parsed.data.username }).select("role").lean();
  redirect(user?.role === "admin" ? "/admin" : "/pos");
}
