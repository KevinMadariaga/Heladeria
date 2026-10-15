import { formatCOP, formatDateTime, PAYMENT_LABELS } from "@/lib/money";
import type { TicketSale } from "./actions";

export function Ticket({ sale }: { sale: TicketSale }) {
  const transferPart = sale.payments?.find((p) => p.method === "transfer")?.amount ?? (sale.paymentMethod === "transfer" ? sale.total : 0);
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
      {sale.delivery && (
        <div className="rounded border border-dashed border-current p-2">
          <p className="font-bold">DOMICILIO</p>
          <p>{sale.delivery.customer}</p>
          <p>{sale.delivery.address}</p>
          {sale.delivery.phone && <p>Tel: {sale.delivery.phone}</p>}
          {sale.delivery.notes && <p>{sale.delivery.notes}</p>}
        </div>
      )}
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
      {(sale.containerFee > 0 || (sale.delivery?.fee ?? 0) > 0) && (
        <div className="flex justify-between border-t border-dashed border-current pt-1">
          <span>Productos</span>
          <span>{formatCOP(sale.items.reduce((s, i) => s + i.subtotal, 0))}</span>
        </div>
      )}
      {sale.containerFee > 0 && (
        <div className="flex justify-between">
          <span>Porta / envase</span>
          <span>{formatCOP(sale.containerFee)}</span>
        </div>
      )}
      {sale.delivery && sale.delivery.fee > 0 && (
        <div className="flex justify-between">
          <span>Domicilio</span>
          <span>{formatCOP(sale.delivery.fee)}</span>
        </div>
      )}
      <hr className="border-dashed border-current" />
      <div className="flex justify-between text-base font-bold">
        <span>TOTAL</span>
        <span>{formatCOP(sale.total)}</span>
      </div>
      <p>Pago: {PAYMENT_LABELS[sale.paymentMethod]}</p>
      {transferPart > 0 && (
        <div className="flex justify-between">
          <span>Transferencia</span>
          <span>{formatCOP(transferPart)}</span>
        </div>
      )}
      {sale.cashReceived !== undefined && (
        <div className="flex justify-between">
          <span>Efectivo recibido</span>
          <span>{formatCOP(sale.cashReceived)}</span>
        </div>
      )}
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
