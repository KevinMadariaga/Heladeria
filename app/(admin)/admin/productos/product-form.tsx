"use client";

import { useActionState, useState } from "react";
import { ImageIcon, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/money-input";
import type { Option } from "@/lib/cash";
import type { ClientProduct } from "@/lib/serialize";
import { type FormState, saveProduct } from "./actions";

const field = "flex flex-col gap-1.5";

/** Reduce la foto a 900px JPEG en el navegador (las de cámara pesan varios MB) y la deja en el mismo input. */
async function shrinkImage(input: HTMLInputElement) {
  const file = input.files?.[0];
  if (!file?.type.startsWith("image/")) return;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!blob || blob.size >= file.size) return;
  const dt = new DataTransfer();
  dt.items.add(new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
  input.files = dt.files;
}

function OptionsEditor({ name, label, initial }: { name: string; label: string; initial: Option[] }) {
  const [rows, setRows] = useState<Option[]>(initial);
  const set = (i: number, patch: Partial<Option>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <fieldset className="flex flex-col gap-2 sm:col-span-2">
      <legend className="mb-1 font-heading text-sm font-medium">{label}</legend>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((o, i) => (
        <div key={i} className="flex gap-2">
          <Input aria-label={`${label}: nombre`} value={o.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Nombre" className="h-10" />
          <div className="w-36 shrink-0">
            <MoneyInput aria-label={`${label}: precio`} value={o.price ? String(o.price) : ""} onValueChange={(d) => set(i, { price: Number(d || 0) })} className="h-10" />
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-10" aria-label="Quitar" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
            <X />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="h-10 self-start rounded-xl" onClick={() => setRows((r) => [...r, { name: "", price: 0 }])}>
        <Plus /> Agregar
      </Button>
    </fieldset>
  );
}

export function ProductForm({
  product,
  categories,
  onCancel,
  onSaved,
}: {
  product?: ClientProduct;
  categories: { id: string; name: string }[];
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const [trackStock, setTrackStock] = useState(product?.trackStock ?? false);
  const [formKey, setFormKey] = useState(0);
  const [preview, setPreview] = useState("");
  const [resizing, setResizing] = useState(false);
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await saveProduct(prev, fd);
    if (res?.ok && !product) {
      setFormKey((k) => k + 1); // remonta el form: limpia campos, variantes y toppings
      setTrackStock(false);
      setPreview("");
    }
    if (res?.ok && product) onSaved?.();
    return res;
  }, undefined);
  const p = product?.id ?? "new";

  return (
    <form key={formKey} action={action} className="grid gap-4 sm:grid-cols-2">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className={`${field} sm:col-span-2`}>
        <Label htmlFor={`${p}-image`}>Imagen {product?.imageUrl && "(deja vacío para conservar la actual)"}</Label>
        <div className="grid size-40 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-input bg-muted">
          {preview || product?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:)
            <img src={preview || product?.imageUrl} alt="Vista previa" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
              <ImageIcon aria-hidden className="size-8" /> Sin foto
            </span>
          )}
        </div>
        <Input
          id={`${p}-image`}
          name="image"
          type="file"
          accept="image/*"
          className="h-11"
          onChange={async (e) => {
            const input = e.currentTarget;
            setResizing(true);
            await shrinkImage(input).finally(() => setResizing(false));
            const f = input.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : "");
          }}
        />
      </div>
      <div className={field}>
        <Label htmlFor={`${p}-name`}>Nombre</Label>
        <Input id={`${p}-name`} name="name" defaultValue={product?.name} required className="h-11" />
      </div>
      <div className={field}>
        <Label htmlFor={`${p}-cat`}>Categoría</Label>
        <select id={`${p}-cat`} name="categoryId" defaultValue={product?.categoryId} required className="h-11 rounded-lg border border-input bg-background px-3">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className={field}>
        <Label htmlFor={`${p}-price`}>Precio (COP)</Label>
        <MoneyInput id={`${p}-price`} name="price" defaultValue={product?.price} required className="h-11" />
      </div>
      <div className={field}>
        <Label htmlFor={`${p}-cost`}>Costo (opcional)</Label>
        <MoneyInput id={`${p}-cost`} name="cost" defaultValue={product?.cost} className="h-11" />
      </div>
      <OptionsEditor name="variants" label="Variantes (tamaños) — el precio reemplaza al base" initial={product?.variants ?? []} />
      <OptionsEditor name="addons" label="Toppings / adicionales — se suman al precio" initial={product?.addons ?? []} />
      <label className="flex items-center gap-3 sm:col-span-2">
        <input type="checkbox" name="trackStock" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} className="size-5 accent-primary" />
        <span className="font-heading">Controlar stock por unidades</span>
      </label>
      {trackStock && (
        <>
          <div className={field}>
            <Label htmlFor={`${p}-stockIn`}>{product ? `Agregar unidades (actual: ${product.stock})` : "Stock inicial"}</Label>
            <Input id={`${p}-stockIn`} name="stockIn" type="number" inputMode="numeric" min={0} defaultValue={0} className="h-11" />
          </div>
          <div className={field}>
            <Label htmlFor={`${p}-min`}>Stock mínimo (alerta)</Label>
            <Input id={`${p}-min`} name="minStock" type="number" inputMode="numeric" min={0} defaultValue={product?.minStock ?? 0} className="h-11" />
          </div>
        </>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending || resizing} className="press-3d h-11 rounded-xl px-6">
          {resizing ? "Preparando foto…" : pending ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="h-11 rounded-xl">
            Volver
          </Button>
        )}
        <p role="status" aria-live="polite" className={`text-sm whitespace-pre-line ${state?.error ? "text-destructive" : "text-muted-foreground"}`}>
          {state?.error ?? (state?.ok ? "Guardado ✓" : "")}
        </p>
      </div>
    </form>
  );
}
