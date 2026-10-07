"use client";

import { useState, useTransition } from "react";
import { Banknote, CreditCard, Landmark, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import { formatCOP, PAYMENT_LABELS } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/models/Sale";
import { changePaymentAction } from "./actions";

export const METHOD_ICON: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  card: CreditCard,
  transfer: Landmark,
  nequi: Smartphone,
  daviplata: Wallet,
};
const METHODS = Object.keys(PAYMENT_LABELS) as PaymentMethod[];

export type MethodChange = { paymentMethod: PaymentMethod; cashReceived?: number; change?: number };

/** Cambia el método de pago de una venta ya cobrada. Total, productos y stock no cambian. */
export function ChangeMethod({
  saleId,
  current,
  total,
  onChanged,
}: {
  saleId: string;
  current: PaymentMethod;
  total: number;
  onChanged?: (c: MethodChange) => void;
}) {
  const [method, setMethod] = useState(current);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [pending, startTransition] = useTransition();

  function pick(m: PaymentMethod) {
    if (m === method || pending) return;
    setError("");
    setDone("");
    startTransition(async () => {
      const res = await changePaymentAction({ saleId, method: m });
      if ("error" in res && res.error) return setError(res.error);
      setMethod(m);
      setDone(`Listo: ahora figura como ${PAYMENT_LABELS[m]}.`);
      onChanged?.({ paymentMethod: m, cashReceived: res.cashReceived, change: res.change });
    });
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-heading text-sm font-medium">¿Pagó con otro método? Cámbialo aquí ({formatCOP(total)} no cambia)</legend>
      <div role="radiogroup" aria-label="Método de pago de la venta" className="grid grid-cols-3 gap-2">
        {METHODS.map((m) => {
          const Icon = METHOD_ICON[m];
          const on = method === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={pending}
              onClick={() => pick(m)}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 font-heading text-xs transition-[background-color,color,border-color] duration-150 disabled:opacity-60",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {PAYMENT_LABELS[m]}
            </button>
          );
        })}
      </div>
      <p role="status" aria-live="polite" className={cn("min-h-5 text-sm", error ? "text-destructive" : "text-muted-foreground")}>
        {pending ? "Cambiando…" : error || done}
      </p>
    </fieldset>
  );
}
