import "server-only";
import { toClientProduct } from "@/lib/serialize";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

/** Categorías y productos activos para POS e inventario. */
export async function activeCatalog() {
  const [cats, docs] = await Promise.all([
    Category.find({ active: true }).sort({ order: 1 }).lean(),
    Product.find({ active: true }).sort({ name: 1 }).lean(),
  ]);
  const categories = cats.map((c) => ({ id: String(c._id), name: c.name, color: c.color }));
  const ids = new Set(categories.map((c) => c.id));
  return { categories, products: docs.map(toClientProduct).filter((p) => ids.has(p.categoryId)) };
}
