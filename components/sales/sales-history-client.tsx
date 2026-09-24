"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Receipt,
  Search,
} from "lucide-react";

type SaleItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products:
    | {
        nama: string;
        sku: string | null;
      }
    | {
        nama: string;
        sku: string | null;
      }[]
    | null;
};

type Sale = {
  id: string;
  invoice_number: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  sale_items: SaleItem[];
};

type Props = {
  initialSales: Sale[];
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const paymentLabel: Record<string, string> = {
  cash: "Cash",
  qris: "QRIS",
  transfer: "Transfer",
  debit: "Debit",
  credit: "Credit",
};

export function SalesHistoryClient({ initialSales }: Props) {
  const [sales] = useState<Sale[]>(initialSales);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredSales = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) {
      return sales;
    }

    return sales.filter((sale) =>
      sale.invoice_number.toLowerCase().includes(keyword),
    );
  }, [sales, search]);

  const todayTotal = useMemo(() => {
    const today = new Date().toDateString();

    return sales
      .filter(
        (sale) =>
          new Date(sale.created_at).toDateString() === today &&
          sale.status === "completed",
      )
      .reduce((total, sale) => total + Number(sale.total_amount), 0);
  }, [sales]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
            <Receipt className="h-5 w-5 text-slate-700" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Riwayat Penjualan
            </h1>

            <p className="text-sm text-slate-500">
              Lihat seluruh transaksi penjualan CloudStock.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Transaksi</p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {sales.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Penjualan Hari Ini</p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatRupiah(todayTotal)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nomor invoice..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:bg-white"
          />
        </div>
      </div>

      {/* Sales */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="mx-auto h-10 w-10 text-slate-300" />

            <p className="mt-4 font-medium text-slate-700">
              Belum ada transaksi
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Transaksi dari POS akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSales.map((sale) => {
              const expanded = expandedId === sale.id;

              return (
                <div key={sale.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : sale.id)}
                    className="w-full px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {sale.invoice_number}
                          </span>

                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {sale.status}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(sale.created_at)}
                          </span>

                          <span>
                            {paymentLabel[sale.payment_method] ??
                              sale.payment_method}
                          </span>

                          <span>{sale.sale_items.length} produk</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <p className="text-base font-bold text-slate-900">
                          {formatRupiah(Number(sale.total_amount))}
                        </p>

                        {expanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Detail */}
                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                      <div className="space-y-3">
                        {sale.sale_items.map((item) => {
                          const product = Array.isArray(item.products)
                            ? item.products[0]
                            : item.products;

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-4 rounded-xl bg-white p-3"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {product?.nama ?? "Produk tidak ditemukan"}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {item.quantity} ×{" "}
                                  {formatRupiah(Number(item.unit_price))}
                                </p>
                              </div>

                              <p className="text-sm font-bold text-slate-900">
                                {formatRupiah(Number(item.subtotal))}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Total</p>

                          <p className="mt-1 text-lg font-bold text-slate-900">
                            {formatRupiah(Number(sale.total_amount))}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
