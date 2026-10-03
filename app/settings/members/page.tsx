import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MembersClient } from "@/components/settings/members-client";
import { createClient } from "@/lib/supabase/server";

export default async function MembersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership?.workspace_id) {
    throw new Error("Workspace user belum ditemukan.");
  }

  if (String(membership.role ?? "").toLowerCase() !== "owner") {
    redirect("/settings");
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", membership.workspace_id)
    .single();

  if (workspaceError) {
    throw new Error(workspaceError.message);
  }

  const initialName =
    typeof user.user_metadata?.name === "string" &&
    user.user_metadata.name.trim()
      ? user.user_metadata.name
      : user.email?.split("@")[0] || "User";

  return (
    <DashboardShell userEmail={user.email} userName={initialName}>
      <MembersClient
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />
    </DashboardShell>
  );
}
