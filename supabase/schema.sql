create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists bahan_baku (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kode_bahan text not null,
  nama_bahan text not null,
  kategori text,
  satuan text not null,
  current_stock numeric not null default 0 check (current_stock >= 0),
  safety_stock numeric not null default 0 check (safety_stock >= 0),
  reorder_point numeric not null default 0 check (reorder_point >= 0),
  reorder_quantity numeric not null default 0 check (reorder_quantity > 0),
  harga_beli numeric not null default 0 check (harga_beli >= 0),
  supplier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  image_url text,
  selling_price numeric not null check (selling_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists product_bom (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  bahan_baku_id uuid not null references bahan_baku(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  unit text not null
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  total numeric not null check (total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0)
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  bahan_baku_id uuid not null references bahan_baku(id),
  type text not null check (type in ('IN','OUT','ADJUSTMENT','RETURN')),
  quantity numeric not null check (quantity > 0),
  stock_before numeric not null,
  stock_after numeric not null,
  reference_type text,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists stock_alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  bahan_baku_id uuid not null references bahan_baku(id) on delete cascade,
  alert_type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_bahan_workspace on bahan_baku(workspace_id);
create index if not exists idx_products_workspace on products(workspace_id);
create index if not exists idx_sales_workspace on sales(workspace_id);
create index if not exists idx_stock_movements_workspace on stock_movements(workspace_id);
