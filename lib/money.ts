const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** Montos en COP como enteros. formatCOP(25000) → "$ 25.000" */
export const formatCOP = (amount: number) => cop.format(amount);

/** Métodos con los que hoy se puede cobrar (los demás quedan solo en ventas antiguas). */
export const ACTIVE_PAYMENT_METHODS = ["cash", "transfer", "mixed"] as const;
/** Métodos a los que se puede cambiar una venta ya cobrada (mixto pide el valor por transferencia). */
export const SWITCHABLE_PAYMENT_METHODS = ["cash", "transfer", "mixed"] as const;

export const PAYMENT_LABELS = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", mixed: "Mixto", nequi: "Nequi", daviplata: "Daviplata" } as const;

const dateTime = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });
/** Fecha y hora en Colombia. */
export const DELIVERY_STATUS_LABELS = { pending: "Pendiente", on_way: "En camino", delivered: "Entregado" } as const;

export const formatDateTime = (d: Date | string) => dateTime.format(new Date(d));
