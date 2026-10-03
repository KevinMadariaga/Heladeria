"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/money-input";
import { Label } from "@/components/ui/label";
import { openShiftAction } from "./actions";

export function OpenShiftForm() {
  const [state, action, pending] = useActionState(openShiftAction, undefined);
  return (
    <form action={action} className="sticker mx-auto flex w-full max-w-sm flex-col gap-4 bg-card p-6">
      <h1 className="text-2xl font-semibold">Abrir caja</h1>
      <p className="text-muted-foreground">Para vender, primero abre tu turno con la base en efectivo.</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="openingCash">Base en efectivo (COP)</Label>
        <MoneyInput id="openingCash" name="openingCash" required autoFocus className="h-12 text-lg" />
      </div>
      <p role="alert" className="min-h-5 text-sm text-destructive">
        {state?.error}
      </p>
      <Button type="submit" disabled={pending} className="press-3d h-12 rounded-2xl text-base">
        {pending ? "Abriendo…" : "Abrir caja"}
      </Button>
    </form>
  );
}
