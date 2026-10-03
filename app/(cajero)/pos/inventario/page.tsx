import type { Metadata } from "next";
import { ProductImage } from "@/components/product-image";
import { StockBadge } from "@/components/stock-badge";
import { requireRole } from "@/lib/auth-guard";
import { activeCatalog } from "@/lib/catalog";
import { formatCOP } from "@/lib/money";

export const metadata: Metadata = { title: "Inventario" };

export default async function InventarioPage() {
  await requireRole("admin", "cashier");
  const { categories, products } = await activeCatalog();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Inventario</h1>
      {categories.map((c) => {
        const items = products.filter((p) => p.categoryId === c.id);
        if (!items.length) return null;
        return (
          <section key={c.id} aria-labelledby={`cat-${c.id}`} className="sticker bg-card p-4">
            <h2 id={`cat-${c.id}`} className="mb-3 text-xl font-semibold">
              {c.name}
            </h2>
            <ul className="flex flex-col divide-y divide-border">
              {items.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <ProductImage src={p.imageUrl} name={p.name} color={c.color} className="size-12 shrink-0 rounded-xl" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="line-clamp-2 font-heading leading-tight font-medium">{p.name}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      {p.trackStock ? `${p.stock} u.` : "Sin control de stock"}
                      <StockBadge product={p} />
                    </span>
                  </div>
                  <span className="shrink-0 font-heading tabular-nums">{formatCOP(p.price)}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
