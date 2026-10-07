import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/auth-guard";
import { formatCOP, formatDateTime, PAYMENT_LABELS } from "@/lib/money";
import { parseRange, rangeSummary, salesInRange, shiftsInRange } from "@/lib/report-queries";
import { VoidButton } from "./void-button";

export const metadata: Metadata = { title: "Reportes" };

const CSVS = [
  { type: "ventas", label: "Ventas" },
  { type: "items", label: "Detalle de productos" },
  { type: "cierres", label: "Cierres de caja" },
  { type: "inventario", label: "Movimientos de inventario" },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sticker flex flex-col gap-1 bg-card p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-heading text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export default async function ReportesPage({ searchParams }: PageProps<"/admin/reportes">) {
  await requireRole("admin");
  const range = parseRange(await searchParams);
  const [summary, sales, shifts] = await Promise.all([rangeSummary(range), salesInRange(range), shiftsInRange(range)]);
  const qs = `from=${range.from}&to=${range.to}`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Reportes</h1>

      <form className="sticker grid grid-cols-1 gap-4 bg-card p-4 sm:flex sm:flex-wrap sm:items-end sm:gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="from">Desde</Label>
          <Input id="from" name="from" type="date" defaultValue={range.from} className="h-11 w-full sm:w-44" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="to">Hasta</Label>
          <Input id="to" name="to" type="date" defaultValue={range.to} className="h-11 w-full sm:w-44" />
        </div>
        <Button type="submit" className="press-3d h-11 w-full rounded-xl px-5 sm:w-auto">
          Ver
        </Button>
        <p className="text-sm text-muted-foreground sm:w-full">Fechas en hora de Colombia, días completos.</p>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ventas pagadas" value={formatCOP(summary.paid)} />
        <Stat label="Tickets" value={summary.tickets.toLocaleString("es-CO")} />
        <Stat label="Anuladas" value={`${summary.voided} · ${formatCOP(summary.voidedTotal)}`} />
        <Stat label="Ticket promedio" value={formatCOP(summary.tickets ? Math.round(summary.paid / summary.tickets) : 0)} />
      </div>

      <section aria-labelledby="exportar" className="sticker flex flex-col gap-3 bg-card p-5">
        <h2 id="exportar" className="text-xl font-semibold">
          Exportar CSV
        </h2>
        <div className="flex flex-wrap gap-2">
          {CSVS.map((c) => (
            <Button key={c.type} asChild variant="outline" className="h-11 rounded-xl">
              <a href={`/admin/reportes/csv?type=${c.type}&${qs}`} download>
                <Download /> {c.label}
              </a>
            </Button>
          ))}
        </div>
      </section>

      <section aria-labelledby="ventas" className="sticker bg-card p-5">
        <h2 id="ventas" className="mb-3 text-xl font-semibold">
          Ventas ({sales.length})
        </h2>
        {sales.length === 0 ? (
          <p className="text-muted-foreground">No hay ventas en este rango.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Cajero</th>
                  <th className="py-2 pr-3 font-medium">Productos</th>
                  <th className="py-2 pr-3 font-medium">Método</th>
                  <th className="py-2 pr-3 text-right font-medium">Total</th>
                  <th className="py-2 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={String(s._id)} className={`border-t border-border ${s.status === "voided" ? "text-muted-foreground" : ""}`}>
                    <td className="py-2 pr-3 font-heading">{s.number}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(s.createdAt)}</td>
                    <td className="py-2 pr-3">{s.cashierName}</td>
                    <td className="max-w-xs py-2 pr-3">{s.items.map((i) => `${i.qty}× ${i.name}${i.variant ? ` (${i.variant})` : ""}`).join(", ")}</td>
                    <td className="py-2 pr-3">
                      {PAYMENT_LABELS[s.paymentMethod]}
                      {s.paymentChanges?.[0] && (
                        <span className="block text-xs text-muted-foreground">
                          antes {PAYMENT_LABELS[s.paymentChanges?.[0].from as keyof typeof PAYMENT_LABELS]}
                        </span>
                      )}
                    </td>
                    <td className={`py-2 pr-3 text-right font-heading tabular-nums ${s.status === "voided" ? "line-through" : ""}`}>{formatCOP(s.total)}</td>
                    <td className="py-2 text-right">
                      {s.status === "paid" ? (
                        <VoidButton saleId={String(s._id)} number={s.number} total={s.total} />
                      ) : (
                        <Badge variant="outline" title={s.voidReason ?? ""}>
                          Anulada
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="cierres" className="sticker bg-card p-5">
        <h2 id="cierres" className="mb-3 text-xl font-semibold">
          Cierres de caja ({shifts.length})
        </h2>
        {shifts.length === 0 ? (
          <p className="text-muted-foreground">No hay turnos abiertos en este rango.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Cajero</th>
                  <th className="py-2 pr-3 font-medium">Apertura</th>
                  <th className="py-2 pr-3 font-medium">Cierre</th>
                  <th className="py-2 pr-3 text-right font-medium">Base</th>
                  <th className="py-2 pr-3 text-right font-medium">Esperado</th>
                  <th className="py-2 pr-3 text-right font-medium">Contado</th>
                  <th className="py-2 text-right font-medium">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={String(s._id)} className="border-t border-border">
                    <td className="py-2 pr-3">{s.cashierName}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(s.openedAt)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{s.closedAt ? formatDateTime(s.closedAt) : <Badge>Abierta</Badge>}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatCOP(s.openingCash)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.expectedCash != null ? formatCOP(s.expectedCash) : "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.countedCash != null ? formatCOP(s.countedCash) : "—"}</td>
                    <td
                      className={`py-2 text-right font-heading tabular-nums ${(s.difference ?? 0) < 0 ? "text-destructive" : ""}`}
                    >
                      {s.difference != null ? formatCOP(s.difference) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
