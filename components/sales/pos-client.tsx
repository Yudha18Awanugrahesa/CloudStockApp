"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

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

type CartItem = {
  product: Product;
  quantity: number;
};

type Props = {
  workspaceId: string;
  initialProducts: Product[];
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export function PosClient({ workspaceId, initialProducts }: Props) {
  const supabase = createClient();

  const [products] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");

  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [processing, setProcessing] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);

  const categories = useMemo(() => {
    const values = products
      .map((product) => product.kategori)
      .filter((value): value is string => Boolean(value));

    return ["Semua", ...Array.from(new Set(values))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !keyword ||
        product.nama.toLowerCase().includes(keyword) ||
        (product.sku ?? "").toLowerCase().includes(keyword);

      const matchesCategory =
        category === "Semua" || product.kategori === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

  const totalAmount = cart.reduce(
    (total, item) => total + Number(item.product.harga_jual) * item.quantity,
    0,
  );

  const addToCart = (product: Product) => {
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
  };

  const increaseQuantity = (productId: string) => {
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
  };

  const decreaseQuantity = (productId: string) => {
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
  };

  const removeFromCart = (productId: string) => {
    setCart((current) =>
      current.filter((item) => item.product.id !== productId),
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const checkout = async () => {
    if (cart.length === 0) {
      alert("Keranjang masih kosong.");
      return;
    }

    const confirmed = window.confirm(
      `Proses penjualan sebesar ${formatRupiah(totalAmount)}?`,
    );

    if (!confirmed) return;

    setProcessing(true);

    try {
      const items = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      const { data, error } = await supabase.rpc("process_sale", {
        p_workspace_id: workspaceId,
        p_payment_method: paymentMethod,
        p_items: items,
      });

      if (error) {
        throw error;
      }

      alert(`Penjualan berhasil!\nID Transaksi: ${data}`);

      setCart([]);
      setShowCartMobile(false);

      window.location.reload();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error ? error.message : "Transaksi gagal diproses.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const CartContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-900">Keranjang</h2>

          <p className="text-xs text-slate-500">{totalItems} item</p>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-medium text-red-500 hover:text-red-700"
          >
            Kosongkan
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowCartMobile(false)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="flex h-full min-h-[250px] flex-col items-center justify-center text-center">
            <ShoppingCart className="h-10 w-10 text-slate-300" />

            <p className="mt-4 font-medium text-slate-700">Keranjang kosong</p>

            <p className="mt-1 text-sm text-slate-500">
              Pilih produk untuk memulai transaksi.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="flex justify-between gap-3">
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
                    className="shrink-0 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => decreaseQuantity(item.product.id)}
                      className="p-2 text-slate-600 hover:bg-slate-50"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>

                    <span className="min-w-8 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => increaseQuantity(item.product.id)}
                      className="p-2 text-slate-600 hover:bg-slate-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="font-semibold text-slate-900">
                    {formatRupiah(
                      Number(item.product.harga_jual) * item.quantity,
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Metode Pembayaran
        </label>

        <select
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
        >
          <option value="cash">Cash</option>
          <option value="qris">QRIS</option>
          <option value="transfer">Transfer</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">Total</span>

          <span className="text-xl font-bold text-slate-900">
            {formatRupiah(totalAmount)}
          </span>
        </div>

        <button
          type="button"
          onClick={checkout}
          disabled={processing || cart.length === 0}
          className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {processing ? "Memproses..." : "Checkout"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-5">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Penjualan</h1>

            <p className="text-sm text-slate-500">
              Pilih produk dan buat transaksi.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCartMobile(true)}
            className="relative inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white lg:hidden"
          >
            <ShoppingCart className="h-4 w-4" />
            Keranjang
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* POS LAYOUT */}
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          {/* PRODUCTS */}
          <div className="min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari produk atau SKU..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                    <ShoppingCart className="h-5 w-5 text-slate-600" />
                  </div>

                  <p className="mt-4 line-clamp-2 min-h-10 text-sm font-semibold text-slate-900">
                    {product.nama}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {product.sku || "Tanpa SKU"}
                  </p>

                  <p className="mt-3 text-sm font-bold text-slate-900">
                    {formatRupiah(Number(product.harga_jual))}
                  </p>

                  {product.kategori && (
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                      {product.kategori}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                <ShoppingCart className="mx-auto h-10 w-10 text-slate-300" />

                <p className="mt-4 font-medium text-slate-700">
                  Produk tidak ditemukan
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Coba ubah kata pencarian atau kategori.
                </p>
              </div>
            )}
          </div>

          {/* CART DESKTOP */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <CartContent />
          </div>
        </div>
      </div>

      {/* MOBILE CART DRAWER */}
      {showCartMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCartMobile(false)}
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl">
            <div className="h-[90vh]">
              <CartContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
