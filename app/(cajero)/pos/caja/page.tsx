import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-guard";
import { closeShiftTotals } from "@/lib/cash";
import { ACTIVE_PAYMENT_METHODS, formatCOP, formatDateTime, PAYMENT_LABELS } from "@/lib/money";
import { shiftTotals } from "@/lib/sales";
import { CashShift } from "@/models/CashShift";
import { Sale } from "@/models/Sale";
import { OpenShiftForm } from "../open-shift-form";
import { CloseShiftForm } from "./close-shift-form";
import { SaleMethodButton } from "./sale-method-button";

export const metadata: Metadata = { title: "Caja" };

type Method = keyof typeof PAYMENT_LABELS;
/** Efectivo y transferencia siempre; métodos antiguos (tarjeta, Nequi…) solo si tienen ventas. */
const methodsFor = (totals: Partial<Record<string, number>> | undefined) =>
  (Object.keys(PAYMENT_LABELS) as Method[]).filter((m) => (ACTIVE_PAYMENT_METHODS as readonly string[]).includes(m) || (totals?.[m] ?? 0) > 0);

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
              {methodsFor(last.totalsByMethod as Record<string, number> | undefined).map((m) => (
                <Row key={m} label={PAYMENT_LABELS[m]} value={(last.totalsByMethod as Record<string, number> | undefined)?.[m] ?? 0} />
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
          {methodsFor(totalsByMethod).map((m) => (
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
                <span className="text-sm">
                  {PAYMENT_LABELS[s.paymentMethod]}
                  {(s.paymentChanges?.length ?? 0) > 0 && <span className="text-muted-foreground"> (cambiado)</span>}
                </span>
                <span className="font-heading font-semibold">{formatCOP(s.total)}</span>
                {s.status === "paid" && <SaleMethodButton saleId={String(s._id)} number={s.number} method={s.paymentMethod} total={s.total} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
