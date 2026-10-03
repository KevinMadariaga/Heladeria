"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/money-input";
import { Label } from "@/components/ui/label";
import { formatCOP } from "@/lib/money";
import { closeShiftAction } from "../actions";

export function CloseShiftForm({ expectedCash }: { expectedCash: number }) {
  const [state, action, pending] = useActionState(closeShiftAction, undefined);
  const [counted, setCounted] = useState("");
  const diff = Number(counted || 0) - expectedCash;
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="countedCash">Efectivo contado (COP)</Label>
        <MoneyInput id="countedCash" name="countedCash" required value={counted} onValueChange={setCounted} className="h-12 text-lg" />
      </div>
      {counted !== "" && (
        <p aria-live="polite" className={`font-heading text-lg ${diff === 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-cafe-600"}`}>
          {diff === 0 ? "Cuadra exacto ✓" : diff < 0 ? `Faltante: ${formatCOP(-diff)}` : `Sobrante: ${formatCOP(diff)}`}
        </p>
      )}
      <p role="alert" className="min-h-5 text-sm text-destructive">
        {state?.error}
      </p>
      <Button type="submit" disabled={pending} className="press-3d h-12 rounded-2xl text-base">
        {pending ? "Cerrando…" : "Cerrar caja"}
      </Button>
    </form>
  );
}
