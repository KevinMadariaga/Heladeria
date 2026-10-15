import { closeShiftTotals } from "@/lib/cash";
import { formatCOP, PAYMENT_LABELS } from "@/lib/money";
import { cn } from "@/lib/utils";

type Totals = Record<string, number>;
const LEGACY = ["card", "nequi", "daviplata"] as const;

function Row({ label, value, strong, hint }: { label: string; value: number; strong?: boolean; hint?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", strong && "font-heading text-lg font-semibold")}>
      <dt>
        {label}
        {hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}
      </dt>
      <dd className="tabular-nums">{formatCOP(value)}</dd>
    </div>
  );
}

/** Resumen del turno: qué se vendió por método y cuánto dinero debe haber (efectivo, transferencias y total con base). */
export function ShiftSummary({
  openingCash,
  totalsByMethod,
  salesCount,
  deliveryFees = 0,
  deliveryCount = 0,
  containerFees = 0,
  containerCount = 0,
}: {
  openingCash: number;
  totalsByMethod: Totals;
  salesCount: number;
  deliveryFees?: number;
  deliveryCount?: number;
  containerFees?: number;
  containerCount?: number;
}) {
  const t = closeShiftTotals(openingCash, totalsByMethod, { cash: 0, transfer: 0 });
  const legacy = LEGACY.filter((m) => (totalsByMethod[m] ?? 0) > 0);
  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-1.5">
        <Row label="Ventas en efectivo" value={t.cashSales} hint="incluye la parte en efectivo de los pagos mixtos" />
        <Row label="Ventas por transferencia" value={t.transferSales} hint="incluye la parte transferida de los pagos mixtos" />
        {legacy.map((m) => (
          <Row key={m} label={PAYMENT_LABELS[m]} value={totalsByMethod[m]!} />
        ))}
        <div className="my-1 border-t border-dashed border-border" />
        <Row label="Productos" value={t.salesTotal - deliveryFees - containerFees} />
        <Row label="Portas / envases" value={containerFees} hint={`${containerCount} venta(s) con porta`} />
        <Row label="Domicilios" value={deliveryFees} hint={`${deliveryCount} domicilio(s)`} />
        <Row label="Total vendido" value={t.salesTotal} strong hint={`${salesCount} venta(s) · productos + portas + domicilios`} />
      </dl>

      <div className="rounded-2xl bg-lila-100 p-4">
        <h2 className="mb-2 font-heading text-base font-semibold">Al cerrar debes tener</h2>
        <dl className="flex flex-col gap-1.5">
          <Row label="Debes tener en efectivo" value={t.expectedCash} strong hint={`base ${formatCOP(openingCash)} + ventas en efectivo ${formatCOP(t.cashSales)}`} />
          <Row label="Debes tener en transferencias" value={t.expectedTransfer} strong hint="verifica en la cuenta del negocio" />
          <div className="my-1 border-t-2 border-dashed border-border" />
          <Row label="Total con la base" value={t.totalWithBase} strong hint={`ventas ${formatCOP(t.salesTotal)} + base ${formatCOP(openingCash)}`} />
        </dl>
      </div>
    </div>
  );
}

/** Resultado de un cierre ya hecho: contado vs esperado. */
export function CloseResult({
  expectedCash,
  countedCash,
  difference,
  expectedTransfer,
  countedTransfer,
  transferDifference,
  note,
}: {
  expectedCash: number;
  countedCash: number;
  difference: number;
  expectedTransfer?: number | null;
  countedTransfer?: number | null;
  transferDifference?: number | null;
  note?: string | null;
}) {
  const diff = (d: number) => (d === 0 ? "Cuadra ✓" : d < 0 ? `Faltó ${formatCOP(-d)}` : `Sobró ${formatCOP(d)}`);
  return (
    <dl className="flex flex-col gap-1.5">
      <Row label="Efectivo contado" value={countedCash} hint={`esperado ${formatCOP(expectedCash)} · ${diff(difference)}`} />
      {countedTransfer != null && (
        <Row label="Transferencias verificadas" value={countedTransfer} hint={`esperado ${formatCOP(expectedTransfer ?? 0)} · ${diff(transferDifference ?? 0)}`} />
      )}
      {note && <p className="mt-1 rounded-xl bg-caramelo-400/20 p-2 text-sm">Nota: {note}</p>}
    </dl>
  );
}
