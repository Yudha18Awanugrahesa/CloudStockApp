"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Package,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Material = {
  id: string;
  nama: string;
  satuan: string;
  current_stock: number | string | null;
  safety_stock: number | string | null;
  reorder_point: number | string | null;
};

type AlertItem = Material & {
  alertType: "OUT_OF_STOCK" | "CRITICAL" | "REORDER";
};

export function NotificationBell() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    loadAlerts();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function loadAlerts() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAlerts([]);
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership?.workspace_id) {
        setAlerts([]);
        return;
      }

      const { data, error } = await supabase
        .from("bahan_baku")
        .select("id, nama, satuan, current_stock, safety_stock, reorder_point")
        .eq("workspace_id", membership.workspace_id)
        .order("nama");

      if (error) {
        throw error;
      }

      const materials = (data ?? []) as Material[];

      const generatedAlerts: AlertItem[] = materials
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

      setAlerts(generatedAlerts);
    } catch (error) {
      console.error("Gagal memuat notifikasi:", error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }

  function formatNumber(value: number | string | null) {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 3,
    }).format(Number(value ?? 0));
  }

  function getAlertConfig(type: AlertItem["alertType"]) {
    if (type === "OUT_OF_STOCK") {
      return {
        label: "Stok Habis",
        description: "Segera lakukan restock.",
        icon: XCircle,
        iconClass: "bg-red-50 text-red-600",
        badgeClass: "bg-red-50 text-red-600",
      };
    }

    if (type === "CRITICAL") {
      return {
        label: "Stok Kritis",
        description: "Stok berada di bawah batas aman.",
        icon: AlertTriangle,
        iconClass: "bg-orange-50 text-orange-600",
        badgeClass: "bg-orange-50 text-orange-600",
      };
    }

    return {
      label: "Perlu Restock",
      description: "Stok sudah mencapai reorder point.",
      icon: Package,
      iconClass: "bg-amber-50 text-amber-600",
      badgeClass: "bg-amber-50 text-amber-600",
    };
  }

  const alertCount = alerts.length;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50"
        aria-label="Notifikasi"
        aria-expanded={open}
      >
        <Bell size={19} />

        {alertCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {alertCount > 99 ? "99+" : alertCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Notifikasi
              </h3>

              <p className="mt-0.5 text-xs text-slate-400">
                {loading
                  ? "Memeriksa stok..."
                  : alertCount > 0
                    ? `${alertCount} bahan membutuhkan perhatian`
                    : "Tidak ada alert stok"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Tutup notifikasi"
            >
              <XCircle size={17} />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />

                <p className="mt-3 text-xs text-slate-400">
                  Memuat notifikasi...
                </p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-6 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Bell size={20} />
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-800">
                  Semua stok aman
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Tidak ada bahan baku yang berada di bawah reorder point.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {alerts.slice(0, 5).map((alert) => {
                  const config = getAlertConfig(alert.alertType);
                  const Icon = config.icon;

                  return (
                    <Link
                      key={alert.id}
                      href="/inventory"
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-3 transition hover:bg-slate-50"
                    >
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config.iconClass}`}
                      >
                        <Icon size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {alert.nama}
                          </p>

                          <ChevronRight
                            size={15}
                            className="mt-0.5 shrink-0 text-slate-300"
                          />
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.badgeClass}`}
                          >
                            {config.label}
                          </span>

                          <span className="text-[11px] text-slate-400">
                            Stok {formatNumber(alert.current_stock)}{" "}
                            {alert.satuan}
                          </span>
                        </div>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {config.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && alerts.length > 0 && (
            <div className="border-t border-slate-100 p-3">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Lihat Semua Alert
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
