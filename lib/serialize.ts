import type { Types } from "mongoose";
import type { Option } from "@/lib/cash";

type LeanProduct = {
  _id: Types.ObjectId;
  name: string;
  categoryId: Types.ObjectId;
  price: number;
  cost?: number | null;
  imageUrl?: string | null;
  variants: Option[];
  addons: Option[];
  trackStock: boolean;
  stock: number;
  minStock: number;
  active: boolean;
};

/** Objeto plano (sin ObjectId) para pasar a Client Components. */
export function toClientProduct(p: LeanProduct) {
  return {
    id: String(p._id),
    name: p.name,
    categoryId: String(p.categoryId),
    price: p.price,
    cost: p.cost ?? undefined,
    imageUrl: p.imageUrl ?? "",
    variants: p.variants.map(({ name, price }) => ({ name, price })),
    addons: p.addons.map(({ name, price }) => ({ name, price })),
    trackStock: p.trackStock,
    stock: p.stock,
    minStock: p.minStock,
    active: p.active,
  };
}
export type ClientProduct = ReturnType<typeof toClientProduct>;

export const stockStatus = (p: Pick<ClientProduct, "trackStock" | "stock" | "minStock">) =>
  !p.trackStock ? null : p.stock <= 0 ? "out" : p.stock <= p.minStock ? "low" : null;
