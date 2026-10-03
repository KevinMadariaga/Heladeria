import "server-only";
import { connectDB } from "@/lib/db";
import { dayRange, todayISO } from "@/lib/periods";
import { CashShift } from "@/models/CashShift";
import { Sale } from "@/models/Sale";
import { StockMovement } from "@/models/StockMovement";

/** Lee ?from&to (YYYY-MM-DD). Por defecto: hoy. */
export function parseRange(sp: Record<string, string | string[] | undefined>) {
  const today = todayISO();
  const from = typeof sp.from === "string" ? sp.from : today;
  const to = typeof sp.to === "string" ? sp.to : from;
  const range = dayRange(from, to) ?? dayRange(today, today)!;
  return { from, to, ...range };
}

type Range = { start: Date; end: Date };

export async function salesInRange({ start, end }: Range) {
  await connectDB();
  return Sale.find({ createdAt: { $gte: start, $lt: end } }).sort({ createdAt: -1 }).lean();
}

/** Totales del rango desde la BD (solo pagadas) — deben cuadrar con la suma de las ventas listadas. */
export async function rangeSummary({ start, end }: Range) {
  await connectDB();
  const rows = await Sale.aggregate<{ _id: string; total: number; count: number }>([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$status", total: { $sum: "$total" }, count: { $sum: 1 } } },
  ]);
  const by = Object.fromEntries(rows.map((r) => [r._id, r]));
  return { paid: by.paid?.total ?? 0, tickets: by.paid?.count ?? 0, voided: by.voided?.count ?? 0, voidedTotal: by.voided?.total ?? 0 };
}

export async function shiftsInRange({ start, end }: Range) {
  await connectDB();
  return CashShift.find({ openedAt: { $gte: start, $lt: end } }).sort({ openedAt: -1 }).lean();
}

export async function movementsInRange({ start, end }: Range) {
  await connectDB();
  return StockMovement.find({ createdAt: { $gte: start, $lt: end } })
    .sort({ createdAt: -1 })
    .populate<{ productId: { name: string } | null }>("productId", "name")
    .populate<{ userId: { name: string } | null }>("userId", "name")
    .lean();
}
