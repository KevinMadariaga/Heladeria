import mongoose from "mongoose";

// Cache en globalThis: en dev el hot reload y en Vercel las lambdas calientes reutilizan la conexión.
const cache = globalThis as unknown as { mongoose?: Promise<typeof mongoose> };

export function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta MONGODB_URI en el entorno");
  cache.mongoose ??= mongoose.connect(uri, { bufferCommands: false }).catch((err) => {
    cache.mongoose = undefined;
    throw err;
  });
  return cache.mongoose;
}
