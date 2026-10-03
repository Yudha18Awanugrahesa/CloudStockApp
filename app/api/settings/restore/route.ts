import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BACKUP_SIZE = 5 * 1024 * 1024;

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

    const formData = await request.formData();

    const workspaceId = formData.get("workspaceId");
    const file = formData.get("file");

    if (typeof workspaceId !== "string" || !workspaceId) {
      return NextResponse.json(
        {
          error: "Workspace tidak ditemukan",
          message: "Workspace ID diperlukan.",
        },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "File tidak ditemukan",
          message: "Silakan pilih file backup JSON.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_BACKUP_SIZE) {
      return NextResponse.json(
        {
          error: "File terlalu besar",
          message: "Ukuran file backup maksimal 5 MB.",
        },
        { status: 400 },
      );
    }

    if (
      file.type &&
      file.type !== "application/json" &&
      !file.name.toLowerCase().endsWith(".json")
    ) {
      return NextResponse.json(
        {
          error: "Format file tidak valid",
          message: "File backup harus berupa JSON.",
        },
        { status: 400 },
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
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

    const role = String(membership.role ?? "").toLowerCase();

    // Owner selalu memiliki akses penuh. Member mengikuti permission workspace.
    if (role !== "owner") {
      const { data: permissionData, error: permissionError } =
        await supabase.rpc("get_my_workspace_permissions", {
          p_workspace_id: workspaceId,
        });

      if (permissionError) {
        throw new Error(
          `Gagal memeriksa permission data.restore: ${permissionError.message}`,
        );
      }

      const permissionRow = Array.isArray(permissionData)
        ? permissionData[0]
        : permissionData;

      const permissions =
        permissionRow &&
        typeof permissionRow === "object" &&
        !Array.isArray(permissionRow) &&
        "permissions" in permissionRow &&
        permissionRow.permissions &&
        typeof permissionRow.permissions === "object" &&
        !Array.isArray(permissionRow.permissions)
          ? (permissionRow.permissions as Record<string, unknown>)
          : {};

      if (permissions["data.restore"] !== true) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message:
              "Anda tidak memiliki permission untuk melakukan restore backup.",
          },
          { status: 403 },
        );
      }
    }
    const rawText = await file.text();

    let backup: unknown;

    try {
      backup = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          error: "JSON tidak valid",
          message: "File backup tidak dapat dibaca sebagai JSON.",
        },
        { status: 400 },
      );
    }

    if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
      return NextResponse.json(
        {
          error: "Struktur backup tidak valid",
          message: "Root backup harus berupa object JSON.",
        },
        { status: 400 },
      );
    }

    const backupObject = backup as Record<string, unknown>;

    if (backupObject.format !== "cloud-stock-backup") {
      return NextResponse.json(
        {
          error: "Format backup tidak valid",
          message: "File bukan backup resmi Cloud Stock.",
        },
        { status: 400 },
      );
    }

    if (backupObject.version !== 1) {
      return NextResponse.json(
        {
          error: "Version tidak didukung",
          message: "Hanya backup Cloud Stock version 1 yang dapat dipulihkan.",
        },
        { status: 400 },
      );
    }

    if (backupObject.workspace_id !== workspaceId) {
      return NextResponse.json(
        {
          error: "Workspace berbeda",
          message:
            "Backup berasal dari workspace yang berbeda dengan workspace aktif.",
        },
        { status: 400 },
      );
    }

    const data = backupObject.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json(
        {
          error: "Data backup tidak valid",
          message: "Bagian data pada backup tidak ditemukan atau tidak valid.",
        },
        { status: 400 },
      );
    }

    const result = await supabase.rpc("restore_cloud_stock_backup", {
      p_workspace_id: workspaceId,
      p_backup: backupObject,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Restore backup berhasil.",
        result: result.data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Cloud Stock restore error:", error);

    return NextResponse.json(
      {
        error: "Restore gagal",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat melakukan restore.",
      },
      { status: 500 },
    );
  }
}
