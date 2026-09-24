"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
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

  const [sales] = useState<Sale[]>(initialSales);

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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Point of Sale
          </p>

          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Penjualan
          </h1>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Pilih produk dan buat transaksi dengan cepat.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCartOpen((current) => !current)}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition sm:h-11 sm:w-11 ${
            cart.length > 0
              ? "border-slate-950 bg-slate-950 text-white shadow-sm"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          aria-label="Buka keranjang"
          title="Keranjang"
        >
          <ShoppingCart className="h-[18px] w-[18px]" />

          {totalCartQuantity > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold text-white">
              {totalCartQuantity > 99 ? "99+" : totalCartQuantity}
            </span>
          )}
        </button>
      </div>

      {/* =====================================================
          SEARCH & FILTER
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari produk..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition focus:border-slate-400 focus:bg-white sm:h-11 sm:text-sm"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter kategori"
            className="h-10 w-[102px] shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 sm:h-11 sm:w-40 sm:text-sm"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* =====================================================
          PRODUCT SECTION
      ====================================================== */}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Produk</h2>

            <p className="mt-1 text-sm text-slate-500">
              Pilih produk untuk ditambahkan ke keranjang.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            {filteredProducts.length} produk
          </p>
        </div>

        {/* ===================================================
            EMPTY PRODUCT
        ==================================================== */}

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Package className="mx-auto h-9 w-9 text-slate-300" />

            <p className="mt-3 text-sm font-medium text-slate-600">
              Produk tidak ditemukan
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Coba ubah kata pencarian atau kategori.
            </p>
          </div>
        ) : (
          /* =================================================
             PRODUCT GRID
          ================================================== */

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const cartItem = cart.find(
                (item) => item.product.id === product.id,
              );

              const quantityInCart = cartItem?.quantity ?? 0;

              return (
                <div
                  key={product.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  {/* Product Icon */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Package className="h-5 w-5" />
                  </div>

                  {/* Product Information */}
                  <div className="mt-4">
                    <h3 className="line-clamp-2 min-h-[48px] font-semibold text-slate-900">
                      {product.nama}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      {product.sku || "Tanpa SKU"}
                    </p>

                    {product.kategori && (
                      <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        {product.kategori}
                      </span>
                    )}
                  </div>

                  {/* Price + Add */}
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Harga</p>

                      <p className="mt-1 text-base font-bold text-slate-950">
                        {formatRupiah(Number(product.harga_jual))}
                      </p>
                    </div>

                    {/* Add Button */}
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800"
                      title="Tambah ke keranjang"
                    >
                      <Plus className="h-5 w-5" />

                      {quantityInCart > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
                          {quantityInCart}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================
          SALES HISTORY
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-950">Transaksi Terakhir</h2>

          <p className="mt-1 text-sm text-slate-500">
            Riwayat penjualan terbaru.
          </p>
        </div>

        {/* Empty */}
        {sales.length === 0 ? (
          <div className="p-10 text-center">
            <ShoppingCart className="mx-auto h-8 w-8 text-slate-300" />

            <p className="mt-3 text-sm font-medium text-slate-600">
              Belum ada transaksi
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Transaksi yang berhasil akan muncul di sini.
            </p>
          </div>
        ) : (
          <>
            {/* =================================================
                DESKTOP SALES TABLE
            ================================================== */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <th className="px-5 py-3 font-medium text-slate-500">
                      Invoice
                    </th>

                    <th className="px-5 py-3 font-medium text-slate-500">
                      Tanggal
                    </th>

                    <th className="px-5 py-3 font-medium text-slate-500">
                      Pembayaran
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-slate-500">
                      Total
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {sale.invoice_number}
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {formatDate(sale.created_at)}
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {paymentMethodLabel[
                          sale.payment_method as PaymentMethod
                        ] ?? sale.payment_method}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-slate-900">
                        {formatRupiah(Number(sale.total_amount))}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {sale.status === "completed"
                            ? "Selesai"
                            : sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* =================================================
                MOBILE SALES
            ================================================== */}

            <div className="space-y-3 p-4 md:hidden">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {sale.invoice_number}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(sale.created_at)}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      {sale.status === "completed" ? "Selesai" : sale.status}
                    </span>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Pembayaran</p>

                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {paymentMethodLabel[
                          sale.payment_method as PaymentMethod
                        ] ?? sale.payment_method}
                      </p>
                    </div>

                    <p className="text-base font-bold text-slate-950">
                      {formatRupiah(Number(sale.total_amount))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* =====================================================
          CART MODAL
      ====================================================== */}

      {cartOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9996] bg-slate-950/40 backdrop-blur-sm"
              aria-hidden="true"
              onClick={() => setCartOpen(false)}
            />

            <div className="fixed inset-0 z-[9997] flex items-start justify-center p-3 pt-16 sm:items-center sm:p-4">
              <div
                className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                {/* =================================================
                CART HEADER
            ================================================== */}

                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                      <ShoppingCart className="h-5 w-5" />

                      {totalCartQuantity > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {totalCartQuantity > 99 ? "99+" : totalCartQuantity}
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="font-bold text-slate-950">Keranjang</h2>

                      <p className="text-xs text-slate-500">
                        {cart.length} produk · {totalCartQuantity} qty
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCartOpen(false)}
                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    title="Tutup"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* =================================================
                EMPTY CART
            ================================================== */}

                {cart.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <ShoppingCart className="h-6 w-6 text-slate-400" />
                    </div>

                    <p className="mt-4 font-semibold text-slate-700">
                      Keranjang masih kosong
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Tambahkan produk terlebih dahulu.
                    </p>

                    <button
                      type="button"
                      onClick={() => setCartOpen(false)}
                      className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Pilih Produk
                    </button>
                  </div>
                ) : (
                  <>
                    {/* =================================================
                    CART ITEMS
                ================================================== */}

                    <div className="max-h-[55vh] space-y-3 overflow-y-auto p-4">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                        >
                          {/* Product Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {item.product.nama}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatRupiah(Number(item.product.harga_jual))}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50"
                              title="Hapus produk"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Quantity + Subtotal */}
                          <div className="mt-3 flex items-center justify-between">
                            {/* Quantity */}
                            <div className="flex items-center rounded-xl border border-slate-200 bg-white">
                              <button
                                type="button"
                                onClick={() =>
                                  decreaseQuantity(item.product.id)
                                }
                                className="flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-slate-50"
                              >
                                <Minus className="h-4 w-4" />
                              </button>

                              <span className="flex h-9 min-w-10 items-center justify-center border-x border-slate-200 px-2 text-sm font-semibold text-slate-900">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  increaseQuantity(item.product.id)
                                }
                                className="flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-slate-50"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Subtotal */}
                            <p className="text-sm font-bold text-slate-900">
                              {formatRupiah(
                                Number(item.product.harga_jual) * item.quantity,
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* =================================================
                    CART FOOTER
                ================================================== */}

                    <div className="border-t border-slate-100 bg-white p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500">
                            Total Pembayaran
                          </p>

                          <p className="mt-1 text-xl font-bold text-slate-950">
                            {formatRupiah(totalCartAmount)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={clearCart}
                          className="text-xs font-medium text-red-500 hover:text-red-600"
                        >
                          Kosongkan
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCartOpen(false);
                          openPayment();
                        }}
                        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Bayar {formatRupiah(totalCartAmount)}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* =====================================================
          PAYMENT MODAL
      ====================================================== */}

      {paymentOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-slate-950/45 backdrop-blur-sm"
              aria-hidden="true"
            />

            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
              <div className="w-full max-h-[92vh] max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl">
                {/* =================================================
                PAYMENT HEADER
            ================================================== */}

                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      Pembayaran
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
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
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* =================================================
                PAYMENT CONTENT
            ================================================== */}

                <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
                  {/* Total */}
                  <div className="rounded-2xl bg-slate-50 p-5 text-center">
                    <p className="text-sm text-slate-500">Total Pembayaran</p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                      {formatRupiah(totalCartAmount)}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {cart.length} produk · {totalCartQuantity} qty
                    </p>
                  </div>

                  {/* =================================================
                  PAYMENT METHOD
              ================================================== */}

                  <div>
                    <p className="mb-3 text-sm font-semibold text-slate-700">
                      Metode Pembayaran
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map(
                        (method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                              paymentMethod === method
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {paymentMethodLabel[method]}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {/* =================================================
                  SUMMARY
              ================================================== */}

                  <div className="rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <span className="text-sm text-slate-500">Produk</span>

                      <span className="text-sm font-semibold text-slate-900">
                        {cart.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-500">Qty</span>

                      <span className="text-sm font-semibold text-slate-900">
                        {totalCartQuantity}
                      </span>
                    </div>
                  </div>

                  {/* =================================================
                  CHECKOUT BUTTON
              ================================================== */}

                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={processing}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
          </>,
          document.body,
        )}
    </div>
  );
}
