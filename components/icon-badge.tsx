import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ícono en "sticker" (fondo pastel, borde blanco, sombra) para títulos de sección. El color va en className. */
export function IconBadge({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 -rotate-6 place-items-center rounded-2xl border-[3px] border-[var(--sticker-edge)] bg-lila-400 text-white shadow-[0_6px_14px_-4px_rgb(91_26_126/0.45)]",
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={2.25} />
    </span>
  );
}
