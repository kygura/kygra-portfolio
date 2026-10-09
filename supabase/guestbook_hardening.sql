-- Guestbook hardening for `public.guestbook` (id, name, message, created_at).
--
-- REVIEW BEFORE APPLYING. This repo never runs this file: no migration tool, build step or
-- deploy applies it. Read it, adjust the limits, then run it yourself in the Supabase SQL editor
-- (ideally on a branch/staging project first).
--
-- Why: the site talks to Supabase with the public anon key, so anyone can call the REST API
-- directly and skip every check in the client (validateSign, the 30s cooldown, the 280-char
-- counter). Those are UX only; the rules below are the real ones.
--
-- Limits of what the database can do with an anon key:
--   * There is no user identity, so rate limits key on the client IP taken from the request
--     headers PostgREST exposes. Check which header your project's gateway sets reliably: the
--     leftmost `x-forwarded-for` value can be supplied by the caller, and many clients can share
--     one IP (NAT, mobile carriers). The global throttle below caps total volume regardless.
--   * A determined attacker rotating IPs is only slowed by the global throttle; for more, put an
--     edge function or captcha in front of inserts and revoke direct anon INSERT.
--   * Constraints are added NOT VALID so existing rows do not block the migration; run the
--     VALIDATE statements at the end once old rows are cleaned up.

begin;

-- 1. Shape of a row --------------------------------------------------------------------------
-- char_length counts characters (code points), like the client's charCount().

alter table public.guestbook
  alter column created_at set default now();

alter table public.guestbook
  add constraint guestbook_message_len
    check (char_length(btrim(message)) between 1 and 280) not valid,
  add constraint guestbook_name_len
    check (name is null or char_length(name) <= 32) not valid,
  -- C0 control characters except tab/newline, plus DEL (same set the client strips).
  add constraint guestbook_no_controls
    check (message !~ '[\x01-\x08\x0b-\x1f\x7f]' and coalesce(name, '') !~ '[\x01-\x08\x0b-\x1f\x7f]') not valid;

-- 2. Row level security ----------------------------------------------------------------------
-- Anyone may read and sign; nobody (via the API) may edit or delete.

alter table public.guestbook enable row level security;

drop policy if exists guestbook_read on public.guestbook;
create policy guestbook_read on public.guestbook
  for select to anon, authenticated
  using (true);

drop policy if exists guestbook_sign on public.guestbook;
create policy guestbook_sign on public.guestbook
  for insert to anon, authenticated
  with check (char_length(btrim(message)) between 1 and 280 and char_length(coalesce(name, '')) <= 32);

-- Clients may only set name and message; id and created_at come from the database.
revoke insert, update, delete on public.guestbook from anon, authenticated;
grant select on public.guestbook to anon, authenticated;
grant insert (name, message) on public.guestbook to anon, authenticated;

-- 3. Insert rate limit ------------------------------------------------------------------------
-- Per IP: at most 3 entries per 10 minutes. Globally: at most 30 entries per minute.
-- Hits live in a schema PostgREST does not expose; IPs are stored hashed, kept for a day.

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.guestbook_hits (
  ip_hash bytea not null,
  at timestamptz not null default now()
);
create index if not exists guestbook_hits_ip_at on private.guestbook_hits (ip_hash, at);
create index if not exists guestbook_hits_at on private.guestbook_hits (at);

create or replace function private.guestbook_throttle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  ip text := coalesce(
    nullif(btrim(split_part(headers ->> 'x-forwarded-for', ',', 1)), ''),
    headers ->> 'x-real-ip',
    'unknown'
  );
  h bytea := sha256(convert_to(ip, 'UTF8'));
begin
  -- Serialise concurrent inserts from the same IP so the count below is exact.
  perform pg_advisory_xact_lock(hashtextextended(ip, 0));

  if (select count(*) from private.guestbook_hits where ip_hash = h and at > now() - interval '10 minutes') >= 3 then
    raise exception 'guestbook: rate limited' using errcode = 'P0001';
  end if;

  if (select count(*) from public.guestbook where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'guestbook: busy' using errcode = 'P0001';
  end if;

  delete from private.guestbook_hits where at < now() - interval '1 day';
  insert into private.guestbook_hits (ip_hash) values (h);

  -- Never trust client-supplied timestamps (belt and braces with the column grant above).
  new.created_at := now();
  return new;
end;
$$;

revoke all on function private.guestbook_throttle() from public, anon, authenticated;

drop trigger if exists guestbook_throttle on public.guestbook;
create trigger guestbook_throttle
  before insert on public.guestbook
  for each row execute function private.guestbook_throttle();

commit;

-- After cleaning up any old rows that break the new rules:
--   alter table public.guestbook validate constraint guestbook_message_len;
--   alter table public.guestbook validate constraint guestbook_name_len;
--   alter table public.guestbook validate constraint guestbook_no_controls;
