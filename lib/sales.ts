import mongoose from "mongoose";
import { BusinessError, closeShiftTotals, splitPayment, unitPrice } from "@/lib/cash";
import type { ConsumptionInput, SaleInput } from "@/lib/validations/sale";
import { CashShift } from "@/models/CashShift";
import { Consumption } from "@/models/Consumption";
import { Counter } from "@/models/Counter";
import { Product } from "@/models/Product";
import { type PaymentMethod, Sale } from "@/models/Sale";
import { StockMovement } from "@/models/StockMovement";

type Actor = { id: string; name: string };
type CartItem = SaleInput["items"][number];

/**
 * Precios del servidor + descuento de stock condicional (stock >= qty) dentro de la transacción.
 * Lo usan las ventas y los consumos del personal.
 */
async function priceAndTakeStock(session: mongoose.ClientSession, cart: CartItem[]) {
  const ids = [...new Set(cart.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: ids }, active: true }).session(session).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items = cart.map((i) => {
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

  // Agrupa unidades por producto con control de stock y descuenta de forma condicional.
  const qtyByProduct = new Map<string, number>();
  for (const i of cart) {
    if (byId.get(i.productId)?.trackStock) qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) ?? 0) + i.qty);
  }
  for (const [productId, qty] of qtyByProduct) {
    const r = await Product.updateOne({ _id: productId, trackStock: true, stock: { $gte: qty } }, { $inc: { stock: -qty } }, { session });
    if (r.modifiedCount !== 1) throw new BusinessError(`Sin stock suficiente de ${byId.get(productId)!.name}`);
  }
  return { items, qtyByProduct };
}

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

      const { items, qtyByProduct } = await priceAndTakeStock(session, input.items);
      // El domicilio y el porta/envase se cobran junto con los productos.
      const containerFee = input.containerFee || undefined;
      const total = items.reduce((s, i) => s + i.subtotal, 0) + (input.delivery?.fee ?? 0) + (containerFee ?? 0);
      const pay = splitPayment(input.paymentMethod, total, { cashReceived: input.cashReceived, transferAmount: input.transferAmount });

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
            payments: pay.payments,
            cashReceived: pay.cashReceived,
            change: pay.change,
            containerFee,
            containerQty: containerFee && (input.containerQty ?? 1),
            delivery: input.delivery && { ...input.delivery, status: "pending", updatedAt: new Date() },
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

/** El cajero anota un producto que saca para él: descuenta stock y queda como deuda; no entra en la caja. */
export async function createConsumptionTx(actor: Actor, input: ConsumptionInput) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const shift = await CashShift.findOne({ cashierId: actor.id, status: "open" }).session(session);
      if (!shift) throw new BusinessError("Abre la caja antes de anotar un consumo");
      const { items, qtyByProduct } = await priceAndTakeStock(session, input.items);
      const [c] = await Consumption.create(
        [
          {
            cashierId: actor.id,
            cashierName: actor.name,
            shiftId: shift._id,
            items,
            total: items.reduce((s, i) => s + i.subtotal, 0),
            note: input.note || undefined,
          },
        ],
        { session },
      );
      await StockMovement.insertMany(
        [...qtyByProduct].map(([productId, qty]) => ({
          productId,
          type: "consumption",
          qty: -qty,
          reason: `Consumo de ${actor.name}`,
          userId: actor.id,
          consumptionId: c!._id,
        })),
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}

/**
 * Quita un consumo anotado por error y devuelve su stock.
 * Cajero: solo los suyos y con esa caja abierta. Admin: cualquiera.
 */
export async function deleteConsumptionTx(actor: Actor & { role: "admin" | "cashier" }, consumptionId: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const c = await Consumption.findById(consumptionId).session(session);
      if (!c) throw new BusinessError("El consumo no existe o ya fue quitado");
      if (actor.role !== "admin") {
        if (String(c.cashierId) !== actor.id) throw new BusinessError("Solo puedes quitar tus propios consumos");
        if (!(await CashShift.exists({ _id: c.shiftId, status: "open" }).session(session))) {
          throw new BusinessError("La caja de este consumo ya se cerró; pídele al administrador que lo quite");
        }
      }
      const moves = await StockMovement.find({ consumptionId: c._id, type: "consumption" }).session(session).lean();
      for (const m of moves) await Product.updateOne({ _id: m.productId }, { $inc: { stock: -m.qty } }, { session });
      await StockMovement.insertMany(
        moves.map((m) => ({ productId: m.productId, type: "void", qty: -m.qty, reason: `Consumo quitado (${c.cashierName})`, userId: actor.id })),
        { session },
      );
      await Consumption.deleteOne({ _id: c._id }, { session });
    });
  } finally {
    await session.endSession();
  }
}

