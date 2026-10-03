import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

// Sin backdrop-blur en móvil: crearía un containing block y la barra inferior (fixed) quedaría atrapada en el header.
export function AppHeader({ links, userName }: { links: { href: string; label: string }[]; userName: string }) {
  return (
    <header className="z-20 border-b-4 border-[var(--sticker-edge)] bg-card pt-[env(safe-area-inset-top,0px)] md:sticky md:top-0 md:bg-card/90 md:backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-1.5 md:gap-4 md:py-2">
        <Logo compact className="h-9 w-auto shrink-0 md:h-11" />
        <NavLinks links={links} />
        <span className="ml-auto min-w-0 truncate text-sm text-muted-foreground md:ml-0">{userName}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="outline" className="h-10 rounded-xl">
            Salir
          </Button>
        </form>
      </div>
    </header>
  );
}
