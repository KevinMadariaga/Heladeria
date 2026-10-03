import { Schema, model, models, type Model } from "mongoose";

// Fotos de productos guardadas en Mongo cuando no hay Cloudinary (ya llegan reducidas a ~900px desde el navegador).
const imageBlobSchema = new Schema({
  data: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ImageBlob = (models.ImageBlob ?? model("ImageBlob", imageBlobSchema, "images")) as Model<{
  data: Buffer;
  contentType: string;
  createdAt: Date;
}>;
