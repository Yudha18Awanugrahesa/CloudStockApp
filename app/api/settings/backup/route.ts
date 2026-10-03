import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WORKSPACE_TABLES = [
  "bahan_baku",
  "products",
  "product_bom",
  "sales",
  "stock_alerts",
  "stock_movements",
  "stock_movement_trash",
  "sales_archive",
] as const;

const PAGE_SIZE = 1000;
const SALE_ID_CHUNK_SIZE = 200;

async function getWorkspaceRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tableName: (typeof WORKSPACE_TABLES)[number],
  workspaceId: string,
) {
  const rows: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("workspace_id", workspaceId)
      .range(from, to);

    if (error) {
      throw new Error(`Gagal membaca tabel ${tableName}: ${error.message}`);
    }

    const page = (data ?? []) as Record<string, unknown>[];

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function getSaleItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sales: Record<string, unknown>[],
) {
  const saleIds = sales
    .map((sale) => sale.id)
    .filter((id): id is string => typeof id === "string");

  if (saleIds.length === 0) {
    return [];
  }

  const rows: Record<string, unknown>[] = [];

  for (
    let chunkStart = 0;
    chunkStart < saleIds.length;
    chunkStart += SALE_ID_CHUNK_SIZE
  ) {
    const saleIdChunk = saleIds.slice(
      chunkStart,
      chunkStart + SALE_ID_CHUNK_SIZE,
    );

    let from = 0;

    while (true) {
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("sale_items")
        .select("*")
        .in("sale_id", saleIdChunk)
        .range(from, to);

      if (error) {
        throw new Error(`Gagal membaca tabel sale_items: ${error.message}`);
      }

      const page = (data ?? []) as Record<string, unknown>[];

      rows.push(...page);

      if (page.length < PAGE_SIZE) {
        break;
      }

      from += PAGE_SIZE;
    }
  }

  return rows;
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
          message: "Workspace ID diperlukan untuk membuat backup.",
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
          message: "Anda bukan anggota workspace yang dipilih.",
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
          `Gagal memeriksa permission data.backup: ${permissionError.message}`,
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

      if (permissions["data.backup"] !== true) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message: "Anda tidak memiliki permission untuk membuat backup.",
          },
          { status: 403 },
        );
      }
    }
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (workspaceError) {
      throw new Error(`Gagal membaca workspace: ${workspaceError.message}`);
    }

    /*
     * Ambil semua tabel yang memiliki workspace_id langsung.
     */
    const backupData: Record<string, unknown> = {};

    for (const tableName of WORKSPACE_TABLES) {
      backupData[tableName] = await getWorkspaceRows(
        supabase,
        tableName,
        workspaceId,
      );
    }

    /*
     * sale_items tidak memiliki workspace_id.
     * Relasinya:
     *
     * sale_items.sale_id -> sales.id
     * sales.workspace_id -> workspace.id
     *
     * Karena data sales sudah diambil di atas,
     * gunakan daftar sale ID tersebut untuk mengambil sale_items.
     */
    const sales = (backupData.sales ?? []) as Record<string, unknown>[];

    backupData.sale_items = await getSaleItems(supabase, sales);

    const createdAt = new Date().toISOString();

    const tableNames = [
      "workspaces",
      "bahan_baku",
      "products",
      "product_bom",
      "sales",
      "sale_items",
      "stock_alerts",
      "stock_movements",
      "stock_movement_trash",
      "sales_archive",
    ];

    const counts = Object.fromEntries(
      tableNames.map((tableName) => {
        if (tableName === "workspaces") {
          return [tableName, 1];
        }

        const value = backupData[tableName];

        return [tableName, Array.isArray(value) ? value.length : 0];
      }),
    );

    const backup = {
      format: "cloud-stock-backup",
      version: 1,
      created_at: createdAt,
      workspace_id: workspaceId,
      workspace,
      data: backupData,
      metadata: {
        tables: tableNames,
        counts,
      },
    };

    const filenameDate = createdAt
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .replace("Z", "");

    const filename = `cloud-stock-backup-${filenameDate}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Cloud Stock backup error:", error);

    return NextResponse.json(
      {
        error: "Backup gagal",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat membuat backup.",
      },
      { status: 500 },
    );
  }
}
