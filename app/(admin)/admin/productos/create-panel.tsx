"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setCategoryActive } from "./actions";
import { CategoryForm } from "./category-form";
import { ProductForm } from "./product-form";

type Category = { id: string; name: string; color: string; active: boolean };
type Panel = "producto" | "categorias" | null;

export function CreatePanel({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState<Panel>(null);
  const panelRef = useRef<HTMLElement>(null);
  const active = categories.filter((c) => c.active);

  // Al abrir: lleva el formulario a la vista y enfoca el primer campo.
  useEffect(() => {
    const el = panelRef.current;
    if (!open || !el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    el.querySelector<HTMLElement>("input:not([type=hidden]):not([type=file]), select")?.focus({ preventScroll: true });
  }, [open]);

  const toggle = (p: Exclude<Panel, null>) => setOpen((o) => (o === p ? null : p));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          aria-expanded={open === "producto"}
          aria-controls="panel-producto"
          onClick={() => toggle("producto")}
          className="press-3d h-12 rounded-2xl px-6 text-base"
        >
          <Plus /> Agregar producto
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open === "categorias"}
          aria-controls="panel-categorias"
          onClick={() => toggle("categorias")}
          className="h-12 rounded-2xl px-5 text-base"
        >
          <Tags /> Categorías
        </Button>
      </div>

      {open === "producto" && (
        <section ref={panelRef} id="panel-producto" aria-labelledby="titulo-producto" className="sticker scroll-mt-20 bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="titulo-producto" className="text-2xl font-semibold">
              Nuevo producto
            </h2>
            <Button type="button" variant="ghost" className="h-10 rounded-xl" onClick={() => setOpen(null)}>
              Cerrar
            </Button>
          </div>
          {active.length ? <ProductForm categories={active} /> : <p>Crea primero una categoría con el botón Categorías.</p>}
        </section>
      )}

      {open === "categorias" && (
        <section ref={panelRef} id="panel-categorias" aria-labelledby="titulo-categorias" className="sticker flex scroll-mt-20 flex-col gap-4 bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="titulo-categorias" className="text-2xl font-semibold">
              Categorías
            </h2>
            <Button type="button" variant="ghost" className="h-10 rounded-xl" onClick={() => setOpen(null)}>
              Cerrar
            </Button>
          </div>
          <CategoryForm />
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Toca una categoría para ocultarla o mostrarla en el POS.</p>
            <ul className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <form action={setCategoryActive}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={String(!c.active)} />
                    <Button
                      type="submit"
                      variant="outline"
                      aria-label={`${c.name}: ${c.active ? "visible, ocultar" : "oculta, mostrar"}`}
                      className={`h-10 rounded-full ${c.active ? "" : "line-through opacity-50"}`}
                    >
                      <span aria-hidden className="size-3 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
