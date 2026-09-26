"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast";

// ============================================================
// TYPE
// ============================================================

type Product = {
  id: string;
  workspace_id: string;
  nama: string;
  sku: string | null;
  kategori: string | null;
  image_url: string | null;
  harga_jual: number;
  stok_produk: number;
  aktif: boolean;
};

type Sale = {
  id: string;
  workspace_id: string;
  invoice_number: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_by: string | null;
  created_at: string;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type SalesClientProps = {
  initialProducts: Product[];
  initialSales: Sale[];
  workspaceId: string;
};

type PaymentMethod = "cash" | "qris" | "transfer";

// ============================================================
// FORMAT RUPIAH
// ============================================================

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

// ============================================================
// PAYMENT LABEL
// ============================================================

const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: "Cash",
  qris: "QRIS",
  transfer: "Transfer",
};

// ============================================================
// COMPONENT
// ============================================================

export function SalesClient({
  initialProducts,
  initialSales,
  workspaceId,
}: SalesClientProps) {
  const supabase = createClient();

  // ==========================================================
  // STATE
  // ==========================================================

  const [products] = useState<Product[]>(initialProducts);

  const [search, setSearch] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("Semua");

  const [cart, setCart] = useState<CartItem[]>([]);

  const [cartOpen, setCartOpen] = useState(false);

  const [paymentOpen, setPaymentOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const [processing, setProcessing] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  // ==========================================================
  // CATEGORY
  // ==========================================================

  const categories = useMemo(() => {
    const values = products
      .map((product) => product.kategori)
      .filter((value): value is string => Boolean(value));

    return ["Semua", ...Array.from(new Set(values))];
  }, [products]);

  // ==========================================================
  // FILTER PRODUCTS
  // ==========================================================

  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !keyword ||
        product.nama.toLowerCase().includes(keyword) ||
        (product.sku ?? "").toLowerCase().includes(keyword);

      const matchesCategory =
        categoryFilter === "Semua" || product.kategori === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  // ==========================================================
  // TOTAL QUANTITY
  // ==========================================================

  const totalCartQuantity = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  // ==========================================================
  // TOTAL CART
  // ==========================================================

  const totalCartAmount = useMemo(() => {
    return cart.reduce(
      (total, item) => total + Number(item.product.harga_jual) * item.quantity,
      0,
    );
  }, [cart]);

  // ==========================================================
  // ADD TO CART
  // ==========================================================

  function addToCart(product: Product) {
    setSuccessMessage("");
    setErrorMessage("");

    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          product,
          quantity: 1,
        },
      ];
    });
  }

  // ==========================================================
  // INCREASE QUANTITY
  // ==========================================================

  function increaseQuantity(productId: string) {
    setCart((current) =>
      current.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item,
      ),
    );
  }

  // ==========================================================
  // DECREASE QUANTITY
  // ==========================================================

  function decreaseQuantity(productId: string) {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  // ==========================================================
  // REMOVE PRODUCT
  // ==========================================================

  function removeFromCart(productId: string) {
    setCart((current) =>
      current.filter((item) => item.product.id !== productId),
    );
  }

  // ==========================================================
  // CLEAR CART
  // ==========================================================

  function clearCart() {
    setCart([]);
    setCartOpen(false);
  }

  // ==========================================================
  // OPEN PAYMENT
  // ==========================================================

  function openPayment() {
    if (cart.length === 0) {
      showToast({
        type: "warning",
        title: "Keranjang kosong",
        message: "Tambahkan produk terlebih dahulu.",
      });
      return;
    }

    setSuccessMessage("");
    setErrorMessage("");

    setPaymentOpen(true);
  }

  // ==========================================================
  // CHECKOUT
  // ==========================================================
  function getCheckoutErrorMessage(error: unknown) {
    const value = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    } | null;

    const message =
      typeof value?.message === "string" ? value.message.trim() : "";

    const details =
      typeof value?.details === "string" ? value.details.trim() : "";

    if (message) return message;
    if (details) return details;

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return "Terjadi kesalahan saat memproses transaksi.";
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      showToast({
        type: "warning",
        title: "Keranjang kosong",
        message: "Tambahkan produk terlebih dahulu.",
      });
      return;
    }

    setProcessing(true);

    setSuccessMessage("");

    setErrorMessage("");

    try {
      const items = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      const { data, error } = await supabase.rpc("create_sale", {
        p_workspace_id: workspaceId,
        p_payment_method: paymentMethod,
        p_items: items,
      });

      if (error) {
        throw error;
      }

      const invoiceNumber = data?.invoice_number ?? "Transaksi berhasil";

      setCart([]);

      setCartOpen(false);

      setPaymentOpen(false);

      showToast({
        type: "success",
        title: "Transaksi berhasil",
        message: invoiceNumber,
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(error);

      const checkoutMessage = getCheckoutErrorMessage(error);

      showToast({
        type: "error",
        title: "Stok tidak mencukupi",
        message: checkoutMessage,
        duration: 7000,
      });
    } finally {
      setProcessing(false);
    }
  }

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="-mt-2 space-y-4 sm:-mt-1">
      {/* MOBILE PAGE INTRO */}
      <div className="lg:hidden">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-500/20">
            <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              Penjualan
            </h1>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Pilih produk dan buat transaksi dengan cepat.
            </p>
          </div>
        </div>
      </div>

      {/* POS WORKSPACE */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* PRODUCT CATALOG */}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-3.5 sm:p-4 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari produk atau SKU..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:bg-slate-950"
              />
            </div>

            {/* CATEGORY CHIPS */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {categories.map((category) => {
                const active = categoryFilter === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setCategoryFilter(category)}
                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                  Produk
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {filteredProducts.length} produk tersedia
                </p>
              </div>

              {totalCartQuantity > 0 && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                  {totalCartQuantity} item di keranjang
                </span>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-5 py-14 text-center dark:border-slate-700">
                <Package className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />

                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Produk tidak ditemukan
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Coba ubah pencarian atau kategori.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find(
                    (item) => item.product.id === product.id,
                  );

                  const quantityInCart = cartItem?.quantity ?? 0;
                  const stock = Number(product.stok_produk ?? 0);

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addToCart(product)}
                      className="group relative min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:translate-y-0 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900"
                    >
                      {quantityInCart > 0 && (
                        <span className="absolute right-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white shadow-sm">
                          {quantityInCart}
                        </span>
                      )}

                      <div className="relative flex aspect-[1.15/1] items-center justify-center overflow-hidden rounded-xl bg-slate-50 text-slate-400 dark:bg-slate-800/70 dark:text-slate-500">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.nama}
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="h-8 w-8 transition group-hover:scale-105" />
                        )}
                      </div>

                      <div className="mt-3 min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {product.nama}
                        </p>

                        <div className="mt-2 flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                              {formatRupiah(Number(product.harga_jual))}
                            </p>
                          </div>

                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition group-hover:bg-blue-700">
                            <Plus className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* DESKTOP CART */}
        <aside className="sticky top-[5.5rem] hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block dark:border-slate-800 dark:bg-slate-900">
          <CartPanel
            cart={cart}
            totalCartQuantity={totalCartQuantity}
            totalCartAmount={totalCartAmount}
            processing={processing}
            increaseQuantity={increaseQuantity}
            decreaseQuantity={decreaseQuantity}
            removeFromCart={removeFromCart}
            clearCart={clearCart}
            openPayment={openPayment}
          />
        </aside>
      </div>

      {/* MOBILE CART BAR */}
      <div className="fixed inset-x-3 bottom-[5.25rem] z-40 lg:hidden">
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className={`flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl px-3.5 shadow-lg ring-1 transition ${
            totalCartQuantity > 0
              ? "bg-blue-600 text-white ring-blue-600"
              : "bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                totalCartQuantity > 0
                  ? "bg-white/15"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
            </div>

            <div className="min-w-0 text-left">
              <p className="truncate text-xs font-semibold">
                {totalCartQuantity > 0
                  ? `${totalCartQuantity} item di keranjang`
                  : "Keranjang masih kosong"}
              </p>

              <p
                className={`mt-0.5 text-[10px] ${
                  totalCartQuantity > 0 ? "text-blue-100" : "text-slate-400"
                }`}
              >
                {totalCartQuantity > 0
                  ? "Tap untuk melihat detail"
                  : "Pilih produk untuk mulai"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-bold">
              {formatRupiah(totalCartAmount)}
            </span>
            <ChevronUp className="h-4 w-4" />
          </div>
        </button>
      </div>

      {/* MOBILE CART SHEET */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-end bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="flex max-h-[78vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 border-b border-slate-100 px-4 pb-3 pt-2 dark:border-slate-800">
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    Keranjang
                  </h2>

                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {totalCartQuantity > 0
                      ? `${totalCartQuantity} item · ${formatRupiah(totalCartAmount)}`
                      : "Belum ada produk"}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      disabled={processing}
                      className="rounded-lg px-2.5 py-2 text-[11px] font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
                    >
                      Kosongkan
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setCartOpen(false)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Tutup keranjang"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <CartPanel
                cart={cart}
                totalCartQuantity={totalCartQuantity}
                totalCartAmount={totalCartAmount}
                processing={processing}
                increaseQuantity={increaseQuantity}
                decreaseQuantity={decreaseQuantity}
                removeFromCart={removeFromCart}
                clearCart={() => {
                  clearCart();
                  setCartOpen(false);
                }}
                openPayment={() => {
                  setCartOpen(false);
                  openPayment();
                }}
                mobile
              />
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {paymentOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Pembayaran
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Pilih metode pembayaran.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!processing) {
                    setPaymentOpen(false);
                  }
                }}
                disabled={processing}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                aria-label="Tutup pembayaran"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              <div className="rounded-2xl bg-slate-50 p-5 text-center dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total Pembayaran
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {formatRupiah(totalCartAmount)}
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  {cart.length} produk · {totalCartQuantity} qty
                </p>
              </div>

              <div>
                <p className="mb-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Metode Pembayaran
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map(
                    (method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`rounded-xl border px-3 py-3 text-xs font-semibold transition sm:text-sm ${
                          paymentMethod === method
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        {paymentMethodLabel[method]}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Produk
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {cart.length}
                  </span>
                </div>

                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Qty
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {totalCartQuantity}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={processing}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Konfirmasi Pembayaran
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CART PANEL
// ============================================================

function CartPanel({
  cart,
  totalCartQuantity,
  totalCartAmount,
  processing,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
  clearCart,
  openPayment,
  mobile = false,
}: {
  cart: CartItem[];
  totalCartQuantity: number;
  totalCartAmount: number;
  processing: boolean;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  openPayment: () => void;
  mobile?: boolean;
}) {
  return (
    <div className={mobile ? "pb-0" : ""}>
      {/* CART HEADER — hidden on mobile because the mobile sheet has its own header */}
      {!mobile && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              Keranjang
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-400">
              {totalCartQuantity} item dipilih
            </p>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              disabled={processing}
              className="text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
            >
              Kosongkan
            </button>
          )}
        </div>
      )}

      {/* CART ITEMS */}
      {cart.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <ShoppingCart className="h-5 w-5" />
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Keranjang kosong
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Pilih produk dari katalog untuk memulai transaksi.
          </p>
        </div>
      ) : (
        <>
          <div
            className={
              mobile
                ? "space-y-2 p-3"
                : "max-h-[calc(100vh-310px)] space-y-2 overflow-y-auto p-3"
            }
          >
            {cart.map((item) => (
              <div
                key={item.product.id}
                className={`rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50 ${mobile ? "p-3" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.product.nama}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-400">
                      {formatRupiah(Number(item.product.harga_jual))} / unit
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    disabled={processing}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30"
                    title="Hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => decreaseQuantity(item.product.id)}
                      disabled={processing}
                      className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label="Kurangi jumlah"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>

                    <span className="flex h-8 min-w-8 items-center justify-center border-x border-slate-200 px-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => increaseQuantity(item.product.id)}
                      disabled={processing}
                      className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label="Tambah jumlah"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                    {formatRupiah(
                      Number(item.product.harga_jual) * item.quantity,
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CART FOOTER */}
          <div
            className={`${mobile ? "sticky bottom-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95" : "border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"}`}
          >
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] text-slate-400">Total Pembayaran</p>

                <p className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {formatRupiah(totalCartAmount)}
                </p>
              </div>

              <p className="text-[11px] text-slate-400">
                {cart.length} produk · {totalCartQuantity} qty
              </p>
            </div>

            <button
              type="button"
              onClick={openPayment}
              disabled={processing}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
              Bayar {formatRupiah(totalCartAmount)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