/** Consumos del personal en un rango, agrupados por cajero (lo que cada uno debe). */
export async function consumptionDebts(start: Date, end: Date) {
  return Consumption.aggregate<{ _id: string; cashierName: string; total: number; count: number }>([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: "$cashierId", cashierName: { $last: "$cashierName" }, total: { $sum: "$total" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
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

/** Pagos de cada venta; las ventas antiguas sin `payments` cuentan todo en su método. */
export const PAYMENTS_EXPR = { $ifNull: ["$payments", [{ method: "$paymentMethod", amount: "$total" }]] };

/**
 * Totales del turno calculados en la BD (solo ventas pagadas). Un pago mixto suma su parte
 * en efectivo a "cash" y su parte transferida a "transfer".
 */
export async function shiftTotals(shiftId: mongoose.Types.ObjectId | string) {
  const [r] = await Sale.aggregate<{
    byMethod: { _id: string; total: number }[];
    sales: { count: number; deliveryFees: number; deliveryCount: number; containerFees: number; containerCount: number }[];
  }>([
    { $match: { shiftId: new mongoose.Types.ObjectId(String(shiftId)), status: "paid" } },
    {
      $facet: {
        byMethod: [
          { $project: { p: PAYMENTS_EXPR } },
          { $unwind: "$p" },
          { $group: { _id: "$p.method", total: { $sum: "$p.amount" } } },
        ],
        sales: [
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              deliveryFees: { $sum: { $ifNull: ["$delivery.fee", 0] } },
              deliveryCount: { $sum: { $cond: [{ $ifNull: ["$delivery", false] }, 1, 0] } },
              containerFees: { $sum: { $ifNull: ["$containerFee", 0] } },
              containerCount: { $sum: { $cond: [{ $gt: [{ $ifNull: ["$containerFee", 0] }, 0] }, { $ifNull: ["$containerQty", 1] }, 0] } },
            },
          },
        ],
      },
    },
  ]);
  const totalsByMethod = Object.fromEntries((r?.byMethod ?? []).map((x) => [x._id, x.total])) as Record<string, number>;
  const s = r?.sales[0];
  return {
    totalsByMethod,
    salesCount: s?.count ?? 0,
    deliveryFees: s?.deliveryFees ?? 0,
    deliveryCount: s?.deliveryCount ?? 0,
    containerFees: s?.containerFees ?? 0,
    containerCount: s?.containerCount ?? 0,
  };
}

/**
 * Cierra el turno comparando lo contado (efectivo y transferencias) contra lo esperado.
 * Si sobra o falta dinero, exige una nota que lo explique.
 */
export async function closeShift(actor: Actor, counted: { cash: number; transfer: number }, note?: string) {
  const shift = await CashShift.findOne({ cashierId: actor.id, status: "open" });
  if (!shift) throw new BusinessError("No tienes una caja abierta");
  const { totalsByMethod, salesCount, deliveryFees, deliveryCount, containerFees, containerCount } = await shiftTotals(shift._id);
  const t = closeShiftTotals(shift.openingCash, totalsByMethod, counted);
  if ((t.difference !== 0 || t.transferDifference !== 0) && !note?.trim()) {
    throw new BusinessError("La caja no cuadra: revisa el conteo o escribe una nota explicando la diferencia");
  }
  const r = await CashShift.updateOne(
    { _id: shift._id, status: "open" },
    {
      status: "closed",
      closedAt: new Date(),
      countedCash: counted.cash,
      expectedCash: t.expectedCash,
      difference: t.difference,
      countedTransfer: counted.transfer,
      expectedTransfer: t.expectedTransfer,
      transferDifference: t.transferDifference,
      closeNote: note?.trim() || undefined,
      totalsByMethod,
      salesCount,
      deliveryFees,
      deliveryCount,
      containerFees,
      containerCount,
    },
  );
  if (r.modifiedCount !== 1) throw new BusinessError("La caja ya fue cerrada");
  return String(shift._id);
}

/**
 * Anula (devuelve) una venta pagada y devuelve el stock que esa venta descontó. Todo o nada.
 * Admin: cualquier venta. Cajero: solo sus ventas y mientras la caja de esa venta siga abierta.
 */
export async function voidSaleTx(actor: Actor & { role: "admin" | "cashier" }, saleId: string, reason: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (actor.role !== "admin") {
        const own = await Sale.findOne({ _id: saleId, cashierId: actor.id }).session(session).lean();
        if (!own) throw new BusinessError("Solo puedes devolver tus propias ventas");
        if (!(await CashShift.exists({ _id: own.shiftId, status: "open" }).session(session))) {
          throw new BusinessError("La caja de esta venta ya se cerró; pídele al administrador que la anule");
        }
      }
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
export async function changePaymentMethod(actor: Actor & { role: "admin" | "cashier" }, saleId: string, method: Extract<PaymentMethod, "cash" | "transfer">) {
  const sale = await Sale.findById(saleId);
  if (!sale || sale.status !== "paid") throw new BusinessError("La venta no existe o está anulada");
  if (actor.role !== "admin" && String(sale.cashierId) !== actor.id) throw new BusinessError("Solo puedes cambiar tus propias ventas");
  if (sale.paymentMethod === method) throw new BusinessError("La venta ya tiene ese método de pago");
  if (!(await CashShift.exists({ _id: sale.shiftId, status: "open" }))) {
    throw new BusinessError("La caja de esta venta ya se cerró; no se puede cambiar el método");
  }
  // A efectivo: se asume pago exacto. A otro método: sin efectivo recibido ni cambio.
  const payments = [{ method, amount: sale.total }];
  const cash = method === "cash"
    ? { $set: { paymentMethod: method, payments, cashReceived: sale.total, change: 0 } }
    : { $set: { paymentMethod: method, payments }, $unset: { cashReceived: 1, change: 1 } };
  const r = await Sale.updateOne(
    { _id: sale._id, status: "paid", paymentMethod: sale.paymentMethod },
    { ...cash, $push: { paymentChanges: { from: sale.paymentMethod, to: method, by: actor.id } } },
  );
  if (r.modifiedCount !== 1) throw new BusinessError("La venta cambió mientras tanto, intenta de nuevo");
}

/** Avanza el estado de un domicilio (Pendiente → En camino → Entregado). */
export async function setDeliveryStatus(saleId: string, status: "pending" | "on_way" | "delivered") {
  const r = await Sale.updateOne(
    { _id: saleId, status: "paid", delivery: { $exists: true } },
    { $set: { "delivery.status": status, "delivery.updatedAt": new Date() } },
  );
  if (r.matchedCount !== 1) throw new BusinessError("El domicilio no existe o la venta fue anulada");
}
