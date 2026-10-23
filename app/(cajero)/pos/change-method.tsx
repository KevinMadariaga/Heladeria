"use client";

import { useState, useTransition } from "react";
import { Banknote, CreditCard, Landmark, Shuffle, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import { formatCOP, PAYMENT_LABELS, SWITCHABLE_PAYMENT_METHODS } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/models/Sale";
import { changePaymentAction } from "./actions";

export const METHOD_ICON: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  card: CreditCard,
  transfer: Landmark,
  mixed: Shuffle,
  nequi: Smartphone,
  daviplata: Wallet,
};
const METHODS = SWITCHABLE_PAYMENT_METHODS;

export type MethodChange = {
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  change?: number;
  payments?: { method: string; amount: number }[];
};

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
  const [mixing, setMixing] = useState(false); // eligió Mixto: falta el valor por transferencia
  const [transfer, setTransfer] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [pending, startTransition] = useTransition();
  const t = Number(transfer || 0);
  const mixedInvalid = t <= 0 || t >= total;

  function save(m: (typeof METHODS)[number], transferAmount?: number) {
    setError("");
    setDone("");
    startTransition(async () => {
      const res = await changePaymentAction({ saleId, method: m, transferAmount });
      if ("error" in res && res.error) return setError(res.error);
      setMethod(m);
      setMixing(false);
      setDone(`Listo: ahora figura como ${PAYMENT_LABELS[m]}.`);
      onChanged?.({ paymentMethod: m, cashReceived: res.cashReceived, change: res.change, payments: res.payments });
    });
  }

  function pick(m: (typeof METHODS)[number]) {
    if (pending) return;
    if (m === "mixed") return setMixing(true);
    setMixing(false);
    if (m !== method) save(m);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-heading text-sm font-medium">¿Pagó con otro método? Cámbialo aquí ({formatCOP(total)} no cambia)</legend>
      <div role="radiogroup" aria-label="Método de pago de la venta" className="grid grid-cols-3 gap-2">
        {METHODS.map((m) => {
          const Icon = METHOD_ICON[m];
          const on = mixing ? m === "mixed" : method === m;
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
      {mixing && (
        <div className="grid grid-cols-[minmax(6rem,9rem)_minmax(0,1fr)] items-center sm:grid-cols-[minmax(6rem,9rem)_minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 rounded-xl bg-lila-100/70 p-2.5">
          <label htmlFor={`mix-${saleId}`} className="col-span-full font-heading text-xs font-medium">
            Valor por transferencia
          </label>
          <MoneyInput id={`mix-${saleId}`} value={transfer} onValueChange={setTransfer} className="h-10 bg-card text-base" aria-invalid={transfer !== "" && mixedInvalid} />
          <p className="font-heading text-sm tabular-nums">
            {transfer !== "" && mixedInvalid ? (
              <span className="text-destructive">Mayor a $ 0 y menor a {formatCOP(total)}</span>
            ) : (
              <>
                En efectivo: <strong className="text-base">{formatCOP(total - t)}</strong>
              </>
            )}
          </p>
          <Button type="button" disabled={pending || mixedInvalid} className="col-span-2 h-10 rounded-xl sm:col-span-1" onClick={() => save("mixed", t)}>
            Guardar
          </Button>
        </div>
      )}
      <p role="status" aria-live="polite" className={cn("min-h-5 text-sm", error ? "text-destructive" : "text-muted-foreground")}>
        {pending ? "Cambiando…" : error || done}
      </p>
    </fieldset>
  );
}
