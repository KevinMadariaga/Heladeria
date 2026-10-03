import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/money";
import { stockStatus, toClientProduct } from "@/lib/serialize";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { StockTable } from "./stock-table";

export const metadata: Metadata = { title: "Inventario" };

const TYPE_LABEL: Record<string, string> = { in: "Entrada", out: "Merma", adjust: "Conteo", sale: "Venta", void: "Anulación" };

export default async function InventarioAdminPage() {
  await requireRole("admin");
  const [cats, docs, moves] = await Promise.all([
    Category.find().lean(),
    Product.find({ trackStock: true, active: true }).sort({ stock: 1, name: 1 }).lean(),
    StockMovement.find().sort({ createdAt: -1 }).limit(40).populate<{ productId: { name: string } | null }>("productId", "name").populate<{ userId: { name: string } | null }>("userId", "name").lean(),
  ]);
  const products = docs.map(toClientProduct);
  const colors = Object.fromEntries(cats.map((c) => [String(c._id), c.color]));
  const out = products.filter((p) => stockStatus(p) === "out").length;
  const low = products.filter((p) => stockStatus(p) === "low").length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Inventario</h1>

      {(out > 0 || low > 0) && (
        <p role="status" className="sticker flex flex-wrap gap-x-4 gap-y-1 bg-caramelo-400/25 p-4 font-heading">
          <span aria-hidden>⚠️</span>
          {out > 0 && <span>{out} agotado(s)</span>}
          {low > 0 && <span>{low} con stock bajo</span>}
        </p>
      )}

      <section aria-labelledby="stock" className="sticker bg-card p-5">
        <h2 id="stock" className="mb-1 text-xl font-semibold">
          Productos con control de stock
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">Ordenados de menor a mayor stock. Para controlar el stock de otro producto, actívalo al editarlo en Productos.</p>
        {products.length ? <StockTable products={products} colors={colors} /> : <p className="text-muted-foreground">Ningún producto controla stock todavía.</p>}
      </section>

      <section aria-labelledby="movs" className="sticker bg-card p-5">
        <h2 id="movs" className="mb-3 text-xl font-semibold">
          Últimos movimientos
        </h2>
        {moves.length === 0 ? (
          <p className="text-muted-foreground">Sin movimientos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Producto</th>
                  <th className="py-2 pr-3 font-medium">Tipo</th>
                  <th className="py-2 pr-3 text-right font-medium">Cant.</th>
                  <th className="py-2 pr-3 font-medium">Motivo</th>
                  <th className="py-2 font-medium">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((m) => (
                  <tr key={String(m._id)} className="border-t border-border">
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                    <td className="py-2 pr-3">{m.productId?.name ?? "—"}</td>
                    <td className="py-2 pr-3">{TYPE_LABEL[m.type]}</td>
                    <td className={`py-2 pr-3 text-right font-heading tabular-nums ${m.qty < 0 ? "text-destructive" : ""}`}>
                      {m.qty > 0 ? `+${m.qty}` : m.qty}
                    </td>
                    <td className="py-2 pr-3">{m.reason}</td>
                    <td className="py-2">{m.userId?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
