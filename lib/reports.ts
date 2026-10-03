import "server-only";
import { connectDB } from "@/lib/db";
import { addPeriods, startOf, TZ, type Unit } from "@/lib/periods";
import { Sale } from "@/models/Sale";

const PAID = { status: "paid" } as const;
export const RANGE: Record<Unit, number> = { day: 30, week: 12, month: 12, year: 5 };

/** Ventas y tickets de hoy, semana, mes y año (hora Colombia). */
export async function kpis() {
  await connectDB();
  const units: Unit[] = ["day", "week", "month", "year"];
  const [row] = await Sale.aggregate<Record<Unit, { total: number; tickets: number }[]>>([
    { $match: { ...PAID, createdAt: { $gte: startOf("year") } } },
    {
      $facet: Object.fromEntries(
        units.map((u) => [
          u,
          [{ $match: { createdAt: { $gte: startOf(u) } } }, { $group: { _id: null, total: { $sum: "$total" }, tickets: { $sum: 1 } } }],
        ]),
      ),
    },
  ]);
  return Object.fromEntries(units.map((u) => [u, row?.[u]?.[0] ?? { total: 0, tickets: 0 }])) as Record<Unit, { total: number; tickets: number }>;
}

/** Serie de ventas por periodo con $dateTrunc en hora de Colombia; los periodos sin ventas salen en 0 ($densify). */
export async function salesSeries(unit: Unit) {
  await connectDB();
  const end = addPeriods(unit, startOf(unit), 1);
  const start = addPeriods(unit, end, -RANGE[unit]);
  return Sale.aggregate<{ period: Date; total: number; tickets: number }>([
    { $match: { ...PAID, createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dateTrunc: { date: "$createdAt", unit, timezone: TZ, startOfWeek: "monday" } },
        total: { $sum: "$total" },
        tickets: { $sum: 1 },
      },
    },
    { $densify: { field: "_id", range: { step: unit === "week" ? 7 : 1, unit: unit === "week" ? "day" : unit, bounds: [start, end] } } },
    { $fill: { output: { total: { value: 0 }, tickets: { value: 0 } } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, period: "$_id", total: 1, tickets: 1 } },
  ]);
}

/** Productos más vendidos (unidades) desde el inicio del periodo. */
export async function topProducts(unit: Unit, limit = 8) {
  await connectDB();
  return Sale.aggregate<{ name: string; qty: number; revenue: number }>([
    { $match: { ...PAID, createdAt: { $gte: startOf(unit) } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.productId", name: { $last: "$items.name" }, qty: { $sum: "$items.qty" }, revenue: { $sum: "$items.subtotal" } } },
    { $sort: { qty: -1, revenue: -1 } },
    { $limit: limit },
    { $project: { _id: 0, name: 1, qty: 1, revenue: 1 } },
  ]);
}

/** Ventas por método de pago desde el inicio del periodo. */
export async function byPaymentMethod(unit: Unit) {
  await connectDB();
  return Sale.aggregate<{ method: string; total: number; tickets: number }>([
    { $match: { ...PAID, createdAt: { $gte: startOf(unit) } } },
    { $group: { _id: "$paymentMethod", total: { $sum: "$total" }, tickets: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $project: { _id: 0, method: "$_id", total: 1, tickets: 1 } },
  ]);
}
