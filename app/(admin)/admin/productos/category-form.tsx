"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategory } from "./actions";

export function CategoryForm() {
  const [state, action, pending] = useActionState(createCategory, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cat-name">Nueva categoría</Label>
        <Input id="cat-name" name="name" required className="h-10 w-48" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cat-color">Color</Label>
        <input id="cat-color" name="color" type="color" defaultValue="#B98AE6" className="h-10 w-14 rounded-lg border border-input bg-background" />
      </div>
      <Button type="submit" disabled={pending} className="press-3d h-10 rounded-xl">
        Agregar
      </Button>
      <p role="status" aria-live="polite" className="text-sm text-destructive">
        {state?.error}
      </p>
    </form>
  );
}
