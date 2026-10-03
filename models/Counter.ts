import { Schema, model, models, type Model } from "mongoose";

// Consecutivos atómicos (número de venta).
const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = (models.Counter ?? model("Counter", counterSchema)) as Model<{ _id: string; seq: number }>;
