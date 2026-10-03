"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="flex flex-col gap-4 text-left">
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Usuario</Label>
        <Input id="username" name="username" autoComplete="username" autoCapitalize="none" required className="h-11 text-base" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-11 text-base" />
      </div>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-destructive">
        {error}
      </p>
      <Button type="submit" disabled={pending} className="press-3d h-12 rounded-2xl text-base">
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
