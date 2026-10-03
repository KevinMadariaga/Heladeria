"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const fmt = (digits: string) => (digits ? Number(digits).toLocaleString("es-CO") : "");

type Props = Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "type"> & {
  defaultValue?: number;
  /** Controlado: solo dígitos ("25000"). */
  value?: string;
  onValueChange?: (digits: string) => void;
};

/**
 * Campo de pesos con punto de miles mientras se escribe ($ 25.000).
 * El formulario recibe solo dígitos por un input oculto con `name`.
 * ponytail: el cursor salta al final al reformatear; suficiente para montos que se escriben de corrido.
 */
export function MoneyInput({ name, defaultValue, value, onValueChange, className, ...rest }: Props) {
  const [inner, setInner] = useState(defaultValue != null ? String(defaultValue) : "");
  const digits = value ?? inner;
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
        $
      </span>
      <Input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={fmt(digits)}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);
          setInner(d);
          onValueChange?.(d);
        }}
        className={cn("pl-7 tabular-nums", className)}
      />
      {name && <input type="hidden" name={name} value={digits} />}
    </div>
  );
}
