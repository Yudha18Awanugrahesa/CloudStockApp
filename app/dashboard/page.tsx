import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

type Sale = {
  id: string;
  invoice_number: string;
  total_amount: number | string;
  payment_method: string;
  status: string;
  created_at: string;
};

type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number | string;
  subtotal: number | string;
};

type Product = {
  id: string;
  nama: string;
  sku: string | null;
};

type Material = {
  id: string;
  nama: string;
  sku: string | null;
  satuan: string;
  current_stock: number | string;
  safety_stock: number | string;
  reorder_point: number | string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const userName =
    user.user_metadata?.name || user.email?.split("@")[0] || "User";

  // =========================================================
  // WORKSPACE
  // =========================================================

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership?.workspace_id) {
    throw new Error("Workspace user belum ditemukan.");
  }

  const workspaceId = membership.workspace_id;

  // =========================================================
  // DATA DASHBOARD
  // =========================================================

  const [productsResult, materialsResult, salesResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, nama, sku")
      .eq("workspace_id", workspaceId)
      .eq("aktif", true)
      .order("nama"),

    supabase
      .from("bahan_baku")
      .select(
        "id, nama, sku, satuan, current_stock, safety_stock, reorder_point",
      )
      .eq("workspace_id", workspaceId)
      .order("nama"),

    supabase
      .from("sales")
      .select(
        "id, invoice_number, total_amount, payment_method, status, created_at",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
  ]);

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  if (materialsResult.error) {
    throw new Error(materialsResult.error.message);
  }

  if (salesResult.error) {
    throw new Error(salesResult.error.message);
  }

  const products = (productsResult.data ?? []) as Product[];
  const materials = (materialsResult.data ?? []) as Material[];
  const sales = (salesResult.data ?? []) as Sale[];

  const completedSales = sales.filter((sale) => sale.status === "completed");

  // =========================================================
  // DATE / WIB
  // =========================================================

  const now = new Date();

  const todayKey = getDateKey(now);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const sevenDaySales = completedSales.filter((sale) => {
    const saleDate = getDateKey(new Date(sale.created_at));
    return saleDate >= getDateKey(sevenDaysAgo) && saleDate <= todayKey;
  });

  const todaySales = completedSales.filter(
    (sale) => getDateKey(new Date(sale.created_at)) === todayKey,
  );

  const todaySalesTotal = todaySales.reduce(
    (total, sale) => total + Number(sale.total_amount),
    0,
  );

  // =========================================================
  // SALE ITEMS
  // =========================================================

  const saleIds = sevenDaySales.map((sale) => sale.id);

  let saleItems: SaleItem[] = [];

  if (saleIds.length > 0) {
    const { data, error } = await supabase
      .from("sale_items")
      .select("id, sale_id, product_id, quantity, subtotal")
      .in("sale_id", saleIds);

    if (error) {
      throw new Error(error.message);
    }

    saleItems = (data ?? []) as SaleItem[];
  }

  const productMap = new Map(products.map((product) => [product.id, product]));

  const todaySaleIds = new Set(todaySales.map((sale) => sale.id));

  const todayItems = saleItems.filter((item) => todaySaleIds.has(item.sale_id));

  const productsSoldToday = todayItems.reduce(
    (total, item) => total + Number(item.quantity),
    0,
  );

  const averageTransaction =
    todaySales.length > 0 ? todaySalesTotal / todaySales.length : 0;

  // =========================================================
  // TOP PRODUCTS — 7 HARI
  // =========================================================

  const topProductsMap = new Map<
    string,
    {
      id: string;
      nama: string;
      sku: string | null;
      quantity: number;
      omzet: number;
    }
  >();

  saleItems.forEach((item) => {
    const product = productMap.get(item.product_id);

    if (!product) {
      return;
    }

    const quantity = Number(item.quantity);
    const subtotal = Number(item.subtotal);
    const existing = topProductsMap.get(item.product_id);

    if (existing) {
      existing.quantity += quantity;
      existing.omzet += subtotal;
    } else {
      topProductsMap.set(item.product_id, {
        id: product.id,
        nama: product.nama,
        sku: product.sku,
        quantity,
        omzet: subtotal,
      });
    }
  });

  const topProducts = Array.from(topProductsMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const maxTopProductQuantity = Math.max(
    ...topProducts.map((product) => product.quantity),
    1,
  );

  // =========================================================
  // SALES TREND — 7 HARI
  // =========================================================

  const salesTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + index);

    const key = getDateKey(date);

    const dailySales = sevenDaySales.filter(
      (sale) => getDateKey(new Date(sale.created_at)) === key,
    );

    return {
      key,
      label: new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        timeZone: "Asia/Jakarta",
      }).format(date),
      dateLabel: new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Jakarta",
      }).format(date),
      omzet: dailySales.reduce(
        (total, sale) => total + Number(sale.total_amount),
        0,
      ),
      transaksi: dailySales.length,
    };
  });

  const maxDailySales = Math.max(...salesTrend.map((item) => item.omzet), 1);

  const sevenDayOmzet = sevenDaySales.reduce(
    (total, sale) => total + Number(sale.total_amount),
    0,
  );

  const sevenDayTransactions = sevenDaySales.length;

  // =========================================================
  // STOCK ALERT — SECONDARY INFORMATION
  // =========================================================

  const lowStockMaterials = materials
    .filter(
      (material) =>
        Number(material.current_stock) <= Number(material.reorder_point),
    )
    .sort((a, b) => {
      const priority = (material: Material) => {
        const stock = Number(material.current_stock);
        const safety = Number(material.safety_stock);

        if (stock <= 0) return 1;
        if (stock <= safety) return 2;
        return 3;
      };

      return priority(a) - priority(b);
    });

  const recentSales = completedSales.slice(0, 6);

  return (
    <DashboardShell userEmail={user.email} userName={userName}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ===================================================
            WELCOME / PRIMARY ACTION
        ==================================================== */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Selamat datang kembali 👋
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Halo, {userName}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Pantau performa penjualan dan aktivitas bisnis Anda hari ini.
            </p>
          </div>
        </section>

        {/* ===================================================
            BUSINESS PERFORMANCE
        ==================================================== */}

        <section>
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Business Performance
              </p>

              <h2 className="mt-1 text-base font-semibold text-slate-950">
                Performa hari ini
              </h2>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Link
                href="/sales"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ShoppingCart size={14} />
                Penjualan Baru
              </Link>

              <Link
                href="/reports"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-950"
              >
                Lihat laporan
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <MetricCard
              title="Omzet Hari Ini"
              value={formatRupiah(todaySalesTotal)}
              description={`${todaySales.length} transaksi`}
              icon={<TrendingUp size={18} />}
              featured
            />

            <MetricCard
              title="Transaksi Hari Ini"
              value={formatNumber(todaySales.length)}
              description="Transaksi selesai"
              icon={<ShoppingCart size={18} />}
            />

            <MetricCard
              title="Produk Terjual"
              value={formatNumber(productsSoldToday)}
              description="Unit hari ini"
              icon={<Package size={18} />}
            />

            <MetricCard
              title="Rata-rata Transaksi"
              value={formatRupiah(averageTransaction)}
              description="Nilai per transaksi"
              icon={<BarChart3 size={18} />}
            />
          </div>
        </section>

        {/* ===================================================
            SALES OVERVIEW + TOP PRODUCTS
        ==================================================== */}

        <section className="grid gap-6 xl:grid-cols-3">
          {/* SALES TREND */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">Tren Penjualan</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Omzet dan transaksi dalam 7 hari terakhir.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
                <p className="text-[11px] text-slate-400">7 hari</p>
                <p className="text-sm font-bold text-slate-900">
                  {formatRupiah(sevenDayOmzet)}
                </p>
                <p className="text-[11px] text-slate-400">
                  {sevenDayTransactions} transaksi
                </p>
              </div>
            </div>

            <div className="mt-5 flex h-36 items-end gap-2 sm:h-40 sm:gap-3">
              {salesTrend.map((item) => {
                const height =
                  item.omzet > 0
                    ? Math.max((item.omzet / maxDailySales) * 100, 8)
                    : 4;

                const isToday = item.key === todayKey;

                return (
                  <div
                    key={item.key}
                    className="group flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <div className="relative flex w-full flex-1 items-end">
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px] font-medium text-white shadow-lg group-hover:block">
                        {formatRupiah(item.omzet)}
                        <span className="ml-1 text-slate-300">
                          · {item.transaksi} trx
                        </span>
                      </div>

                      <div
                        className={`w-full rounded-t-lg transition ${
                          isToday
                            ? "bg-slate-950"
                            : "bg-slate-200 group-hover:bg-slate-400"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>

                    <p
                      className={`mt-2 text-[10px] font-medium sm:text-xs ${
                        isToday ? "text-slate-950" : "text-slate-400"
                      }`}
                    >
                      {item.label}
                    </p>

                    <p className="text-[9px] text-slate-400 sm:text-[10px]">
                      {item.dateLabel}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TOP PRODUCTS */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Produk Terlaris
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Berdasarkan unit terjual, 7 hari.
                </p>
              </div>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Package size={17} />
              </div>
            </div>

            {topProducts.length === 0 ? (
              <EmptyState
                icon={<Package size={19} />}
                title="Belum ada data produk"
                description="Produk terjual akan muncul setelah transaksi selesai."
              />
            ) : (
              <div className="mt-5 space-y-4">
                {topProducts.map((product, index) => {
                  const width = Math.max(
                    (product.quantity / maxTopProductQuantity) * 100,
                    8,
                  );

                  return (
                    <div key={product.id}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {product.nama}
                              </p>

                              {product.sku && (
                                <p className="truncate text-[10px] text-slate-400">
                                  {product.sku}
                                </p>
                              )}
                            </div>

                            <span className="shrink-0 text-xs font-bold text-slate-900">
                              {formatNumber(product.quantity)} unit
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-slate-900"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ===================================================
            STOCK ALERT + RECENT SALES
        ==================================================== */}

        <section className="grid gap-6 xl:grid-cols-3">
          {/* STOCK ALERT */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">Stock Alert</h2>

                <p className="mt-1 text-sm text-slate-500">Perlu perhatian.</p>
              </div>

              <Link
                href="/inventory"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-950 hover:text-white"
                aria-label="Buka inventory"
              >
                <ArrowUpRight size={17} />
              </Link>
            </div>

            {lowStockMaterials.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                  <Boxes size={17} />
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Stok aman
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Tidak ada bahan di bawah reorder point.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-2.5">
                {lowStockMaterials.slice(0, 4).map((material) => {
                  const currentStock = Number(material.current_stock);
                  const safetyStock = Number(material.safety_stock);

                  const isOutOfStock = currentStock <= 0;
                  const isCritical = currentStock <= safetyStock;

                  return (
                    <div
                      key={material.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-xs font-semibold text-slate-800">
                          {material.nama}
                        </p>

                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                            isOutOfStock
                              ? "bg-slate-950 text-white"
                              : isCritical
                                ? "bg-red-50 text-red-600"
                                : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {isOutOfStock
                            ? "Habis"
                            : isCritical
                              ? "Kritis"
                              : "Reorder"}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          Stok {formatNumber(currentStock)} {material.satuan}
                        </span>

                        <span>
                          ROP {formatNumber(Number(material.reorder_point))}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {lowStockMaterials.length > 4 && (
                  <Link
                    href="/inventory"
                    className="block pt-1 text-center text-xs font-semibold text-slate-500 hover:text-slate-950"
                  >
                    +{lowStockMaterials.length - 4} alert lainnya
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>

        {/* RECENT TRANSACTIONS */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-2 xl:col-start-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-950">
                Transaksi Terbaru
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Aktivitas penjualan terakhir.
              </p>
            </div>

            <Link
              href="/reports"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-950"
            >
              Semua
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart size={19} />}
              title="Belum ada transaksi"
              description="Transaksi akan muncul setelah checkout."
            />
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <ShoppingCart size={16} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {sale.invoice_number}
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatDate(sale.created_at)} ·{" "}
                        {formatPaymentMethod(sale.payment_method)}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-sm font-bold text-slate-900">
                    {formatRupiah(Number(sale.total_amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===================================================
            QUICK ACTIONS
        ==================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Quick Actions
              </p>

              <h2 className="mt-1 font-semibold text-slate-950">
                Kelola bisnis lebih cepat
              </h2>
            </div>

            <p className="text-xs text-slate-400">
              Akses fitur yang paling sering digunakan.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction
              href="/sales"
              icon={<ShoppingCart size={18} />}
              title="Penjualan"
              description="Transaksi baru"
              primary
            />

            <QuickAction
              href="/inventory"
              icon={<Boxes size={18} />}
              title="Inventory"
              description="Kelola stok"
            />

            <QuickAction
              href="/products"
              icon={<Package size={18} />}
              title="Produk"
              description="Kelola katalog"
            />

            <QuickAction
              href="/reports"
              icon={<BarChart3 size={18} />}
              title="Laporan"
              description="Analisis bisnis"
            />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

// =========================================================
// HELPERS
// =========================================================

function getDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatPaymentMethod(value: string) {
  const labels: Record<string, string> = {
    cash: "Cash",
    qris: "QRIS",
    transfer: "Transfer",
    debit: "Debit",
    credit: "Credit",
  };

  return labels[value] ?? value;
}

// =========================================================
// METRIC CARD
// =========================================================

function MetricCard({
  title,
  value,
  description,
  icon,
  featured = false,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
        featured
          ? "border-slate-700 bg-slate-900 text-white shadow-md"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-xs font-medium ${
            featured ? "text-slate-300" : "text-slate-500"
          }`}
        >
          {title}
        </p>

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            featured ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          {icon}
        </div>
      </div>

      <p
        className={`mt-4 break-words text-xl font-bold tracking-tight sm:text-2xl ${
          featured ? "text-white" : "text-slate-950"
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-[11px] ${
          featured ? "text-slate-400" : "text-slate-400"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

// =========================================================
// EMPTY STATE
// =========================================================

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
        {icon}
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>

      <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}

// =========================================================
// QUICK ACTION
// =========================================================

function QuickAction({
  href,
  icon,
  title,
  description,
  primary = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-sm sm:p-4 ${
        primary
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          primary
            ? "bg-white/10 text-white"
            : "bg-slate-100 text-slate-700 group-hover:bg-slate-950 group-hover:text-white"
        }`}
      >
        {icon}
      </div>

      <p
        className={`mt-3 text-sm font-semibold ${
          primary ? "text-white" : "text-slate-900"
        }`}
      >
        {title}
      </p>

      <p
        className={`mt-1 text-[11px] ${
          primary ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {description}
      </p>
    </Link>
  );
}
