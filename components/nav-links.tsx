"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BarChart3, Boxes, LayoutDashboard, Package, Shield, ShoppingCart, Users, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/productos": Package,
  "/admin/inventario": Boxes,
  "/admin/reportes": BarChart3,
  "/admin/usuarios": Users,
  "/pos": ShoppingCart,
  "/pos/caja": Wallet,
  "/pos/inventario": Boxes,
};

/**
 * Menú principal. Móvil: barra inferior fija con íconos (alcance del pulgar, no roba alto arriba).
 * Desde md: fila dentro del encabezado. La opción activa lleva un fondo que se desliza (200ms ease-out).
 */
export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  // Activa = el href más largo que coincide (/admin/productos gana sobre /admin).
  const active = links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      aria-label="Principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 grid auto-cols-fr grid-flow-col gap-1 border-t-4 border-[var(--sticker-edge)] bg-card/95 px-1 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_24px_-12px_rgb(91_26_126/0.35)] backdrop-blur",
        "md:static md:flex md:flex-1 md:flex-wrap md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none",
      )}
    >
      {links.map((l) => {
        const isActive = l.href === active;
        const Icon = ICONS[l.href] ?? Shield;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 font-heading text-[10.5px] leading-none tracking-tight transition-colors duration-150 select-none",
              "md:h-10 md:flex-row md:px-3 md:text-base md:tracking-normal",
              isActive ? "text-primary-foreground" : "text-foreground md:hover:bg-muted",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="nav-active"
                aria-hidden
                className="absolute inset-0 rounded-xl bg-primary shadow-[0_3px_0_var(--press-shadow),0_6px_14px_-4px_rgb(91_26_126/0.45)]"
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              />
            )}
            <Icon aria-hidden className="relative size-5 md:hidden" />
            <span className="relative max-w-full truncate">{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
