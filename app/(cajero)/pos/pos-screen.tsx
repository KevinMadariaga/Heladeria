"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Minus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { MoneyInput } from "@/components/money-input";
import { ProductImage } from "@/components/product-image";
import { StockBadge } from "@/components/stock-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Option, unitPrice } from "@/lib/cash";
import { ACTIVE_PAYMENT_METHODS, formatCOP, PAYMENT_LABELS } from "@/lib/money";
import { type ClientProduct, stockStatus } from "@/lib/serialize";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/models/Sale";
import { submitSale, type TicketSale } from "./actions";
import { ChangeMethod, METHOD_ICON } from "./change-method";
import { Ticket } from "./ticket";

type Category = { id: string; name: string; color: string };
type Line = { key: string; product: ClientProduct; variant?: string; addons: Option[]; unitPrice: number; qty: number };

const METHODS = ACTIVE_PAYMENT_METHODS;
const QUICK_CASH = [10000, 20000, 50000, 100000];

function ProductCard({ product, color, inCart, onPick }: { product: ClientProduct; color?: string; inCart: number; onPick: () => void }) {
  const [scope, animate] = useAnimate();
  const out = stockStatus(product) === "out";
  const price = product.variants.length ? Math.min(...product.variants.map((v) => v.price)) : product.price;
  return (
    <button
      ref={scope}
      type="button"
      disabled={out}
      onClick={() => {
        animate(scope.current, { transform: ["scale(1)", "scale(0.94)", "scale(1.03)", "scale(1)"] }, { duration: 0.3 });
        onPick();
      }}
      className={cn(
        "lift sticker relative flex flex-col gap-2 bg-card p-2 text-left focus-visible:ring-4 focus-visible:ring-ring disabled:opacity-50",
        inCart > 0 && "outline-4 outline-offset-0 outline-lila-400",
      )}
    >
      <div className="relative">
        <ProductImage src={product.imageUrl} name={product.name} color={color} className="aspect-[4/3]" />
        {/* Etiqueta de precio tipo sticker */}
        <span className="absolute right-1.5 bottom-1.5 rounded-full border-2 border-white bg-card px-2.5 py-0.5 font-heading text-sm font-semibold text-primary shadow-md">
          {product.variants.length > 0 && <span className="font-normal text-muted-foreground">desde </span>}
          {formatCOP(price)}
        </span>
        <span className="absolute top-1.5 left-1.5">
          <StockBadge product={product} />
        </span>
      </div>
      <span className="line-clamp-2 min-h-[2.5em] px-1 pb-0.5 font-heading leading-tight font-semibold">{product.name}</span>
      <AnimatePresence>
        {inCart > 0 && (
          <motion.span
            key={inCart}
            initial={{ transform: "scale(0.6)", opacity: 0 }}
            animate={{ transform: "scale(1)", opacity: 1 }}
            exit={{ transform: "scale(0.6)", opacity: 0 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.3 }}
            aria-label={`${inCart} en el pedido`}
            className="absolute -top-2 -right-2 grid size-8 place-items-center rounded-full bg-primary font-heading text-sm text-primary-foreground ring-4 ring-white"
          >
            {inCart}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function Configurator({
  product,
  color,
  onAdd,
}: {
  product: ClientProduct;
  color?: string;
  onAdd: (variant: string | undefined, addons: string[], qty: number) => void;
}) {
  const [variant, setVariant] = useState(product.variants[0]?.name);
  const [addons, setAddons] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const price = unitPrice(product, variant, addons).unitPrice;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <ProductImage src={product.imageUrl} name={product.name} color={color} className="size-20 shrink-0 rounded-2xl" />
        <div>
          <p className="font-heading text-lg leading-tight font-semibold">{product.name}</p>
          <p className="text-sm text-muted-foreground">Elige tamaño y toppings</p>
        </div>
      </div>
      {product.variants.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-heading font-semibold">Tamaño</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {product.variants.map((v) => (
              <label
                key={v.name}
                className="flex cursor-pointer flex-col rounded-2xl border-2 border-border p-3 has-checked:border-primary has-checked:bg-secondary has-focus-visible:ring-4 has-focus-visible:ring-ring"
              >
                <input type="radio" name="variant" className="sr-only" checked={variant === v.name} onChange={() => setVariant(v.name)} />
                <span className="font-heading font-medium">{v.name}</span>
                <span className="text-sm text-muted-foreground">{formatCOP(v.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {product.addons.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-heading font-semibold">Toppings</legend>
          <div className="grid grid-cols-2 gap-2">
            {product.addons.map((a) => (
              <label
                key={a.name}
                className="flex cursor-pointer flex-col rounded-2xl border-2 border-border p-3 has-checked:border-primary has-checked:bg-secondary has-focus-visible:ring-4 has-focus-visible:ring-ring"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={addons.includes(a.name)}
                  onChange={(e) => setAddons((s) => (e.target.checked ? [...s, a.name] : s.filter((x) => x !== a.name)))}
                />
                <span className="font-heading font-medium">{a.name}</span>
                <span className="text-sm text-muted-foreground">+{formatCOP(a.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="size-11 rounded-xl" aria-label="Menos" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            <Minus />
          </Button>
          <span className="w-8 text-center font-heading text-xl" aria-live="polite">
            {qty}
          </span>
          <Button type="button" variant="outline" size="icon" className="size-11 rounded-xl" aria-label="Más" onClick={() => setQty((q) => q + 1)}>
            <Plus />
          </Button>
        </div>
        <Button type="button" className="press-3d h-12 flex-1 rounded-2xl text-base" onClick={() => onAdd(variant, addons, qty)}>
          Agregar · {formatCOP(price * qty)}
        </Button>
      </div>
    </div>
  );
}

export function PosScreen({ products, categories }: { products: ClientProduct[]; categories: Category[] }) {
  const [cat, setCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [configuring, setConfiguring] = useState<ClientProduct | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<TicketSale | null>(null);
  const [pending, startTransition] = useTransition();
  const cartRef = useRef<HTMLElement>(null);
  const [cartInView, setCartInView] = useState(false);

  // La barra flotante "Carrito" sobra cuando el carrito ya está en pantalla (móvil).
  useEffect(() => {
    const el = cartRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCartInView(!!e?.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const colorOf = useMemo(() => new Map(categories.map((c) => [c.id, c.color])), [categories]);
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es");
    return products.filter((p) => (cat === "all" || p.categoryId === cat) && (!q || p.name.toLocaleLowerCase("es").includes(q)));
  }, [products, cat, query]);

  const total = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const units = cart.reduce((s, l) => s + l.qty, 0);
  const received = Number(cashReceived || 0);
  const cashShort = method === "cash" && cashReceived !== "" && received < total;

  function add(product: ClientProduct, variant: string | undefined, addonNames: string[], qty: number) {
    const priced = unitPrice(product, variant, addonNames);
    const key = [product.id, variant ?? "", ...[...addonNames].sort()].join("|");
    setCart((c) => {
      const found = c.find((l) => l.key === key);
      return found
        ? c.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l))
        : [...c, { key, product, variant, addons: priced.addons, unitPrice: priced.unitPrice, qty }];
    });
    setError("");
  }

  function pick(p: ClientProduct) {
    if (p.variants.length || p.addons.length) setConfiguring(p);
    else add(p, undefined, [], 1);
  }

  const setQty = (key: string, qty: number) => setCart((c) => (qty <= 0 ? c.filter((l) => l.key !== key) : c.map((l) => (l.key === key ? { ...l, qty } : l))));

  function checkout() {
    setError("");
    startTransition(async () => {
      const res = await submitSale({
        items: cart.map((l) => ({ productId: l.product.id, variant: l.variant, addons: l.addons.map((a) => a.name), qty: l.qty })),
        paymentMethod: method,
        cashReceived: method === "cash" && cashReceived !== "" ? received : undefined,
      });
      if (res.error) return setError(res.error);
      setTicket(res.sale!);
      setCart([]);
      setCashReceived("");
      setMethod("cash");
    });
  }

  const inCart = new Map<string, number>();
  for (const l of cart) inCart.set(l.product.id, (inCart.get(l.product.id) ?? 0) + l.qty);

  return (
    <div className="grid gap-4 pb-20 sm:gap-6 lg:grid-cols-[1fr_400px] lg:pb-0">
      <section aria-label="Productos" className="flex min-w-0 flex-col gap-3">
        <div className="relative">
          <Search aria-hidden className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Buscar producto"
            placeholder="Buscar producto…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 rounded-full border-2 border-white bg-card pl-11 text-base shadow-[var(--sticker-shadow)]"
          />
        </div>
        <div role="group" aria-label="Categorías" className="-mx-3 flex gap-2 overflow-x-auto px-3 pt-1 pb-2 sm:-mx-4 sm:px-4">
          {[{ id: "all", name: "Todo", color: "var(--uva-700)" }, ...categories].map((c) => {
            const on = cat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCat(c.id)}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 font-heading text-base transition-[background-color,color,transform] duration-150 active:scale-[0.97]",
                  on ? "border-white bg-primary text-primary-foreground shadow-[0_3px_0_var(--press-shadow)]" : "border-white bg-card text-foreground shadow-sm",
                )}
              >
                <span aria-hidden className="size-3 rounded-full ring-2 ring-white" style={{ background: c.color }} />
                {c.name}
              </button>
            );
          })}
        </div>
        {visible.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">No hay productos para mostrar.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} color={colorOf.get(p.categoryId)} inCart={inCart.get(p.id) ?? 0} onPick={() => pick(p)} />
            ))}
          </div>
        )}
      </section>

      <aside
        ref={cartRef}
        id="carrito"
        aria-label="Carrito"
        className="sticker flex scroll-mt-4 flex-col self-start overflow-hidden bg-card lg:sticky lg:top-20"
      >
        <div className="flex items-center gap-2 bg-lila-100 px-4 py-3">
          <ShoppingBag aria-hidden className="text-primary" />
          <h2 className="text-xl font-semibold">Pedido</h2>
          {units > 0 && <span className="rounded-full bg-primary px-2 py-0.5 font-heading text-sm text-primary-foreground">{units}</span>}
          {cart.length > 0 && (
            <Button type="button" variant="ghost" className="ml-auto h-9 rounded-xl text-muted-foreground" onClick={() => setCart([])}>
              <Trash2 /> Vaciar
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-4 p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <span aria-hidden className="text-4xl">🍦</span>
              <p>Toca un producto para agregarlo al pedido.</p>
            </div>
          ) : (
            <ul className="-mx-1 flex max-h-[42dvh] flex-col gap-2 overflow-y-auto overscroll-contain px-1">
              <AnimatePresence initial={false}>
                {cart.map((l) => (
                  <motion.li
                    key={l.key}
                    layout
                    initial={{ opacity: 0, transform: "translateX(12px)" }}
                    animate={{ opacity: 1, transform: "translateX(0px)" }}
                    exit={{ opacity: 0, transform: "translateX(-12px)" }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="flex items-center gap-3 rounded-2xl bg-lila-100/70 p-2"
                  >
                    <ProductImage src={l.product.imageUrl} name={l.product.name} color={colorOf.get(l.product.categoryId)} className="size-14 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 font-heading leading-tight font-semibold">{l.product.name}</p>
                      {(l.variant || l.addons.length > 0) && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {[l.variant, ...l.addons.map((a) => `+ ${a.name}`)].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <p className="font-heading text-sm font-semibold text-primary tabular-nums">{formatCOP(l.unitPrice * l.qty)}</p>
                    </div>
                    <div className="flex shrink-0 items-center rounded-full border-2 border-white bg-card shadow-sm">
                      <button
                        type="button"
                        aria-label={`Quitar uno de ${l.product.name}`}
                        onClick={() => setQty(l.key, l.qty - 1)}
                        className="grid size-10 place-items-center rounded-full text-primary active:bg-muted"
                      >
                        {l.qty === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                      </button>
                      <span className="w-6 text-center font-heading tabular-nums">{l.qty}</span>
                      <button
                        type="button"
                        aria-label={`Agregar uno de ${l.product.name}`}
                        onClick={() => setQty(l.key, l.qty + 1)}
                        className="grid size-10 place-items-center rounded-full text-primary active:bg-muted"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          <div className="flex items-baseline justify-between border-t-2 border-dashed border-border pt-3">
            <span className="font-heading text-lg">Total</span>
            <span className="font-heading text-3xl font-semibold text-primary tabular-nums">{formatCOP(total)}</span>
          </div>

          <div role="radiogroup" aria-label="Método de pago" className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => {
              const Icon = METHOD_ICON[m];
              const on = method === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 font-heading text-xs transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97]",
                    on ? "border-primary bg-primary text-primary-foreground shadow-[0_3px_0_var(--press-shadow)]" : "border-border bg-card text-foreground",
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  {PAYMENT_LABELS[m]}
                </button>
              );
            })}
          </div>

          {method === "cash" && (
            <div className="flex flex-col gap-2 rounded-2xl bg-lila-100/70 p-3">
              <label htmlFor="cashReceived" className="font-heading text-sm font-medium">
                Efectivo recibido (vacío = exacto)
              </label>
              <MoneyInput id="cashReceived" value={cashReceived} onValueChange={setCashReceived} className="h-12 bg-card text-lg" aria-invalid={cashShort} />
              <div className="flex flex-wrap gap-2">
                {QUICK_CASH.filter((v) => v >= total).slice(0, 3).map((v) => (
                  <Button key={v} type="button" variant="outline" className="h-10 rounded-full bg-card" onClick={() => setCashReceived(String(v))}>
                    {formatCOP(v)}
                  </Button>
                ))}
              </div>
              <p aria-live="polite" className={cn("font-heading text-lg tabular-nums", cashShort && "text-destructive")}>
                {cashShort ? `Faltan ${formatCOP(total - received)}` : `Cambio: ${formatCOP(cashReceived === "" ? 0 : received - total)}`}
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="button" disabled={!cart.length || cashShort || pending} onClick={checkout} className="press-3d h-14 rounded-2xl text-lg">
            {pending ? "Cobrando…" : `Cobrar ${formatCOP(total)}`}
          </Button>
        </div>
      </aside>

      {/* Barra móvil: fotos de lo que va en el pedido + total; lleva al pedido */}
      {cart.length > 0 && !cartInView && (
        <a
          href="#carrito"
          className="press-3d fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-20 flex h-16 items-center gap-3 rounded-2xl bg-primary px-3 font-heading text-primary-foreground md:inset-x-4 md:bottom-4 lg:hidden"
        >
          <span className="flex -space-x-3">
            {cart.slice(0, 3).map((l) => (
              <ProductImage
                key={l.key}
                src={l.product.imageUrl}
                name={l.product.name}
                color={colorOf.get(l.product.categoryId)}
                className="size-10 rounded-full ring-2 ring-white"
              />
            ))}
          </span>
          <span className="min-w-0 flex-1 truncate">Ver carrito · {units}</span>
          <span className="text-lg tabular-nums">{formatCOP(total)}</span>
        </a>
      )}

      <Modal open={!!configuring} onClose={() => setConfiguring(null)} title={configuring?.name ?? ""}>
        {configuring && (
          <Configurator
            key={configuring.id}
            product={configuring}
            color={colorOf.get(configuring.categoryId)}
            onAdd={(variant, addons, qty) => {
              add(configuring, variant, addons, qty);
              setConfiguring(null);
            }}
          />
        )}
      </Modal>

      <Modal open={!!ticket} onClose={() => setTicket(null)} title="Venta registrada">
        {ticket && (
          <div className="flex flex-col gap-5">
            <Ticket sale={ticket} />
            <ChangeMethod
              key={ticket.id}
              saleId={ticket.id}
              current={ticket.paymentMethod}
              total={ticket.total}
              onChanged={(c) => setTicket((t) => (t ? { ...t, ...c } : t))}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-12 flex-1 rounded-2xl" onClick={() => window.print()}>
                Imprimir
              </Button>
              <Button type="button" className="press-3d h-12 flex-1 rounded-2xl" onClick={() => setTicket(null)}>
                Nueva venta
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
