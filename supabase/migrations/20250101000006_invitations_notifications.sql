-- Invitations and Notifications schema + join-safe RLS + helper RPCs
-- This migration is designed to be non-recursive and RLS-safe under Supabase.
-- It avoids any self-referential policies and uses group creators/membership-independent checks.

-- 0) Prereqs
create extension if not exists pgcrypto;

-- 1) Types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'invitation_status') then
    create type invitation_status as enum ('pending','accepted','declined','expired');
  end if;
end$$;

-- 2) Tables

-- Invitations: one row per invited email
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_email text not null,
  status invitation_status not null default 'pending',
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz default (now() + interval '14 days'),
  unique (token)
);

create index if not exists invitations_group_id_idx on public.invitations(group_id);
create index if not exists invitations_invitee_email_idx on public.invitations(invitee_email);
create index if not exists invitations_inviter_id_idx on public.invitations(inviter_id);
create index if not exists invitations_status_idx on public.invitations(status);

-- Notifications: one row per user notification
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, -- 'group_invitation', 'expense_added', 'payment_received', etc.
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  metadata jsonb default '{}'
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_is_read_idx on public.notifications(user_id, is_read);

-- 3) Enable RLS
alter table public.invitations enable row level security;
alter table public.notifications enable row level security;

-- 4) RLS Policies (join-safe, no recursion)

-- Invitations:
-- Read: inviter can see invites they sent; invitee can see invites addressed to their email
drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
for select
using (
  inviter_id = auth.uid()
  or invitee_email = coalesce((auth.jwt() ->> 'email'), '')
);

-- Insert: allow inviter if they created the group (admin/creator can be tightened later)
drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
for insert
with check (
  exists (
    select 1 from public.groups g
    where g.id = invitations.group_id
      and g.created_by = auth.uid()
  )
);

-- Update: inviter can manage the invites they created, invitee can accept their own invite by token via RPC
drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations
for update
using (
  inviter_id = auth.uid()
  or invitee_email = coalesce((auth.jwt() ->> 'email'), '')
);

-- Delete: inviter can delete invites they sent
drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations
for delete
using (inviter_id = auth.uid());

-- Notifications:
-- Read: only to the notification's user
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
for select
using (user_id = auth.uid());

-- Insert: allow a user to create notifications for themselves
drop policy if exists notifications_insert_self on public.notifications;
create policy notifications_insert_self on public.notifications
for insert
with check (user_id = auth.uid());

-- Update: user can mark their notifications read/unread
drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications
for update
using (user_id = auth.uid());

-- Delete: user can delete their own notifications
drop policy if exists notifications_delete_self on public.notifications;
create policy notifications_delete_self on public.notifications
for delete
using (user_id = auth.uid());

-- 5) Helper RPCs (SECURITY DEFINER) to create invites and accept them without recursive policies

-- RPC: create invitation + notification (if invitee has a profile)
-- Requires: caller is group creator (enforced here) and invitations_insert policy
create or replace function public.invite_user_to_group(p_group_id uuid, p_invitee_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_invitee_id uuid;
  v_token uuid;
  v_group_creator uuid;
begin
  -- Ensure caller is authenticated
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Ensure caller is the group creator (admin path can be added later)
  select created_by into v_group_creator from public.groups where id = p_group_id;
  if v_group_creator is null then
    raise exception 'group not found';
  end if;
  if v_group_creator <> v_user_id then
    raise exception 'only group creator can invite at this time';
  end if;

  -- Create invitation (RLS insert policy checks created_by condition)
  insert into public.invitations (group_id, inviter_id, invitee_email)
  values (p_group_id, v_user_id, p_invitee_email)
  returning token into v_token;

  -- If the invitee already has a profile, drop them a notification
  select id into v_invitee_id from public.profiles where email = p_invitee_email;
  if v_invitee_id is not null then
    -- SECURITY DEFINER cannot bypass RLS, but notifications_insert_self only allows user_id = auth.uid().
    -- So we cannot insert for another user here via RLS. Instead, we create a lightweight invitation
    -- and the client for the invitee will fetch pending invitations and present a banner.
    -- If you want server-side notifications to others, create a service role function or broaden insert policy carefully.
    null;
  end if;

  return jsonb_build_object('ok', true, 'token', v_token);
end;
$$;

-- RPC: accept invitation by token - inserts into group_members and marks invite accepted
-- Avoids recursion by not referencing group_members in any policy here; insertion relies on group_members policies
create or replace function public.accept_invitation(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
  v_inv record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  v_email := coalesce((auth.jwt() ->> 'email'), '');
  if v_email = '' then
    raise exception 'email not available on JWT';
  end if;

  select * into v_inv
  from public.invitations
  where token = p_token
    and status = 'pending'
    and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'invitation not found or expired';
  end if;

  -- Ensure the authenticated user matches invitee email
  if lower(v_inv.invitee_email) <> lower(v_email) then
    raise exception 'invitation email does not match your account email';
  end if;

  -- Insert membership (creator/any role - default 'member')
  insert into public.group_members (group_id, user_id, role)
  values (v_inv.group_id, v_user_id, 'member')
  on conflict do nothing;

  -- Mark invitation accepted
  update public.invitations
  set status = 'accepted',
      accepted_at = now()
  where id = v_inv.id;

  return jsonb_build_object('ok', true);
end;
$$;

-- 6) Optional: Badge count helper
create or replace function public.get_unread_notification_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.notifications
  where user_id = auth.uid()
    and is_read = false;
$$;

-- 7) Notes:
-- - Email delivery is handled by Supabase Auth SMTP config in the dashboard.
-- - The application should call invite_user_to_group(group_id, email) to create invitations.
-- - The invitee should call accept_invitation(token) to join the group.