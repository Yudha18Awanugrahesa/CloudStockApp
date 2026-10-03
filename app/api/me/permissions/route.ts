import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Anda harus login terlebih dahulu.",
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        {
          error: "Workspace tidak ditemukan",
          message: "Workspace ID diperlukan.",
        },
        { status: 400 },
      );
    }

    /*
     * Pastikan user memang anggota workspace.
     */
    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    if (!membership) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Anda bukan anggota workspace ini.",
        },
        { status: 403 },
      );
    }

    const { data, error } = await supabase.rpc("get_my_workspace_permissions", {
      p_workspace_id: workspaceId,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      role: membership.role,
      workspaceId,
      permissions: data?.permissions ?? {},
    });
  } catch (error) {
    console.error("Get my permissions error:", error);

    return NextResponse.json(
      {
        error: "Gagal mengambil permission",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
      },
      { status: 500 },
    );
  }
}
