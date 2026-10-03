"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserForm } from "./user-form";

export function CreateUser() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        aria-expanded={open}
        aria-controls="nuevo-usuario"
        onClick={() => setOpen((o) => !o)}
        className="press-3d h-12 self-start rounded-2xl px-6 text-base"
      >
        <UserPlus /> Crear usuario
      </Button>
      {open && (
        <section id="nuevo-usuario" aria-labelledby="nuevo" className="sticker bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="nuevo" className="text-xl font-semibold">
              Nuevo usuario
            </h2>
            <Button type="button" variant="ghost" className="h-10 rounded-xl" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
          <UserForm />
        </section>
      )}
    </div>
  );
}
