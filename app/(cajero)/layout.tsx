import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";

const links = [
  { href: "/pos", label: "Vender" },
  { href: "/pos/caja", label: "Caja" },
  { href: "/pos/inventario", label: "Inventario" },
];

export default async function CajeroLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const admin = session.user.role === "admin" ? [{ href: "/admin", label: "Admin" }] : [];
  return (
    <>
      <AppHeader links={[...links, ...admin]} userName={session.user.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-4 md:py-6">{children}</main>
    </>
  );
}
