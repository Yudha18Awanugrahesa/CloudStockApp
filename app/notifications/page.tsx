import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  ChevronRight,
  Package,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

type Material = {
  id: string;
  nama: string;
  sku: string | null;
  satuan: string;
  current_stock: number | string | null;
  safety_stock: number | string | null;
  reorder_point: number | string | null;
};

type AlertType = "OUT_OF_STOCK" | "CRITICAL" | "REORDER";

type AlertItem = Material & {
  alertType: AlertType;
};

export default async function NotificationsPage() {
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
  // BAHAN BAKU
  // =========================================================

  const { data, error } = await supabase
    .from("bahan_baku")
    .select("id, nama, sku, satuan, current_stock, safety_stock, reorder_point")
    .eq("workspace_id", workspaceId)
    .order("nama");

  if (error) {
    throw new Error(error.message);
  }

  const materials = (data ?? []) as Material[];

  // =========================================================
  // GENERATE ALERT
  // =========================================================

  const alerts: AlertItem[] = materials
    .map((material) => {
      const currentStock = Number(material.current_stock ?? 0);
      const safetyStock = Number(material.safety_stock ?? 0);
      const reorderPoint = Number(material.reorder_point ?? 0);

      if (currentStock <= 0) {
        return {
          ...material,
          alertType: "OUT_OF_STOCK" as const,
        };
      }

      if (currentStock <= safetyStock) {
        return {
          ...material,
          alertType: "CRITICAL" as const,
        };
      }

      if (currentStock <= reorderPoint) {
        return {
          ...material,
          alertType: "REORDER" as const,
        };
      }

      return null;
    })
    .filter((item): item is AlertItem => item !== null)
    .sort((a, b) => {
      const priority = {
        OUT_OF_STOCK: 1,
        CRITICAL: 2,
        REORDER: 3,
      };

      return priority[a.alertType] - priority[b.alertType];
    });

  const outOfStockCount = alerts.filter(
    (item) => item.alertType === "OUT_OF_STOCK",
  ).length;

  const criticalCount = alerts.filter(
    (item) => item.alertType === "CRITICAL",
  ).length;

  const reorderCount = alerts.filter(
    (item) => item.alertType === "REORDER",
  ).length;

  return (
    <DashboardShell userEmail={user.email} userName={userName}>
      <div className="mx-auto max-w-6xl">
        {/* ===================================================
            HEADER
        ==================================================== */}

        <section className="mb-6">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Kembali ke Dashboard
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Bell size={20} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                    Alert Center
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Pantau kondisi stok bahan baku Anda.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/inventory"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Package size={17} />
              Buka Inventory
            </Link>
          </div>
        </section>

        {/* ===================================================
            SUMMARY
        ==================================================== */}

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Stok Habis"
            value={outOfStockCount}
            description="Perlu segera diisi"
            icon={<XCircle size={19} />}
            iconClass="bg-red-50 text-red-600"
          />

          <SummaryCard
            title="Stok Kritis"
            value={criticalCount}
            description="Di bawah batas aman"
            icon={<AlertTriangle size={19} />}
            iconClass="bg-orange-50 text-orange-600"
          />

          <SummaryCard
            title="Perlu Restock"
            value={reorderCount}
            description="Mencapai reorder point"
            icon={<Package size={19} />}
            iconClass="bg-amber-50 text-amber-600"
          />
        </section>

        {/* ===================================================
            ALERT LIST
        ==================================================== */}

        <section className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Semua Alert</h2>

              <p className="mt-1 text-sm text-slate-500">
                Daftar bahan baku yang membutuhkan perhatian.
              </p>
            </div>

            {alerts.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Bell size={24} />
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  Semua stok aman
                </h3>

                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                  Tidak ada bahan baku yang berada di bawah reorder point saat
                  ini.
                </p>

                <Link
                  href="/inventory"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Lihat Inventory
                  <ChevronRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {alerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
  title,
  value,
  description,
  icon,
  iconClass,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-5 text-sm text-slate-500">{title}</p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

// =========================================================
// ALERT ROW
// =========================================================

function AlertRow({ alert }: { alert: AlertItem }) {
  const config = getAlertConfig(alert.alertType);
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.iconClass}`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">
              {alert.nama}
            </h3>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.badgeClass}`}
            >
              {config.label}
            </span>
          </div>

          {alert.sku && (
            <p className="mt-1 text-xs text-slate-400">SKU: {alert.sku}</p>
          )}

          <p className="mt-1 text-xs text-slate-500">
            Stok saat ini{" "}
            <span className="font-semibold text-slate-700">
              {formatNumber(alert.current_stock)} {alert.satuan}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-5 sm:justify-end">
        <div className="text-left sm:text-right">
          <p className="text-[11px] text-slate-400">Reorder Point</p>

          <p className="text-sm font-semibold text-slate-700">
            {formatNumber(alert.reorder_point)} {alert.satuan}
          </p>
        </div>

        <Link
          href="/inventory"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Tambah Stok
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}

// =========================================================
// ALERT CONFIG
// =========================================================

function getAlertConfig(type: AlertType) {
  if (type === "OUT_OF_STOCK") {
    return {
      label: "Stok Habis",
      icon: XCircle,
      iconClass: "bg-red-50 text-red-600",
      badgeClass: "bg-red-50 text-red-600",
    };
  }

  if (type === "CRITICAL") {
    return {
      label: "Stok Kritis",
      icon: AlertTriangle,
      iconClass: "bg-orange-50 text-orange-600",
      badgeClass: "bg-orange-50 text-orange-600",
    };
  }

  return {
    label: "Perlu Restock",
    icon: Package,
    iconClass: "bg-amber-50 text-amber-600",
    badgeClass: "bg-amber-50 text-amber-600",
  };
}

// =========================================================
// HELPERS
// =========================================================

function formatNumber(value: number | string | null) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(Number(value ?? 0));
}
