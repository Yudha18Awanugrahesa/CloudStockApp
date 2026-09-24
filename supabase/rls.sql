-- Enable RLS on tenant-owned tables.
alter table bahan_baku enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table stock_movements enable row level security;
alter table stock_alerts enable row level security;

-- Example policy pattern.
-- Replace the workspace membership lookup with your final auth model.
create policy "tenant read bahan" on bahan_baku
for select using (
  exists (
    select 1 from workspace_members wm
    where wm.workspace_id = bahan_baku.workspace_id
      and wm.user_id = auth.uid()
  )
);

-- Apply the same membership pattern to INSERT/UPDATE/DELETE and every tenant-owned table.
