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
    const targetUserId = searchParams.get("userId");

    if (!workspaceId || !targetUserId) {
      return NextResponse.json(
        {
          error: "Data tidak lengkap",
          message: "Workspace ID dan User ID diperlukan.",
        },
        { status: 400 },
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    if (String(membership?.role ?? "").toLowerCase() !== "owner") {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Hanya Owner yang dapat melihat permission.",
        },
        { status: 403 },
      );
    }

    const { data, error } = await supabase.rpc(
      "get_workspace_member_permissions",
      {
        p_workspace_id: workspaceId,
        p_user_id: targetUserId,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Get member permissions error:", error);

    return NextResponse.json(
      {
        error: "Gagal mengambil permission",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
      },
      { status: 500 },
    );
  }
}
