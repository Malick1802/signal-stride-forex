
-- 1) Ensure a profiles row is created for every new auth user
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) Optional but helpful: keep profiles.updated_at current
--    Uses your existing public.update_updated_at_column() function
drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

-- 3) Index for faster invalid-token cleanup
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_profiles_push_token'
  ) then
    create index idx_profiles_push_token on public.profiles (push_token);
  end if;
end $$;
