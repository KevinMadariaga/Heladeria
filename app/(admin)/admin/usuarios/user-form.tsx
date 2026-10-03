"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUser, updateUser } from "./actions";

type UserValues = { id: string; name: string; username: string; role: "admin" | "cashier" };

export function UserForm({ user }: { user?: UserValues }) {
  const [state, action, pending] = useActionState(user ? updateUser : createUser, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !user) formRef.current?.reset();
  }, [state, user]);
  const p = user?.id ?? "new";

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-2">
      {user && <input type="hidden" name="id" value={user.id} />}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${p}-name`}>Nombre</Label>
        <Input id={`${p}-name`} name="name" defaultValue={user?.name} required className="h-11" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${p}-username`}>Usuario</Label>
        <Input id={`${p}-username`} name="username" defaultValue={user?.username} autoCapitalize="none" required className="h-11" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${p}-password`}>{user ? "Nueva contraseña (opcional)" : "Contraseña"}</Label>
        <Input id={`${p}-password`} name="password" type="password" autoComplete="new-password" required={!user} className="h-11" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${p}-role`}>Rol</Label>
        <select
          id={`${p}-role`}
          name="role"
          defaultValue={user?.role ?? "cashier"}
          className="h-11 rounded-lg border border-input bg-background px-3"
        >
          <option value="cashier">Cajero</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending} className="press-3d h-11 rounded-xl px-6">
          {pending ? "Guardando…" : user ? "Guardar" : "Guardar usuario"}
        </Button>
        <p role="status" aria-live="polite" className={`text-sm ${state?.error ? "text-destructive" : "text-muted-foreground"}`}>
          {state?.error ?? (state?.ok ? "Guardado ✓" : "")}
        </p>
      </div>
    </form>
  );
}
