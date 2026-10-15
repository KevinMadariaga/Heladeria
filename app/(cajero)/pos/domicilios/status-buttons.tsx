"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deliveryStatusAction } from "../actions";

type Status = "pending" | "on_way" | "delivered";
const NEXT: Record<Status, { to: Status; label: string } | null> = {
  pending: { to: "on_way", label: "Enviar" },
  on_way: { to: "delivered", label: "Marcar entregado" },
  delivered: null,
};
const BACK: Record<Status, Status | null> = { pending: null, on_way: "pending", delivered: "on_way" };

export function StatusButtons({ saleId, status }: { saleId: string; status: Status }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const go = (to: Status) =>
    startTransition(async () => {
      setError("");
      const res = await deliveryStatusAction({ saleId, status: to });
      if (res.error) setError(res.error);
    });
  const next = NEXT[status];
  const back = BACK[status];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {next && (
        <Button type="button" disabled={pending} onClick={() => go(next.to)} className="press-3d h-10 rounded-xl">
          {next.label}
        </Button>
      )}
      {back && (
        <Button type="button" variant="ghost" disabled={pending} onClick={() => go(back)} className="h-10 rounded-xl text-muted-foreground">
          Deshacer
        </Button>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
