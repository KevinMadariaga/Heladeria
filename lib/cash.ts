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

/** Cierre: esperado = base + ventas en efectivo; diferencia = contado − esperado. */
export function closeShiftTotals(openingCash: number, totalsByMethod: Record<string, number>, countedCash: number) {
  const expectedCash = openingCash + (totalsByMethod.cash ?? 0);
  return { expectedCash, difference: countedCash - expectedCash };
}
