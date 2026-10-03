import { z } from "zod";
import { ROLES } from "@/models/User";

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,30}$/, "3 a 30 caracteres: letras, números, punto, guion");
const password = z.string().min(6, "Mínimo 6 caracteres").max(72);

export const loginSchema = z.object({ username, password: z.string().min(1).max(72) });

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(60),
  username,
  password,
  role: z.enum(ROLES),
});

// Contraseña vacía = no cambiarla.
export const updateUserSchema = createUserSchema.extend({
  id: z.string().regex(/^[a-f0-9]{24}$/),
  password: z.union([z.literal(""), password]),
});
