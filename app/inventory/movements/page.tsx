import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StockMovementsClient } from "@/components/stock-movements/stock-movements-client";
import { createClient } from "@/lib/supabase/server";

export default async function StockMovementsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const { data: movementRows, error: movementError } = await supabase
    .from("stock_movements")
    .select(
      `
      id,
      bahan_baku_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      notes,
      created_by,
      created_at
    `,
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (movementError) {
    throw new Error(movementError.message);
  }

  const rows = movementRows ?? [];
  const bahanIds = Array.from(new Set(rows.map((row) => row.bahan_baku_id)));

  let bahanRows: {
    id: string;
    nama: string;
    sku: string | null;
    satuan: string;
  }[] = [];

  if (bahanIds.length > 0) {
    const { data, error: bahanError } = await supabase
      .from("bahan_baku")
      .select("id, nama, sku, satuan")
      .eq("workspace_id", workspaceId)
      .in("id", bahanIds);

    if (bahanError) {
      throw new Error(bahanError.message);
    }

    bahanRows = data ?? [];
  }

  const bahanMap = new Map(bahanRows.map((bahan) => [bahan.id, bahan]));

  const movements = rows.map((row) => {
    const bahan = bahanMap.get(row.bahan_baku_id);

    return {
      id: row.id,
      bahan_baku_id: row.bahan_baku_id,
      movement_type: row.movement_type,
      quantity: Number(row.quantity),
      reference_type: row.reference_type,
      reference_id: row.reference_id,
      notes: row.notes,
      created_by: row.created_by,
      created_at: row.created_at,
      bahan_nama: bahan?.nama ?? "Bahan tidak ditemukan",
      bahan_sku: bahan?.sku ?? null,
      bahan_satuan: bahan?.satuan ?? "",
    };
  });

  const userName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <DashboardShell userEmail={user.email} userName={userName}>
      <div className="mx-auto max-w-7xl">
        <Link
          href="/inventory"
          title="Kembali ke Inventory"
          aria-label="Kembali ke Inventory"
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 sm:mb-4 sm:h-10 sm:w-10"
        >
          <ArrowLeft size={17} />
        </Link>

        <StockMovementsClient movements={movements} />
      </div>
    </DashboardShell>
  );
}
