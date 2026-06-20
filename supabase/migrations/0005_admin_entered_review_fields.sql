alter table public.reviews add column if not exists admin_entered_by uuid references public.profiles(id) on delete restrict;
alter table public.reviews add column if not exists admin_entered_at timestamptz;
alter table public.reviews add column if not exists admin_entry_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_admin_entry_requires_reason'
  ) then
    alter table public.reviews
      add constraint reviews_admin_entry_requires_reason check (
        (
          admin_entered_by is null
          and admin_entered_at is null
          and admin_entry_reason is null
        )
        or (
          admin_entered_by is not null
          and admin_entered_at is not null
          and length(trim(admin_entry_reason)) >= 5
        )
      );
  end if;
end $$;

create index if not exists reviews_admin_entered_by_idx
on public.reviews (admin_entered_by)
where admin_entered_by is not null;
