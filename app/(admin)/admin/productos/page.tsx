import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-guard";
import { toClientProduct } from "@/lib/serialize";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { Catalog } from "./catalog";
import { CreatePanel } from "./create-panel";

export const metadata: Metadata = { title: "Productos" };

export default async function ProductosPage() {
  await requireRole("admin");
  const [cats, docs] = await Promise.all([Category.find().sort({ order: 1 }).lean(), Product.find().sort({ active: -1, name: 1 }).lean()]);
  const categories = cats.map((c) => ({ id: String(c._id), name: c.name, color: c.color, active: c.active }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Productos</h1>
      <CreatePanel categories={categories} />
      <Catalog products={docs.map(toClientProduct)} categories={categories} />
    </div>
  );
}
