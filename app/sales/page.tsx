import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SalesClient } from "@/components/sales/sales-client";
import { createClient } from "@/lib/supabase/server";

export default async function SalesPage() {
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

  // =========================================================
  // PRODUCTS
  // =========================================================

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      `
        id,
        workspace_id,
        nama,
        sku,
        kategori,
        harga_jual,
        stok_produk,
        aktif
      `,
    )
    .eq("workspace_id", workspaceId)
    .eq("aktif", true)
    .order("nama", { ascending: true });

  if (productsError) {
    throw new Error(productsError.message);
  }

  // =========================================================
  // SALES HISTORY
  // =========================================================

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select(
      `
        id,
        workspace_id,
        invoice_number,
        total_amount,
        payment_method,
        status,
        created_by,
        created_at
      `,
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (salesError) {
    throw new Error(salesError.message);
  }

  const userName =
    user.user_metadata?.name || user.email?.split("@")[0] || "User";

  return (
    <DashboardShell userEmail={user.email} userName={userName}>
      <SalesClient
        initialProducts={products ?? []}
        initialSales={sales ?? []}
        workspaceId={workspaceId}
      />
    </DashboardShell>
  );
}
