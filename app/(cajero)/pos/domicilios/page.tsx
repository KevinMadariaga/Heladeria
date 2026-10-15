import type { Metadata } from "next";
import { MapPin, Phone } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { DELIVERY_STATUS_LABELS, formatCOP, formatDateTime, PAYMENT_LABELS } from "@/lib/money";
import { startOf } from "@/lib/periods";
import { Sale } from "@/models/Sale";
import { StatusButtons } from "./status-buttons";

export const metadata: Metadata = { title: "Domicilios" };

const COLUMNS = ["pending", "on_way", "delivered"] as const;
const TONE = { pending: "bg-caramelo-400/25", on_way: "bg-lila-400/25", delivered: "bg-secondary" } as const;

export default async function DomiciliosPage() {
  await requireRole("admin", "cashier");
  // Pendientes y en camino de cualquier día + todo lo de hoy (hora Colombia). Las ventas anuladas no salen.
  const docs = await Sale.find({
    status: "paid",
    delivery: { $exists: true },
    $or: [{ "delivery.status": { $ne: "delivered" } }, { createdAt: { $gte: startOf("day") } }],
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const todayFees = docs.filter((d) => d.createdAt >= startOf("day")).reduce((s, d) => s + (d.delivery?.fee ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl font-semibold">Domicilios</h1>
        <p className="text-sm text-muted-foreground">
          Valor de domicilios de hoy: <strong className="font-heading text-foreground">{formatCOP(todayFees)}</strong>
        </p>
      </div>
      <p className="text-sm text-muted-foreground">Para crear un domicilio, en Vender marca «Es domicilio» antes de cobrar.</p>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = docs.filter((d) => (d.delivery?.status ?? "pending") === col);
          return (
            <section key={col} aria-labelledby={`col-${col}`} className={`sticker flex flex-col gap-3 p-3 ${TONE[col]}`}>
              <h2 id={`col-${col}`} className="flex items-center justify-between px-1 text-xl font-semibold">
                {DELIVERY_STATUS_LABELS[col]}
                <span className="rounded-full bg-card px-2.5 py-0.5 font-heading text-sm">{items.length}</span>
              </h2>
              {items.length === 0 && <p className="px-1 pb-2 text-sm text-muted-foreground">Sin pedidos.</p>}
              <ul className="flex flex-col gap-3">
                {items.map((d) => (
                  <li key={String(d._id)} className="flex flex-col gap-2 rounded-2xl bg-card p-3 shadow-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-heading text-lg font-semibold">{d.delivery!.customer}</span>
                      <span className="text-xs text-muted-foreground">
                        #{d.number} · {formatDateTime(d.createdAt)}
                      </span>
                    </div>
                    <p className="flex items-start gap-1.5 text-sm">
                      <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                      {d.delivery!.address}
                    </p>
                    {d.delivery!.phone && (
                      <a href={`tel:${d.delivery!.phone}`} className="flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline">
                        <Phone aria-hidden className="size-4" />
                        {d.delivery!.phone}
                      </a>
                    )}
                    {d.delivery!.notes && <p className="text-sm text-muted-foreground">{d.delivery!.notes}</p>}
                    <p className="text-sm">{d.items.map((i) => `${i.qty}× ${i.name}${i.variant ? ` (${i.variant})` : ""}`).join(", ")}</p>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-dashed border-border pt-2 text-sm">
                      <span>
                        Domicilio {formatCOP(d.delivery!.fee ?? 0)} · {PAYMENT_LABELS[d.paymentMethod]}
                      </span>
                      <span className="font-heading text-base font-semibold">{formatCOP(d.total)}</span>
                    </div>
                    <StatusButtons saleId={String(d._id)} status={d.delivery!.status ?? "pending"} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
