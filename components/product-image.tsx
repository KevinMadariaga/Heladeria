import Image from "next/image";
import { cn } from "@/lib/utils";

export function ProductImage({ src, name, color, className }: { src?: string; name: string; color?: string; className?: string }) {
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-2xl", className)} style={{ background: color ?? "var(--lila-400)" }}>
      {src ? (
        <Image src={src} alt="" fill sizes="(max-width: 640px) 45vw, 200px" className="object-cover" />
      ) : (
        <span aria-hidden className="absolute inset-0 grid place-items-center font-brand text-4xl text-white/90">
          {name.charAt(0)}
        </span>
      )}
    </div>
  );
}
