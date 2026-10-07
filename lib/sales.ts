import mongoose from "mongoose";
import { BusinessError, change, closeShiftTotals, unitPrice } from "@/lib/cash";
import type { SaleInput } from "@/lib/validations/sale";
import { CashShift } from "@/models/CashShift";
import { Counter } from "@/models/Counter";
import { Product } from "@/models/Product";
import { type PaymentMethod, Sale } from "@/models/Sale";
import { StockMovement } from "@/models/StockMovement";

type Actor = { id: string; name: string };

/**
 * Venta atómica: turno abierto → precios del servidor → descuento de stock condicional
 * (stock >= qty) → consecutivo → venta → movimientos. Cualquier fallo revierte todo.
 * Dos cajas vendiendo la última unidad: MongoDB detecta el conflicto de escritura,
 * reintenta la segunda transacción y esa ve stock 0 → falla con "Sin stock".
 */
export async function createSaleTx(actor: Actor, input: SaleInput) {
  const session = await mongoose.startSession();
  try {
    let saleId = "";
    await session.withTransaction(async () => {
      const shift = await CashShift.findOne({ cashierId: actor.id, status: "open" }).session(session);
      if (!shift) throw new BusinessError("Abre la caja antes de vender");

      const ids = [...new Set(input.items.map((i) => i.productId))];
      const products = await Product.find({ _id: { $in: ids }, active: true }).session(session).lean();
      const byId = new Map(products.map((p) => [String(p._id), p]));

      const items = input.items.map((i) => {
        const p = byId.get(i.productId);
        if (!p) throw new BusinessError("Un producto del carrito ya no está disponible");
        const priced = unitPrice(p, i.variant, i.addons);
        return {
          productId: p._id,
          name: p.name,
          variant: p.variants.length ? i.variant : undefined,
          addons: priced.addons,
          unitPrice: priced.unitPrice,
          qty: i.qty,
          subtotal: priced.unitPrice * i.qty,
        };
      });
      const total = items.reduce((s, i) => s + i.subtotal, 0);
      const cash = input.paymentMethod === "cash";
      const cashReceived = cash ? (input.cashReceived ?? total) : undefined;
      const changeDue = cash ? change(total, cashReceived!) : undefined;

      // Agrupa unidades por producto con control de stock y descuenta de forma condicional.
      const qtyByProduct = new Map<string, number>();
      for (const i of input.items) {
        if (byId.get(i.productId)?.trackStock) qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) ?? 0) + i.qty);
      }
      for (const [productId, qty] of qtyByProduct) {
        const r = await Product.updateOne(
          { _id: productId, trackStock: true, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          { session },
        );
        if (r.modifiedCount !== 1) throw new BusinessError(`Sin stock suficiente de ${byId.get(productId)!.name}`);
      }

      const counter = await Counter.findOneAndUpdate(
        { _id: "sale" },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: "after", session },
      );
      const [sale] = await Sale.create(
        [
          {
            number: counter!.seq,
            cashierId: actor.id,
            cashierName: actor.name,
            shiftId: shift._id,
            items,
            total,
            paymentMethod: input.paymentMethod,
            cashReceived,
            change: changeDue,
          },
        ],
        { session },
      );
      await StockMovement.insertMany(
        [...qtyByProduct].map(([productId, qty]) => ({
          productId,
          type: "sale",
          qty: -qty,
          reason: `Venta #${counter!.seq}`,
          userId: actor.id,
          saleId: sale!._id,
        })),
        { session },
      );
      saleId = String(sale!._id);
    });
    return saleId;
  } finally {
    await session.endSession();
  }
}

export async function openShift(actor: Actor, openingCash: number) {
  try {
    const shift = await CashShift.create({ cashierId: actor.id, cashierName: actor.name, openingCash });
    return String(shift._id);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw new BusinessError("Ya tienes una caja abierta");
    throw err;
  }
}

