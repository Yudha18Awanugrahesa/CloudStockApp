import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getOwnerMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workspaceId: string,
) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  if (String(data.role ?? "").toLowerCase() !== "owner") {
    return null;
  }

  return data;
}

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

    const membership = await getOwnerMembership(supabase, user.id, workspaceId);

    if (!membership) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message:
            "Hanya Owner workspace yang dapat mengakses Manajemen Anggota.",
        },
        { status: 403 },
      );
    }

    const { data, error } = await supabase.rpc(
      "get_workspace_members_with_permissions",
      {
        p_workspace_id: workspaceId,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      members: data ?? [],
    });
  } catch (error) {
    console.error("Get workspace members error:", error);

    return NextResponse.json(
      {
        error: "Gagal mengambil anggota",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();

    const workspaceId = body?.workspaceId;
    const targetUserId = body?.userId;
    const permissionKey = body?.permissionKey;
    const enabled = body?.enabled;

    if (
      typeof workspaceId !== "string" ||
      typeof targetUserId !== "string" ||
      typeof permissionKey !== "string" ||
      typeof enabled !== "boolean"
    ) {
      return NextResponse.json(
        {
          error: "Data tidak valid",
          message: "Parameter permission tidak lengkap.",
        },
        { status: 400 },
      );
    }

    const membership = await getOwnerMembership(supabase, user.id, workspaceId);

    if (!membership) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Hanya Owner workspace yang dapat mengubah permission.",
        },
        { status: 403 },
      );
    }

    const { data, error } = await supabase.rpc(
      "set_workspace_member_permission",
      {
        p_workspace_id: workspaceId,
        p_user_id: targetUserId,
        p_permission_key: permissionKey,
        p_enabled: enabled,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      result: data,
    });
  } catch (error) {
    console.error("Set workspace member permission error:", error);

    return NextResponse.json(
      {
        error: "Gagal mengubah permission",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
      },
      { status: 500 },
    );
  }
}
