"use client";

import { useActionState, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { IconBadge } from "@/components/icon-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/money-input";
import { formatCOP } from "@/lib/money";
import { cn } from "@/lib/utils";
import { closeShiftAction } from "../actions";

function Diff({ value }: { value: number }) {
  return (
    <p aria-live="polite" className={cn("font-heading", value === 0 ? "text-primary" : value < 0 ? "text-destructive" : "text-cafe-600")}>
      {value === 0 ? "Cuadra exacto ✓" : value < 0 ? `Falta ${formatCOP(-value)}` : `Sobra ${formatCOP(value)}`}
    </p>
  );
}

/** Cierre: se cuentan efectivo y transferencias; si algo no cuadra, se exige una nota. */
export function CloseShiftForm({ expectedCash, expectedTransfer }: { expectedCash: number; expectedTransfer: number }) {
  const [state, action, pending] = useActionState(closeShiftAction, undefined);
  const [cash, setCash] = useState("");
  const [transfer, setTransfer] = useState("");
  const cashDiff = Number(cash || 0) - expectedCash;
  const transferDiff = Number(transfer || 0) - expectedTransfer;
  const filled = cash !== "" && transfer !== "";
  const mismatch = filled && (cashDiff !== 0 || transferDiff !== 0);

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
        <IconBadge icon={LockKeyhole} className="bg-fresa-300 text-uva-900" /> Cerrar caja
      </h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="countedCash">Efectivo contado (COP)</Label>
        <MoneyInput id="countedCash" name="countedCash" required value={cash} onValueChange={setCash} className="h-12 text-lg" />
        {cash !== "" && <Diff value={cashDiff} />}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="countedTransfer">Transferencias recibidas (COP)</Label>
        <MoneyInput id="countedTransfer" name="countedTransfer" required value={transfer} onValueChange={setTransfer} className="h-12 text-lg" />
        <p className="text-xs text-muted-foreground">Revisa en la cuenta del negocio cuánto llegó en este turno.</p>
        {transfer !== "" && <Diff value={transferDiff} />}
      </div>

      {mismatch && (
        <div className="flex flex-col gap-1.5 rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-3">
          <p className="font-heading text-sm text-destructive">La caja no cuadra. Vuelve a contar; si la diferencia es real, explica por qué.</p>
          <Label htmlFor="note">Nota (obligatoria)</Label>
          <textarea
            id="note"
            name="note"
            required
            minLength={3}
            rows={2}
            placeholder="Ej: se pagó un domicilio con efectivo de la caja"
            className="rounded-xl border border-input bg-card p-2 text-base"
          />
        </div>
      )}

      <p role="alert" className="min-h-5 text-sm text-destructive">
        {state?.error}
      </p>
      <Button type="submit" disabled={pending || !filled} variant={mismatch ? "destructive" : "default"} className={cn("h-12 rounded-2xl text-base", !mismatch && "press-3d")}>
        {pending ? "Cerrando…" : mismatch ? "Cerrar con diferencia" : "Cerrar caja"}
      </Button>
    </form>
  );
}
