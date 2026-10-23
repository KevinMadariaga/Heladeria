import type { Metadata } from "next";
import type { Types } from "mongoose";
import { requireRole } from "@/lib/auth-guard";
import { closeShiftTotals } from "@/lib/cash";
import { formatCOP, formatDateTime, PAYMENT_LABELS } from "@/lib/money";
import { shiftTotals } from "@/lib/sales";
import { CashShift } from "@/models/CashShift";
import { Consumption } from "@/models/Consumption";
import { Sale } from "@/models/Sale";
import { OpenShiftForm } from "../open-shift-form";
import { CloseShiftForm } from "./close-shift-form";
import { CloseResult, ShiftSummary } from "./shift-summary";
import { ConsumptionList, type ConsumptionRow } from "@/components/consumption-list";
import { SaleMethodButton } from "./sale-method-button";
import { VoidSaleButton } from "@/components/void-sale-button";
import { returnSaleAction } from "../actions";

export const metadata: Metadata = { title: "Caja" };

async function consumptionRows(shiftId: Types.ObjectId): Promise<ConsumptionRow[]> {
  const docs = await Consumption.find({ shiftId }).sort({ createdAt: -1 }).lean();
  return docs.map((c) => ({
    id: String(c._id),
    time: formatDateTime(c.createdAt),
    detail: c.items.map((i) => `${i.qty}× ${i.name}${i.variant ? ` (${i.variant})` : ""}`).join(", "),
    note: c.note ?? undefined,
    total: c.total,
  }));
}

export default async function CajaPage() {
  const user = await requireRole("admin", "cashier");
  const shift = await CashShift.findOne({ cashierId: user.id, status: "open" }).lean();

  if (!shift) {
    const last = await CashShift.findOne({ cashierId: user.id, status: "closed" }).sort({ closedAt: -1 }).lean();
    const lastConsumptions = last ? await consumptionRows(last._id) : [];
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
                containerFees={last.containerFees ?? 0}
                containerCount={last.containerCount ?? 0}
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
              {lastConsumptions.length > 0 && <ConsumptionList rows={lastConsumptions} canDelete={false} />}
            </div>
          </section>
        )}
        <OpenShiftForm />
      </div>
    );
  }

  const [{ totalsByMethod, salesCount, deliveryFees, deliveryCount, containerFees, containerCount }, sales, consumptions] = await Promise.all([
    shiftTotals(shift._id),
    Sale.find({ shiftId: shift._id }).sort({ createdAt: -1 }).lean(),
    consumptionRows(shift._id),
  ]);
  const { expectedCash, expectedTransfer } = closeShiftTotals(shift.openingCash, totalsByMethod, { cash: 0, transfer: 0 });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="turno" className="sticker flex flex-col gap-4 self-start bg-card p-5 xl:p-6">
        <div>
          <h1 id="turno" className="text-2xl font-semibold">
            Mi caja
          </h1>
          <p className="text-sm text-muted-foreground">Abierta: {formatDateTime(shift.openedAt)}</p>
        </div>
        <p className="text-sm">
          Base inicial: <strong className="font-heading">{formatCOP(shift.openingCash)}</strong>
        </p>
        {/* En pantallas anchas: resumen a la izquierda, consumos y cierre a la derecha */}
        <div className="grid gap-6 2xl:grid-cols-2">
          <ShiftSummary
            openingCash={shift.openingCash}
            totalsByMethod={totalsByMethod}
            salesCount={salesCount}
            deliveryFees={deliveryFees}
            deliveryCount={deliveryCount}
            containerFees={containerFees}
            containerCount={containerCount}
          />
          <div className="flex flex-col gap-4">
            <ConsumptionList rows={consumptions} canDelete />
            <CloseShiftForm expectedCash={expectedCash} expectedTransfer={expectedTransfer} />
          </div>
        </div>
      </section>

      <section aria-labelledby="ventas" className="sticker flex flex-col self-start bg-card p-5 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] xl:p-6">
        <h2 id="ventas" className="mb-3 text-xl font-semibold">
          Ventas de este turno
        </h2>
        {sales.length === 0 ? (
          <p className="text-muted-foreground">Aún no hay ventas.</p>
        ) : (
          <ul className="-mx-2 flex min-h-0 flex-col divide-y divide-border overflow-y-auto overscroll-contain px-2">
            {sales.map((s) => (
              <li key={String(s._id)} className={`flex flex-col gap-1 py-3 ${s.status === "voided" ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-heading font-medium">#{s.number}</span>
                  <span className="text-sm text-muted-foreground">{formatDateTime(s.createdAt)}</span>
                  {s.delivery && <span className="rounded-full bg-fresa-300 px-2 py-0.5 text-xs">Domicilio</span>}
                  {(s.containerFee ?? 0) > 0 && <span className="rounded-full bg-lila-100 px-2 py-0.5 text-xs">Porta x{s.containerQty ?? 1}</span>}
                  <span className={`ml-auto font-heading font-semibold tabular-nums ${s.status === "voided" ? "line-through" : ""}`}>{formatCOP(s.total)}</span>
                </div>
                <p className="text-sm break-words">{s.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    {PAYMENT_LABELS[s.paymentMethod]}
                    {s.paymentMethod === "mixed" && s.payments && (
                      <span className="text-muted-foreground"> ({s.payments.map((p) => `${PAYMENT_LABELS[p.method as keyof typeof PAYMENT_LABELS]} ${formatCOP(p.amount)}`).join(" + ")})</span>
                    )}
                    {(s.paymentChanges?.length ?? 0) > 0 && <span className="text-muted-foreground"> (cambiado)</span>}
                  </span>
                  {s.status === "paid" && (
                    <span className="flex gap-2">
                      <SaleMethodButton saleId={String(s._id)} number={s.number} method={s.paymentMethod} total={s.total} />
                      <VoidSaleButton saleId={String(s._id)} number={s.number} total={s.total} action={returnSaleAction} label="Devolver" />
                    </span>
                  )}
                  {s.status === "voided" && <span className="text-sm text-muted-foreground">Devuelta: {s.voidReason}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
