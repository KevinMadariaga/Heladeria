import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/usuarios", label: "Usuarios" },
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
