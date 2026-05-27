-- Enable RLS on room_tasks
alter table public.room_tasks enable row level security;

drop policy if exists "Members can view room tasks" on public.room_tasks;
drop policy if exists "Creators can manage room tasks" on public.room_tasks;

create policy "Members can view room tasks"
  on public.room_tasks for select
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_tasks.room_id
        and (public.is_member_of_org(r.organization_id) or r.created_by = auth.uid())
    )
  );

create policy "Creators can manage room tasks"
  on public.room_tasks for all
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_tasks.room_id
        and r.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = room_tasks.room_id
        and r.created_by = auth.uid()
    )
  );
