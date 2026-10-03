import { formatCOP, formatDateTime, PAYMENT_LABELS } from "@/lib/money";
import type { TicketSale } from "./actions";

export function Ticket({ sale }: { sale: TicketSale }) {
  return (
    <div id="ticket" className="mx-auto flex max-w-xs flex-col gap-2 font-mono text-sm">
      <div className="text-center">
        <p className="font-brand text-2xl text-primary">Kathy</p>
        <p>Coffe Heladería</p>
        <p>
          Venta #{sale.number} · {formatDateTime(sale.createdAt)}
        </p>
        <p>Atendió: {sale.cashierName}</p>
      </div>
      <hr className="border-dashed border-current" />
      {sale.items.map((i, k) => (
        <div key={k} className="flex justify-between gap-2">
          <span>
            {i.qty} × {i.name}
            {i.variant && ` (${i.variant})`}
            {i.addons.length > 0 && <span className="block pl-4 text-xs">+ {i.addons.join(", ")}</span>}
          </span>
          <span>{formatCOP(i.subtotal)}</span>
        </div>
      ))}
      <hr className="border-dashed border-current" />
      <div className="flex justify-between text-base font-bold">
        <span>TOTAL</span>
        <span>{formatCOP(sale.total)}</span>
      </div>
      <div className="flex justify-between">
        <span>{PAYMENT_LABELS[sale.paymentMethod]}</span>
        <span>{formatCOP(sale.cashReceived ?? sale.total)}</span>
      </div>
      {sale.change !== undefined && (
        <div className="flex justify-between">
          <span>Cambio</span>
          <span>{formatCOP(sale.change)}</span>
        </div>
      )}
      <p className="mt-2 text-center">¡Gracias por tu visita! ♥</p>
    </div>
  );
}
