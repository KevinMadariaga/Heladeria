"use client";

import { useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { Modal } from "@/components/modal";
import { ProductImage } from "@/components/product-image";
import { StockBadge } from "@/components/stock-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCOP } from "@/lib/money";
import type { ClientProduct } from "@/lib/serialize";
import { setProductActive } from "./actions";
import { ProductForm } from "./product-form";

type Category = { id: string; name: string; color: string; active: boolean };

function Detail({ product, category, onEdit }: { product: ClientProduct; category?: Category; onEdit: () => void }) {
  const margin = product.cost !== undefined && product.price > 0 ? Math.round(((product.price - product.cost) / product.price) * 100) : null;
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ProductImage src={product.imageUrl} name={product.name} color={category?.color} className="aspect-square w-full" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: category?.color }} />
            {category?.name ?? "Sin categoría"}
          </Badge>
          <StockBadge product={product} />
          {!product.active && <Badge variant="outline">Inactivo</Badge>}
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-sm text-muted-foreground">Precio</dt>
            <dd className="font-heading text-2xl font-semibold text-primary">{formatCOP(product.price)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Costo · margen</dt>
            <dd className="font-heading text-lg">{product.cost !== undefined ? `${formatCOP(product.cost)} · ${margin}%` : "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm text-muted-foreground">Inventario</dt>
            <dd className="font-heading text-lg">
              {product.trackStock ? `${product.stock} unidades (mínimo ${product.minStock})` : "Sin control de stock"}
            </dd>
          </div>
        </dl>
        {[
          ["Tamaños", product.variants, ""],
          ["Toppings", product.addons, "+"],
        ].map(([label, opts, sign]) =>
          (opts as ClientProduct["variants"]).length ? (
            <div key={label as string}>
              <h3 className="mb-1.5 text-sm font-medium text-muted-foreground">{label as string}</h3>
              <ul className="flex flex-wrap gap-2">
                {(opts as ClientProduct["variants"]).map((o) => (
                  <li key={o.name} className="rounded-full bg-secondary px-3 py-1 text-sm">
                    {o.name} · {sign as string}
                    {formatCOP(o.price)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
        <div className="mt-auto flex flex-wrap justify-center gap-3 pt-2">
          <Button type="button" onClick={onEdit} className="press-3d h-11 rounded-xl px-5">
            <Pencil /> Editar
          </Button>
          <form action={setProductActive}>
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="active" value={String(!product.active)} />
            <Button type="submit" variant={product.active ? "destructive" : "outline"} className="h-11 rounded-xl">
              {product.active ? "Desactivar" : "Reactivar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function Catalog({ products, categories }: { products: ClientProduct[]; categories: Category[] }) {
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es");
    return products.filter((p) => (cat === "all" || p.categoryId === cat) && (!q || p.name.toLocaleLowerCase("es").includes(q)));
  }, [products, cat, query]);
  // Se deriva de props: tras guardar, revalidatePath trae el producto actualizado y la ficha lo refleja.
  const open = products.find((p) => p.id === openId);

  return (
    <section aria-labelledby="catalogo" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="catalogo" className="text-2xl font-semibold">
          Catálogo <span className="text-base font-normal text-muted-foreground">({products.length})</span>
        </h2>
        <div className="relative w-full sm:w-72">
          <Search aria-hidden className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Buscar producto"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 rounded-2xl bg-card pl-10"
          />
        </div>
      </div>
      <div role="group" aria-label="Filtrar por categoría" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[{ id: "all", name: "Todo", color: "var(--uva-700)" }, ...categories].map((c) => (
          <Button
            key={c.id}
            type="button"
            variant={cat === c.id ? "default" : "outline"}
            aria-pressed={cat === c.id}
            onClick={() => setCat(c.id)}
            className="h-10 shrink-0 rounded-full px-4"
          >
            <span aria-hidden className="size-3 rounded-full border border-white" style={{ background: c.color }} />
            {c.name}
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No hay productos para mostrar.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((p) => {
            const c = catById.get(p.categoryId);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => {
                    setEditing(false);
                    setOpenId(p.id);
                  }}
                  className={`lift sticker flex w-full flex-col gap-2 bg-card p-2 text-left focus-visible:ring-4 focus-visible:ring-ring ${p.active ? "" : "opacity-55"}`}
                >
                  <ProductImage src={p.imageUrl} name={p.name} color={c?.color} className="aspect-[4/3]" />
                  <span className="line-clamp-2 px-1 font-heading leading-tight font-medium">{p.name}</span>
                  <span className="flex flex-wrap items-center gap-1 px-1 pb-1 text-sm">
                    <span className="font-heading text-base font-semibold text-primary">{formatCOP(p.price)}</span>
                    {p.trackStock && <span className="text-muted-foreground">· {p.stock} u.</span>}
                    <StockBadge product={p} />
                    {!p.active && <Badge variant="outline">Inactivo</Badge>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!open}
        onClose={() => setOpenId(null)}
        title={open ? (editing ? `Editar · ${open.name}` : open.name) : ""}
        className="w-[min(56rem,calc(100vw-2rem))]"
      >
        {open &&
          (editing ? (
            <ProductForm key={open.id} product={open} categories={categories} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
          ) : (
            <Detail product={open} category={catById.get(open.categoryId)} onEdit={() => setEditing(true)} />
          ))}
      </Modal>
    </section>
  );
}
