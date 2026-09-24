import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { InventoryClient } from "@/components/inventory/inventory-client";
import { createClient } from "@/lib/supabase/server";

export default async function InventoryPage() {
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

  const { data: bahanBaku, error: bahanError } = await supabase
    .from("bahan_baku")
    .select("*")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", {
      ascending: false,
    });

  if (bahanError) {
    throw new Error(bahanError.message);
  }

  const userName =
    user.user_metadata?.name || user.email?.split("@")[0] || "User";

  return (
    <DashboardShell userEmail={user.email} userName={userName}>
      <InventoryClient
        initialItems={bahanBaku ?? []}
        workspaceId={membership.workspace_id}
      />
    </DashboardShell>
  );
}
