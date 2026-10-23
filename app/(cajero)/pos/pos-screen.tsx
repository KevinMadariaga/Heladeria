"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Bike, CupSoda, HandCoins, Minus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { MoneyInput } from "@/components/money-input";
import { ProductImage } from "@/components/product-image";
import { StockBadge } from "@/components/stock-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Option, unitPrice } from "@/lib/cash";
import { ACTIVE_PAYMENT_METHODS, formatCOP, PAYMENT_LABELS } from "@/lib/money";
import { type ClientProduct, stockStatus } from "@/lib/serialize";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/models/Sale";
import { submitConsumption, submitSale, type TicketSale } from "./actions";
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
        "lift sticker relative flex flex-col gap-1 bg-card p-1.5 text-left sm:gap-2 sm:p-2 focus-visible:ring-4 focus-visible:ring-ring disabled:opacity-50",
        inCart > 0 && "outline-4 outline-offset-0 outline-lila-400",
      )}
    >
      <div className="relative">
        <ProductImage src={product.imageUrl} name={product.name} color={color} className="aspect-[4/3]" />
        {/* Etiqueta de precio tipo sticker */}
        <span className="absolute right-1 bottom-1 max-w-[calc(100%-0.5rem)] truncate rounded-full border-2 border-white bg-card px-1.5 py-0.5 font-heading text-xs font-semibold text-primary shadow-md sm:right-1.5 sm:bottom-1.5 sm:px-2.5 sm:text-sm">
          {product.variants.length > 0 && <span className="font-normal text-muted-foreground">desde </span>}
          {formatCOP(price)}
        </span>
        <span className="absolute top-1.5 left-1.5">
          <StockBadge product={product} />
        </span>
      </div>
      <span className="line-clamp-2 min-h-[2.5em] px-0.5 pb-0.5 font-heading text-[13px] leading-tight font-semibold sm:px-1 sm:text-base">{product.name}</span>
      <AnimatePresence>
        {inCart > 0 && (
          <motion.span
            key={inCart}
            initial={{ transform: "scale(0.6)", opacity: 0 }}
            animate={{ transform: "scale(1)", opacity: 1 }}
            exit={{ transform: "scale(0.6)", opacity: 0 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.3 }}
            aria-label={`${inCart} en el pedido`}
            className="absolute -top-2 -right-2 grid size-7 place-items-center sm:size-8 rounded-full bg-primary font-heading text-sm text-primary-foreground ring-4 ring-white"
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
  const [transferAmount, setTransferAmount] = useState("");
  const [containerFeeInput, setContainerFeeInput] = useState("");
  const [hasContainer, setHasContainer] = useState(false);
  const [containerQty, setContainerQty] = useState(1);
  const [isDelivery, setIsDelivery] = useState(false);
  const [delivery, setDelivery] = useState({ customer: "", phone: "", address: "", notes: "", fee: "" });
  const setDel = (k: keyof typeof delivery) => (v: string) => setDelivery((d) => ({ ...d, [k]: v }));
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<TicketSale | null>(null);
  const [consuming, setConsuming] = useState(false); // confirmar "lo saco yo"
  const [consumeNote, setConsumeNote] = useState("");
  const [consumed, setConsumed] = useState(0); // total anotado (aviso)
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

  const itemsTotal = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const fee = isDelivery ? Number(delivery.fee || 0) : 0;
  const containerFee = hasContainer ? containerQty * Number(containerFeeInput || 0) : 0;
  const total = itemsTotal + fee + containerFee;
  const units = cart.reduce((s, l) => s + l.qty, 0);
  const transfer = Number(transferAmount || 0);
  // Parte que se paga en efectivo: todo (efectivo), el resto de la transferencia (mixto) o nada.
  const cashPart = method === "cash" ? total : method === "mixed" ? Math.max(total - transfer, 0) : 0;
  const received = Number(cashReceived || 0);
  const takesCash = method === "cash" || method === "mixed";
  const cashShort = takesCash && cashReceived !== "" && received < cashPart;
  const mixedInvalid = method === "mixed" && (transfer <= 0 || transfer >= total);
  const deliveryInvalid = isDelivery && (delivery.customer.trim().length < 2 || delivery.address.trim().length < 3);

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
    setConsumed(0);
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
        cashReceived: takesCash && cashReceived !== "" ? received : undefined,
        transferAmount: method === "mixed" ? transfer : undefined,
        containerFee: containerFee || undefined,
        containerQty: containerFee ? containerQty : undefined,
        delivery: isDelivery
          ? {
              customer: delivery.customer,
              phone: delivery.phone || undefined,
              address: delivery.address,
              notes: delivery.notes || undefined,
              fee,
            }
          : undefined,
      });
      if (res.error) return setError(res.error);
      setTicket(res.sale!);
      setCart([]);
      setCashReceived("");
      setTransferAmount("");
      setMethod("cash");
      setContainerFeeInput("");
      setHasContainer(false);
      setContainerQty(1);
      setIsDelivery(false);
      setDelivery({ customer: "", phone: "", address: "", notes: "", fee: "" });
    });
  }

  function consume() {
    setError("");
    startTransition(async () => {
      const res = await submitConsumption({
        items: cart.map((l) => ({ productId: l.product.id, variant: l.variant, addons: l.addons.map((a) => a.name), qty: l.qty })),
        note: consumeNote || undefined,
      });
      setConsuming(false);
      if (res.error) return setError(res.error);
      setConsumed(itemsTotal);
      setCart([]);
      setConsumeNote("");
    });
  }

  const inCart = new Map<string, number>();
  for (const l of cart) inCart.set(l.product.id, (inCart.get(l.product.id) ?? 0) + l.qty);

  return (
    <div className="grid gap-4 pb-20 sm:gap-6 lg:grid-cols-[1fr_440px] lg:pb-0 xl:grid-cols-[1fr_480px]">
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
        <div role="group" aria-label="Categorías" className="grid grid-cols-3 gap-2 pt-1 pb-1 sm:grid-cols-5">
          {[{ id: "all", name: "Todo", color: "var(--uva-700)" }, ...categories].map((c) => {
            const on = cat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                title={c.name}
                onClick={() => setCat(c.id)}
                className={cn(
                  "flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-full border-2 px-2 font-heading text-sm sm:h-11 transition-[background-color,color,transform] duration-150 active:scale-[0.97] sm:text-base",
                  on ? "border-white bg-primary text-primary-foreground shadow-[0_3px_0_var(--press-shadow)]" : "border-white bg-card text-foreground shadow-sm",
                )}
              >
                <span aria-hidden className="size-3 shrink-0 rounded-full ring-2 ring-white" style={{ background: c.color }} />
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
        {visible.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">No hay productos para mostrar.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 pt-1 sm:gap-3 xl:grid-cols-4">
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
        className="sticker order-first flex scroll-mt-4 flex-col self-start overflow-hidden bg-card lg:sticky lg:top-20 lg:order-none lg:max-h-[calc(100dvh-6rem)]"
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

        <div className="flex flex-col gap-4 p-4 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-3 text-center text-muted-foreground lg:py-8">
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

          {/* Celular: con el pedido vacío solo se ve el aviso, para que los productos queden cerca */}
          <div className={cn("contents", !cart.length && "max-lg:hidden")}>
            <div className="flex flex-col gap-3 border-t-2 border-dashed border-border pt-3">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-lila-100/70 px-3 py-2.5 has-focus-visible:ring-4 has-focus-visible:ring-ring">
                <span className="flex items-center gap-2 font-heading">
                  <Bike aria-hidden className="size-5 text-primary" /> Es domicilio
                </span>
                <input type="checkbox" checked={isDelivery} onChange={(e) => setIsDelivery(e.target.checked)} className="size-5 accent-primary" />
              </label>
              {isDelivery && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 flex flex-col gap-1">
                    <Label htmlFor="del-customer">Cliente *</Label>
                    <Input id="del-customer" value={delivery.customer} onChange={(e) => setDel("customer")(e.target.value)} autoComplete="off" className="h-11" />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <Label htmlFor="del-address">Dirección *</Label>
                    <Input id="del-address" value={delivery.address} onChange={(e) => setDel("address")(e.target.value)} autoComplete="off" className="h-11" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="del-phone">Teléfono</Label>
                    <Input id="del-phone" type="tel" inputMode="tel" value={delivery.phone} onChange={(e) => setDel("phone")(e.target.value)} className="h-11" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="del-fee">Valor domicilio</Label>
                    <MoneyInput id="del-fee" value={delivery.fee} onValueChange={setDel("fee")} className="h-11" />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <Label htmlFor="del-notes">Notas</Label>
                    <Input id="del-notes" value={delivery.notes} onChange={(e) => setDel("notes")(e.target.value)} placeholder="Ej: torre 2, apto 301" className="h-11" />
                  </div>
                </div>
              )}
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-lila-100/70 px-3 py-2.5 has-focus-visible:ring-4 has-focus-visible:ring-ring">
                <span className="flex items-center gap-2 font-heading">
                  <CupSoda aria-hidden className="size-5 text-primary" /> Lleva porta / envase
                </span>
                <input type="checkbox" checked={hasContainer} onChange={(e) => setHasContainer(e.target.checked)} className="size-5 accent-primary" />
              </label>
              {hasContainer && (
                <div className="grid grid-cols-[6rem_1fr] gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="container-qty">Cantidad</Label>
                    <Input
                      id="container-qty"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={99}
                      value={containerQty}
                      onChange={(e) => setContainerQty(Math.min(99, Math.max(1, Math.trunc(Number(e.target.value)) || 1)))}
                      className="h-11"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="container-fee">Valor de cada porta</Label>
                    <MoneyInput id="container-fee" value={containerFeeInput} onValueChange={setContainerFeeInput} className="h-11" />
                  </div>
                </div>
              )}
            </div>

            {(fee > 0 || containerFee > 0) && (
              <dl className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Productos</dt>
                  <dd className="tabular-nums">{formatCOP(itemsTotal)}</dd>
                </div>
                {containerFee > 0 && (
                  <div className="flex justify-between">
                    <dt>Porta / envase{containerQty > 1 && ` x${containerQty}`}</dt>
                    <dd className="tabular-nums">{formatCOP(containerFee)}</dd>
                  </div>
                )}
                {fee > 0 && (
                  <div className="flex justify-between">
                    <dt>Domicilio</dt>
                    <dd className="tabular-nums">{formatCOP(fee)}</dd>
                  </div>
                )}
              </dl>
            )}
            <div className="flex items-baseline justify-between">
              <span className="font-heading text-lg">Total</span>
              <span className="font-heading text-3xl font-semibold text-primary tabular-nums">{formatCOP(total)}</span>
            </div>

            <div role="radiogroup" aria-label="Método de pago" className="grid grid-cols-3 gap-2">
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

            {takesCash && (
              <div className="flex flex-col gap-2 rounded-2xl bg-lila-100/70 p-3">
                {method === "mixed" && (
                  <>
                    <label htmlFor="transferAmount" className="font-heading text-sm font-medium">
                      Valor por transferencia
                    </label>
                    <MoneyInput id="transferAmount" value={transferAmount} onValueChange={setTransferAmount} className="h-12 bg-card text-lg" aria-invalid={mixedInvalid} />
                    <p className="font-heading tabular-nums">
                      {mixedInvalid ? (
                        <span className="text-destructive">Debe ser mayor a $ 0 y menor a {formatCOP(total)}</span>
                      ) : (
                        <>
                          En efectivo: <strong>{formatCOP(cashPart)}</strong>
                        </>
                      )}
                    </p>
                  </>
                )}
                <label htmlFor="cashReceived" className="font-heading text-sm font-medium">
                  Efectivo recibido (vacío = exacto)
                </label>
                <MoneyInput id="cashReceived" value={cashReceived} onValueChange={setCashReceived} className="h-12 bg-card text-lg" aria-invalid={cashShort} />
                <div className="flex flex-wrap gap-2">
                  {QUICK_CASH.filter((v) => v >= cashPart).slice(0, 3).map((v) => (
                    <Button key={v} type="button" variant="outline" className="h-10 rounded-full bg-card" onClick={() => setCashReceived(String(v))}>
                      {formatCOP(v)}
                    </Button>
                  ))}
                </div>
                <p aria-live="polite" className={cn("font-heading text-lg tabular-nums", cashShort && "text-destructive")}>
                  {cashShort ? `Faltan ${formatCOP(cashPart - received)}` : `Cambio: ${formatCOP(cashReceived === "" ? 0 : received - cashPart)}`}
                </p>
              </div>
            )}

            {deliveryInvalid && cart.length > 0 && <p className="text-sm text-destructive">Completa el cliente y la dirección del domicilio.</p>}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {/* En escritorio el cobro queda siempre a la vista aunque el pedido sea largo */}
            <div className="flex flex-col gap-4 bg-card lg:sticky lg:-bottom-4 lg:-mx-4 lg:-mb-4 lg:px-4 lg:pt-2 lg:pb-4">
              <Button type="button" disabled={!cart.length || cashShort || mixedInvalid || deliveryInvalid || pending} onClick={checkout} className="press-3d h-14 rounded-2xl text-lg">
                {pending ? "Cobrando…" : `Cobrar ${formatCOP(total)}`}
              </Button>
              <Button type="button" variant="outline" disabled={!cart.length || pending} onClick={() => setConsuming(true)} className="h-12 rounded-2xl">
                <HandCoins aria-hidden /> Lo saco yo (anotar a mi cuenta)
              </Button>
            </div>
          </div>
          {consumed > 0 && (
            <p role="status" className="text-sm text-muted-foreground">
              Consumo anotado a tu cuenta: {formatCOP(consumed)}. Lo ves en Caja.
            </p>
          )}
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

      <Modal open={consuming} onClose={() => setConsuming(false)} title="Anotar a mi cuenta">
        <div className="flex flex-col gap-4">
          <p>
            Vas a sacar {units} producto(s) por <strong>{formatCOP(itemsTotal)}</strong>. No entra dinero a la caja: queda anotado como lo que debes y el
            administrador lo ve al final del mes.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="consume-note">Nota (opcional)</Label>
            <Input id="consume-note" value={consumeNote} onChange={(e) => setConsumeNote(e.target.value)} placeholder="Ej: almuerzo" className="h-11" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setConsuming(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={pending} className="h-11 rounded-xl" onClick={consume}>
              {pending ? "Anotando…" : "Sí, anotar"}
            </Button>
          </div>
        </div>
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
