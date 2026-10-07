const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** Montos en COP como enteros. formatCOP(25000) → "$ 25.000" */
export const formatCOP = (amount: number) => cop.format(amount);

export const PAYMENT_LABELS = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", nequi: "Nequi", daviplata: "Daviplata" } as const;

const dateTime = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });
/** Fecha y hora en Colombia. */
export const formatDateTime = (d: Date | string) => dateTime.format(new Date(d));
