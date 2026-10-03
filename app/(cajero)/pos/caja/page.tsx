import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-guard";
import { closeShiftTotals } from "@/lib/cash";
import { formatCOP, formatDateTime, PAYMENT_LABELS } from "@/lib/money";
import { shiftTotals } from "@/lib/sales";
import { CashShift } from "@/models/CashShift";
import { Sale } from "@/models/Sale";
import { OpenShiftForm } from "../open-shift-form";
import { CloseShiftForm } from "./close-shift-form";

export const metadata: Metadata = { title: "Caja" };

const METHODS = Object.keys(PAYMENT_LABELS) as (keyof typeof PAYMENT_LABELS)[];

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-heading text-lg font-semibold" : ""}`}>
      <dt>{label}</dt>
      <dd>{formatCOP(value)}</dd>
    </div>
  );
}

export default async function CajaPage() {
  const user = await requireRole("admin", "cashier");
  const shift = await CashShift.findOne({ cashierId: user.id, status: "open" }).lean();

  if (!shift) {
    const last = await CashShift.findOne({ cashierId: user.id, status: "closed" }).sort({ closedAt: -1 }).lean();
    return (
      <div className="flex flex-col gap-6">
        {last && (
          <section className="sticker mx-auto w-full max-w-sm bg-card p-6">
            <h2 className="text-xl font-semibold">Último cierre</h2>
            <p className="mb-3 text-sm text-muted-foreground">{formatDateTime(last.closedAt!)}</p>
            <dl className="flex flex-col gap-1">
              <Row label="Base" value={last.openingCash} />
              {METHODS.map((m) => (
                <Row key={m} label={PAYMENT_LABELS[m]} value={last.totalsByMethod?.[m as never] ?? 0} />
              ))}
              <Row label="Efectivo esperado" value={last.expectedCash ?? 0} strong />
              <Row label="Efectivo contado" value={last.countedCash ?? 0} />
              <Row label="Diferencia" value={last.difference ?? 0} strong />
            </dl>
          </section>
        )}
        <OpenShiftForm />
      </div>
    );
  }

  const [{ totalsByMethod, salesCount }, sales] = await Promise.all([
    shiftTotals(shift._id),
    Sale.find({ shiftId: shift._id }).sort({ createdAt: -1 }).lean(),
  ]);
  const { expectedCash } = closeShiftTotals(shift.openingCash, totalsByMethod, 0);
  const total = Object.values(totalsByMethod).reduce((s, v) => s + v, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section aria-labelledby="turno" className="sticker flex flex-col gap-4 self-start bg-card p-5">
        <div>
          <h1 id="turno" className="text-2xl font-semibold">
            Mi caja
          </h1>
          <p className="text-sm text-muted-foreground">Abierta: {formatDateTime(shift.openedAt)}</p>
        </div>
        <dl className="flex flex-col gap-1">
          <Row label="Base" value={shift.openingCash} />
          {METHODS.map((m) => (
            <Row key={m} label={PAYMENT_LABELS[m]} value={totalsByMethod[m] ?? 0} />
          ))}
          <Row label={`Ventas (${salesCount})`} value={total} strong />
          <Row label="Efectivo esperado" value={expectedCash} strong />
        </dl>
        <CloseShiftForm expectedCash={expectedCash} />
      </section>

      <section aria-labelledby="ventas" className="sticker bg-card p-5">
        <h2 id="ventas" className="mb-3 text-xl font-semibold">
          Ventas de este turno
        </h2>
        {sales.length === 0 ? (
          <p className="text-muted-foreground">Aún no hay ventas.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {sales.map((s) => (
              <li key={String(s._id)} className={`flex flex-wrap items-center justify-between gap-2 py-2 ${s.status === "voided" ? "line-through opacity-60" : ""}`}>
                <span className="font-heading font-medium">#{s.number}</span>
                <span className="text-sm text-muted-foreground">{formatDateTime(s.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{s.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</span>
                <span className="text-sm">{PAYMENT_LABELS[s.paymentMethod]}</span>
                <span className="font-heading font-semibold">{formatCOP(s.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
