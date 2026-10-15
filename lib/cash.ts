/** Error de negocio: su mensaje se muestra tal cual al usuario. */
export class BusinessError extends Error {}

// Cálculos puros de caja y precios (enteros COP). Los usa el servidor; el cliente solo los muestra.

export type Option = { name: string; price: number };
export type PricedProduct = { name: string; price: number; variants: Option[]; addons: Option[] };

/** Precio unitario = precio de la variante (o base) + toppings. Lanza si la variante/topping no existe. */
export function unitPrice(product: PricedProduct, variant: string | undefined, addonNames: string[]) {
  let base = product.price;
  if (product.variants.length) {
    const v = product.variants.find((x) => x.name === variant);
    if (!v) throw new BusinessError(`Elige una opción válida para ${product.name}`);
    base = v.price;
  }
  const addons = addonNames.map((n) => {
    const a = product.addons.find((x) => x.name === n);
    if (!a) throw new BusinessError(`Topping inválido en ${product.name}`);
    return a;
  });
  return { unitPrice: base + addons.reduce((s, a) => s + a.price, 0), addons };
}

export function change(total: number, cashReceived: number) {
  if (cashReceived < total) throw new BusinessError("El efectivo recibido no alcanza");
  return cashReceived - total;
}

export type Payment = { method: "cash" | "transfer"; amount: number };

/**
 * Reparte el total entre efectivo y transferencia.
 * - cash: todo en efectivo; cashReceived (vacío = exacto) ≥ total → cambio.
 * - transfer: todo por transferencia.
 * - mixed: transferAmount por transferencia (0 < t < total) y el resto en efectivo;
 *   el cambio se calcula solo sobre la parte en efectivo.
 */
export function splitPayment(
  method: "cash" | "transfer" | "mixed",
  total: number,
  opts: { cashReceived?: number; transferAmount?: number } = {},
): { payments: Payment[]; cashReceived?: number; change?: number } {
  if (method === "transfer") return { payments: [{ method: "transfer", amount: total }] };
  let cashPart = total;
  const payments: Payment[] = [];
  if (method === "mixed") {
    const t = opts.transferAmount ?? 0;
    if (t <= 0 || t >= total) throw new BusinessError("En pago mixto, la transferencia debe ser mayor a 0 y menor al total");
    cashPart = total - t;
    payments.push({ method: "cash", amount: cashPart }, { method: "transfer", amount: t });
  } else {
    payments.push({ method: "cash", amount: total });
  }
  const cashReceived = opts.cashReceived ?? cashPart;
  return { payments, cashReceived, change: change(cashPart, cashReceived) };
}

/**
 * Cierre de caja. Debe haber:
 * - en efectivo: base + ventas en efectivo (incluye la parte en efectivo de los pagos mixtos);
 * - en transferencias: ventas por transferencia.
 * Diferencias = contado − esperado (negativo = falta, positivo = sobra).
 */
export function closeShiftTotals(
  openingCash: number,
  totalsByMethod: Record<string, number>,
  counted: { cash: number; transfer: number },
) {
  const cashSales = totalsByMethod.cash ?? 0;
  const transferSales = totalsByMethod.transfer ?? 0;
  const salesTotal = Object.values(totalsByMethod).reduce((s, v) => s + v, 0);
  const expectedCash = openingCash + cashSales;
  const expectedTransfer = transferSales;
  return {
    cashSales,
    transferSales,
    salesTotal,
    expectedCash,
    expectedTransfer,
    totalWithBase: openingCash + salesTotal,
    difference: counted.cash - expectedCash,
    transferDifference: counted.transfer - expectedTransfer,
  };
}
