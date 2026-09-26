import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const supabase = await createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("OAUTH CALLBACK ERROR:", exchangeError);
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_user`);
  }

  // Google users do not go through the normal RegisterForm,
  // so make sure a first-time user also receives a workspace.
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("WORKSPACE MEMBERSHIP CHECK ERROR:", membershipError);
    return NextResponse.redirect(`${origin}/login?error=workspace`);
  }

  if (!membership?.workspace_id) {
    const displayName =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User";

    const workspaceName = `${displayName} Workspace`;

    const { error: workspaceError } = await supabase.rpc(
      "create_workspace_for_user",
      {
        workspace_name: workspaceName,
      },
    );

    if (workspaceError) {
      console.error("GOOGLE WORKSPACE CREATION ERROR:", workspaceError);
      return NextResponse.redirect(`${origin}/login?error=workspace`);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
