import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { BomClient } from "@/components/bom/bom-client";
import { createClient } from "@/lib/supabase/server";

export default async function BomPage() {
  const supabase = await createClient();

  // =========================================================
  // USER
  // =========================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
    .order("nama", {
      ascending: true,
    });

  if (productsError) {
    throw new Error(productsError.message);
  }

  // =========================================================
  // BAHAN BAKU
  // =========================================================

  const { data: bahanBaku, error: bahanError } = await supabase
    .from("bahan_baku")
    .select(
      `
          id,
          workspace_id,
          nama,
          sku,
          satuan,
          harga_satuan,
          current_stock
        `,
    )
    .eq("workspace_id", workspaceId)
    .order("nama", {
      ascending: true,
    });

  if (bahanError) {
    throw new Error(bahanError.message);
  }

  // =========================================================
  // PRODUCT BOM
  // =========================================================

  const { data: bomRows, error: bomError } = await supabase
    .from("product_bom")
    .select(
      `
          id,
          workspace_id,
          product_id,
          bahan_baku_id,
          quantity,
          created_at
        `,
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", {
      ascending: true,
    });

  if (bomError) {
    throw new Error(bomError.message);
  }

  // =========================================================
  // USER NAME
  // =========================================================

  const userName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <DashboardShell userEmail={user.email} userName={userName}>
      <BomClient
        initialProducts={products ?? []}
        initialBahanBaku={bahanBaku ?? []}
        initialBomRows={bomRows ?? []}
        workspaceId={workspaceId}
      />
    </DashboardShell>
  );
}
