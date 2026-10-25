"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Bike, Cake, CupSoda, HandCoins, Minus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
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
type Line = { key: string; product: ClientProduct; variant?: string; addons: Option[]; unitPrice: number; qty: number; discount: number }; // discount: cumpleaños, en pesos

const METHODS = ACTIVE_PAYMENT_METHODS;
const QUICK_CASH = [10000, 20000, 50000, 100000];
const TOGGLE =
  "flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border-2 border-border bg-card px-2.5 font-heading text-[13px] whitespace-nowrap sm:gap-2 sm:px-3 sm:text-sm transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] has-checked:border-primary has-checked:bg-lila-100 has-focus-visible:ring-4 has-focus-visible:ring-ring";

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
      <span className="line-clamp-2 min-h-[2.5em] px-0.5 pb-0.5 font-heading text-[13px] leading-tight font-semibold sm:px-1 sm:text-base lg:text-sm">{product.name}</span>
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
  const [bdayKey, setBdayKey] = useState<string | null>(null); // línea con el descuento de cumpleaños abierto
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

  const itemsTotal = cart.reduce((s, l) => s + l.unitPrice * l.qty - l.discount, 0);
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
        : [...c, { key, product, variant, addons: priced.addons, unitPrice: priced.unitPrice, qty, discount: 0 }];
    });
    setError("");
    setConsumed(0);
  }

  function pick(p: ClientProduct) {
    if (p.variants.length || p.addons.length) setConfiguring(p);
    else add(p, undefined, [], 1);
  }

  const setQty = (key: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.key !== key) : c.map((l) => (l.key === key ? { ...l, qty, discount: Math.min(l.discount, l.unitPrice * qty) } : l))));
  // Descuento de cumpleaños de una línea: entre 0 y lo que vale la línea.
  const setDiscount = (key: string, value: number) =>
    setCart((c) => c.map((l) => (l.key === key ? { ...l, discount: Math.max(0, Math.min(value, l.unitPrice * l.qty)) } : l)));

  // Marcar domicilio / porta muestra sus campos debajo y lleva el cursor al primero.
  function toggleOption(kind: "delivery" | "container", on: boolean) {
    (kind === "delivery" ? setIsDelivery : setHasContainer)(on);
    if (on) requestAnimationFrame(() => document.getElementById(kind === "delivery" ? "del-customer" : "container-fee")?.focus());
  }

  function checkout() {
    setError("");
    startTransition(async () => {
      const res = await submitSale({
        items: cart.map((l) => ({
          productId: l.product.id,
          variant: l.variant,
          addons: l.addons.map((a) => a.name),
          qty: l.qty,
          birthdayDiscount: l.discount || undefined,
        })),
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
      resetOrder();
    });
  }

  // Deja el pedido en blanco (productos, pago, domicilio y porta) para el siguiente cliente.
  function resetOrder() {
    setCart([]);
    setBdayKey(null);
    setCashReceived("");
    setTransferAmount("");
    setMethod("cash");
    setContainerFeeInput("");
    setHasContainer(false);
    setContainerQty(1);
    setIsDelivery(false);
    setDelivery({ customer: "", phone: "", address: "", notes: "", fee: "" });
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
      resetOrder();
      setConsumeNote("");
    });
  }

  const inCart = new Map<string, number>();
  for (const l of cart) inCart.set(l.product.id, (inCart.get(l.product.id) ?? 0) + l.qty);

  return (
    <div className="grid gap-4 pb-20 sm:gap-6 lg:grid-cols-[11fr_9fr] lg:pb-0 xl:grid-cols-[9fr_11fr]">
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
          <div className="grid grid-cols-3 gap-2 pt-1 sm:gap-3">
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
        className="sticker order-first flex scroll-mt-4 flex-col self-start overflow-hidden bg-card lg:sticky lg:top-22 lg:order-none lg:h-[calc(100dvh-6rem)]"
      >
        <div className="flex min-h-15 items-center gap-2 bg-lila-100 px-4 py-3">
          <ShoppingBag aria-hidden className="text-primary" />
          <h2 className="text-xl font-semibold">Pedido</h2>
          {units > 0 && <span className="rounded-full bg-primary px-2 py-0.5 font-heading text-sm text-primary-foreground">{units}</span>}
          {cart.length > 0 && (
            <Button type="button" variant="ghost" className="ml-auto h-9 rounded-xl text-muted-foreground" onClick={resetOrder}>
              <Trash2 /> Vaciar
            </Button>
          )}
        </div>

        {/* xl: dos columnas dentro del pedido — productos a la izquierda, cobro a la derecha — para que todo quepa sin scroll */}
        <div className="flex flex-col gap-4 p-4 lg:min-h-0 lg:flex-1 xl:grid xl:grid-cols-2 xl:grid-rows-[minmax(0,1fr)_auto] xl:gap-x-4 xl:gap-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-3 text-center text-muted-foreground lg:min-h-[8rem] lg:flex-1 lg:justify-center">
              <span aria-hidden className="text-4xl">🍦</span>
              <p>Toca un producto para agregarlo al pedido.</p>
            </div>
          ) : (
            <ul className="-mx-1 flex max-h-[42dvh] flex-col gap-2 lg:max-h-none lg:min-h-[8rem] lg:flex-1 xl:min-h-0 overflow-y-auto overscroll-contain px-1">
              <AnimatePresence initial={false}>
                {cart.map((l) => (
                  <motion.li
                    key={l.key}
                    layout
                    initial={{ opacity: 0, transform: "translateX(12px)" }}
                    animate={{ opacity: 1, transform: "translateX(0px)" }}
                    exit={{ opacity: 0, transform: "translateX(-12px)" }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="flex flex-col gap-2 rounded-2xl bg-lila-100/70 p-2 lg:p-1.5"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <ProductImage src={l.product.imageUrl} name={l.product.name} color={colorOf.get(l.product.categoryId)} className="size-12 shrink-0 rounded-xl sm:size-14 lg:size-12" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-heading leading-tight font-semibold">{l.product.name}</p>
                        {(l.variant || l.addons.length > 0) && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {[l.variant, ...l.addons.map((a) => `+ ${a.name}`)].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        <p className="flex flex-wrap items-baseline gap-x-1.5 font-heading text-sm font-semibold text-primary tabular-nums">
                          {l.discount > 0 && <span className="text-xs font-normal text-muted-foreground line-through">{formatCOP(l.unitPrice * l.qty)}</span>}
                          {formatCOP(l.unitPrice * l.qty - l.discount)}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Descuento de cumpleaños en ${l.product.name}`}
                        aria-expanded={bdayKey === l.key}
                        onClick={() => setBdayKey((k) => (k === l.key ? null : l.key))}
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors sm:size-10 duration-150 active:scale-[0.97]",
                          l.discount > 0 || bdayKey === l.key ? "border-caramelo-400 bg-caramelo-400 text-uva-900" : "border-white bg-card text-primary shadow-sm",
                        )}
                      >
                        <Cake className="size-4" />
                      </button>
                      <div className="flex shrink-0 items-center rounded-full border-2 border-white bg-card shadow-sm">
                        <button
                          type="button"
                          aria-label={`Quitar uno de ${l.product.name}`}
                          onClick={() => setQty(l.key, l.qty - 1)}
                          className="grid size-9 place-items-center rounded-full text-primary active:bg-muted sm:size-10"
                        >
                          {l.qty === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                        </button>
                        <span className="w-6 text-center font-heading tabular-nums">{l.qty}</span>
                        <button
                          type="button"
                          aria-label={`Agregar uno de ${l.product.name}`}
                          onClick={() => setQty(l.key, l.qty + 1)}
                          className="grid size-9 place-items-center rounded-full text-primary active:bg-muted sm:size-10"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                    {bdayKey === l.key && (
                      <div role="group" aria-label={`Cumpleaños: ${l.product.name}`} className="flex flex-wrap items-center gap-1.5 rounded-xl bg-card p-2">
                        <span className="font-heading text-xs font-medium">🎂 Descuento cumpleaños:</span>
                        <Button type="button" variant="outline" className="h-8 rounded-full px-2.5 text-xs" onClick={() => setDiscount(l.key, l.unitPrice)}>
                          1 gratis
                        </Button>
                        <Button type="button" variant="outline" className="h-8 rounded-full px-2.5 text-xs" onClick={() => setDiscount(l.key, Math.round(l.unitPrice / 2))}>
                          50% de 1
                        </Button>
                        <div className="w-28">
                          <MoneyInput
                            aria-label={`Valor del descuento de ${l.product.name}`}
                            placeholder="Otro valor"
                            value={l.discount ? String(l.discount) : ""}
                            onValueChange={(d) => setDiscount(l.key, Number(d || 0))}
                            className="h-8 text-sm"
                          />
                        </div>
                        {l.discount > 0 && (
                          <Button type="button" variant="ghost" className="h-8 rounded-full px-2.5 text-xs" onClick={() => setDiscount(l.key, 0)}>
                            Quitar
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {/* Celular: con el pedido vacío solo se ve el aviso, para que los productos queden cerca */}
          <div className={cn("contents", !cart.length && "max-lg:hidden")}>
            {/* Escritorio: opciones y pago toman su alto; la lista de arriba usa lo que sobra */}
            <div className="flex flex-col gap-3 lg:-mx-1 lg:min-h-[9.5rem] xl:gap-2 lg:overflow-y-auto xl:min-h-0 lg:overscroll-contain lg:px-1">
              <div className="flex flex-col gap-2 border-t-2 border-dashed border-border pt-3 xl:border-t-0 xl:pt-0">
                <div role="radiogroup" aria-label="Método de pago" className="order-3 grid grid-cols-3 gap-2 sm:order-none xl:order-3">
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
                          "flex h-10 items-center justify-center gap-1 rounded-xl border-2 px-1 font-heading text-xs sm:gap-1.5 transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] sm:text-sm xl:gap-1 xl:text-xs 2xl:text-sm",
                          on ? "border-primary bg-primary text-primary-foreground shadow-[0_3px_0_var(--press-shadow)]" : "border-border bg-card text-foreground",
                        )}
                      >
                        <Icon aria-hidden className="size-4 shrink-0" />
                        {PAYMENT_LABELS[m]}
                      </button>
                    );
                  })}
                </div>
                <div className="contents sm:flex sm:flex-row sm:gap-2 xl:contents">
                  {takesCash && (
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl bg-lila-100/70 p-2.5 order-4 sm:order-none xl:order-4">
                      {method === "mixed" && (
                        // Mismo formato que el efectivo: casilla angosta y lo que falta en efectivo al lado
                        <div className="grid grid-cols-[minmax(6rem,9rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 border-b border-dashed border-border pb-2">
                          <label htmlFor="transferAmount" className="col-span-2 font-heading text-xs font-medium">
                            Valor por transferencia
                          </label>
                          <MoneyInput id="transferAmount" value={transferAmount} onValueChange={setTransferAmount} className="h-10 bg-card text-base" aria-invalid={mixedInvalid} />
                          <p className="font-heading text-sm tabular-nums">
                            {mixedInvalid ? (
                              <span className="text-destructive">Mayor a $ 0 y menor a {formatCOP(total)}</span>
                            ) : (
                              <>
                                En efectivo: <strong className="text-base">{formatCOP(cashPart)}</strong>
                              </>
                            )}
                          </p>
                        </div>
                      )}
                      {/* Casilla angosta y el cambio en grande justo al lado */}
                      <div className="grid grid-cols-[minmax(6rem,9rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
                        <label htmlFor="cashReceived" className="col-span-2 font-heading text-xs font-medium">
                          Efectivo recibido (vacío = exacto)
                        </label>
                        <MoneyInput id="cashReceived" value={cashReceived} onValueChange={setCashReceived} className="h-10 bg-card text-base" aria-invalid={cashShort} />
                        <p aria-live="polite" className={cn("flex flex-wrap items-baseline gap-x-1.5 font-heading tabular-nums", cashShort ? "text-destructive" : "text-primary")}>
                          <span className="text-sm font-medium text-muted-foreground">{cashShort ? "Faltan:" : "Cambio:"}</span>{" "}
                          <span className="text-2xl leading-none font-semibold sm:text-3xl lg:text-2xl 2xl:text-3xl">
                            {formatCOP(cashShort ? cashPart - received : cashReceived === "" ? 0 : received - cashPart)}
                          </span>
                        </p>
                        <div className="col-span-2 flex flex-wrap gap-1.5">
                          {QUICK_CASH.filter((v) => v >= cashPart).slice(0, 3).map((v) => (
                            <Button key={v} type="button" variant="outline" className="h-8 rounded-full bg-card px-2.5 text-xs" onClick={() => setCashReceived(String(v))}>
                              {formatCOP(v)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Domicilio y porta al lado del efectivo (debajo en celular) */}
                  <div className={cn("order-1 grid grid-cols-2 gap-2 sm:order-none xl:order-1", takesCash && "sm:flex sm:w-40 sm:shrink-0 sm:flex-col xl:grid xl:w-auto")}>
                    <label className={cn(TOGGLE, takesCash && "sm:h-auto sm:flex-1 xl:h-10")}>
                      <Bike aria-hidden className="size-4 shrink-0 text-primary" />
                      <span className="flex-1">Es domicilio</span>
                      <input type="checkbox" checked={isDelivery} onChange={(e) => toggleOption("delivery", e.target.checked)} className="size-4 shrink-0 accent-primary" />
                    </label>
                    <label className={cn(TOGGLE, takesCash && "sm:h-auto sm:flex-1 xl:h-10")}>
                      <CupSoda aria-hidden className="size-4 shrink-0 text-primary" />
                      <span className="flex-1">Lleva porta</span>
                      <input type="checkbox" checked={hasContainer} onChange={(e) => toggleOption("container", e.target.checked)} className="size-4 shrink-0 accent-primary" />
                    </label>
                  </div>
                </div>
                {isDelivery && (
                  <fieldset id="delivery-fields" className="order-2 grid grid-cols-2 gap-2 sm:order-none xl:order-2 rounded-2xl bg-lila-100/70 p-2.5 sm:grid-cols-3 xl:grid-cols-2">
                    <legend className="sr-only">Datos del domicilio</legend>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="del-customer" className="text-xs">Cliente *</Label>
                      <Input id="del-customer" value={delivery.customer} onChange={(e) => setDel("customer")(e.target.value)} autoComplete="off" className="h-9 bg-card" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="del-phone" className="text-xs">Teléfono</Label>
                      <Input id="del-phone" type="tel" inputMode="tel" value={delivery.phone} onChange={(e) => setDel("phone")(e.target.value)} className="h-9 bg-card" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="del-fee" className="text-xs">Valor domicilio</Label>
                      <MoneyInput id="del-fee" value={delivery.fee} onValueChange={setDel("fee")} className="h-9 bg-card" />
                    </div>
                    <div className="flex flex-col gap-1 sm:order-last xl:order-none">
                      <Label htmlFor="del-notes" className="text-xs">Notas</Label>
                      <Input id="del-notes" value={delivery.notes} onChange={(e) => setDel("notes")(e.target.value)} placeholder="Torre 2, apto 301" className="h-9 bg-card" />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1">
                      <Label htmlFor="del-address" className="text-xs">Dirección *</Label>
                      <Input id="del-address" value={delivery.address} onChange={(e) => setDel("address")(e.target.value)} autoComplete="off" className="h-9 bg-card" />
                    </div>
                  </fieldset>
                )}
                {hasContainer && (
                  <fieldset id="container-fields" className="order-2 grid grid-cols-[auto_1fr_auto] sm:order-none xl:order-2 items-end gap-2 rounded-2xl bg-lila-100/70 p-2.5">
                    <legend className="sr-only">Porta / envase</legend>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="container-qty" className="text-xs">Cantidad</Label>
                      <div className="flex h-9 items-center rounded-full border-2 border-white bg-card shadow-sm">
                        <button
                          type="button"
                          aria-label="Un porta menos"
                          onClick={() => setContainerQty((q) => Math.max(1, q - 1))}
                          className="grid size-8 place-items-center rounded-full text-primary active:bg-muted"
                        >
                          <Minus className="size-4" />
                        </button>
                        <input
                          id="container-qty"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={99}
                          value={containerQty}
                          onChange={(e) => setContainerQty(Math.min(99, Math.max(1, Math.trunc(Number(e.target.value)) || 1)))}
                          className="w-7 [appearance:textfield] bg-transparent text-center font-heading tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          aria-label="Un porta más"
                          onClick={() => setContainerQty((q) => Math.min(99, q + 1))}
                          className="grid size-8 place-items-center rounded-full text-primary active:bg-muted"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="container-fee" className="text-xs">Valor de cada porta</Label>
                      <MoneyInput id="container-fee" value={containerFeeInput} onValueChange={setContainerFeeInput} className="h-9 bg-card" />
                    </div>
                    <p className="pb-2 font-heading text-sm tabular-nums">= {formatCOP(containerFee)}</p>
                  </fieldset>
                )}
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            {/* Total y cobro siempre a la vista */}
            <div className="flex shrink-0 flex-col gap-2 lg:border-t-2 lg:border-dashed lg:border-border lg:pt-2.5 xl:col-span-2 xl:grid xl:grid-cols-2 xl:items-end xl:gap-x-4">
              {(fee > 0 || containerFee > 0) && (
                <dl className="flex flex-col text-xs text-muted-foreground xl:col-start-1 xl:row-start-1">
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
              {/* En escritorio el total ya va en el botón Cobrar */}
              <div className="flex items-baseline justify-between lg:hidden">
                <span className="font-heading text-lg">Total</span>
                <span className="font-heading text-3xl font-semibold text-primary tabular-nums">{formatCOP(total)}</span>
              </div>
              {deliveryInvalid && <p className="text-xs text-destructive xl:col-start-2">Completa el cliente y la dirección del domicilio.</p>}
              <div className="flex gap-2 xl:col-start-2 xl:row-start-1">
                <Button type="button" disabled={!cart.length || cashShort || mixedInvalid || deliveryInvalid || pending} onClick={checkout} className="press-3d h-12 flex-1 rounded-2xl text-base">
                  {pending ? "Cobrando…" : `Cobrar ${formatCOP(total)}`}
                </Button>
                <Button type="button" variant="outline" disabled={!cart.length || pending} onClick={() => setConsuming(true)} className="h-12 rounded-2xl px-3 text-xs" title="Lo saco yo (anotar a mi cuenta)">
                  <HandCoins aria-hidden /> Lo saco yo
                </Button>
              </div>
            </div>
          </div>
          {consumed > 0 && (
            <p role="status" className="text-sm text-muted-foreground xl:col-span-2">
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
