import { type InferSchemaType, Schema, model, models, type Model } from "mongoose";

export const PAYMENT_METHODS = ["cash", "card", "transfer", "nequi", "daviplata"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const option = new Schema({ name: String, price: Number }, { _id: false });

// Snapshot de nombre y precios: si el producto cambia después, la venta no cambia.
const itemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    variant: String,
    addons: { type: [option], default: [] },
    unitPrice: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true },
  },
  { _id: false },
);

const saleSchema = new Schema({
  number: { type: Number, required: true, unique: true },
  cashierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  cashierName: { type: String, required: true },
  shiftId: { type: Schema.Types.ObjectId, ref: "CashShift", required: true },
  items: { type: [itemSchema], required: true },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
  cashReceived: Number,
  change: Number,
  status: { type: String, enum: ["paid", "voided"], default: "paid" },
  voidReason: String,
  // Historial de cambios de método de pago (la venta en sí no cambia).
  paymentChanges: {
    type: [new Schema({ from: String, to: String, at: { type: Date, default: Date.now }, by: { type: Schema.Types.ObjectId, ref: "User" } }, { _id: false })],
    default: [],
  },
  voidedAt: Date,
  voidedBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});
saleSchema.index({ createdAt: -1 });
saleSchema.index({ shiftId: 1 });
saleSchema.index({ cashierId: 1, createdAt: -1 });

export type SaleDoc = InferSchemaType<typeof saleSchema>;
export const Sale: Model<SaleDoc> = models.Sale ?? model("Sale", saleSchema);