/** Totales del turno calculados en la BD (solo ventas pagadas). */
export async function shiftTotals(shiftId: mongoose.Types.ObjectId | string) {
  const rows = await Sale.aggregate<{ _id: string; total: number; count: number }>([
    { $match: { shiftId: new mongoose.Types.ObjectId(String(shiftId)), status: "paid" } },
    { $group: { _id: "$paymentMethod", total: { $sum: "$total" }, count: { $sum: 1 } } },
  ]);
  const totalsByMethod = Object.fromEntries(rows.map((r) => [r._id, r.total])) as Record<string, number>;
  return { totalsByMethod, salesCount: rows.reduce((s, r) => s + r.count, 0) };
}

export async function closeShift(actor: Actor, countedCash: number) {
  const shift = await CashShift.findOne({ cashierId: actor.id, status: "open" });
  if (!shift) throw new BusinessError("No tienes una caja abierta");
  const { totalsByMethod, salesCount } = await shiftTotals(shift._id);
  const { expectedCash, difference } = closeShiftTotals(shift.openingCash, totalsByMethod, countedCash);
  const r = await CashShift.updateOne(
    { _id: shift._id, status: "open" },
    { status: "closed", closedAt: new Date(), countedCash, expectedCash, difference, totalsByMethod, salesCount },
  );
  if (r.modifiedCount !== 1) throw new BusinessError("La caja ya fue cerrada");
  return String(shift._id);
}

/** Anula una venta pagada y devuelve el stock que esa venta descontó. Todo o nada. */
export async function voidSaleTx(actor: Actor, saleId: string, reason: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const sale = await Sale.findOneAndUpdate(
        { _id: saleId, status: "paid" },
        { status: "voided", voidReason: reason, voidedAt: new Date(), voidedBy: actor.id },
        { session },
      );
      if (!sale) throw new BusinessError("La venta no existe o ya fue anulada");
      const moves = await StockMovement.find({ saleId: sale._id, type: "sale" }).session(session).lean();
      for (const m of moves) {
        await Product.updateOne({ _id: m.productId }, { $inc: { stock: -m.qty } }, { session });
      }
      await StockMovement.insertMany(
        moves.map((m) => ({
          productId: m.productId,
          type: "void",
          qty: -m.qty,
          reason: `Anulación venta #${sale.number}: ${reason}`,
          userId: actor.id,
          saleId: sale._id,
        })),
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}

/**
 * Cambia solo el método de pago de una venta pagada (p. ej. efectivo → transferencia).
 * Productos, total y stock no se tocan. Solo mientras la caja de esa venta siga abierta,
 * para que el cierre cuadre con lo que realmente entró. Queda registro en paymentChanges.
 */
export async function changePaymentMethod(actor: Actor & { role: "admin" | "cashier" }, saleId: string, method: PaymentMethod) {
  const sale = await Sale.findById(saleId);
  if (!sale || sale.status !== "paid") throw new BusinessError("La venta no existe o está anulada");
  if (actor.role !== "admin" && String(sale.cashierId) !== actor.id) throw new BusinessError("Solo puedes cambiar tus propias ventas");
  if (sale.paymentMethod === method) throw new BusinessError("La venta ya tiene ese método de pago");
  if (!(await CashShift.exists({ _id: sale.shiftId, status: "open" }))) {
    throw new BusinessError("La caja de esta venta ya se cerró; no se puede cambiar el método");
  }
  // A efectivo: se asume pago exacto. A otro método: sin efectivo recibido ni cambio.
  const cash = method === "cash"
    ? { $set: { paymentMethod: method, cashReceived: sale.total, change: 0 } }
    : { $set: { paymentMethod: method }, $unset: { cashReceived: 1, change: 1 } };
  const r = await Sale.updateOne(
    { _id: sale._id, status: "paid", paymentMethod: sale.paymentMethod },
    { ...cash, $push: { paymentChanges: { from: sale.paymentMethod, to: method, by: actor.id } } },
  );
  if (r.modifiedCount !== 1) throw new BusinessError("La venta cambió mientras tanto, intenta de nuevo");
}
