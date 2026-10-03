import { type InferSchemaType, Schema, model, models, type Model } from "mongoose";

const categorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  color: { type: String, default: "#B98AE6" },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

export type CategoryDoc = InferSchemaType<typeof categorySchema>;
export const Category: Model<CategoryDoc> = models.Category ?? model("Category", categorySchema);
