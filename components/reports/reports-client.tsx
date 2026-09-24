"use client";

import { useMemo, useState } from "react";

import {
  Banknote,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

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

type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
};

type Product = {
  id: string;
  nama: string;
  sku: string | null;
  kategori: string | null;
  harga_jual: number;
};

type ReportsClientProps = {
  initialSales: Sale[];
  initialSaleItems: SaleItem[];
  initialProducts: Product[];
};

type PeriodFilter = "today" | "7days" | "month" | "all";

// ============================================================
// FORMAT
// ============================================================

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(value);
}

function getStartDate(period: PeriodFilter) {
  const now = new Date();

  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === "7days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    start.setHours(0, 0, 0, 0);

    return start;
  }

  return null;
}

function paymentLabel(method: string) {
  const labels: Record<string, string> = {
    cash: "Cash",
    qris: "QRIS",
    transfer: "Transfer",
  };

  return labels[method] ?? method;
}

// ============================================================
// COMPONENT
// ============================================================

export function ReportsClient({
  initialSales,
  initialSaleItems,
  initialProducts,
}: ReportsClientProps) {
  const [period, setPeriod] = useState<PeriodFilter>("month");

  // ==========================================================
  // PRODUCT MAP
  // ==========================================================

  const productMap = useMemo(() => {
    return new Map(initialProducts.map((product) => [product.id, product]));
  }, [initialProducts]);

  // ==========================================================
  // FILTER SALES
  // ==========================================================

  const filteredSales = useMemo(() => {
    const startDate = getStartDate(period);

    return initialSales.filter((sale) => {
      if (!startDate) {
        return true;
      }

      return new Date(sale.created_at) >= startDate;
    });
  }, [initialSales, period]);

  // ==========================================================
  // FILTER SALE IDS
  // ==========================================================

  const filteredSaleIds = useMemo(() => {
    return new Set(filteredSales.map((sale) => sale.id));
  }, [filteredSales]);

  // ==========================================================
  // FILTER ITEMS
  // ==========================================================

  const filteredItems = useMemo(() => {
    return initialSaleItems.filter((item) => filteredSaleIds.has(item.sale_id));
  }, [initialSaleItems, filteredSaleIds]);

  // ==========================================================
  // SUMMARY
  // ==========================================================

  const summary = useMemo(() => {
    const omzet = filteredSales.reduce(
      (total, sale) => total + Number(sale.total_amount),
      0,
    );

    const transaksi = filteredSales.length;

    const produkTerjual = filteredItems.reduce(
      (total, item) => total + Number(item.quantity),
      0,
    );

    const rataRata = transaksi > 0 ? omzet / transaksi : 0;

    return {
      omzet,
      transaksi,
      produkTerjual,
      rataRata,
    };
  }, [filteredSales, filteredItems]);

  // ==========================================================
  // DAILY SALES
  // ==========================================================

  const dailySales = useMemo(() => {
    const map = new Map<
      string,
      {
        date: Date;
        omzet: number;
        transaksi: number;
      }
    >();

    filteredSales.forEach((sale) => {
      const date = new Date(sale.created_at);

      const key = [date.getFullYear(), date.getMonth(), date.getDate()].join(
        "-",
      );

      const existing = map.get(key);

      if (existing) {
        existing.omzet += Number(sale.total_amount);

        existing.transaksi += 1;
      } else {
        map.set(key, {
          date,
          omzet: Number(sale.total_amount),
          transaksi: 1,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [filteredSales]);

  // ==========================================================
  // MAX DAILY OMZET
  // ==========================================================

  const maxDailyOmzet = useMemo(() => {
    return Math.max(...dailySales.map((item) => item.omzet), 1);
  }, [dailySales]);

  // ==========================================================
  // PAYMENT SUMMARY
  // ==========================================================

  const paymentSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        method: string;
        total: number;
        count: number;
      }
    >();

    filteredSales.forEach((sale) => {
      const method = sale.payment_method;

      const existing = map.get(method);

      if (existing) {
        existing.total += Number(sale.total_amount);

        existing.count += 1;
      } else {
        map.set(method, {
          method,
          total: Number(sale.total_amount),
          count: 1,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  // ==========================================================
  // TOP PRODUCTS
  // ==========================================================

  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        nama: string;
        sku: string | null;
        quantity: number;
        omzet: number;
      }
    >();

    filteredItems.forEach((item) => {
      const product = productMap.get(item.product_id);

      const existing = map.get(item.product_id);

      if (existing) {
        existing.quantity += Number(item.quantity);

        existing.omzet += Number(item.subtotal);
      } else {
        map.set(item.product_id, {
          productId: item.product_id,
          nama: product?.nama ?? "Produk tidak ditemukan",
          sku: product?.sku ?? null,
          quantity: Number(item.quantity),
          omzet: Number(item.subtotal),
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredItems, productMap]);

  // ==========================================================
  // RECENT SALES
  // ==========================================================

  const recentSales = filteredSales.slice(0, 10);

  // ==========================================================
  // PERIOD LABEL
  // ==========================================================

  const periodLabel = {
    today: "Hari Ini",
    "7days": "7 Hari Terakhir",
    month: "Bulan Ini",
    all: "Semua Data",
  }[period];

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-5 sm:space-y-6">
      {/* ====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 sm:h-11 sm:w-11 sm:rounded-2xl">
              <BarChart3 className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                Laporan
              </h1>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Pantau performa penjualan bisnis Anda.
              </p>
            </div>
          </div>
        </div>

        {/* ==================================================
            PERIOD FILTER
        =================================================== */}

        <div className="relative w-full sm:w-auto">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as PeriodFilter)}
            className="h-10 w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 sm:h-11 sm:min-w-[190px] sm:pl-10 sm:pr-10"
          >
            <option value="today">Hari Ini</option>

            <option value="7days">7 Hari Terakhir</option>

            <option value="month">Bulan Ini</option>

            <option value="all">Semua Data</option>
          </select>

          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* ====================================================
          PERIOD INFO
      ===================================================== */}

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-xs text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:gap-2 sm:text-sm">
        <TrendingUp className="h-4 w-4" />
        Menampilkan laporan:
        <span className="font-semibold text-slate-800">{periodLabel}</span>
      </div>

      {/* ====================================================
          SUMMARY CARDS
      ===================================================== */}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <SummaryCard
          title="Total Omzet"
          value={formatRupiah(summary.omzet)}
          description={`${periodLabel}`}
          icon={<Wallet className="h-5 w-5" />}
        />

        <SummaryCard
          title="Total Transaksi"
          value={formatNumber(summary.transaksi)}
          description="Transaksi berhasil"
          icon={<Receipt className="h-5 w-5" />}
        />

        <SummaryCard
          title="Produk Terjual"
          value={formatNumber(summary.produkTerjual)}
          description="Total quantity"
          icon={<ShoppingCart className="h-5 w-5" />}
        />

        <SummaryCard
          title="Rata-rata Transaksi"
          value={formatRupiah(summary.rataRata)}
          description="Nilai per transaksi"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* ====================================================
          CHART + PAYMENT
      ===================================================== */}

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
        {/* ==================================================
            DAILY SALES
        =================================================== */}

        <div className="rounded-[20px] border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-5 xl:col-span-2">
          <div>
            <h2 className="font-semibold text-slate-950">Omzet Harian</h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Pergerakan omzet berdasarkan transaksi.
            </p>
          </div>

          {dailySales.length === 0 ? (
            <EmptyReport message="Belum ada data penjualan" />
          ) : (
            <div className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
              {dailySales.map((item) => {
                const percentage = Math.max(
                  4,
                  (item.omzet / maxDailyOmzet) * 100,
                );

                return (
                  <div key={item.date.toISOString()}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-slate-500">
                        {formatShortDate(item.date)}
                      </span>

                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span className="text-xs text-slate-400">
                          {item.transaksi} trx
                        </span>

                        <span className="text-xs font-semibold text-slate-800">
                          {formatRupiah(item.omzet)}
                        </span>
                      </div>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-900 transition-all"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================================================
            PAYMENT
        =================================================== */}

        <div className="rounded-[20px] border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-5">
          <div>
            <h2 className="font-semibold text-slate-950">Metode Pembayaran</h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Distribusi transaksi berdasarkan metode.
            </p>
          </div>

          {paymentSummary.length === 0 ? (
            <EmptyReport message="Belum ada transaksi" />
          ) : (
            <div className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
              {paymentSummary.map((item) => {
                const percentage =
                  summary.omzet > 0 ? (item.total / summary.omzet) * 100 : 0;

                const Icon =
                  item.method === "cash"
                    ? Banknote
                    : item.method === "qris"
                      ? CreditCard
                      : Wallet;

                return (
                  <div key={item.method}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {paymentLabel(item.method)}
                          </p>

                          <p className="text-xs text-slate-400">
                            {item.count} transaksi
                          </p>
                        </div>
                      </div>

                      <p className="text-sm font-bold text-slate-900">
                        {formatRupiah(item.total)}
                      </p>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-700"
                        style={{
                          width: `${Math.max(percentage, 3)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ====================================================
          TOP PRODUCTS
      ===================================================== */}

      <div className="rounded-[20px] border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4">
          <h2 className="font-semibold text-slate-950">Produk Terlaris</h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            Produk dengan quantity penjualan terbanyak.
          </p>
        </div>

        {topProducts.length === 0 ? (
          <EmptyReport message="Belum ada produk terjual" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Produk
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Terjual
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Omzet
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {topProducts.map((product, index) => (
                  <tr
                    key={product.productId}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                          {index + 1}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {product.nama}
                          </p>

                          {product.sku && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {product.sku}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-slate-800">
                      {formatNumber(product.quantity)}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-slate-900">
                      {formatRupiah(product.omzet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====================================================
          TRANSACTIONS
      ===================================================== */}

      <div className="rounded-[20px] border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4">
          <h2 className="font-semibold text-slate-950">Transaksi Terbaru</h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            Maksimal 10 transaksi terbaru pada periode yang dipilih.
          </p>
        </div>

        {recentSales.length === 0 ? (
          <EmptyReport message="Belum ada transaksi" />
        ) : (
          <>
            {/* Desktop */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Invoice
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Tanggal
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Pembayaran
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Total
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {sale.invoice_number}
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {formatDate(sale.created_at)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {paymentLabel(sale.payment_method)}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-slate-900">
                        {formatRupiah(Number(sale.total_amount))}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
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

            {/* Mobile */}

            <div className="space-y-2.5 p-3 md:hidden">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-2xl border border-slate-200/90 p-3.5"
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

                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Pembayaran</p>

                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {paymentLabel(sale.payment_method)}
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
    </div>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition hover:border-slate-300 sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        {icon}
      </div>

      <p className="mt-4 text-xs text-slate-500 sm:mt-5 sm:text-sm">{title}</p>

      <p className="mt-1 truncate text-lg font-bold tracking-tight text-slate-950 sm:text-2xl">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">
        {description}
      </p>
    </div>
  );
}

// ============================================================
// EMPTY REPORT
// ============================================================

function EmptyReport({ message }: { message: string }) {
  return (
    <div className="mx-5 my-6 rounded-xl border border-dashed border-slate-200/90 bg-slate-50 p-8 text-center">
      <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />

      <p className="mt-3 text-sm font-medium text-slate-600">{message}</p>

      <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">
        Data akan muncul setelah transaksi tersedia.
      </p>
    </div>
  );
}
