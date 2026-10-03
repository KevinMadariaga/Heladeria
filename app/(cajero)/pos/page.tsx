import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-guard";
import { activeCatalog } from "@/lib/catalog";
import { CashShift } from "@/models/CashShift";
import { OpenShiftForm } from "./open-shift-form";
import { PosScreen } from "./pos-screen";

export const metadata: Metadata = { title: "Vender" };

export default async function PosPage() {
  const user = await requireRole("admin", "cashier");
  if (!(await CashShift.exists({ cashierId: user.id, status: "open" }))) return <OpenShiftForm />;
  const { categories, products } = await activeCatalog();
  return <PosScreen categories={categories} products={products} />;
}
