import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/auth-guard";
import { formatCOP, formatDateTime } from "@/lib/money";
import { addPeriods, todayISO } from "@/lib/periods";
import { consumptionDebts } from "@/lib/sales";
import { Consumption } from "@/models/Consumption";
import { ConsumptionList } from "@/components/consumption-list";

export const metadata: Metadata = { title: "Consumos del personal" };

export default async function ConsumosPage({ searchParams }: PageProps<"/admin/consumos">) {
  await requireRole("admin");
  const raw = (await searchParams).mes;
  const mes = typeof raw === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : todayISO().slice(0, 7);
  const start = new Date(`${mes}-01T00:00:00-05:00`);
  const end = addPeriods("month", start, 1);
  const [debts, docs] = await Promise.all([
    consumptionDebts(start, end),
    Consumption.find({ createdAt: { $gte: start, $lt: end } }).sort({ createdAt: -1 }).lean(),
  ]);
  const total = debts.reduce((s, d) => s + d.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Consumos del personal</h1>
        <p className="text-muted-foreground">Lo que cada cajero sacó para él en el mes y debe pagar.</p>
      </div>

      <form className="sticker flex flex-wrap items-end gap-3 bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mes">Mes</Label>
          <Input id="mes" name="mes" type="month" defaultValue={mes} className="h-11 w-48" />
        </div>
        <Button type="submit" className="press-3d h-11 rounded-xl px-5">
          Ver
        </Button>
      </form>

      <section aria-labelledby="deudas" className="sticker bg-card p-5">
        <h2 id="deudas" className="mb-3 text-xl font-semibold">
          Cuánto debe cada uno
        </h2>
        {debts.length === 0 ? (
          <p className="text-muted-foreground">Nadie sacó productos este mes.</p>
        ) : (
          <dl className="flex flex-col divide-y divide-border">
            {debts.map((d) => (
              <div key={String(d._id)} className="flex items-baseline justify-between gap-4 py-2">
                <dt>
                  <span className="font-heading text-lg font-medium">{d.cashierName}</span>
                  <span className="block text-xs text-muted-foreground">{d.count} consumo(s)</span>
                </dt>
                <dd className="font-heading text-lg font-semibold tabular-nums">debe {formatCOP(d.total)}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 pt-3 font-heading text-lg font-semibold">
              <dt>Total del mes</dt>
              <dd className="tabular-nums">{formatCOP(total)}</dd>
            </div>
          </dl>
        )}
      </section>

      <section aria-label="Detalle" className="sticker bg-card p-5">
        <ConsumptionList
          title="Detalle del mes"
          empty="Sin consumos."
          canDelete
          rows={docs.map((c) => ({
            id: String(c._id),
            time: `${formatDateTime(c.createdAt)} · ${c.cashierName}`,
            detail: c.items.map((i) => `${i.qty}× ${i.name}${i.variant ? ` (${i.variant})` : ""}`).join(", "),
            note: c.note ?? undefined,
            total: c.total,
          }))}
        />
      </section>
    </div>
  );
}
