import { type InferSchemaType, Schema, model, models, type Model } from "mongoose";

const stockMovementSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  type: { type: String, enum: ["in", "out", "sale", "void", "adjust"], required: true },
  qty: { type: Number, required: true }, // con signo: negativo = sale del inventario
  reason: String,
  saleId: { type: Schema.Types.ObjectId, ref: "Sale" }, // venta que lo generó (para devolver stock al anular)
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});
stockMovementSchema.index({ productId: 1, createdAt: -1 });
stockMovementSchema.index({ saleId: 1 }, { sparse: true });
stockMovementSchema.index({ createdAt: -1 });

export type StockMovementDoc = InferSchemaType<typeof stockMovementSchema>;
export const StockMovement: Model<StockMovementDoc> =
  models.StockMovement ?? model("StockMovement", stockMovementSchema, "stockMovements");
