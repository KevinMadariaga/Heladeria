"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-guard";
import { BusinessError } from "@/lib/cash";
import { deleteLocalImage, uploadProductImage } from "@/lib/images";
import { categorySchema, productSchema, toggleSchema } from "@/lib/validations/product";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";

export type FormState = { ok?: boolean; error?: string } | undefined;

function refresh() {
  revalidatePath("/admin/productos");
  revalidatePath("/pos", "layout");
}

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const image = formData.get("image");
  formData.delete("image");
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };
  const { id, stockIn, ...data } = parsed.data;

  try {
    if (!(await Category.exists({ _id: data.categoryId }))) return { error: "Categoría inválida" };
    const imageUrl = image instanceof File && image.size > 0 ? await uploadProductImage(image) : undefined;
    const fields = { ...data, ...(imageUrl && { imageUrl }), ...(data.cost === undefined && { $unset: { cost: 1 } }) };

    let productId = id;
    if (id) {
      const prev = await Product.findOneAndUpdate({ _id: id }, { ...fields, ...(data.trackStock && stockIn > 0 && { $inc: { stock: stockIn } }) });
      if (!prev) return { error: "Producto no encontrado" };
      if (imageUrl) await deleteLocalImage(prev.imageUrl);
    } else {
      const p = await Product.create({ ...data, imageUrl, stock: data.trackStock ? stockIn : 0 });
      productId = p.id;
    }
    if (data.trackStock && stockIn > 0) {
      await StockMovement.create({ productId, type: "in", qty: stockIn, reason: id ? "Entrada" : "Stock inicial", userId: admin.id });
    }
  } catch (err) {
    if (err instanceof BusinessError) return { error: err.message };
    throw err;
  }
  refresh();
  return { ok: true };
}

export async function setProductActive(formData: FormData) {
  await requireRole("admin");
  const { id, active } = toggleSchema.parse(Object.fromEntries(formData));
  await Product.updateOne({ _id: id }, { active: active === "true" });
  refresh();
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };
  try {
    await Category.create({ ...parsed.data, slug: slugify(parsed.data.name), order: await Category.countDocuments() });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { error: "Esa categoría ya existe" };
    throw err;
  }
  refresh();
  return { ok: true };
}

export async function setCategoryActive(formData: FormData) {
  await requireRole("admin");
  const { id, active } = toggleSchema.parse(Object.fromEntries(formData));
  await Category.updateOne({ _id: id }, { active: active === "true" });
  refresh();
}

const deleteSchema = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/) });

/** Elimina el producto y su foto. Ventas y movimientos conservan su copia (nombre y precio). */
export async function deleteProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Producto inválido" };
  const deleted = await Product.findOneAndDelete({ _id: parsed.data.id });
  if (!deleted) return { error: "El producto ya no existe" };
  await deleteLocalImage(deleted.imageUrl);
  refresh();
  return { ok: true };
}
