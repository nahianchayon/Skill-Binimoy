import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Home,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Smartphone,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { limit, where } from "firebase/firestore";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { useAuth } from "@/lib/auth";
import { createRecord, watchRecords } from "@/lib/firestore";

type Product = {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  imageUrl?: string;
  active?: boolean;
};

type CartItem = Product & { quantity: number };

type OrderItem = {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
};

type CustomerOrder = {
  id: string;
  userId?: string;
  userName?: string;
  items?: OrderItem[];
  total?: number;
  paymentMethod?: string;
  status?: "PLACED" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | string;
  createdAt?: string;
  shippingAddress?: string;
  phone?: string;
};

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Shop & Track Orders · Skill Binimoy" }] }),
  component: ShopPage,
});

function ShopPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"catalog" | "orders">("catalog");
  const [products, setProducts] = useState<Product[]>([]);
  const [myOrders, setMyOrders] = useState<CustomerOrder[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notice, setNotice] = useState("");
  const [orderSearch, setOrderSearch] = useState("");

  // Checkout modal
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "BKASH" | "NAGAD" | "CARD">("BKASH");
  const [paymentPhone, setPaymentPhone] = useState("01712345678");
  const [deliveryAddress, setDeliveryAddress] = useState("Dhaka, Bangladesh");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  useEffect(() => watchRecords<Product>("products", [limit(50)], setProducts), []);

  useEffect(() => {
    if (!user) {
      setMyOrders([]);
      return;
    }
    return watchRecords<CustomerOrder>(
      "orders",
      [where("userId", "==", user.uid), limit(50)],
      (orders) => {
        const sorted = [...orders].sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
        );
        setMyOrders(sorted);
      },
      (error) => console.warn("Orders watch error:", error),
    );
  }, [user]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0),
    [cart],
  );

  function add(product: Product) {
    if (!product.stock || product.stock < 1) {
      setNotice("This product is out of stock.");
      return;
    }
    setCart((items) => {
      const current = items.find((item) => item.id === product.id);
      return current
        ? items.map((item) =>
            item.id === product.id
              ? { ...item, quantity: Math.min(item.quantity + 1, product.stock || 1) }
              : item,
          )
        : [...items, { ...product, quantity: 1 }];
    });
    setNotice(`${product.name || "Product"} added to your cart.`);
  }

  async function handleCheckoutSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || cart.length === 0) return;
    setSubmittingOrder(true);
    try {
      if (paymentMethod !== "COD") {
        await new Promise((r) => setTimeout(r, 800)); // realistic simulated payment processing
      }
      const newOrder = {
        userId: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Customer",
        items: cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
        total,
        paymentMethod,
        shippingAddress: deliveryAddress.trim() || "Dhaka, Bangladesh",
        phone: paymentPhone.trim() || "01712345678",
        status: paymentMethod === "COD" ? "PLACED" : "PAID",
        createdAt: new Date().toISOString(),
      };
      await createRecord("orders", newOrder);
      setCart([]);
      setCheckoutOpen(false);
      setActiveTab("orders"); // Switch straight to order tracker!
      setNotice(
        paymentMethod === "COD"
          ? "Order placed successfully! You can track live delivery status below."
          : `Payment successful! Order placed and verified via ${paymentMethod}. Track status below.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not place order.");
    } finally {
      setSubmittingOrder(false);
    }
  }

  const filteredOrders = myOrders.filter((ord) => {
    if (!orderSearch.trim()) return true;
    const term = orderSearch.toLowerCase();
    return (
      ord.id.toLowerCase().includes(term) ||
      (ord.items || []).some((it) => it.name?.toLowerCase().includes(term)) ||
      (ord.status || "").toLowerCase().includes(term)
    );
  });

  return (
    <WorkspaceShell title="Skill Binimoy Store" eyebrow="Community goods & order tracking">
      <div className="space-y-8">
        {/* Hero Header */}
        <section className="shop-hero">
          <div>
            <p className="eyebrow text-primary">Community goods</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              Carry the spirit of learning with you.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Small-batch essentials for people who learn boldly, teach generously, and make things
              together. Track every order from packing to doorstep delivery.
            </p>
          </div>
          <ShoppingBag className="hidden size-20 text-primary/20 sm:block" />
        </section>

        {/* Tab Navigation: Catalog vs Track My Orders */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition ${
                activeTab === "catalog"
                  ? "bg-primary text-white shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="size-4" />
              <span>Store Catalog</span>
              <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-black">
                {products.filter((p) => p.active !== false).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition ${
                activeTab === "orders"
                  ? "bg-primary text-white shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Truck className="size-4" />
              <span>Track My Orders</span>
              {myOrders.length > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    activeTab === "orders"
                      ? "bg-white text-primary"
                      : "bg-primary text-white"
                  }`}
                >
                  {myOrders.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "orders" && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by Order ID or item..."
                className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}
        </div>

        {notice && (
          <div className="flex items-center justify-between rounded-xl bg-primary-soft p-4 text-xs font-bold text-primary">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} className="text-primary hover:opacity-75">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* TAB 1: STORE CATALOG */}
        {activeTab === "catalog" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="grid gap-5 sm:grid-cols-2">
              {products.length === 0 ? (
                <div className="sm:col-span-2 rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                  <Package className="mx-auto size-10 text-primary" />
                  <h3 className="mt-3 font-black text-lg text-slate-950 dark:text-white">
                    The store is currently preparing stock
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Check back soon or ask an administrator to list community goods.
                  </p>
                </div>
              ) : (
                products
                  .filter((product) => product.active !== false)
                  .map((product) => (
                    <article
                      className="product-card flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card shadow-card hover:border-primary/40 transition"
                      key={product.id}
                    >
                      <div className="product-art relative h-48 w-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name || "Product"}
                            className="size-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        ) : (
                          <Package className="size-14 text-primary/40" />
                        )}
                        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                          {product.category || "Apparel"}
                        </span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-black text-slate-950 dark:text-white leading-snug">
                              {product.name}
                            </h3>
                            <strong className="text-base font-black text-primary shrink-0">
                              ৳{product.price || 0}
                            </strong>
                          </div>

                          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">
                            {product.description || "A Skill Binimoy community product."}
                          </p>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {product.stock && product.stock > 0
                              ? `${product.stock} in stock`
                              : "Out of stock"}
                          </span>
                          <button
                            onClick={() => add(product)}
                            disabled={!product.stock || product.stock < 1}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-95 disabled:opacity-50"
                          >
                            <Plus className="size-3.5" /> Add to cart
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
              )}
            </div>

            {/* Cart Panel */}
            <aside className="cart-panel h-fit rounded-3xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="size-5 text-primary" />
                  <h2 className="text-base font-black text-slate-950 dark:text-white">Your Shopping Cart</h2>
                </div>
                <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-black text-primary">
                  {cart.reduce((s, it) => s + it.quantity, 0)} items
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <Package className="mx-auto size-8 text-muted-foreground/50 mb-2" />
                  Your cart is empty. Add something above!
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {cart.map((item) => (
                    <div
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3"
                      key={item.id}
                    >
                      <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <Package className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1 text-xs">
                        <strong className="block truncate font-bold text-slate-950 dark:text-white">
                          {item.name}
                        </strong>
                        <span className="text-muted-foreground">
                          {item.quantity} × ৳{item.price} = ৳{item.quantity * Number(item.price || 0)}
                        </span>
                      </span>
                      <button
                        aria-label={`Remove ${item.name}`}
                        onClick={() =>
                          setCart((items) => items.filter((entry) => entry.id !== item.id))
                        }
                        className="rounded-lg p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}

                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between text-base font-black text-slate-950 dark:text-white">
                      <span>Total</span>
                      <span className="text-primary">৳{total}</span>
                    </div>

                    <button
                      onClick={() => setCheckoutOpen(true)}
                      className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-95"
                    >
                      <Check className="size-4" /> Proceed to Checkout
                    </button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* TAB 2: TRACK MY ORDERS (CUSTOMER ORDER STATUS TRACKER) */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {filteredOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                <Truck className="mx-auto size-12 text-primary/40 mb-3" />
                <h3 className="text-lg font-black text-slate-950 dark:text-white">No orders found</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {orderSearch
                    ? "No orders match your search keyword."
                    : "You haven't placed any store orders yet. Browse our catalog and place an order!"}
                </p>
                {!orderSearch && (
                  <button
                    onClick={() => setActiveTab("catalog")}
                    className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-hover"
                  >
                    <ShoppingBag className="size-4" /> Browse Catalog
                  </button>
                )}
              </div>
            ) : (
              filteredOrders.map((order) => {
                const status = (order.status || "PLACED").toUpperCase();
                const isCancelled = status === "CANCELLED";

                // Step progress mapping: 0 = Placed, 1 = Processing, 2 = Shipped, 3 = Delivered
                let activeStep = 0;
                if (status === "PAID" || status === "PROCESSING") activeStep = 1;
                else if (status === "SHIPPED") activeStep = 2;
                else if (status === "DELIVERED") activeStep = 3;

                const steps = [
                  { label: "Order Placed", desc: "Received & logged in system", icon: CheckCircle2 },
                  { label: "Processing", desc: "Packed at fulfillment hub", icon: Package },
                  { label: "In Transit", desc: "Dispatched with courier partner", icon: Truck },
                  { label: "Delivered", desc: "Handed to customer", icon: Home },
                ];

                return (
                  <article
                    key={order.id}
                    className="rounded-3xl border border-border bg-card p-6 shadow-card hover:border-primary/40 transition"
                  >
                    {/* Order Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-primary">
                            #{order.id.slice(-8).toUpperCase()}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                              isCancelled
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : status === "DELIVERED"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-primary/10 text-primary"
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="size-3.5" /> Placed on{" "}
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleString("en-US", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "Recent"}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-xs text-muted-foreground">Total Amount</span>
                        <p className="text-lg font-black text-slate-950 dark:text-white">৳{order.total || 0}</p>
                        <span className="text-[11px] font-bold text-muted-foreground">
                          Paid via {order.paymentMethod || "bKash"}
                        </span>
                      </div>
                    </div>

                    {/* Visual 4-Step Progress Tracker */}
                    {!isCancelled ? (
                      <div className="mt-6 py-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
                          {steps.map((step, idx) => {
                            const isDone = activeStep >= idx;
                            const isCurrent = activeStep === idx;
                            const StepIcon = step.icon;

                            return (
                              <div
                                key={step.label}
                                className={`flex flex-col items-start p-3 rounded-2xl border transition ${
                                  isCurrent
                                    ? "border-primary bg-primary/5 shadow-xs"
                                    : isDone
                                      ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                                      : "border-border/60 bg-slate-50/50 dark:bg-slate-900/30 opacity-60"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span
                                    className={`grid size-7 place-items-center rounded-xl text-xs font-bold ${
                                      isDone
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                    }`}
                                  >
                                    <StepIcon className="size-3.5" />
                                  </span>
                                  <span
                                    className={`text-xs font-bold ${
                                      isCurrent
                                        ? "text-primary"
                                        : isDone
                                          ? "text-emerald-700 dark:text-emerald-300"
                                          : "text-muted-foreground"
                                    }`}
                                  >
                                    {step.label}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-tight">
                                  {step.desc}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Status Message Banner */}
                        <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 text-xs flex items-center justify-between gap-3 border border-border">
                          <span className="text-slate-700 dark:text-slate-300">
                            🚚{" "}
                            <strong>
                              {status === "DELIVERED"
                                ? "This order has been delivered. Thank you for supporting the collective!"
                                : status === "SHIPPED"
                                  ? "Package is in transit with courier. Expected delivery within 24-48 hours."
                                  : status === "PROCESSING" || status === "PAID"
                                    ? "Order confirmed and being packed at fulfillment hub."
                                    : "Order received. Pending packing confirmation."}
                            </strong>
                          </span>
                          {order.shippingAddress && (
                            <span className="text-muted-foreground text-[11px] truncate shrink-0">
                              Destination: <strong>{order.shippingAddress}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 p-4 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                        <AlertCircle className="size-5 shrink-0" />
                        <span>This order was cancelled by the store administrator. Any electronic payment has been queued for reversal.</span>
                      </div>
                    )}

                    {/* Ordered Items Summary */}
                    <div className="mt-5 border-t border-border/70 pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Items in this shipment ({(order.items || []).length}):
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(order.items || []).map((it, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-slate-950 dark:text-white"
                          >
                            <Package className="size-3.5 text-primary" />
                            <span>{it.name}</span>
                            <span className="text-muted-foreground font-normal">
                              ({it.quantity}x @ ৳{it.price})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* Checkout Modal */}
        {checkoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-slate-950 dark:text-white">Store Checkout</h3>
                  <p className="text-xs text-muted-foreground">
                    Total Amount: <span className="font-bold text-primary">৳{total}</span> ({cart.length} items)
                  </p>
                </div>
                <button
                  onClick={() => setCheckoutOpen(false)}
                  className="rounded-xl p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground">
                    Delivery Address
                  </label>
                  <input
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House, Road, Area, City (e.g. Dhanmondi, Dhaka)"
                    className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground">
                    Select Payment Method
                  </label>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {[
                      { id: "BKASH" as const, label: "bKash", icon: Smartphone },
                      { id: "NAGAD" as const, label: "Nagad", icon: Smartphone },
                      { id: "CARD" as const, label: "Card", icon: CreditCard },
                      { id: "COD" as const, label: "COD", icon: Check },
                    ].map((method) => {
                      const MethodIcon = method.icon;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-bold transition ${
                            paymentMethod === method.id
                              ? "border-primary bg-primary/10 text-primary shadow-xs"
                              : "border-border text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <MethodIcon className="size-4" />
                          {method.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {paymentMethod === "CARD" && (
                  <div className="space-y-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 p-3">
                    <label className="block text-xs font-bold text-muted-foreground">
                      Card Number
                      <input
                        type="text"
                        defaultValue="4123 •••• •••• 8888"
                        className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-xs font-mono outline-none"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-xs font-bold text-muted-foreground">
                        Expiry
                        <input
                          type="text"
                          defaultValue="10/28"
                          className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-xs font-mono outline-none"
                        />
                      </label>
                      <label className="block text-xs font-bold text-muted-foreground">
                        CVC
                        <input
                          type="text"
                          defaultValue="999"
                          className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-xs font-mono outline-none"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {(paymentMethod === "BKASH" || paymentMethod === "NAGAD") && (
                  <div className="space-y-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 p-3">
                    <label className="block text-xs font-bold text-muted-foreground">
                      {paymentMethod === "BKASH" ? "bKash" : "Nagad"} Account Number
                      <input
                        type="text"
                        value={paymentPhone}
                        onChange={(e) => setPaymentPhone(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-mono outline-none"
                      />
                    </label>
                    <label className="block text-xs font-bold text-muted-foreground">
                      PIN (Simulated)
                      <input
                        type="password"
                        defaultValue="1234"
                        className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-mono outline-none"
                      />
                    </label>
                  </div>
                )}

                {paymentMethod === "COD" && (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-3 text-xs text-muted-foreground">
                    💵 Pay in cash upon delivery of physical community items at your doorstep.
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setCheckoutOpen(false)}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOrder}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition"
                  >
                    <Check className="size-3.5" />
                    {submittingOrder ? "Processing..." : `Confirm Order (৳${total})`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
