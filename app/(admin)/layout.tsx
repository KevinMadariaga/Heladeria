import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";

const links = [
  { href: "/admin", label: "Dashboard", short: "Inicio" },
  { href: "/admin/productos", label: "Productos", short: "Menú" },
  { href: "/admin/inventario", label: "Inventario", short: "Stock" },
  { href: "/admin/reportes", label: "Reportes", short: "Ventas" },
  { href: "/admin/consumos", label: "Consumos", short: "Deudas" },
  { href: "/admin/usuarios", label: "Usuarios", short: "Equipo" },
  { href: "/pos", label: "POS" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user.role !== "admin") redirect("/login");
  return (
    <>
      <AppHeader links={links} userName={session.user.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-4 md:py-6">{children}</main>
    </>
  );
}
