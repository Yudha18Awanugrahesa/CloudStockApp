import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

    const { data: membership, error } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!membership?.workspace_id) {
      return NextResponse.json(
        {
          error: "Workspace tidak ditemukan",
          message: "Workspace aktif belum ditemukan.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      workspaceId: membership.workspace_id,
      role: membership.role,
    });
  } catch (error) {
    console.error("Get active workspace error:", error);

    return NextResponse.json(
      {
        error: "Gagal mengambil workspace",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
      },
      { status: 500 },
    );
  }
}
