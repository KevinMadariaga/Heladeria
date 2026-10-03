import { Logo } from "@/components/logo";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

export default function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <Stagger className="flex flex-col items-center gap-8">
        <StaggerItem>
          <Logo className="w-full max-w-md" />
        </StaggerItem>
        <StaggerItem className="sticker bg-card px-6 py-5">
          <h1 className="text-2xl font-semibold">
            Esto es <span className="font-brand text-primary">Kathy POS</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Inventario y ventas de la heladería.</p>
        </StaggerItem>
        <StaggerItem>
          <Button asChild size="lg" className="press-3d h-12 rounded-2xl px-8 text-base">
            <Link href="/login">Ingresar</Link>
          </Button>
        </StaggerItem>
      </Stagger>
    </main>
  );
}
