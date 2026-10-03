import { z } from "zod";
import { objectId } from "@/lib/validations/sale";

const int = z.coerce.number().int().min(0).max(100_000_000);
const option = z.object({ name: z.string().trim().min(1, "Opción sin nombre").max(60), price: int });
const optionsJson = z
  .string()
  .default("[]")
  .transform((s, ctx) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Opciones inválidas" });
      return z.NEVER;
    }
  })
  .pipe(z.array(option).max(20));

export const productSchema = z.object({
  id: z.union([z.literal(""), objectId]).optional().transform((v) => v || undefined),
  name: z.string().trim().min(2, "Nombre muy corto").max(80),
  categoryId: objectId,
  price: int,
  cost: z.union([z.literal(""), int]).optional().transform((v) => (v === "" ? undefined : v)),
  variants: optionsJson,
  addons: optionsJson,
  trackStock: z.literal("on").optional().transform((v) => v === "on"),
  stockIn: z.union([z.literal(""), z.coerce.number().int().min(0).max(100_000)]).optional().transform((v) => Number(v || 0)),
  minStock: z.coerce.number().int().min(0).max(100_000).default(0),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#B98AE6"),
});

export const toggleSchema = z.object({ id: objectId, active: z.enum(["true", "false"]) });
