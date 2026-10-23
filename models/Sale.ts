import { type InferSchemaType, Schema, model, models, type Model } from "mongoose";

// Todos los valores que pueden existir guardados (tarjeta/Nequi/Daviplata quedan solo por ventas antiguas).
export const PAYMENT_METHODS = ["cash", "card", "transfer", "mixed", "nequi", "daviplata"] as const;
export const DELIVERY_STATUSES = ["pending", "on_way", "delivered"] as const;
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
  // Cuánto entró por cada método (mixto = efectivo + transferencia). Ventas antiguas no lo tienen.
  payments: { type: [new Schema({ method: { type: String, required: true }, amount: { type: Number, required: true } }, { _id: false })], default: undefined },
  // Pedido a domicilio: el valor del domicilio va incluido en `total`.
  delivery: {
    type: new Schema(
      {
        customer: { type: String, required: true },
        phone: String,
        address: { type: String, required: true },
        notes: String,
        fee: { type: Number, default: 0 },
        status: { type: String, enum: DELIVERY_STATUSES, default: "pending" },
        updatedAt: Date,
      },
      { _id: false },
    ),
    default: undefined,
  },
  // Valor del porta / envase (incluido en `total`).
  containerFee: Number,
  containerQty: Number,
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
saleSchema.index({ "delivery.status": 1, createdAt: -1 }, { sparse: true });

export type SaleDoc = InferSchemaType<typeof saleSchema>;
export const Sale: Model<SaleDoc> = models.Sale ?? model("Sale", saleSchema);
