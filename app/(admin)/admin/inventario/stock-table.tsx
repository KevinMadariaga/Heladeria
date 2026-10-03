"use client";

import { useActionState, useState } from "react";
import { Modal } from "@/components/modal";
import { ProductImage } from "@/components/product-image";
import { StockBadge } from "@/components/stock-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClientProduct } from "@/lib/serialize";
import { adjustStockAction, type FormState } from "./actions";

const TYPES = [
  { id: "in", label: "Entrada", help: "Unidades que llegan (compra, producción)", qty: "Unidades que entran" },
  { id: "out", label: "Merma", help: "Unidades dañadas, vencidas o perdidas", qty: "Unidades que salen" },
  { id: "adjust", label: "Conteo", help: "Corrige al número contado físicamente", qty: "Stock contado" },
] as const;

function AdjustForm({ product, onDone }: { product: ClientProduct; onDone: () => void }) {
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("in");
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await adjustStockAction(prev, fd);
    if (res?.ok) onDone();
    return res;
  }, undefined);
  const t = TYPES.find((x) => x.id === type)!;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={product.id} />
      <p className="text-muted-foreground">
        Stock actual: <strong className="text-foreground">{product.stock} u.</strong>
      </p>
      <fieldset>
        <legend className="mb-2 font-heading text-sm font-medium">Tipo de movimiento</legend>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((x) => (
            <label
              key={x.id}
              className="flex cursor-pointer justify-center rounded-xl border-2 border-border p-2 font-heading has-checked:border-primary has-checked:bg-secondary has-focus-visible:ring-4 has-focus-visible:ring-ring"
            >
              <input type="radio" name="type" value={x.id} checked={type === x.id} onChange={() => setType(x.id)} className="sr-only" />
              {x.label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t.help}</p>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="adj-qty">{t.qty}</Label>
        <Input id="adj-qty" name="qty" type="number" inputMode="numeric" min={0} required autoFocus className="h-12 text-lg" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="adj-reason">Motivo</Label>
        <Input id="adj-reason" name="reason" required minLength={3} placeholder="Ej: pedido del proveedor, se derritió…" className="h-11" />
      </div>
      <p role="alert" className="min-h-5 text-sm whitespace-pre-line text-destructive">
        {state?.error}
      </p>
      <Button type="submit" disabled={pending} className="press-3d h-12 rounded-2xl text-base">
        {pending ? "Guardando…" : "Guardar movimiento"}
      </Button>
    </form>
  );
}

export function StockTable({ products, colors }: { products: ClientProduct[]; colors: Record<string, string> }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = products.find((p) => p.id === openId);
  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2.5">
            <ProductImage src={p.imageUrl} name={p.name} color={colors[p.categoryId]} className="size-12 shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="line-clamp-2 font-heading leading-tight font-medium">{p.name}</span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums text-muted-foreground">
                <span>
                  <strong className="font-heading text-base text-foreground">{p.stock}</strong> u. · mín {p.minStock}
                </span>
                <StockBadge product={p} />
              </span>
            </div>
            <Button type="button" variant="outline" className="h-10 shrink-0 rounded-xl" onClick={() => setOpenId(p.id)}>
              Ajustar
            </Button>
          </li>
        ))}
      </ul>
      <Modal open={!!open} onClose={() => setOpenId(null)} title={open ? `Ajustar · ${open.name}` : ""}>
        {open && <AdjustForm key={open.id} product={open} onDone={() => setOpenId(null)} />}
      </Modal>
    </>
  );
}
