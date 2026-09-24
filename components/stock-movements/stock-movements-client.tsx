"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Search,
  SlidersHorizontal,
  Package,
} from "lucide-react";

type Movement = {
  id: string;
  bahan_baku_id: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  bahan_nama: string;
  bahan_sku: string | null;
  bahan_satuan: string;
};

type Props = {
  movements: Movement[];
};

type MovementFilter = "ALL" | "IN" | "OUT";

export function StockMovementsClient({ movements }: Props) {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementFilter>("ALL");
  const [bahanFilter, setBahanFilter] = useState(
    searchParams.get("bahan_id") ?? "ALL",
  );

  const totalMovement = movements.length;

  const stockIn = movements.filter(
    (movement) => movement.movement_type === "in",
  ).length;

  const stockOut = movements.filter(
    (movement) => movement.movement_type === "out",
  ).length;

  const bahanOptions = useMemo(() => {
    const map = new Map<string, { id: string; nama: string }>();

    movements.forEach((movement) => {
      if (!map.has(movement.bahan_baku_id)) {
        map.set(movement.bahan_baku_id, {
          id: movement.bahan_baku_id,
          nama: movement.bahan_nama,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.nama.localeCompare(b.nama, "id"),
    );
  }, [movements]);

  const filteredMovements = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return movements.filter((movement) => {
      const matchesSearch =
        !keyword ||
        movement.bahan_nama.toLowerCase().includes(keyword) ||
        (movement.bahan_sku ?? "").toLowerCase().includes(keyword) ||
        (movement.notes ?? "").toLowerCase().includes(keyword) ||
        (movement.reference_type ?? "").toLowerCase().includes(keyword);

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "IN" && movement.movement_type === "in") ||
        (typeFilter === "OUT" && movement.movement_type === "out");

      const matchesBahan =
        bahanFilter === "ALL" || movement.bahan_baku_id === bahanFilter;

      return matchesSearch && matchesType && matchesBahan;
    });
  }, [movements, search, typeFilter, bahanFilter]);

  const groupedMovements = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        nama: string;
        sku: string | null;
        satuan: string;
        movements: Movement[];
      }
    >();

    filteredMovements.forEach((movement) => {
      const existing = groups.get(movement.bahan_baku_id);

      if (existing) {
        existing.movements.push(movement);
      } else {
        groups.set(movement.bahan_baku_id, {
          id: movement.bahan_baku_id,
          nama: movement.bahan_nama,
          sku: movement.bahan_sku,
          satuan: movement.bahan_satuan,
          movements: [movement],
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.nama.localeCompare(b.nama, "id"),
    );
  }, [filteredMovements]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      {/* HEADER */}
      <section>
        <div className="mt-1 flex items-start gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 sm:flex">
            <History size={20} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Inventory
            </p>

            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Movement Bahan Baku
            </h1>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Riwayat pergerakan stok bahan baku.
            </p>
          </div>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        <MovementSummary
          label="Total Movement"
          value={totalMovement}
          icon={<History size={17} />}
          tone="neutral"
        />

        <MovementSummary
          label="Stok Masuk"
          value={stockIn}
          icon={<ArrowUpCircle size={17} />}
          tone="in"
        />

        <MovementSummary
          label="Stok Keluar"
          value={stockOut}
          icon={<ArrowDownCircle size={17} />}
          tone="out"
        />
      </section>

      {/* FILTER */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari bahan, SKU, atau catatan..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5 sm:h-11 sm:text-sm"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as MovementFilter)
            }
            aria-label="Filter tipe movement"
            className="h-10 w-[88px] shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 sm:h-11 sm:w-32 sm:px-3 sm:text-sm"
          >
            <option value="ALL">Tipe</option>
            <option value="IN">Masuk</option>
            <option value="OUT">Keluar</option>
          </select>

          <select
            value={bahanFilter}
            onChange={(event) => setBahanFilter(event.target.value)}
            aria-label="Filter bahan baku"
            className="h-10 w-[88px] shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 sm:h-11 sm:w-40 sm:px-3 sm:text-sm"
          >
            <option value="ALL">Bahan</option>
            {bahanOptions.map((bahan) => (
              <option key={bahan.id} value={bahan.id}>
                {bahan.nama}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* MOVEMENT HISTORY */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Riwayat
            </p>

            <h2 className="mt-1 text-sm font-semibold text-slate-950 sm:text-base">
              Pergerakan Stok
            </h2>
          </div>

          <p className="text-xs text-slate-400">
            {filteredMovements.length} movement
          </p>
        </div>

        {groupedMovements.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {groupedMovements.map((group) => (
              <div
                key={group.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                {/* BAHAN HEADER */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                      <Package size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 sm:text-[15px]">
                        {group.nama}
                      </p>

                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400 sm:text-xs">
                        {group.sku && <span>{group.sku}</span>}
                        {group.sku && <span>·</span>}
                        <span>{group.movements.length} movement</span>
                      </div>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm sm:text-xs">
                    {group.satuan}
                  </span>
                </div>

                {/* RIWAYAT PER BAHAN */}
                <div className="divide-y divide-slate-100">
                  {group.movements.map((movement) => {
                    const isIn = movement.movement_type === "in";

                    return (
                      <div
                        key={movement.id}
                        className="px-4 py-3.5 sm:px-5 sm:py-4"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              isIn
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {isIn ? (
                              <ArrowUpCircle size={17} />
                            ) : (
                              <ArrowDownCircle size={17} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 sm:text-sm">
                                  {getMovementTitle(movement)}
                                </p>

                                <p className="mt-0.5 truncate text-[10px] leading-4 text-slate-400 sm:text-xs">
                                  {movement.notes ||
                                    getReferenceLabel(movement.reference_type)}
                                </p>
                              </div>

                              <p
                                className={`shrink-0 text-sm font-bold sm:text-base ${
                                  isIn ? "text-emerald-600" : "text-red-600"
                                }`}
                              >
                                {isIn ? "+" : "-"}
                                {formatNumber(movement.quantity)} {group.satuan}
                              </p>
                            </div>

                            <p className="mt-1.5 text-[10px] text-slate-400 sm:text-xs">
                              {formatDate(movement.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MovementSummary({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "neutral" | "in" | "out";
}) {
  const iconClass =
    tone === "in"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "out"
        ? "bg-red-50 text-red-600"
        : "bg-slate-100 text-slate-600";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${iconClass}`}
      >
        {icon}
      </div>

      <p className="mt-3 text-[10px] leading-4 text-slate-500 sm:mt-4 sm:text-sm">
        {label}
      </p>

      <p className="mt-0.5 text-lg font-bold tracking-tight text-slate-950 sm:text-2xl">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <History size={20} />
      </div>

      <h3 className="mt-3 text-sm font-semibold text-slate-800">
        Tidak ada movement
      </h3>

      <p className="mt-1 text-xs text-slate-400">
        Belum ada riwayat yang sesuai dengan filter.
      </p>
    </div>
  );
}

function getMovementTitle(movement: Movement) {
  if (movement.movement_type === "in") {
    return movement.reference_type === "restock"
      ? "Stok masuk · Restock"
      : "Stok masuk";
  }

  return movement.reference_type === "sale"
    ? "Stok keluar · Penjualan"
    : "Stok keluar";
}

function getReferenceLabel(referenceType: string | null) {
  const labels: Record<string, string> = {
    restock: "Penambahan stok",
    sale: "Pengurangan stok dari penjualan",
    adjustment: "Penyesuaian stok",
  };

  return labels[referenceType ?? ""] ?? "Pergerakan stok";
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
