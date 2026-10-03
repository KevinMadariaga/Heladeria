import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { CashShift } from "../models/CashShift";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { Sale } from "../models/Sale";
import { StockMovement } from "../models/StockMovement";
import { User } from "../models/User";

// Idempotente: solo inserta lo que no existe ($setOnInsert). No pisa contraseñas ni precios editados.
const categories = [
  { name: "Helados", slug: "helados", color: "#F7B9DA", order: 1 },
  { name: "Café", slug: "cafe", color: "#7A4A2E", order: 2 },
  { name: "Malteadas", slug: "malteadas", color: "#B98AE6", order: 3 },
  { name: "Postres", slug: "postres", color: "#E2A35A", order: 4 },
];

const toppings = [
  { name: "Chispas de chocolate", price: 1500 },
  { name: "Arequipe", price: 2000 },
  { name: "Gomitas", price: 1500 },
];
const tamanos = (base: number) => [
  { name: "Pequeño", price: base },
  { name: "Mediano", price: base + 3000 },
  { name: "Grande", price: base + 6000 },
];

const products = [
  { cat: "helados", name: "Cono sencillo", price: 5000, variants: tamanos(5000), addons: toppings },
  { cat: "helados", name: "Cono doble", price: 8000, addons: toppings },
  { cat: "helados", name: "Copa Kathy", price: 15000, addons: toppings },
  { cat: "helados", name: "Paleta de fresa", price: 4000, trackStock: true, stock: 30, minStock: 5 },
  { cat: "cafe", name: "Tinto", price: 2500, variants: tamanos(2500) },
  { cat: "cafe", name: "Capuchino", price: 7000, variants: tamanos(7000) },
  { cat: "cafe", name: "Latte", price: 7500 },
  { cat: "cafe", name: "Affogato", price: 9000 },
  { cat: "malteadas", name: "Malteada de vainilla", price: 12000, variants: tamanos(12000), addons: toppings },
  { cat: "malteadas", name: "Malteada de chocolate", price: 12000, variants: tamanos(12000), addons: toppings },
  { cat: "postres", name: "Brownie", price: 6000, trackStock: true, stock: 12, minStock: 3 },
  { cat: "postres", name: "Torta de chocolate (porción)", price: 8000, trackStock: true, stock: 10, minStock: 2 },
];

async function main() {
  await connectDB();
  // Crea colecciones e índices fuera de transacciones (un turno abierto por cajero, consecutivo único…).
  for (const m of [User, Category, Product, Sale, CashShift, StockMovement]) await m.createCollection().then(() => m.createIndexes());

  await User.updateOne(
    { username: "admin" },
    { $setOnInsert: { name: "Administrador", role: "admin", active: true, passwordHash: await bcrypt.hash("123456", 10) } },
    { upsert: true },
  );

  const catIds = new Map<string, mongoose.Types.ObjectId>();
  for (const c of categories) {
    const doc = await Category.findOneAndUpdate({ slug: c.slug }, { $setOnInsert: c }, { upsert: true, returnDocument: "after" });
    catIds.set(c.slug, doc._id);
  }

  // Productos de ejemplo solo para pruebas (SEED_DEMO=1); en la base real los crea el admin.
  if (process.env.SEED_DEMO === "1") {
    await User.updateOne(
      { username: "cajero.e2e" },
      { $setOnInsert: { name: "Cajero E2E", role: "cashier", active: true, passwordHash: await bcrypt.hash("cajero123", 10) } },
      { upsert: true },
    );
    for (const { cat, ...p } of products) {
      await Product.updateOne({ name: p.name }, { $setOnInsert: { ...p, categoryId: catIds.get(cat) } }, { upsert: true });
    }
  }

  console.log("Seed OK → usuario: admin / contraseña: 123456 (cámbiala desde /admin/usuarios)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
