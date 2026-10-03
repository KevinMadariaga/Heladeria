"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** <dialog> nativo: foco atrapado, Esc y fondo los maneja el navegador. */
export function Modal({
  open,
  onClose,
  title,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d?.open) d?.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className={cn("modal sticker m-auto w-[min(32rem,calc(100vw-2rem))] bg-card p-0 text-card-foreground", className)}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" className="size-10" aria-label="Cerrar" onClick={onClose}>
          <X />
        </Button>
      </div>
      <div className="max-h-[75dvh] overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}
