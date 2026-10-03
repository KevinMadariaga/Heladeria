import { type InferSchemaType, Schema, model, models, type Model } from "mongoose";

const option = new Schema({ name: { type: String, required: true }, price: { type: Number, required: true, min: 0 } }, { _id: false });

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, min: 0 },
    imageUrl: { type: String, default: "" },
    variants: { type: [option], default: [] },
    addons: { type: [option], default: [] },
    trackStock: { type: Boolean, default: false },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
productSchema.index({ categoryId: 1, active: 1 });
productSchema.index({ name: "text" });

export type ProductDoc = InferSchemaType<typeof productSchema>;
export const Product: Model<ProductDoc> = models.Product ?? model("Product", productSchema);
