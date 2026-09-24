import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProductClient } from "@/components/products/product-client";
import { createClient } from "@/lib/supabase/server";

export default async function ProductsPage() {
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

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false });

  if (productsError) {
    throw new Error(productsError.message);
  }

  const userName =
    user.user_metadata?.name || user.email?.split("@")[0] || "User";

  return (
    <DashboardShell userEmail={user.email} userName={userName}>
      <ProductClient
        initialProducts={products ?? []}
        workspaceId={membership.workspace_id}
      />
    </DashboardShell>
  );
}
