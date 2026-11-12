-- Keep exactly one reusable private conversation channel for each group.
create unique index if not exists conversations_one_group_channel_idx
  on public.conversations (group_id)
  where is_group and group_id is not null;
