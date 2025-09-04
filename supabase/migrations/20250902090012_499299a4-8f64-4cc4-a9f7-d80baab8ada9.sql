-- Create global app settings for signal thresholds
create table if not exists public.app_settings (
  singleton boolean primary key default true,
  signal_threshold_level text not null default 'HIGH' check (signal_threshold_level in ('LOW','MEDIUM','HIGH')),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Enable RLS and policies
alter table public.app_settings enable row level security;

-- Allow all authenticated users to read settings
create policy "Users can read app settings"
  on public.app_settings
  for select
  to authenticated
  using (true);

-- Only admins can insert/update settings
create policy "Admins can insert app settings"
  on public.app_settings
  for insert
  to authenticated
  with check (has_role('admin'));

create policy "Admins can update app settings"
  on public.app_settings
  for update
  to authenticated
  using (has_role('admin'))
  with check (has_role('admin'));

-- Trigger to maintain updated_at
drop trigger if exists update_app_settings_updated_at on public.app_settings;
create trigger update_app_settings_updated_at
before update on public.app_settings
for each row execute function public.update_updated_at_column();

-- Seed a singleton row (HIGH by default)
insert into public.app_settings (singleton, signal_threshold_level)
values (true, 'HIGH')
on conflict (singleton) do nothing;