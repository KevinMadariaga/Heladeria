import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-guard";
import { closeShiftTotals } from "@/lib/cash";
import { formatCOP, formatDateTime, PAYMENT_LABELS } from "@/lib/money";
import { shiftTotals } from "@/lib/sales";
import { CashShift } from "@/models/CashShift";
import { Sale } from "@/models/Sale";
import { OpenShiftForm } from "../open-shift-form";
import { CloseShiftForm } from "./close-shift-form";
import { CloseResult, ShiftSummary } from "./shift-summary";
import { SaleMethodButton } from "./sale-method-button";
import { VoidSaleButton } from "@/components/void-sale-button";
import { returnSaleAction } from "../actions";

export const metadata: Metadata = { title: "Caja" };

export default async function CajaPage() {
  const user = await requireRole("admin", "cashier");
  const shift = await CashShift.findOne({ cashierId: user.id, status: "open" }).lean();

  if (!shift) {
    const last = await CashShift.findOne({ cashierId: user.id, status: "closed" }).sort({ closedAt: -1 }).lean();
    return (
      <div className="flex flex-col gap-6">
        {last && (
          <section className="sticker mx-auto w-full max-w-md bg-card p-6">
            <h2 className="text-xl font-semibold">Último cierre</h2>
            <p className="mb-3 text-sm text-muted-foreground">{formatDateTime(last.closedAt!)}</p>
            <div className="flex flex-col gap-4">
              <ShiftSummary
                openingCash={last.openingCash}
                totalsByMethod={(last.totalsByMethod ?? {}) as Record<string, number>}
                salesCount={last.salesCount ?? 0}
                deliveryFees={last.deliveryFees ?? 0}
                deliveryCount={last.deliveryCount ?? 0}
              />
              <CloseResult
                expectedCash={last.expectedCash ?? 0}
                countedCash={last.countedCash ?? 0}
                difference={last.difference ?? 0}
                expectedTransfer={last.expectedTransfer}
                countedTransfer={last.countedTransfer}
                transferDifference={last.transferDifference}
                note={last.closeNote}
              />
            </div>
          </section>
        )}
        <OpenShiftForm />
      </div>
    );
  }

  const [{ totalsByMethod, salesCount, deliveryFees, deliveryCount }, sales] = await Promise.all([
    shiftTotals(shift._id),
    Sale.find({ shiftId: shift._id }).sort({ createdAt: -1 }).lean(),
  ]);
  const { expectedCash, expectedTransfer } = closeShiftTotals(shift.openingCash, totalsByMethod, { cash: 0, transfer: 0 });

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <section aria-labelledby="turno" className="sticker flex flex-col gap-4 self-start bg-card p-5">
        <div>
          <h1 id="turno" className="text-2xl font-semibold">
            Mi caja
          </h1>
          <p className="text-sm text-muted-foreground">Abierta: {formatDateTime(shift.openedAt)}</p>
        </div>
        <p className="text-sm">
          Base inicial: <strong className="font-heading">{formatCOP(shift.openingCash)}</strong>
        </p>
        <ShiftSummary
          openingCash={shift.openingCash}
          totalsByMethod={totalsByMethod}
          salesCount={salesCount}
          deliveryFees={deliveryFees}
          deliveryCount={deliveryCount}
        />
        <CloseShiftForm expectedCash={expectedCash} expectedTransfer={expectedTransfer} />
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
              <li key={String(s._id)} className={`flex flex-wrap items-center justify-between gap-2 py-2 ${s.status === "voided" ? "opacity-60" : ""}`}>
                <span className="font-heading font-medium">#{s.number}</span>
                <span className="text-sm text-muted-foreground">{formatDateTime(s.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{s.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</span>
                <span className="text-sm">
                  {s.delivery && <span className="mr-1 rounded-full bg-fresa-300 px-2 py-0.5 text-xs">Domicilio</span>}
                  {PAYMENT_LABELS[s.paymentMethod]}
                  {s.paymentMethod === "mixed" && s.payments && (
                    <span className="text-muted-foreground"> ({s.payments.map((p) => `${PAYMENT_LABELS[p.method as keyof typeof PAYMENT_LABELS]} ${formatCOP(p.amount)}`).join(" + ")})</span>
                  )}
                  {(s.paymentChanges?.length ?? 0) > 0 && <span className="text-muted-foreground"> (cambiado)</span>}
                </span>
                <span className={`font-heading font-semibold ${s.status === "voided" ? "line-through" : ""}`}>{formatCOP(s.total)}</span>
                {s.status === "paid" && (
                  <span className="flex gap-2">
                    <SaleMethodButton saleId={String(s._id)} number={s.number} method={s.paymentMethod} total={s.total} />
                    <VoidSaleButton saleId={String(s._id)} number={s.number} total={s.total} action={returnSaleAction} label="Devolver" />
                  </span>
                )}
                {s.status === "voided" && <span className="text-sm text-muted-foreground">Devuelta: {s.voidReason}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
