-- Prevent authenticated users from re-parenting or transferring content rows.
create or replace function public.prevent_owned_content_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if tg_table_name = 'posts' then
    if new.author_id is distinct from old.author_id or new.group_id is distinct from old.group_id then
      raise exception 'Post ownership and group placement cannot be changed';
    end if;
  elsif tg_table_name = 'comments' then
    if new.author_id is distinct from old.author_id or new.post_id is distinct from old.post_id then
      raise exception 'Comment ownership and parent post cannot be changed';
    end if;
  elsif tg_table_name = 'stories' then
    if new.author_id is distinct from old.author_id
      or new.created_at is distinct from old.created_at
      or new.expires_at is distinct from old.expires_at then
      raise exception 'Story ownership and expiry cannot be changed';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists posts_owner_placement_immutable on public.posts;
create trigger posts_owner_placement_immutable
before update on public.posts
for each row execute function public.prevent_owned_content_reassignment();

drop trigger if exists comments_owner_parent_immutable on public.comments;
create trigger comments_owner_parent_immutable
before update on public.comments
for each row execute function public.prevent_owned_content_reassignment();

drop trigger if exists stories_owner_expiry_immutable on public.stories;
create trigger stories_owner_expiry_immutable
before update on public.stories
for each row execute function public.prevent_owned_content_reassignment();

create or replace function public.prevent_event_group_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.group_id is distinct from old.group_id or new.organizer_id is distinct from old.organizer_id then
    raise exception 'An event cannot be transferred to another organiser or group after creation';
  end if;
  return new;
end;
$function$;
