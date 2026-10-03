import { type InferSchemaType, Schema, model, models, type Model } from "mongoose";

const cashShiftSchema = new Schema({
  cashierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  cashierName: { type: String, required: true },
  openedAt: { type: Date, default: Date.now },
  openingCash: { type: Number, required: true, min: 0 },
  closedAt: Date,
  countedCash: Number,
  expectedCash: Number,
  difference: Number,
  totalsByMethod: { type: Map, of: Number },
  salesCount: Number,
  status: { type: String, enum: ["open", "closed"], default: "open" },
});
// Un solo turno abierto por cajero (lo garantiza la BD, no el código).
cashShiftSchema.index({ cashierId: 1 }, { unique: true, partialFilterExpression: { status: "open" } });
cashShiftSchema.index({ openedAt: -1 });

export type CashShiftDoc = InferSchemaType<typeof cashShiftSchema>;
export const CashShift = (models.CashShift ?? model("CashShift", cashShiftSchema, "cashShifts")) as Model<CashShiftDoc>;
