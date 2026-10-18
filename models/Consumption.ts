import { type InferSchemaType, Schema, model, models, type Model } from "mongoose";

const option = new Schema({ name: String, price: Number }, { _id: false });

// Producto que un cajero saca para él: descuenta stock, no entra en la caja y queda como deuda del cajero.
const consumptionSchema = new Schema({
  cashierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  cashierName: { type: String, required: true },
  shiftId: { type: Schema.Types.ObjectId, ref: "CashShift", required: true },
  items: {
    type: [
      new Schema(
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
      ),
    ],
    required: true,
  },
  total: { type: Number, required: true },
  note: String,
  createdAt: { type: Date, default: Date.now },
});
consumptionSchema.index({ shiftId: 1 });
consumptionSchema.index({ createdAt: -1, cashierId: 1 });

export type ConsumptionDoc = InferSchemaType<typeof consumptionSchema>;
export const Consumption: Model<ConsumptionDoc> = models.Consumption ?? model("Consumption", consumptionSchema, "consumptions");
