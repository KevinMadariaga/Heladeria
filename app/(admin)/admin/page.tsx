import type { Metadata } from "next";
import Link from "next/link";
import { CountUp } from "@/components/count-up";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { requireRole } from "@/lib/auth-guard";
import { formatCOP, PAYMENT_LABELS } from "@/lib/money";
import { TZ, type Unit } from "@/lib/periods";
import { byPaymentMethod, kpis, RANGE, salesSeries, topProducts } from "@/lib/reports";
import { cn } from "@/lib/utils";
import { RankChart, SalesChart } from "./charts";

export const metadata: Metadata = { title: "Dashboard" };

const PERIODS: { unit: Unit; tab: string; kpi: string }[] = [
  { unit: "day", tab: "Día", kpi: "Hoy" },
  { unit: "week", tab: "Semana", kpi: "Esta semana" },
  { unit: "month", tab: "Mes", kpi: "Este mes" },
  { unit: "year", tab: "Año", kpi: "Este año" },
];
const RANGE_LABEL: Record<Unit, string> = { day: "días", week: "semanas", month: "meses", year: "años" };
const LABEL_FMT: Record<Unit, Intl.DateTimeFormatOptions> = {
  day: { day: "numeric", month: "short" },
  week: { day: "numeric", month: "short" },
  month: { month: "short", year: "2-digit" },
  year: { year: "numeric" },
};

function Card({ title, subtitle, table, children }: { title: string; subtitle: string; table: [string, string][]; children: React.ReactNode }) {
  return (
    <section className="sticker flex min-w-0 flex-col gap-3 bg-card p-5">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Ver tabla</summary>
        <table className="mt-2 w-full">
          <tbody>
            {table.map(([k, v]) => (
              <tr key={k} className="border-b border-border">
                <td className="py-1">{k}</td>
                <td className="py-1 text-right tabular-nums">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

const Empty = () => <p className="py-10 text-center text-muted-foreground">Aún no hay ventas en este periodo.</p>;

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  await requireRole("admin");
  const p = (await searchParams).p;
  const unit: Unit = PERIODS.some((x) => x.unit === p) ? (p as Unit) : "day";

  const [k, series, top, methods] = await Promise.all([kpis(), salesSeries(unit), topProducts("week"), byPaymentMethod("month")]);
  const fmt = new Intl.DateTimeFormat("es-CO", { ...LABEL_FMT[unit], timeZone: TZ });
  const seriesData = series.map((s) => ({ label: fmt.format(s.period), total: s.total, tickets: s.tickets }));
  const best = top[0];

  return (
    <Stagger className="flex flex-col gap-6">
      <StaggerItem>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
      </StaggerItem>

      <StaggerItem>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {PERIODS.map(({ unit: u, kpi }) => (
            <li key={u} className="sticker flex flex-col gap-1 bg-card p-4">
              <span className="text-sm text-muted-foreground">{kpi}</span>
              <span className="font-heading text-2xl font-semibold tabular-nums sm:text-3xl">
                <CountUp value={k[u].total} money />
              </span>
              <span className="text-sm text-muted-foreground">
                <CountUp value={k[u].tickets} /> tickets
              </span>
            </li>
          ))}
          <li className="sticker col-span-2 flex flex-col gap-1 bg-card p-4 lg:col-span-1">
            <span className="text-sm text-muted-foreground">Más vendido (semana)</span>
            <span className="font-heading text-xl font-semibold">{best?.name ?? "—"}</span>
            {best && <span className="text-sm text-muted-foreground">{best.qty} unidades</span>}
          </li>
        </ul>
      </StaggerItem>

      <StaggerItem>
        <Card
          title="Ventas"
          subtitle={`Últimos ${RANGE[unit]} ${RANGE_LABEL[unit]} · hora de Colombia`}
          table={seriesData.map((d) => [d.label, `${formatCOP(d.total)} · ${d.tickets} tickets`])}
        >
          <nav aria-label="Periodo" className="flex flex-wrap gap-2">
            {PERIODS.map(({ unit: u, tab }) => (
              <Link
                key={u}
                href={`/admin?p=${u}`}
                scroll={false}
                aria-current={u === unit ? "page" : undefined}
                className={cn(
                  "rounded-full border-2 px-4 py-2 font-heading text-sm transition-colors",
                  u === unit ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                )}
              >
                {tab}
              </Link>
            ))}
          </nav>
          {seriesData.some((d) => d.total > 0) ? <SalesChart data={seriesData} /> : <Empty />}
        </Card>
      </StaggerItem>

      <StaggerItem className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Más vendidos de la semana"
          subtitle="Unidades vendidas desde el lunes"
          table={top.map((t) => [t.name, `${t.qty} u. · ${formatCOP(t.revenue)}`])}
        >
          {top.length ? (
            <RankChart
              data={top.map((t) => ({ label: t.name, value: t.qty, display: `${t.qty} u.` }))}
            />
          ) : (
            <Empty />
          )}
        </Card>
        <Card
          title="Métodos de pago"
          subtitle="Ventas de este mes"
          table={methods.map((m) => [PAYMENT_LABELS[m.method as keyof typeof PAYMENT_LABELS], `${formatCOP(m.total)} · ${m.tickets} tickets`])}
        >
          {methods.length ? (
            <RankChart
              data={methods.map((m) => ({
                label: PAYMENT_LABELS[m.method as keyof typeof PAYMENT_LABELS],
                value: m.total,
                display: formatCOP(m.total),
              }))}
            />
          ) : (
            <Empty />
          )}
        </Card>
      </StaggerItem>
    </Stagger>
  );
}
