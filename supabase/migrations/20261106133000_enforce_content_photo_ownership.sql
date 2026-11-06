-- Prevent a member from pointing their own content at another member's stored image.
-- The first folder in every community-photo path must be the content/profile owner.
create or replace function public.guard_post_photo_path_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.photo_path is not null
    and split_part(new.photo_path, '/', 1) is distinct from new.author_id::text then
    raise exception 'A post may reference only a photo stored in its author''s folder';
  end if;
  return new;
end;
$function$;

create or replace function public.guard_story_photo_path_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.photo_path is not null
    and split_part(new.photo_path, '/', 1) is distinct from new.author_id::text then
    raise exception 'A story may reference only a photo stored in its author''s folder';
  end if;
  return new;
end;
$function$;

create or replace function public.guard_profile_photo_path_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.avatar_path is not null
    and split_part(new.avatar_path, '/', 1) is distinct from new.id::text then
    raise exception 'A profile avatar must be stored in its owner''s folder';
  end if;
  if new.cover_path is not null
    and split_part(new.cover_path, '/', 1) is distinct from new.id::text then
    raise exception 'A profile cover must be stored in its owner''s folder';
  end if;
  return new;
end;
$function$;

drop trigger if exists posts_photo_path_owner_guard on public.posts;
create trigger posts_photo_path_owner_guard
before insert or update of photo_path on public.posts
for each row execute function public.guard_post_photo_path_owner();

drop trigger if exists stories_photo_path_owner_guard on public.stories;
create trigger stories_photo_path_owner_guard
before insert or update of photo_path on public.stories
for each row execute function public.guard_story_photo_path_owner();

drop trigger if exists profiles_photo_path_owner_guard on public.profiles;
create trigger profiles_photo_path_owner_guard
before insert or update of avatar_path, cover_path on public.profiles
for each row execute function public.guard_profile_photo_path_owner();

revoke all on function public.guard_post_photo_path_owner() from public, anon, authenticated;
revoke all on function public.guard_story_photo_path_owner() from public, anon, authenticated;
revoke all on function public.guard_profile_photo_path_owner() from public, anon, authenticated;
