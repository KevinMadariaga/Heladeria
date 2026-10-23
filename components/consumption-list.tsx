"use client";

import { useState, useTransition } from "react";
import { HandCoins } from "lucide-react";
import { IconBadge } from "@/components/icon-badge";
import { Button } from "@/components/ui/button";
import { formatCOP } from "@/lib/money";
import { deleteConsumptionAction } from "@/app/(cajero)/pos/actions";

export type ConsumptionRow = { id: string; time: string; detail: string; note?: string; total: number };

/** Lo que el cajero sacó para él en este turno. No entra en la caja; queda como deuda. */
export function ConsumptionList({
  rows,
  canDelete,
  title = "Lo que sacaste (a tu cuenta)",
  empty = "No sacaste nada en este turno.",
}: {
  rows: ConsumptionRow[];
  canDelete: boolean;
  title?: string;
  empty?: string;
}) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-caramelo-400 p-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <IconBadge icon={HandCoins} className="rotate-6 bg-caramelo-400 text-uva-900" /> {title}
        </h2>
        <span className="font-heading text-lg font-semibold tabular-nums">{formatCOP(total)}</span>
      </div>
      <p className="text-xs text-muted-foreground">No entra en la caja: se suma a lo que debes y el administrador lo ve al final del mes.</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border text-sm">
          {rows.map((r) => (
            <Item key={r.id} row={r} canDelete={canDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Item({ row, canDelete }: { row: ConsumptionRow; canDelete: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex flex-wrap items-center gap-2 py-1.5">
      <span className="flex-1 text-muted-foreground">{row.time}</span>
      <span className="order-last min-w-0 basis-full">
        {row.detail}
        {row.note && <span className="text-muted-foreground"> · {row.note}</span>}
      </span>
      <span className="font-heading tabular-nums">{formatCOP(row.total)}</span>
      {canDelete && (
        <Button
          type="button"
          variant={confirm ? "destructive" : "outline"}
          disabled={pending}
          className="h-8 rounded-xl"
          onClick={() => {
            if (!confirm) return setConfirm(true);
            startTransition(async () => {
              const res = await deleteConsumptionAction(row.id);
              if (res.error) setError(res.error);
              setConfirm(false);
            });
          }}
        >
          {confirm ? "¿Quitar?" : "Quitar"}
        </Button>
      )}
      {error && <span className="w-full text-destructive">{error}</span>}
    </li>
  );
}
