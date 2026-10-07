"use client";

import { useActionState, useState } from "react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCOP } from "@/lib/money";

type FormState = { ok?: boolean; error?: string } | undefined;

/** Anular/devolver una venta con motivo. `action` es la Server Action que aplica las reglas de cada rol. */
export function VoidSaleButton({
  saleId,
  number,
  total,
  action: voidAction,
  label = "Anular",
}: {
  saleId: string;
  number: number;
  total: number;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await voidAction(prev, fd);
    if (res?.ok) setOpen(false);
    return res;
  }, undefined);
  return (
    <>
      <Button type="button" variant="destructive" className="h-9 rounded-xl" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`${label} venta #${number}`}>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="saleId" value={saleId} />
          <p>
            Se anulará la venta de <strong>{formatCOP(total)}</strong> y se devolverá el stock de sus productos. No se puede deshacer.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`void-${saleId}`}>Motivo</Label>
            <Input id={`void-${saleId}`} name="reason" required minLength={3} autoFocus placeholder="Ej: cliente devolvió el pedido" className="h-11" />
          </div>
          <p role="alert" className="min-h-5 text-sm text-destructive">
            {state?.error}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending} className="h-11 rounded-xl">
              {pending ? "Procesando…" : `${label} venta`}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
