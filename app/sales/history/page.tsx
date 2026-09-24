import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SalesHistoryClient } from "@/components/sales/sales-history-client";
import { createClient } from "@/lib/supabase/server";

export default async function SalesHistoryPage() {
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

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select(
      `
      id,
      invoice_number,
      total_amount,
      payment_method,
      status,
      created_at,
      sale_items (
        id,
        product_id,
        quantity,
        unit_price,
        subtotal,
        products (
          nama,
          sku
        )
      )
    `,
    )
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false });

  if (salesError) {
    throw new Error(salesError.message);
  }

  const userName =
    user.user_metadata?.name || user.email?.split("@")[0] || "User";

  return (
    <DashboardShell userEmail={user.email} userName={userName}>
      <SalesHistoryClient initialSales={sales ?? []} />
    </DashboardShell>
  );
}
