import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ReportsClient } from "@/components/reports/reports-client";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createClient();

  // ==========================================================
  // USER
  // ==========================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ==========================================================
  // WORKSPACE
  // ==========================================================

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

  // ==========================================================
  // SALES
  // ==========================================================

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
    .order("created_at", {
      ascending: false,
    });

  if (salesError) {
    throw new Error(salesError.message);
  }

  // ==========================================================
  // SALE ITEMS
  // ==========================================================

  const saleIds = (sales ?? []).map((sale) => sale.id);

  let saleItems: {
    id: string;
    sale_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    created_at: string;
  }[] = [];

  if (saleIds.length > 0) {
    const { data, error: saleItemsError } = await supabase
      .from("sale_items")
      .select(
        `
            id,
            sale_id,
            product_id,
            quantity,
            unit_price,
            subtotal,
            created_at
          `,
      )
      .in("sale_id", saleIds);

    if (saleItemsError) {
      throw new Error(saleItemsError.message);
    }

    saleItems = (data ?? []).map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      subtotal: Number(item.subtotal),
    }));
  }

  // ==========================================================
  // PRODUCTS
  // ==========================================================

  const productIds = Array.from(
    new Set(saleItems.map((item) => item.product_id)),
  );

  let products: {
    id: string;
    nama: string;
    sku: string | null;
    kategori: string | null;
    harga_jual: number;
  }[] = [];

  if (productIds.length > 0) {
    const { data, error: productsError } = await supabase
      .from("products")
      .select(
        `
            id,
            nama,
            sku,
            kategori,
            harga_jual
          `,
      )
      .eq("workspace_id", workspaceId)
      .in("id", productIds);

    if (productsError) {
      throw new Error(productsError.message);
    }

    products = (data ?? []).map((product) => ({
      ...product,
      harga_jual: Number(product.harga_jual),
    }));
  }

  // ==========================================================
  // USER NAME
  // ==========================================================

  const userName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <DashboardShell userEmail={user.email} userName={userName}>
      <ReportsClient
        initialSales={sales ?? []}
        initialSaleItems={saleItems}
        initialProducts={products}
      />
    </DashboardShell>
  );
}
