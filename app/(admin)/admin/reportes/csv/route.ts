import { ForbiddenError, requireRole } from "@/lib/auth-guard";
import { toCSV } from "@/lib/csv";
import { formatDateTime, PAYMENT_LABELS } from "@/lib/money";
import { movementsInRange, parseRange, salesInRange, shiftsInRange } from "@/lib/report-queries";

const STATUS = { paid: "Pagada", voided: "Anulada" } as const;
/** Monto pagado con un método (ventas antiguas sin `payments`: todo en su método). */
const part = (s: { payments?: { method: string; amount: number }[] | null; paymentMethod: string; total: number }, m: string) =>
  s.payments ? s.payments.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0) : s.paymentMethod === m ? s.total : 0;

const MOVE = { in: "Entrada", out: "Merma", adjust: "Conteo", sale: "Venta", void: "Anulación" } as const;

export async function GET(req: Request) {
  try {
    await requireRole("admin");
  } catch (err) {
    if (err instanceof ForbiddenError) return new Response("Sin permiso", { status: 403 });
    throw err;
  }
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const range = parseRange(sp);
  let csv: string;

  switch (sp.type) {
    case "ventas": {
      const sales = await salesInRange(range);
      csv = toCSV(
        ["Número", "Fecha", "Cajero", "Productos", "Método", "Método original", "Total", "En efectivo", "Por transferencia", "Recibido", "Cambio", "Domicilio", "Cliente", "Dirección", "Teléfono", "Estado", "Motivo anulación"],
        sales.map((s) => [
          s.number,
          formatDateTime(s.createdAt),
          s.cashierName,
          s.items.map((i) => `${i.qty}x ${i.name}${i.variant ? ` (${i.variant})` : ""}`).join(", "),
          PAYMENT_LABELS[s.paymentMethod],
          s.paymentChanges?.[0] ? PAYMENT_LABELS[s.paymentChanges?.[0].from as keyof typeof PAYMENT_LABELS] : "",
          s.total,
          part(s, "cash"),
          part(s, "transfer"),
          s.cashReceived,
          s.change,
          s.delivery?.fee,
          s.delivery?.customer,
          s.delivery?.address,
          s.delivery?.phone,
          STATUS[s.status],
          s.voidReason,
        ]),
      );
      break;
    }
    case "items": {
      const sales = await salesInRange(range);
      csv = toCSV(
        ["Venta", "Fecha", "Producto", "Variante", "Toppings", "Precio unitario", "Cantidad", "Subtotal", "Estado"],
        sales.flatMap((s) =>
          s.items.map((i) => [
            s.number,
            formatDateTime(s.createdAt),
            i.name,
            i.variant,
            i.addons.map((a) => a.name).join(", "),
            i.unitPrice,
            i.qty,
            i.subtotal,
            STATUS[s.status],
          ]),
        ),
      );
      break;
    }
    case "cierres": {
      const shifts = await shiftsInRange(range);
      csv = toCSV(
        ["Cajero", "Apertura", "Cierre", "Base", "Ventas efectivo", "Ventas transferencia", "Otros (tarjeta/Nequi/Daviplata)", "Ventas totales", "Domicilios", "Efectivo esperado", "Efectivo contado", "Diferencia efectivo", "Transferencia esperada", "Transferencia verificada", "Diferencia transferencia", "Nota", "Estado"],
        shifts.map((s) => {
          const t = (m: string) => (s.totalsByMethod as Record<string, number> | undefined)?.[m] ?? 0;
          return [
            s.cashierName,
            formatDateTime(s.openedAt),
            s.closedAt ? formatDateTime(s.closedAt) : "",
            s.openingCash,
            t("cash"),
            t("transfer"),
            t("card") + t("nequi") + t("daviplata"),
            Object.values((s.totalsByMethod ?? {}) as Record<string, number>).reduce((a, b) => a + b, 0),
            s.deliveryFees,
            s.expectedCash,
            s.countedCash,
            s.difference,
            s.expectedTransfer,
            s.countedTransfer,
            s.transferDifference,
            s.closeNote,
            s.status === "open" ? "Abierta" : "Cerrada",
          ];
        }),
      );
      break;
    }
    case "inventario": {
      const moves = await movementsInRange(range);
      csv = toCSV(
        ["Fecha", "Producto", "Tipo", "Cantidad", "Motivo", "Usuario"],
        moves.map((m) => [formatDateTime(m.createdAt), m.productId?.name, MOVE[m.type], m.qty, m.reason, m.userId?.name]),
      );
      break;
    }
    default:
      return new Response("Tipo de reporte inválido", { status: 400 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kathy-${sp.type}-${range.from}_${range.to}.csv"`,
    },
  });
}
