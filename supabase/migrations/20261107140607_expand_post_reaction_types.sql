-- Keep the feed's nine visible reaction choices in sync with the database constraint.
ALTER TABLE public.post_reactions
  DROP CONSTRAINT IF EXISTS post_reactions_reaction_check;

ALTER TABLE public.post_reactions
  ADD CONSTRAINT post_reactions_reaction_check
  CHECK (reaction IN ('like', 'love', 'laugh', 'wow', 'sad', 'celebrate', 'support', 'salute', 'pray'));
