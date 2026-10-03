import mongoose from "mongoose";
import { BusinessError } from "@/lib/cash";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";

export type AdjustType = "in" | "out" | "adjust";

/** Cambio de stock que produce cada ajuste. "adjust" = conteo físico: deja el stock en `qty`. */
export function stockDelta(type: AdjustType, qty: number, current: number) {
  if (type === "in") return qty;
  if (type === "out") {
    if (qty > current) throw new BusinessError(`Solo hay ${current} unidades para dar de baja`);
    return -qty;
  }
  return qty - current;
}

/** Entrada, merma o conteo con motivo. Cada uno deja su stockMovement; todo en una transacción. */
export async function adjustStock(actor: { id: string }, input: { productId: string; type: AdjustType; qty: number; reason: string }) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const p = await Product.findOne({ _id: input.productId, trackStock: true }).session(session);
      if (!p) throw new BusinessError("El producto no controla stock");
      const delta = stockDelta(input.type, input.qty, p.stock);
      if (delta === 0) throw new BusinessError("El stock ya está en ese valor");
      // Condición sobre el stock leído: si una venta lo cambió entre medio, la transacción reintenta.
      const r = await Product.updateOne({ _id: p._id, stock: p.stock }, { $inc: { stock: delta } }, { session });
      if (r.modifiedCount !== 1) throw new BusinessError("El stock cambió, intenta de nuevo");
      await StockMovement.create([{ productId: p._id, type: input.type, qty: delta, reason: input.reason, userId: actor.id }], { session });
    });
  } finally {
    await session.endSession();
  }
}
