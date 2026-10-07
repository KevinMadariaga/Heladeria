import { ForbiddenError, requireRole } from "@/lib/auth-guard";
import { toCSV } from "@/lib/csv";
import { formatDateTime, PAYMENT_LABELS } from "@/lib/money";
import { movementsInRange, parseRange, salesInRange, shiftsInRange } from "@/lib/report-queries";

const STATUS = { paid: "Pagada", voided: "Anulada" } as const;
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
        ["Número", "Fecha", "Cajero", "Productos", "Método", "Método original", "Total", "Recibido", "Cambio", "Estado", "Motivo anulación"],
        sales.map((s) => [
          s.number,
          formatDateTime(s.createdAt),
          s.cashierName,
          s.items.map((i) => `${i.qty}x ${i.name}${i.variant ? ` (${i.variant})` : ""}`).join(", "),
          PAYMENT_LABELS[s.paymentMethod],
          s.paymentChanges?.[0] ? PAYMENT_LABELS[s.paymentChanges?.[0].from as keyof typeof PAYMENT_LABELS] : "",
          s.total,
          s.cashReceived,
          s.change,
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
        ["Cajero", "Apertura", "Cierre", "Base", "Efectivo", "Transferencia", "Otros (tarjeta/Nequi/Daviplata)", "Esperado", "Contado", "Diferencia", "Estado"],
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
            s.expectedCash,
            s.countedCash,
            s.difference,
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
